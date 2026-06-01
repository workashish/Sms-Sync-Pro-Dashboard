import crypto from 'crypto';

// Retrieves a safe 32-byte key from standard passwords
function getKey(password: string): Buffer {
    return crypto.createHash('sha256').update(String(password)).digest();
}

/**
 * Decrypts a payload coming directly from the Android SMS Sync Pro app.
 * The Android app uses AES-256-CBC natively. 
 */
export function decryptAndroidPayload(base64Payload: string, password?: string): string {
    if (!password) return base64Payload;
    try {
        const payloadBuffer = Buffer.from(base64Payload, 'base64');
        const iv = payloadBuffer.subarray(0, 16);
        const ciphertext = payloadBuffer.subarray(16);
        
        const key = getKey(password);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        
        let decrypted = decipher.update(ciphertext, undefined, 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        console.error("AES Decryption failed", e);
        return "DECRYPTION_FAILED";
    }
}

/**
 * Encrypts data for secure storage in Supabase PostgreSQL database.
 */
export function encryptForDatabase(text: string): string {
    const dbKey = process.env.DB_ENCRYPTION_KEY;
    if (!dbKey) return text; // Fallback if no DB key is provided
    
    try {
        const key = Buffer.from(dbKey, 'hex');
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return `${iv.toString('hex')}:${encrypted}`;
    } catch (e) {
         console.error("DB Encryption failed", e);
         return text;
    }
}

/**
 * Decrypts data fetched securely from the Supabase Database.
 */
export function decryptFromDatabase(hash: string): string {
    const dbKey = process.env.DB_ENCRYPTION_KEY;
    if (!dbKey || !hash.includes(':')) return hash; // Unencrypted fallback
    
    try {
        const [ivString, encryptedString] = hash.split(':');
        const key = Buffer.from(dbKey, 'hex');
        const iv = Buffer.from(ivString, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedString, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    } catch (e) {
        console.error("DB Decryption failed", e);
        return "DECRYPTION_FAILED";
    }
}
