import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Secret } from './secrets.entity';
import { EncryptionService } from './encryption.service';

@Injectable()
export class SecretsService {
    constructor(
        @InjectRepository(Secret)
        private readonly secretRepository: Repository<Secret>,
        private readonly encryptionService: EncryptionService,
    ) { }

    /**
     * Store a secret for a tenant
     */
    async storeSecret(
        tenantId: string,
        key: string,
        value: string,
        options?: {
            description?: string;
            expiresAt?: Date;
        },
    ): Promise<Secret> {
        const encryptedValue = this.encryptionService.encrypt(value);

        let secret = await this.secretRepository.findOne({
            where: { tenantId, key },
        });

        if (secret) {
            secret.encryptedValue = encryptedValue;
            secret.version += 1;
            secret.rotatedAt = new Date();
            if (options?.description) secret.description = options.description;
            if (options?.expiresAt) secret.expiresAt = options.expiresAt;
        } else {
            secret = this.secretRepository.create({
                tenantId,
                key,
                encryptedValue,
                description: options?.description,
                expiresAt: options?.expiresAt,
            });
        }

        return this.secretRepository.save(secret);
    }

    /**
     * Retrieve a secret value (decrypted)
     */
    async getSecret(tenantId: string, key: string): Promise<string | null> {
        const secret = await this.secretRepository.findOne({
            where: { tenantId, key },
        });

        if (!secret) {
            return null;
        }

        // Check if expired
        if (secret.expiresAt && secret.expiresAt < new Date()) {
            return null;
        }

        return this.encryptionService.decrypt(secret.encryptedValue);
    }

    /**
     * Get secret metadata without decrypting
     */
    async getSecretMetadata(tenantId: string, key: string): Promise<Omit<Secret, 'encryptedValue'> | null> {
        const secret = await this.secretRepository.findOne({
            where: { tenantId, key },
            select: ['id', 'key', 'description', 'expiresAt', 'rotatedAt', 'version', 'createdAt', 'updatedAt'],
        });

        return secret;
    }

    /**
     * List all secret keys for a tenant (without values)
     */
    async listSecrets(tenantId: string): Promise<Array<{ key: string; description: string; expiresAt: Date; version: number }>> {
        const secrets = await this.secretRepository.find({
            where: { tenantId },
            select: ['key', 'description', 'expiresAt', 'version'],
        });

        return secrets;
    }

    /**
     * Delete a secret
     */
    async deleteSecret(tenantId: string, key: string): Promise<boolean> {
        const result = await this.secretRepository.delete({ tenantId, key });
        return (result.affected ?? 0) > 0;
    }

    /**
     * Rotate all secrets for a tenant (re-encrypt with current key)
     * Useful after encryption key rotation
     */
    async rotateAllSecrets(tenantId: string): Promise<number> {
        const secrets = await this.secretRepository.find({ where: { tenantId } });
        let rotatedCount = 0;

        for (const secret of secrets) {
            try {
                // Decrypt with current key
                const value = this.encryptionService.decrypt(secret.encryptedValue);
                // Re-encrypt
                secret.encryptedValue = this.encryptionService.encrypt(value);
                secret.rotatedAt = new Date();
                secret.version += 1;
                await this.secretRepository.save(secret);
                rotatedCount++;
            } catch (error) {
                console.error(`Failed to rotate secret ${secret.key}:`, error);
            }
        }

        return rotatedCount;
    }

    /**
     * Check if a secret exists
     */
    async hasSecret(tenantId: string, key: string): Promise<boolean> {
        const count = await this.secretRepository.count({ where: { tenantId, key } });
        return count > 0;
    }
}
