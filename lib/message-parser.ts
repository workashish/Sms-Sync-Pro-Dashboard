export type ParsedMessage = { type: 'message' | 'otp' | 'bank'; code?: string; amount?: string; currency?: string; bank_type?: 'DEPOSIT' | 'PAYMENT' | 'OTHER' };
export function parseMessage(body: string): ParsedMessage {
    const after = /\b(?:otp|one[ -]time password|verification code|security code|authentication code|passcode|code|pin)\b[^\d\n]{0,40}\b(\d{4,8})\b/i.exec(body);
    const before = /\b(\d{4,8})\b\s*(?:is\s+)?(?:your\s+|the\s+)?(?:otp|verification code|security code|passcode)\b/i.exec(body);
    const google = /\bG-(\d{6})\b/.exec(body);
    const code = after?.[1] || before?.[1] || google?.[1];
    if (code || /\b(?:otp|one[ -]time password|verification code|security code|authentication code|passcode)\b/i.test(body)) return { type: 'otp', ...(code ? { code } : {}) };
    if (!/\b(?:debited|credited|transaction|withdrawn|deposited|payment|bank|card ending)\b|account balance/i.test(body)) return { type: 'message' };
    const type = /\b(?:credited|deposited|deposit)\b/i.test(body) ? 'DEPOSIT' : /\b(?:debited|paid|payment|withdrawn)\b/i.test(body) ? 'PAYMENT' : 'OTHER';
    const candidates = Array.from(body.matchAll(/(₹|Rs\.?|INR|USD|\$|EUR|€|GBP|£)\s*([\d]+(?:,[\d]{2,3})*(?:\.[\d]{1,2})?)\b/gi));
    const actions = Array.from(body.matchAll(/\b(?:debited|credited|paid|payment|withdrawn|deposited|transaction|amount)\b/gi)).map(m => m.index!);
    const sorted = candidates.sort((a, b) => {
        const score = (m: RegExpMatchArray) => Math.min(...actions.map(index => Math.abs(index - m.index!)), 1000) + (/balance|limit/i.test(body.slice(Math.max(0, m.index! - 24), m.index)) ? 1000 : 0);
        return score(a) - score(b);
    });
    const amount = sorted[0];
    const currency = amount ? /₹|Rs\.?|INR/i.test(amount[1]) ? 'INR' : /USD|\$/i.test(amount[1]) ? 'USD' : /EUR|€/i.test(amount[1]) ? 'EUR' : 'GBP' : undefined;
    return { type: 'bank', bank_type: type, ...(amount ? { amount: amount[2].replaceAll(',', ''), currency } : {}) };
}
