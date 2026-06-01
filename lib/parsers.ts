export function classifyMessage(message: string) {
    const text = message.toLowerCase();
    
    let type = 'general';
    let metadata: any = {};

    // 1. Detect OTP
    if (/otp|code|verification|password|pin|2fa|one time password/i.test(text)) {
        // Find 4 to 8 digit numbers. Often nearby "is" ...
        const match = text.match(/\b(\d{4,8})\b/);
        if (match) {
            type = 'otp';
            metadata.code = match[1];
            // Extract expiry time if present (e.g., "valid for 10 minutes")
            const minMatch = text.match(/valid for (\d+)\s*(min|minute|minutes)/i);
            if (minMatch) {
                 metadata.expiry_mins = parseInt(minMatch[1], 10);
            }
        }
    }

    // 2. Detect Bank
    if (/debited|credited|upi|atm|a\/c|account|loan|card/i.test(text)) {
        type = 'bank';
        
        // Match amounts gracefully (RS, INR, ₹, USD, $)
        const amountMatch = text.match(/(?:rs\.?|inr|₹|usd|\$)\s*(\d+(?:,\d+)*(?:\.\d+)?)/i) || 
                            text.match(/(\d+(?:,\d+)*(?:\.\d+)?)\s*(?:inr|rs)/i);

        if (amountMatch) {
            // Remove commas to get numeric value
            metadata.amount = parseFloat(amountMatch[1].replace(/,/g, ''));
        }

        if (/credited/i.test(text)) metadata.bank_type = 'credit';
        else if (/debited/i.test(text)) metadata.bank_type = 'debit';
        else if (/upi/i.test(text)) metadata.bank_type = 'upi';
        else if (/atm/i.test(text)) metadata.bank_type = 'atm';
        else metadata.bank_type = 'other';
    }

    return { type, metadata };
}
