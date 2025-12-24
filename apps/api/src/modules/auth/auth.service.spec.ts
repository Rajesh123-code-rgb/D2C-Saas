import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { User, UserRole, UserStatus } from '../users/user.entity';
import { Tenant, TenantStatus, SubscriptionTier } from '../tenants/tenant.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { mockUser, mockTenant, mockRepository, mockJwtService } from '../../test/test-utils';
import { ConflictException, UnauthorizedException } from '@nestjs/common';

describe('AuthService', () => {
    let service: AuthService;
    let userRepository: ReturnType<typeof mockRepository>;
    let tenantRepository: ReturnType<typeof mockRepository>;
    let refreshTokenRepository: ReturnType<typeof mockRepository>;
    let passwordResetTokenRepository: ReturnType<typeof mockRepository>;
    let jwtService: ReturnType<typeof mockJwtService>;

    beforeEach(async () => {
        userRepository = mockRepository();
        tenantRepository = mockRepository();
        refreshTokenRepository = mockRepository();
        passwordResetTokenRepository = mockRepository();
        jwtService = mockJwtService();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: getRepositoryToken(User), useValue: userRepository },
                { provide: getRepositoryToken(Tenant), useValue: tenantRepository },
                { provide: getRepositoryToken(RefreshToken), useValue: refreshTokenRepository },
                { provide: getRepositoryToken(PasswordResetToken), useValue: passwordResetTokenRepository },
                { provide: JwtService, useValue: jwtService },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
    });

    describe('signup', () => {
        const signupDto = {
            email: 'newuser@example.com',
            password: 'SecureP@ss123',
            firstName: 'New',
            lastName: 'User',
            companyName: 'New Company',
            companySlug: 'new-company',
        };

        it('should create user and tenant successfully', async () => {
            tenantRepository.findOne.mockResolvedValue(null);
            userRepository.findOne.mockResolvedValue(null);
            tenantRepository.create.mockReturnValue(mockTenant({ name: signupDto.companyName }));
            tenantRepository.save.mockResolvedValue(mockTenant({ name: signupDto.companyName }));
            userRepository.create.mockReturnValue(mockUser({ email: signupDto.email }));
            userRepository.save.mockResolvedValue(mockUser({ email: signupDto.email }));
            refreshTokenRepository.create.mockReturnValue({ token: 'refresh-token' });
            refreshTokenRepository.save.mockResolvedValue({ token: 'refresh-token' });

            const result = await service.signup(signupDto);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(result).toHaveProperty('tenant');
            expect(tenantRepository.save).toHaveBeenCalled();
            expect(userRepository.save).toHaveBeenCalled();
        });

        it('should reject duplicate email', async () => {
            tenantRepository.findOne.mockResolvedValue(null);
            userRepository.findOne.mockResolvedValue(mockUser({ email: signupDto.email }));

            await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
        });

        it('should reject duplicate company slug', async () => {
            tenantRepository.findOne.mockResolvedValue(mockTenant({ slug: signupDto.companySlug }));

            await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
        });
    });

    describe('login', () => {
        const loginDto = {
            email: 'test@example.com',
            password: 'SecureP@ss123',
        };

        it('should return tokens for valid credentials', async () => {
            const hashedPassword = await bcrypt.hash(loginDto.password, 10);
            const user = mockUser({
                email: loginDto.email,
                passwordHash: hashedPassword,
                tenant: mockTenant(),
            });
            userRepository.findOne.mockResolvedValue(user);
            userRepository.save.mockResolvedValue(user);
            refreshTokenRepository.create.mockReturnValue({ token: 'refresh-token' });
            refreshTokenRepository.save.mockResolvedValue({ token: 'refresh-token' });

            const result = await service.login(loginDto);

            expect(result).toHaveProperty('accessToken');
            expect(result).toHaveProperty('refreshToken');
            expect(result).toHaveProperty('user');
            expect(result.user.email).toBe(loginDto.email);
        });

        it('should reject invalid password', async () => {
            const user = mockUser({
                email: loginDto.email,
                passwordHash: await bcrypt.hash('different-password', 10),
                tenant: mockTenant(),
            });
            userRepository.findOne.mockResolvedValue(user);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject non-existent user', async () => {
            userRepository.findOne.mockResolvedValue(null);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject inactive user', async () => {
            const user = mockUser({
                email: loginDto.email,
                passwordHash: await bcrypt.hash(loginDto.password, 10),
                status: UserStatus.INACTIVE,
                tenant: mockTenant(),
            });
            userRepository.findOne.mockResolvedValue(user);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });

        it('should reject suspended tenant', async () => {
            const hashedPassword = await bcrypt.hash(loginDto.password, 10);
            const user = mockUser({
                email: loginDto.email,
                passwordHash: hashedPassword,
                tenant: mockTenant({ status: TenantStatus.SUSPENDED }),
            });
            userRepository.findOne.mockResolvedValue(user);

            await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('refreshAccessToken', () => {
        it('should return new access token for valid refresh token', async () => {
            const user = mockUser({ tenant: mockTenant() });
            refreshTokenRepository.findOne.mockResolvedValue({
                token: 'valid-refresh-token',
                user,
                isRevoked: false,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            });

            const result = await service.refreshAccessToken('valid-refresh-token');

            expect(result).toHaveProperty('accessToken');
            expect(jwtService.sign).toHaveBeenCalled();
        });

        it('should reject invalid refresh token', async () => {
            refreshTokenRepository.findOne.mockResolvedValue(null);

            await expect(service.refreshAccessToken('invalid-token')).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('requestPasswordReset', () => {
        it('should generate OTP for existing user', async () => {
            const user = mockUser();
            userRepository.findOne.mockResolvedValue(user);
            passwordResetTokenRepository.create.mockReturnValue({ token: '123456:token' });
            passwordResetTokenRepository.save.mockResolvedValue({ token: '123456:token' });

            const result = await service.requestPasswordReset(user.email);

            expect(result).toHaveProperty('message');
            expect(passwordResetTokenRepository.save).toHaveBeenCalled();
        });

        it('should return user not found for invalid email', async () => {
            userRepository.findOne.mockResolvedValue(null);

            const result = await service.requestPasswordReset('nonexistent@example.com');

            expect(result.message).toBe('User not found');
            expect(result.userExists).toBe(false);
        });
    });

    describe('logout', () => {
        it('should revoke refresh token', async () => {
            refreshTokenRepository.update.mockResolvedValue({ affected: 1 });

            const result = await service.logout('refresh-token');

            expect(result.message).toBe('Logged out successfully');
            expect(refreshTokenRepository.update).toHaveBeenCalledWith(
                { token: 'refresh-token' },
                { isRevoked: true }
            );
        });
    });

    describe('logoutAll', () => {
        it('should revoke all refresh tokens for user', async () => {
            refreshTokenRepository.update.mockResolvedValue({ affected: 3 });

            const result = await service.logoutAll('user-id');

            expect(result.message).toBe('Logged out from all devices');
            expect(refreshTokenRepository.update).toHaveBeenCalledWith(
                { userId: 'user-id', isRevoked: false },
                { isRevoked: true }
            );
        });
    });
});
