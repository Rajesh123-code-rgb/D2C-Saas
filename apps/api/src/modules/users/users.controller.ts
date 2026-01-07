import { Controller, Get, Patch, Body, UseGuards, Req, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Get('me')
    @ApiOperation({ summary: 'Get current user profile' })
    @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
    async getProfile(@Req() req: any) {
        const user = await this.usersService.findOne(req.user.id);
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            companyName: user.tenant?.name,
            companySlug: user.tenant?.slug,
            avatarUrl: user.avatarUrl,
            settings: user.settings || {},
        };
    }

    @Patch('me')
    @ApiOperation({ summary: 'Update current user profile' })
    @ApiResponse({ status: 200, description: 'Profile updated successfully' })
    async updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
        console.log('UpdateProfile payload:', JSON.stringify(body));
        try {
            const user = await this.usersService.updateProfile(req.user.id, body);
            return {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
                companyName: user.tenant?.name,
                companySlug: user.tenant?.slug,
                avatarUrl: user.avatarUrl,
                settings: user.settings,
            };
        } catch (error: any) {
            console.error('UpdateProfile Error:', error);
            throw error; // Let global filter handle it, but at least we logged it. 
            // Actually, let's rethrow as BadRequest or Internal to control message if needed.
            // But console.error is key for me to see (hopefully).
            // Since I cannot see stdout easily, I will return the error message in the response for debugging.

            const message = error.message || 'Unknown error occurred';
            throw new InternalServerErrorException(`Update failed: ${message}`);
        }
    }
}
