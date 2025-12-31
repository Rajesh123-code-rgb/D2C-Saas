import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SuperAdminUser, SuperAdminStatus } from '../entities/super-admin-user.entity';

export interface SuperAdminJwtPayload {
    sub: string;          // admin ID
    email: string;
    role: string;
    type: 'super_admin';  // Distinguish from regular user tokens
    iat?: number;
    exp?: number;
}

@Injectable()
export class SuperAdminJwtStrategy extends PassportStrategy(Strategy, 'super-admin-jwt') {
    constructor(
        private configService: ConfigService,
        @InjectRepository(SuperAdminUser)
        private adminUserRepository: Repository<SuperAdminUser>,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('ADMIN_JWT_SECRET') || configService.get<string>('JWT_SECRET') || 'super-admin-secret-key-dev',
        });
    }

    async validate(payload: SuperAdminJwtPayload): Promise<SuperAdminUser> {
        // Verify this is a super admin token
        if (payload.type !== 'super_admin') {
            throw new UnauthorizedException('Invalid token type');
        }

        const admin = await this.adminUserRepository.findOne({
            where: { id: payload.sub },
        });

        if (!admin) {
            throw new UnauthorizedException('Super Admin not found');
        }

        if (admin.status !== SuperAdminStatus.ACTIVE) {
            throw new UnauthorizedException('Super Admin account is not active');
        }

        // Check if password was changed after token was issued
        if (admin.passwordChangedAt && payload.iat) {
            const passwordChangedTimestamp = Math.floor(admin.passwordChangedAt.getTime() / 1000);
            if (passwordChangedTimestamp > payload.iat) {
                throw new UnauthorizedException('Password changed. Please login again.');
            }
        }

        return admin;
    }
}
