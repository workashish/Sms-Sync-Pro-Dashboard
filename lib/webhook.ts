import crypto from 'node:crypto';
import { parseMessage } from './message-parser';

export class PayloadError extends Error {}

export function verifySignature(raw: string, signature: string | null, secret: string): boolean {
    if (!signature || !secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(raw, 'utf8').digest();
    let supplied: Buffer;
    if (/^[a-f\d]{64}$/i.test(signature)) supplied = Buffer.from(signature, 'hex');
    else if (/^[A-Za-z\d+/]{43}=$/.test(signature)) supplied = Buffer.from(signature, 'base64');
    else return false;
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

export function decryptMessage(body: string, password?: string, encryption?: string): string {
    if (encryption === 'none') return body;
    // Ordinary text containing colons is not an encrypted envelope.
    const parts = body.split(':');
    const encrypted = parts.length === 3 && parts.every(part => /^[a-f\d]+$/i.test(part));
    if (!encrypted) { if (encryption) throw new PayloadError('Invalid encrypted envelope'); return body; }
    if (!password) throw new PayloadError('Encrypted message received without AES configuration');
    const [saltHex, ivHex, cipherHex] = parts;
    if (saltHex.length !== 32 || ivHex.length !== 24 || cipherHex.length < 32 || cipherHex.length % 2)
        throw new PayloadError('Invalid encrypted message');
    try {
        const encryptedBytes = Buffer.from(cipherHex, 'hex');
        const key = crypto.pbkdf2Sync(password, Buffer.from(saltHex, 'hex'), 10000, 32, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
        decipher.setAuthTag(encryptedBytes.subarray(-16));
        return Buffer.concat([decipher.update(encryptedBytes.subarray(0, -16)), decipher.final()]).toString('utf8');
    } catch { throw new PayloadError('Message decryption failed'); }
}

function record(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeMessages(payload: unknown, password?: string) {
    const messages = Array.isArray(payload) ? payload : [payload];
    if (!messages.length || messages.length > 100) throw new PayloadError('Expected 1 to 100 messages');
    return messages.map(msg => {
        if (!record(msg)) throw new PayloadError('Each message must be an object');
        const body = msg.body ?? msg.message;
        if (typeof msg.sender !== 'string' || !msg.sender.trim() || msg.sender.length > 256 ||
            typeof body !== 'string' || !body.trim() || body.length > 524384)
            throw new PayloadError('A valid sender and message body are required');
        if (msg.metadata !== undefined && !record(msg.metadata)) throw new PayloadError('Metadata must be an object');
        const version = msg.schema_version;
        if (version !== undefined && version !== 1) throw new PayloadError('Unsupported schema version');
        const uuid = /^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i;
        if (msg.id !== undefined && (typeof msg.id !== 'string' || !uuid.test(msg.id))) throw new PayloadError('Invalid message ID');
        if (version === 1 && (typeof msg.id !== 'string' || !['none', 'aes-256-gcm-pbkdf2-sha256-v1'].includes(msg.encryption as string) || typeof msg.timestamp !== 'number'))
            throw new PayloadError('Version 1 requires id, timestamp and encryption');
        const plain = decryptMessage(body, password, version === 1 ? msg.encryption as string : undefined);
        if (!plain.trim()) throw new PayloadError('Empty message');
        const parsed = parseMessage(plain);
        const lower = plain.toLowerCase();
        const explicitType = msg.type;
        if (explicitType !== undefined && !['message', 'otp', 'bank'].includes(explicitType as string))
            throw new PayloadError('Invalid message type');
        const type = explicitType ?? parsed.type;
        const table = type === 'otp' ? 'otp_messages' : type === 'bank' ? 'bank_activity' : 'messages';
        let time: string;
        if (typeof msg.timestamp === 'number') {
            const date = new Date(msg.timestamp);
            if (!Number.isFinite(date.getTime())) throw new PayloadError('Invalid timestamp');
            time = date.toISOString();
        } else if (typeof msg.time === 'string' && msg.time.trim()) time = msg.time;
        else time = new Date().toISOString();
        // Decrypted body + original timestamp keeps IDs stable across re-encryption and retries.
        const preciseTime = typeof msg.timestamp === 'number' || (typeof msg.time === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(msg.time));
        const identity = typeof msg.id === 'string' ? msg.id : preciseTime ?
            crypto.createHash('sha256').update(JSON.stringify([msg.sender, plain, msg.timestamp ?? msg.time, msg.metadata ?? {}])).digest('hex').slice(0, 32)
                .replace(/^(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})$/, '$1-$2-$3-$4-$5') : crypto.randomUUID();
        const metadata: Record<string, unknown> = { ...(msg.metadata as Record<string, unknown> || {}), ...parsed, is_unread: true };
        if (typeof msg.device_model === 'string') metadata.device_model = msg.device_model;
        const received = typeof msg.timestamp === 'number' ? new Date(msg.timestamp) : new Date(time);
        const received_at = Number.isFinite(received.getTime()) ? received.toISOString() : new Date().toISOString();
        return { table, row: { id: identity, sender: msg.sender, body: plain, time, received_at, metadata } };
    });
}

export function redactPayload(payload: unknown): unknown {
    if (Array.isArray(payload)) return payload.map(redactPayload);
    if (!record(payload)) return null;
    // Only non-sensitive delivery information is retained, never OTP metadata or raw text.
    return { id: typeof payload.id === 'string' ? payload.id : undefined,
        type: typeof payload.type === 'string' ? payload.type : undefined,
        body: '[redacted]', metadata: '[redacted]' };
}
