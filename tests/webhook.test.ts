import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { decryptMessage, normalizeMessages, redactPayload, verifySignature } from '../lib/webhook';

function encrypt(text: string, password: string) {
    const salt = Buffer.alloc(16, 1);
    const iv = Buffer.alloc(12, 2);
    const key = crypto.pbkdf2Sync(password, salt, 10000, 32, 'sha256');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(text, 'utf8'), cipher.final(), cipher.getAuthTag()]);
    return [salt, iv, ciphertext].map(value => value.toString('hex')).join(':');
}

test('Android PBKDF2/AES-GCM envelope decrypts Unicode and verifies authentication tag', () => {
    const text = 'Your OTP is 123456. नमस्ते 👋';
    const encrypted = encrypt(text, 'test-password');
    assert.equal(decryptMessage(encrypted, 'test-password'), text);
    assert.throws(() => decryptMessage(encrypted, 'wrong-password'));
    assert.throws(() => decryptMessage(encrypted));
    assert.throws(() => decryptMessage(encrypted.slice(0, -2) + 'ff', 'test-password'));
    assert.equal(decryptMessage('Reminder: meeting at 10:30', 'test-password'), 'Reminder: meeting at 10:30');
});

test('HMAC matches raw UTF-8 bytes; accepts hex/base64 and rejects missing or changed signatures', () => {
    const raw = JSON.stringify({ body: 'नमस्ते' });
    const hmac = crypto.createHmac('sha256', 'secret').update(raw);
    const signature = hmac.digest();
    assert(verifySignature(raw, signature.toString('hex'), 'secret'));
    assert(verifySignature(raw, signature.toString('base64'), 'secret'));
    assert(!verifySignature(raw + ' ', signature.toString('hex'), 'secret'));
    assert(!verifySignature(raw, null, 'secret'));
    assert(!verifySignature(raw, 'x'.repeat(64), 'secret'));
});

test('Current Android and legacy payloads normalize; encrypted retries retain IDs', () => {
    const legacy = { sender: 'BANK', message: 'Account credited', timestamp: 1718042456000, device_model: 'Pixel' };
    const [first] = normalizeMessages(legacy);
    assert.equal(first.table, 'bank_activity');
    assert.equal(first.row.time, '2024-06-10T18:00:56.000Z');
    assert.equal(first.row.metadata.device_model, 'Pixel');
    const [retry] = normalizeMessages({ ...legacy, message: encrypt(legacy.message, 'secret') }, 'secret');
    assert.equal(first.row.id, retry.row.id);
    const id = crypto.randomUUID();
    const [explicit] = normalizeMessages({ id, sender: 'TEST', body: 'verification', type: 'message' });
    assert.equal(explicit.row.id, id);
    assert.equal(explicit.table, 'messages');
});

test('Invalid batches fail completely instead of falsely acknowledging dropped messages', () => {
    for (const payload of [null, [], { sender: 'TEST' }, { sender: 'TEST', body: 42 },
        { sender: 'TEST', body: 'a', metadata: [] }, [{ sender: 'TEST', body: 'ok' }, null]]) {
        assert.throws(() => normalizeMessages(payload));
    }
});

test('Logs redact message bodies and extracted OTP metadata for batches and legacy messages', () => {
    const output = JSON.stringify(redactPayload([{ sender: 'PRIVATE', message: '123456', metadata: { code: '123456' } }]));
    assert(!output.includes('123456'));
    assert(!output.includes('PRIVATE'));
    assert(output.includes('[redacted]'));
});
