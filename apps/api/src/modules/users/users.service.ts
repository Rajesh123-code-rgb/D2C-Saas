import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async findOne(id: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['tenant'],
        });
        if (!user) {
            throw new NotFoundException('User not found');
        }
        return user;
    }

    async updateProfile(id: string, data: { firstName?: string; lastName?: string; companyName?: string; settings?: Record<string, any> }) {
        const user = await this.findOne(id);

        if (data.firstName) user.firstName = data.firstName;
        if (data.lastName) user.lastName = data.lastName;

        if (data.settings) {
            user.settings = { ...user.settings, ...data.settings };
        }

        await this.userRepository.save(user);

        if (data.companyName && user.tenant) {
            user.tenant.name = data.companyName;
            // Best effort tenant update
        }

        return this.findOne(id);
    }
}
