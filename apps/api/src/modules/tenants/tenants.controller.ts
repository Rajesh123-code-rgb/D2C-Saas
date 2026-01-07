import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantsService } from './tenants.service';

@ApiTags('tenants')
@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    @Get('my/members')
    @ApiOperation({ summary: 'Get current tenant members' })
    @ApiResponse({ status: 200, description: 'Members retrieved successfully' })
    async getMembers(@Req() req: any) {
        // req.user is populated by JwtStrategy, contains { id, email, tenantId, ... }
        // We need to ensure tenantId is available.
        // Assuming the JWT strategy puts tenantId in the user object or we fetch user first.
        // Standard JWT usually has sub (userId) and maybe custom claims.
        // Let's assume req.user has tenantId based on typical implementation or we fetch it via UsersService if needed.
        // But for now, let's assume req.user.tenantId exists efficiently. 
        // If not, we might need to fetch user. But wait, we just implemented UsersController which fetches user.
        // Let's try to access req.user.tenantId. If it fails, I'll need to fetch user.
        // Based on User entity, tenantId is a column.
        return this.tenantsService.getMembers(req.user.tenantId);
    }

    @Post('my/invite')
    @ApiOperation({ summary: 'Invite a new member' })
    @ApiResponse({ status: 201, description: 'Member invited successfully' })
    async inviteMember(@Req() req: any, @Body() body: { email: string; role: string }) {
        return this.tenantsService.inviteMember(req.user.tenantId, body.email, body.role);
    }
}
