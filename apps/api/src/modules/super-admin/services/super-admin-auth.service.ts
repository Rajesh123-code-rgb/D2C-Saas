import { Injectable, UnauthorizedException, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import {
    SuperAdminUser,
    SuperAdminRole,
    SuperAdminStatus,
    DEFAULT_PERMISSIONS,
} from '../entities/super-admin-user.entity';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';
import { SuperAdminJwtPayload } from '../guards/super-admin-jwt.strategy';
import {
    SuperAdminLoginDto,
    CreateSuperAdminDto,
    UpdateSuperAdminDto,
    ChangePasswordDto,
    SuperAdminResponseDto,
    AuthResponseDto,
} from '../dto/auth.dto';

@Injectable()
export class SuperAdminAuthService {
    constructor(
        @InjectRepository(SuperAdminUser)
        private adminUserRepository: Repository<SuperAdminUser>,
        @InjectRepository(AdminAuditLog)
        private auditLogRepository: Repository<AdminAuditLog>,
        private jwtService: JwtService,
        private configService: ConfigService,
    ) { }

    async login(
        loginDto: SuperAdminLoginDto,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<AuthResponseDto> {
        const admin = await this.adminUserRepository.findOne({
            where: { email: loginDto.email.toLowerCase() },
        });

        if (!admin) {
            await this.logFailedLogin(loginDto.email, ipAddress, userAgent);
            throw new UnauthorizedException('Invalid email or password');
        }

        if (admin.status !== SuperAdminStatus.ACTIVE) {
            throw new UnauthorizedException('Account is not active');
        }

        const isPasswordValid = await bcrypt.compare(loginDto.password, admin.passwordHash);
        if (!isPasswordValid) {
            await this.logFailedLogin(loginDto.email, ipAddress, userAgent);
            throw new UnauthorizedException('Invalid email or password');
        }

        // Update login info
        admin.lastLoginAt = new Date();
        admin.lastLoginIp = ipAddress || null;
        admin.loginCount += 1;
        await this.adminUserRepository.save(admin);

        // Generate token
        const token = this.generateToken(admin);

        // Log successful login
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.LOGIN,
            resourceType: 'admin_user',
            resourceId: admin.id,
            description: 'Super Admin logged in successfully',
            ipAddress,
            userAgent,
            success: true,
        });

        return {
            admin: this.toResponseDto(admin),
            accessToken: token,
            tokenType: 'Bearer',
            expiresIn: 86400, // 24 hours
        };
    }

    async createAdmin(
        createDto: CreateSuperAdminDto,
        createdBy?: SuperAdminUser,
    ): Promise<SuperAdminResponseDto> {
        // Check if email already exists
        const existingAdmin = await this.adminUserRepository.findOne({
            where: { email: createDto.email.toLowerCase() },
        });

        if (existingAdmin) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const passwordHash = await bcrypt.hash(createDto.password, 10);

        // Create admin user
        const admin = this.adminUserRepository.create({
            email: createDto.email.toLowerCase(),
            passwordHash,
            firstName: createDto.firstName,
            lastName: createDto.lastName,
            role: createDto.role || SuperAdminRole.SUPPORT,
            status: SuperAdminStatus.ACTIVE,
            permissions: DEFAULT_PERMISSIONS[createDto.role || SuperAdminRole.SUPPORT],
        });

        await this.adminUserRepository.save(admin);

        // Log admin creation
        if (createdBy) {
            await this.createAuditLog({
                adminId: createdBy.id,
                adminEmail: createdBy.email,
                adminName: createdBy.fullName,
                action: AdminAuditAction.CREATE,
                resourceType: 'admin_user',
                resourceId: admin.id,
                resourceName: admin.fullName,
                newValues: {
                    email: admin.email,
                    role: admin.role,
                },
                description: `Created super admin: ${admin.email}`,
                success: true,
            });
        }

        return this.toResponseDto(admin);
    }

    async updateAdmin(
        adminId: string,
        updateDto: UpdateSuperAdminDto,
        updatedBy: SuperAdminUser,
    ): Promise<SuperAdminResponseDto> {
        const admin = await this.adminUserRepository.findOne({
            where: { id: adminId },
        });

        if (!admin) {
            throw new NotFoundException('Super Admin not found');
        }

        const previousValues = {
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: admin.role,
        };

        // Update fields
        if (updateDto.firstName) admin.firstName = updateDto.firstName;
        if (updateDto.lastName) admin.lastName = updateDto.lastName;
        if (updateDto.role) {
            admin.role = updateDto.role;
            admin.permissions = DEFAULT_PERMISSIONS[updateDto.role];
        }
        if (updateDto.phoneNumber) admin.phoneNumber = updateDto.phoneNumber;
        if (updateDto.avatarUrl) admin.avatarUrl = updateDto.avatarUrl;

        await this.adminUserRepository.save(admin);

        // Log update
        await this.createAuditLog({
            adminId: updatedBy.id,
            adminEmail: updatedBy.email,
            adminName: updatedBy.fullName,
            action: AdminAuditAction.UPDATE,
            resourceType: 'admin_user',
            resourceId: admin.id,
            resourceName: admin.fullName,
            previousValues,
            newValues: updateDto,
            description: `Updated super admin: ${admin.email}`,
            success: true,
        });

        return this.toResponseDto(admin);
    }

    async changePassword(
        admin: SuperAdminUser,
        changePasswordDto: ChangePasswordDto,
    ): Promise<void> {
        // Verify current password
        const isPasswordValid = await bcrypt.compare(
            changePasswordDto.currentPassword,
            admin.passwordHash,
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Current password is incorrect');
        }

        // Hash new password
        admin.passwordHash = await bcrypt.hash(changePasswordDto.newPassword, 10);
        admin.passwordChangedAt = new Date();
        admin.mustChangePassword = false;

        await this.adminUserRepository.save(admin);

        // Log password change
        await this.createAuditLog({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: admin.fullName,
            action: AdminAuditAction.PASSWORD_CHANGE,
            resourceType: 'admin_user',
            resourceId: admin.id,
            description: 'Password changed successfully',
            success: true,
        });
    }

    async getAdminById(id: string): Promise<SuperAdminResponseDto | null> {
        const admin = await this.adminUserRepository.findOne({
            where: { id },
        });
        return admin ? this.toResponseDto(admin) : null;
    }

    async getAllAdmins(): Promise<SuperAdminResponseDto[]> {
        const admins = await this.adminUserRepository.find({
            order: { createdAt: 'DESC' },
        });
        return admins.map((admin) => this.toResponseDto(admin));
    }

    private generateToken(admin: SuperAdminUser): string {
        const payload: SuperAdminJwtPayload = {
            sub: admin.id,
            email: admin.email,
            role: admin.role,
            type: 'super_admin',
        };

        const secret = this.configService.get<string>('ADMIN_JWT_SECRET') ||
            this.configService.get<string>('JWT_SECRET') ||
            'super-admin-secret-key-dev';

        return this.jwtService.sign(payload, {
            secret,
            expiresIn: '24h',
        });
    }

    private toResponseDto(admin: SuperAdminUser): SuperAdminResponseDto {
        return {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            fullName: admin.fullName,
            role: admin.role,
            status: admin.status,
            avatarUrl: admin.avatarUrl,
            lastLoginAt: admin.lastLoginAt,
            createdAt: admin.createdAt,
        };
    }

    private async createAuditLog(data: Partial<AdminAuditLog>): Promise<void> {
        const log = this.auditLogRepository.create(data);
        await this.auditLogRepository.save(log);
    }

    private async logFailedLogin(
        email: string,
        ipAddress?: string,
        userAgent?: string,
    ): Promise<void> {
        await this.createAuditLog({
            adminEmail: email,
            action: AdminAuditAction.LOGIN,
            resourceType: 'admin_user',
            description: 'Failed login attempt',
            ipAddress,
            userAgent,
            success: false,
            errorMessage: 'Invalid credentials',
        });
    }
}
