import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Param,
    Body,
    Query,
    UseGuards,
    Req,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import {
    AdminUserFilterDto,
    CreateAdminUserDto,
    UpdateAdminUserDto,
    AdminUserResponseDto,
    PaginatedAdminUsersDto,
    UpdateStatusDto,
    ResetPasswordDto,
    AdminRole,
    AdminStatus,
} from '../dto/admin-user.dto';
import {
    SuperAdminUser,
    SuperAdminRole,
    SuperAdminStatus,
    DEFAULT_PERMISSIONS,
} from '../entities/super-admin-user.entity';
import { AdminAuditLog, AdminAuditAction } from '../entities/admin-audit-log.entity';

@ApiTags('Admin Users')
@Controller('admin/users')
@UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
@ApiBearerAuth()
export class AdminUsersController {
    constructor(
        @InjectRepository(SuperAdminUser)
        private readonly adminUserRepository: Repository<SuperAdminUser>,
        @InjectRepository(AdminAuditLog)
        private readonly auditLogRepository: Repository<AdminAuditLog>,
    ) { }

    @Get()
    @ApiOperation({ summary: 'Get all admin users with filters' })
    @ApiResponse({ status: 200, description: 'Paginated admin users list' })
    async getAll(
        @Query() filter: AdminUserFilterDto,
    ): Promise<PaginatedAdminUsersDto> {
        const { role, status, page = 1, limit = 10 } = filter;

        const queryBuilder = this.adminUserRepository.createQueryBuilder('admin');

        if (role) {
            // Map DTO role to entity role
            const roleMap: Record<AdminRole, SuperAdminRole> = {
                [AdminRole.PLATFORM_ADMIN]: SuperAdminRole.PLATFORM_ADMIN,
                [AdminRole.SUPPORT]: SuperAdminRole.SUPPORT,
                [AdminRole.VIEWER]: SuperAdminRole.VIEWER,
            };
            queryBuilder.andWhere('admin.role = :role', { role: roleMap[role] });
        }

        if (status) {
            // Map DTO status to entity status
            const statusMap: Record<AdminStatus, SuperAdminStatus> = {
                [AdminStatus.ACTIVE]: SuperAdminStatus.ACTIVE,
                [AdminStatus.INACTIVE]: SuperAdminStatus.INACTIVE,
                [AdminStatus.SUSPENDED]: SuperAdminStatus.SUSPENDED,
            };
            queryBuilder.andWhere('admin.status = :status', { status: statusMap[status] });
        }

        queryBuilder.orderBy('admin.createdAt', 'DESC');
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [admins, total] = await queryBuilder.getManyAndCount();

        const data: AdminUserResponseDto[] = admins.map(admin => this.toResponseDto(admin));

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get admin user by ID' })
    @ApiResponse({ status: 200, description: 'Admin user details' })
    async getById(@Param('id') id: string): Promise<AdminUserResponseDto> {
        const admin = await this.adminUserRepository.findOneOrFail({ where: { id } });
        return this.toResponseDto(admin);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new admin user' })
    @ApiResponse({ status: 201, description: 'Admin user created' })
    async create(
        @Body() dto: CreateAdminUserDto,
        @Req() req: Request,
    ): Promise<AdminUserResponseDto> {
        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Map role from DTO to entity
        const roleMap: Record<AdminRole, SuperAdminRole> = {
            [AdminRole.PLATFORM_ADMIN]: SuperAdminRole.PLATFORM_ADMIN,
            [AdminRole.SUPPORT]: SuperAdminRole.SUPPORT,
            [AdminRole.VIEWER]: SuperAdminRole.VIEWER,
        };

        const newAdmin = this.adminUserRepository.create({
            email: dto.email,
            passwordHash: hashedPassword,
            firstName: dto.firstName,
            lastName: dto.lastName,
            role: roleMap[dto.role] || SuperAdminRole.VIEWER,
            status: SuperAdminStatus.ACTIVE,
            twoFactorEnabled: false,
            permissions: DEFAULT_PERMISSIONS[roleMap[dto.role] || SuperAdminRole.VIEWER],
        });

        const savedAdmin = await this.adminUserRepository.save(newAdmin);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.CREATE, 'admin_user', savedAdmin.id, `${savedAdmin.firstName} ${savedAdmin.lastName}`, {
            newValues: { email: dto.email, role: dto.role },
            description: `Created admin user: ${dto.email}`,
        });

        return this.toResponseDto(savedAdmin);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update an admin user' })
    @ApiResponse({ status: 200, description: 'Admin user updated' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateAdminUserDto,
        @Req() req: Request,
    ): Promise<AdminUserResponseDto> {
        const admin = await this.adminUserRepository.findOneOrFail({ where: { id } });
        const previousValues: Record<string, any> = {};

        if (dto.firstName !== undefined) {
            previousValues.firstName = admin.firstName;
            admin.firstName = dto.firstName;
        }
        if (dto.lastName !== undefined) {
            previousValues.lastName = admin.lastName;
            admin.lastName = dto.lastName;
        }
        if (dto.role !== undefined) {
            previousValues.role = admin.role;
            const roleMap: Record<AdminRole, SuperAdminRole> = {
                [AdminRole.PLATFORM_ADMIN]: SuperAdminRole.PLATFORM_ADMIN,
                [AdminRole.SUPPORT]: SuperAdminRole.SUPPORT,
                [AdminRole.VIEWER]: SuperAdminRole.VIEWER,
            };
            admin.role = roleMap[dto.role] || admin.role;
            admin.permissions = DEFAULT_PERMISSIONS[admin.role];
        }

        const updatedAdmin = await this.adminUserRepository.save(admin);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.UPDATE, 'admin_user', id, `${admin.firstName} ${admin.lastName}`, {
            previousValues,
            newValues: dto,
            description: `Updated admin user: ${admin.email}`,
        });

        return this.toResponseDto(updatedAdmin);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an admin user' })
    @ApiResponse({ status: 204, description: 'Admin user deleted' })
    async delete(
        @Param('id') id: string,
        @Req() req: Request,
    ): Promise<void> {
        const admin = await this.adminUserRepository.findOneOrFail({ where: { id } });

        // Prevent deleting yourself
        if (req.admin?.id === id) {
            throw new Error('Cannot delete your own account');
        }

        await this.adminUserRepository.remove(admin);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.DELETE, 'admin_user', id, `${admin.firstName} ${admin.lastName}`, {
            previousValues: { email: admin.email, role: admin.role },
            description: `Deleted admin user: ${admin.email}`,
        });
    }

    @Post(':id/status')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update admin user status' })
    @ApiResponse({ status: 200, description: 'Status updated' })
    async updateStatus(
        @Param('id') id: string,
        @Body() dto: UpdateStatusDto,
        @Req() req: Request,
    ) {
        const admin = await this.adminUserRepository.findOneOrFail({ where: { id } });
        const previousStatus = admin.status;

        // Map DTO status to entity status
        const statusMap: Record<AdminStatus, SuperAdminStatus> = {
            [AdminStatus.ACTIVE]: SuperAdminStatus.ACTIVE,
            [AdminStatus.INACTIVE]: SuperAdminStatus.INACTIVE,
            [AdminStatus.SUSPENDED]: SuperAdminStatus.SUSPENDED,
        };

        admin.status = statusMap[dto.status] || SuperAdminStatus.ACTIVE;
        await this.adminUserRepository.save(admin);

        // Log the action
        const action = dto.status === AdminStatus.ACTIVE ? AdminAuditAction.ACTIVATE : AdminAuditAction.SUSPEND;
        await this.createAuditLog(req, action, 'admin_user', id, `${admin.firstName} ${admin.lastName}`, {
            previousValues: { status: previousStatus },
            newValues: { status: admin.status },
            description: `Updated status of admin user ${admin.email} to ${dto.status}`,
        });

        return { success: true, message: `User status updated to ${dto.status}` };
    }

    @Post(':id/reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset admin user password' })
    @ApiResponse({ status: 200, description: 'Password reset' })
    async resetPassword(
        @Param('id') id: string,
        @Body() dto: ResetPasswordDto,
        @Req() req: Request,
    ) {
        const admin = await this.adminUserRepository.findOneOrFail({ where: { id } });

        admin.passwordHash = await bcrypt.hash(dto.newPassword, 10);
        admin.mustChangePassword = true;
        await this.adminUserRepository.save(admin);

        // Log the action
        await this.createAuditLog(req, AdminAuditAction.PASSWORD_CHANGE, 'admin_user', id, `${admin.firstName} ${admin.lastName}`, {
            description: `Reset password for admin user: ${admin.email}`,
        });

        return { success: true, message: 'Password has been reset' };
    }

    private toResponseDto(admin: SuperAdminUser): AdminUserResponseDto {
        // Map entity role to DTO role
        const roleMap: Record<SuperAdminRole, AdminRole> = {
            [SuperAdminRole.PLATFORM_ADMIN]: AdminRole.PLATFORM_ADMIN,
            [SuperAdminRole.SUPPORT]: AdminRole.SUPPORT,
            [SuperAdminRole.VIEWER]: AdminRole.VIEWER,
        };

        // Map entity status to DTO status
        const statusMap: Record<SuperAdminStatus, AdminStatus> = {
            [SuperAdminStatus.ACTIVE]: AdminStatus.ACTIVE,
            [SuperAdminStatus.INACTIVE]: AdminStatus.INACTIVE,
            [SuperAdminStatus.SUSPENDED]: AdminStatus.SUSPENDED,
        };

        // Map permissions to response format
        const perms = admin.permissions || DEFAULT_PERMISSIONS[admin.role];

        return {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            role: roleMap[admin.role] || AdminRole.VIEWER,
            status: statusMap[admin.status] || AdminStatus.ACTIVE,
            lastLoginAt: admin.lastLoginAt?.toISOString(),
            twoFactorEnabled: admin.twoFactorEnabled,
            createdAt: admin.createdAt.toISOString(),
            permissions: {
                canManageTenants: perms.canManageOrganizations,
                canManageUsers: perms.canManageAdminUsers,
                canViewAnalytics: perms.canViewAuditLogs,
                canManageFeatureFlags: perms.canManageFeatureFlags,
                canIssueCredits: perms.canIssueCredits,
                canProcessRefunds: perms.canProcessRefunds,
            },
        };
    }

    private async createAuditLog(
        req: Request,
        action: AdminAuditAction,
        resourceType: string,
        resourceId: string,
        resourceName: string,
        options: {
            previousValues?: Record<string, any>;
            newValues?: Record<string, any>;
            description: string;
        },
    ) {
        const admin = req.admin!;
        const auditLog = this.auditLogRepository.create({
            adminId: admin.id,
            adminEmail: admin.email,
            adminName: `${admin.firstName} ${admin.lastName}`,
            action,
            resourceType: resourceType as any,
            resourceId,
            resourceName,
            previousValues: options.previousValues,
            newValues: options.newValues,
            description: options.description,
            ipAddress: req.ip || req.headers['x-forwarded-for']?.toString() || '',
            userAgent: req.headers['user-agent'] || '',
            success: true,
        });

        await this.auditLogRepository.save(auditLog);
    }
}
