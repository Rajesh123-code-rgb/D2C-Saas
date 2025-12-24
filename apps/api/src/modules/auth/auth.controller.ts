import { Controller, Post, Body, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { IsEmail, IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

class RefreshTokenDto {
    @IsString()
    refreshToken: string;
}

class ForgotPasswordDto {
    @IsEmail()
    email: string;
}

class VerifyOtpDto {
    @IsEmail()
    email: string;

    @IsString()
    otp: string;
}

class ResetPasswordDto {
    @IsEmail()
    email: string;

    @IsString()
    resetToken: string;

    @IsString()
    @MinLength(8)
    newPassword: string;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('signup')
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 signups per minute
    @ApiOperation({ summary: 'Create new account (tenant + owner user)' })
    @ApiResponse({ status: 201, description: 'Account created successfully' })
    @ApiResponse({ status: 409, description: 'Email or slug already exists' })
    async signup(@Body() signupDto: SignupDto) {
        return this.authService.signup(signupDto);
    }

    @Post('login')
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 login attempts per minute
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Login to existing account' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto, @Req() req: Request) {
        const deviceInfo = req.headers['user-agent'] || undefined;
        const ipAddress = req.ip || req.socket?.remoteAddress || undefined;
        return this.authService.login(loginDto, deviceInfo, ipAddress);
    }

    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token using refresh token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
    async refreshToken(@Body() body: RefreshTokenDto) {
        return this.authService.refreshAccessToken(body.refreshToken);
    }

    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout and invalidate refresh token' })
    @ApiResponse({ status: 200, description: 'Logged out successfully' })
    async logout(@Body() body: RefreshTokenDto) {
        return this.authService.logout(body.refreshToken);
    }

    @Post('logout-all')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout from all devices' })
    @ApiResponse({ status: 200, description: 'Logged out from all devices' })
    async logoutAll(@Req() req: any) {
        return this.authService.logoutAll(req.user.sub);
    }

    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Request password reset OTP' })
    @ApiResponse({ status: 200, description: 'Reset email sent if account exists' })
    async forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.requestPasswordReset(body.email);
    }

    @Post('verify-otp')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify password reset OTP' })
    @ApiResponse({ status: 200, description: 'OTP verified successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
    async verifyOtp(@Body() body: VerifyOtpDto) {
        return this.authService.verifyResetToken(body.email, body.otp);
    }

    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset password with verified token' })
    @ApiResponse({ status: 200, description: 'Password reset successfully' })
    @ApiResponse({ status: 400, description: 'Invalid or expired token' })
    async resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.email, body.resetToken, body.newPassword);
    }
}
