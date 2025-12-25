import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class EncryptionService {
    private readonly algorithm = 'aes-256-gcm';
    private readonly keyLength = 32;
    private readonly ivLength = 16;
    private readonly tagLength = 16;
    private encryptionKey: Buffer;

    constructor(private configService: ConfigService) {
        let key = this.configService.get<string>('ENCRYPTION_KEY');

        // In development, use a default key if not provided
        if (!key) {
            if (process.env.NODE_ENV === 'production') {
                throw new Error('ENCRYPTION_KEY environment variable is required in production');
            }
            // Default development key (DO NOT use in production!)
            key = 'dev-encryption-key-not-for-production-use';
            console.warn('WARNING: Using default encryption key. Set ENCRYPTION_KEY in production!');
        }

        // Derive a 32-byte key from the provided key using SHA-256
        this.encryptionKey = crypto.createHash('sha256').update(key).digest();
    }

    /**
     * Encrypts a plaintext string using AES-256-GCM
     * @param plaintext - The string to encrypt
     * @returns Base64 encoded string containing IV + ciphertext + auth tag
     */
    encrypt(plaintext: string): string {
        const iv = crypto.randomBytes(this.ivLength);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'base64');
        encrypted += cipher.final('base64');

        const authTag = cipher.getAuthTag();

        // Combine IV + encrypted data + auth tag
        const combined = Buffer.concat([
            iv,
            Buffer.from(encrypted, 'base64'),
            authTag,
        ]);

        return combined.toString('base64');
    }

    /**
     * Decrypts a ciphertext string encrypted with encrypt()
     * @param ciphertext - Base64 encoded encrypted string
     * @returns Decrypted plaintext string
     */
    decrypt(ciphertext: string): string {
        const data = Buffer.from(ciphertext, 'base64');

        // Extract IV, encrypted content, and auth tag
        const iv = data.subarray(0, this.ivLength);
        const authTag = data.subarray(data.length - this.tagLength);
        const encrypted = data.subarray(this.ivLength, data.length - this.tagLength);

        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    }

    /**
     * Encrypts a JSON object
     * @param obj - Object to encrypt
     * @returns Encrypted base64 string
     */
    encryptObject<T>(obj: T): string {
        return this.encrypt(JSON.stringify(obj));
    }

    /**
     * Decrypts to a JSON object
     * @param ciphertext - Encrypted base64 string
     * @returns Decrypted object
     */
    decryptObject<T>(ciphertext: string): T {
        return JSON.parse(this.decrypt(ciphertext));
    }

    /**
     * Generates a random encryption key (for initial setup)
     * @returns Base64 encoded 32-byte key
     */
    static generateKey(): string {
        return crypto.randomBytes(32).toString('base64');
    }
}
