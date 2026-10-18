import { createHmac } from 'node:crypto';

export const REALTIME_TOKEN_SECONDS = 5 * 60;

function base64url(value: string): string {
    return Buffer.from(value, 'utf8').toString('base64url');
}

export function createRealtimeToken(secret: string, subject: string, nowSeconds = Math.floor(Date.now() / 1000)) {
    if (secret.length < 32) throw new Error('Realtime signing secret is too short.');
    if (!/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/i.test(subject))
        throw new Error('Realtime token subject must be a UUID.');

    const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const expiresAt = nowSeconds + REALTIME_TOKEN_SECONDS;
    const payload = base64url(JSON.stringify({
        aud: 'authenticated',
        exp: expiresAt,
        iat: nowSeconds,
        role: 'authenticated',
        sub: subject,
        dashboard_access: true,
    }));
    const unsigned = `${header}.${payload}`;
    const signature = createHmac('sha256', secret).update(unsigned).digest('base64url');
    return { token: `${unsigned}.${signature}`, expiresAt };
}

export function getRealtimePublicKey(env: Record<string, string | undefined> = process.env): string | undefined {
    const key = env.SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!key || key === env.SUPABASE_SERVICE_ROLE_KEY) return undefined;
    return key;
}
