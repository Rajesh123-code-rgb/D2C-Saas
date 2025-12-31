import { IsEmail, IsString, MinLength, IsOptional, IsEnum } from 'class-validator';
import { SuperAdminRole } from '../entities/super-admin-user.entity';

export class SuperAdminLoginDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;
}

export class CreateSuperAdminDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(8)
    password: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsEnum(SuperAdminRole)
    @IsOptional()
    role?: SuperAdminRole;
}

export class UpdateSuperAdminDto {
    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsEnum(SuperAdminRole)
    @IsOptional()
    role?: SuperAdminRole;

    @IsString()
    @IsOptional()
    phoneNumber?: string;

    @IsString()
    @IsOptional()
    avatarUrl?: string;
}

export class ChangePasswordDto {
    @IsString()
    currentPassword: string;

    @IsString()
    @MinLength(8)
    newPassword: string;
}

export class SuperAdminResponseDto {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    fullName: string;
    role: SuperAdminRole;
    status: string;
    avatarUrl?: string;
    lastLoginAt?: Date;
    createdAt: Date;
}

export class AuthResponseDto {
    admin: SuperAdminResponseDto;
    accessToken: string;
    tokenType: string;
    expiresIn: number;
}
