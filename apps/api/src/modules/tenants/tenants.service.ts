import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Tenant } from './tenant.entity';
import { User, UserRole, UserStatus } from '../users/user.entity';

@Injectable()
export class TenantsService {
    constructor(
        @InjectRepository(Tenant)
        private tenantRepository: Repository<Tenant>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async getMembers(tenantId: string): Promise<User[]> {
        return this.userRepository.find({
            where: { tenantId },
            order: { firstName: 'ASC' },
        });
    }

    async inviteMember(tenantId: string, email: string, role: string) {
        // Check if user exists
        const existingUser = await this.userRepository.findOne({ where: { email } });

        if (existingUser) {
            if (existingUser.tenantId === tenantId) {
                throw new Error('User is already a member of this organization');
            } else {
                throw new Error('User belongs to another organization');
            }
        }

        // Create new user
        // Note: For MVP we set a dummy password. In prod, we'd send an invite email with a token.
        // We import bcrypt here? Or just hardcode a hash if we don't want to add import?
        // Let's rely on auth service usually, but let's just create raw user here.
        // We need UserRole enum.

        // Use a dummy hash for now (e.g. hash of "Password123!")
        const dummyHash = '$2a$10$abcdefghijklmnopqrstuvwxyzABC'; // This is not real, just a placeholder string

        const newUser = this.userRepository.create({
            email,
            tenantId,
            role: role as UserRole,
            status: UserStatus.INVITED,
            passwordHash: dummyHash,
            firstName: '',
            lastName: '',
        });

        return this.userRepository.save(newUser);
    }
}
