import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Tenant, TenantStatus, SubscriptionTier } from '../tenants/tenant.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken, ResetTokenType } from './password-reset-token.entity';
import { SignupDto, LoginDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
    private readonly logger = new Logger(AuthService.name);

    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Tenant)
        private tenantRepository: Repository<Tenant>,
        @InjectRepository(RefreshToken)
        private refreshTokenRepository: Repository<RefreshToken>,
        @InjectRepository(PasswordResetToken)
        private passwordResetTokenRepository: Repository<PasswordResetToken>,
        private jwtService: JwtService,
    ) { }

    async signup(signupDto: SignupDto) {
        try {
            const { email, password, firstName, lastName, companyName, companySlug } = signupDto;

            // Check if tenant slug already exists
            const existingTenant = await this.tenantRepository.findOne({
                where: { slug: companySlug },
            });

            if (existingTenant) {
                throw new ConflictException('Company slug already taken');
            }

            // Check if user email exists
            const existingUser = await this.userRepository.findOne({
                where: { email },
            });

            if (existingUser) {
                throw new ConflictException('Email already registered');
            }

            // Create tenant
            const tenant = this.tenantRepository.create({
                name: companyName,
                slug: companySlug,
                subscriptionTier: SubscriptionTier.FREE,
                status: TenantStatus.TRIAL,
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days trial
                settings: {
                    timezone: 'UTC',
                    language: 'en',
                },
            });

            await this.tenantRepository.save(tenant);

            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);

            // Create owner user
            const user = this.userRepository.create({
                tenantId: tenant.id,
                email,
                passwordHash,
                firstName,
                lastName,
                role: UserRole.OWNER,
                status: UserStatus.ACTIVE,
            });

            await this.userRepository.save(user);

            // Generate tokens
            const accessToken = this.generateAccessToken(user);
            const refreshToken = await this.generateRefreshToken(user.id);

            return {
                user: this.sanitizeUser(user),
                tenant: this.sanitizeTenant(tenant),
                accessToken,
                refreshToken,
            };
        } catch (error) {
            if (error instanceof ConflictException) {
                throw error;
            }
            this.logger.error('Failed to create account', error);
            throw new Error('Failed to create account');
        }
    }

    async login(loginDto: LoginDto, deviceInfo?: string, ipAddress?: string) {
        const { email, password } = loginDto;

        // Find user with tenant
        const user = await this.userRepository.findOne({
            where: { email },
            relations: ['tenant'],
        });

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Verify password
        const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // Check if user and tenant are active
        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is inactive');
        }

        if (user.tenant.status === TenantStatus.SUSPENDED) {
            throw new UnauthorizedException('Account suspended');
        }

        if (user.tenant.status === TenantStatus.CANCELLED) {
            throw new UnauthorizedException('Account cancelled');
        }

        // Update last login
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        // Generate tokens
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id, deviceInfo, ipAddress);

        return {
            user: this.sanitizeUser(user),
            tenant: this.sanitizeTenant(user.tenant),
            accessToken,
            refreshToken,
        };
    }

    async refreshAccessToken(refreshTokenStr: string) {
        const tokenRecord = await this.refreshTokenRepository.findOne({
            where: {
                token: refreshTokenStr,
                isRevoked: false,
                expiresAt: MoreThan(new Date()),
            },
            relations: ['user', 'user.tenant'],
        });

        if (!tokenRecord) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const user = tokenRecord.user;

        if (user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('Account is inactive');
        }

        // Generate new access token
        const accessToken = this.generateAccessToken(user);

        return {
            accessToken,
            user: this.sanitizeUser(user),
        };
    }

    async logout(refreshTokenStr: string) {
        await this.refreshTokenRepository.update(
            { token: refreshTokenStr },
            { isRevoked: true }
        );
        return { message: 'Logged out successfully' };
    }

    async logoutAll(userId: string) {
        await this.refreshTokenRepository.update(
            { userId, isRevoked: false },
            { isRevoked: true }
        );
        return { message: 'Logged out from all devices' };
    }

    // Password Reset Methods
    async requestPasswordReset(email: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            // Show user not found message
            return {
                message: 'User not found',
                userExists: false,
            };
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const token = crypto.randomBytes(32).toString('hex');

        // Store reset token (expires in 15 minutes)
        const resetToken = this.passwordResetTokenRepository.create({
            userId: user.id,
            token: `${otp}:${token}`,
            type: ResetTokenType.PASSWORD_RESET,
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
        });

        await this.passwordResetTokenRepository.save(resetToken);

        // TODO: Send email with OTP
        // For now, log it (remove in production)
        this.logger.log(`Password reset OTP for ${email}: ${otp}`);

        return {
            message: 'If the email exists, a reset link has been sent',
            // In development, return the OTP for testing
            ...(isDevelopment && { otp, userExists: true }),
        };
    }

    async verifyResetToken(email: string, otp: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new BadRequestException('Invalid or expired reset code');
        }

        const tokenRecord = await this.passwordResetTokenRepository.findOne({
            where: {
                userId: user.id,
                isUsed: false,
                expiresAt: MoreThan(new Date()),
            },
            order: { createdAt: 'DESC' },
        });

        if (!tokenRecord) {
            throw new BadRequestException('Invalid or expired reset code');
        }

        const [storedOtp] = tokenRecord.token.split(':');

        if (storedOtp !== otp) {
            throw new BadRequestException('Invalid or expired reset code');
        }

        return {
            valid: true,
            resetToken: tokenRecord.token,
        };
    }

    async resetPassword(email: string, resetToken: string, newPassword: string) {
        const user = await this.userRepository.findOne({ where: { email } });

        if (!user) {
            throw new BadRequestException('Invalid request');
        }

        const tokenRecord = await this.passwordResetTokenRepository.findOne({
            where: {
                userId: user.id,
                token: resetToken,
                isUsed: false,
                expiresAt: MoreThan(new Date()),
            },
        });

        if (!tokenRecord) {
            throw new BadRequestException('Invalid or expired reset token');
        }

        // Update password
        const passwordHash = await bcrypt.hash(newPassword, 10);
        user.passwordHash = passwordHash;
        await this.userRepository.save(user);

        // Mark token as used
        tokenRecord.isUsed = true;
        await this.passwordResetTokenRepository.save(tokenRecord);

        // Revoke all refresh tokens (force re-login)
        await this.logoutAll(user.id);

        return { message: 'Password reset successfully' };
    }

    async validateUser(userId: string): Promise<User> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['tenant'],
        });

        if (!user || user.status !== UserStatus.ACTIVE) {
            throw new UnauthorizedException('User not found or inactive');
        }

        return user;
    }

    private generateAccessToken(user: User): string {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
        };

        return this.jwtService.sign(payload, { expiresIn: '15m' });
    }

    private async generateRefreshToken(
        userId: string,
        deviceInfo?: string,
        ipAddress?: string
    ): Promise<string> {
        const token = crypto.randomBytes(64).toString('hex');

        const refreshToken = this.refreshTokenRepository.create({
            userId,
            token,
            deviceInfo,
            ipAddress,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        });

        await this.refreshTokenRepository.save(refreshToken);

        return token;
    }

    // Keep old method for backward compatibility
    private generateToken(user: User): string {
        return this.generateAccessToken(user);
    }

    private sanitizeUser(user: User) {
        const { passwordHash, ...sanitized } = user;
        return sanitized;
    }

    private sanitizeTenant(tenant: Tenant) {
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            subscriptionTier: tenant.subscriptionTier,
            status: tenant.status,
            trialEndsAt: tenant.trialEndsAt,
        };
    }
}
