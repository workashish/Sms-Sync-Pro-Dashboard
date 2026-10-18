import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { createRealtimeToken, getRealtimePublicKey, REALTIME_TOKEN_SECONDS } from '../lib/realtime-token';

function decode(segment: string) {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));
}

test('realtime token is short-lived, signed and limited to the authenticated role', () => {
    const secret = 'a secure test signing secret with enough entropy';
    const subject = randomUUID();
    const now = 1_800_000_000;
    const { token, expiresAt } = createRealtimeToken(secret, subject, now);
    const [header, payload, signature] = token.split('.');

    assert.deepEqual(decode(header), { alg: 'HS256', typ: 'JWT' });
    assert.deepEqual(decode(payload), {
        aud: 'authenticated', exp: now + REALTIME_TOKEN_SECONDS, iat: now,
        role: 'authenticated', sub: subject, dashboard_access: true,
    });
    assert.equal(signature, createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url'));
    assert.equal(expiresAt, now + REALTIME_TOKEN_SECONDS);
});

test('realtime configuration never exposes the service-role key', () => {
    assert.equal(getRealtimePublicKey({ SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_public', SUPABASE_SERVICE_ROLE_KEY: 'private' }), 'sb_publishable_public');
    assert.equal(getRealtimePublicKey({ SUPABASE_PUBLISHABLE_KEY: 'same', SUPABASE_SERVICE_ROLE_KEY: 'same' }), undefined);
    assert.throws(() => createRealtimeToken('short', randomUUID()));
    assert.throws(() => createRealtimeToken('a secure test signing secret with enough entropy', 'not-a-uuid'));
});
