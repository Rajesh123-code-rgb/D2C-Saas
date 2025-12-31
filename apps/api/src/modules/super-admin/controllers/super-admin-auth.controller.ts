import { Controller, Post, Get, Put, Body, Req, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { SuperAdminAuthService } from '../services/super-admin-auth.service';
import { SuperAdminGuard } from '../guards/super-admin.guard';
import { SuperAdminUser } from '../entities/super-admin-user.entity';
import {
    SuperAdminLoginDto,
    ChangePasswordDto,
    AuthResponseDto,
    SuperAdminResponseDto,
} from '../dto/auth.dto';

// Extend Express Request to include admin
declare global {
    namespace Express {
        interface Request {
            admin?: SuperAdminUser;
        }
    }
}

@ApiTags('Admin Auth')
@Controller('admin/auth')
export class SuperAdminAuthController {
    constructor(private readonly authService: SuperAdminAuthService) { }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Super Admin login' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(
        @Body() loginDto: SuperAdminLoginDto,
        @Req() req: Request,
    ): Promise<AuthResponseDto> {
        const ipAddress = req.ip || req.headers['x-forwarded-for']?.toString();
        const userAgent = req.headers['user-agent'];

        return this.authService.login(loginDto, ipAddress, userAgent);
    }

    @Get('me')
    @UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current admin profile' })
    @ApiResponse({ status: 200, description: 'Admin profile' })
    async getMe(@Req() req: Request): Promise<SuperAdminResponseDto> {
        const admin = req.admin!;
        return this.authService.getAdminById(admin.id);
    }

    @Put('password')
    @UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Change password' })
    @ApiResponse({ status: 204, description: 'Password changed successfully' })
    @ApiResponse({ status: 401, description: 'Current password is incorrect' })
    async changePassword(
        @Body() changePasswordDto: ChangePasswordDto,
        @Req() req: Request,
    ): Promise<void> {
        const admin = req.admin!;
        return this.authService.changePassword(admin, changePasswordDto);
    }

    @Post('logout')
    @UseGuards(AuthGuard('super-admin-jwt'), SuperAdminGuard)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Logout and invalidate session' })
    @ApiResponse({ status: 204, description: 'Logged out successfully' })
    async logout(): Promise<void> {
        // With JWT, logout is typically handled client-side by removing the token
        // If we want server-side logout, we'd need a token blacklist in Redis
        return;
    }
}
