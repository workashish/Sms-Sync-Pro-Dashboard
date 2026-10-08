export const SESSION_SECONDS = 7 * 24 * 60 * 60;
export type Session = { id: string; expires: number };
const encoder = new TextEncoder();
function hex(bytes: ArrayBuffer): string { return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join(''); }
export async function createSessionToken(secret: string, id: string, expires: number): Promise<string> {
    const value = `v1.${id}.${expires}`;
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    return `${value}.${hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))}`;
}
export async function verifySessionToken(token: string | undefined, secret: string | undefined, now = Date.now()): Promise<Session | null> {
    if (!token || !secret || token.length > 256) return null;
    const match = /^v1\.([a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12})\.(\d{10,13})\.([a-f\d]{64})$/.exec(token);
    if (!match) return null;
    const expires = Number(match[2]);
    if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_SECONDS * 1000 + 60000) return null;
    const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
    const signature = Uint8Array.from(match[3].match(/../g)!, value => parseInt(value, 16));
    if (!(await crypto.subtle.verify('HMAC', key, signature, encoder.encode(`v1.${match[1]}.${match[2]}`)))) return null;
    return { id: match[1], expires };
}
