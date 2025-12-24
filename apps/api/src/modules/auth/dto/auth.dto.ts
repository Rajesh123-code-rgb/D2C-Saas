import { IsEmail, IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
    @IsString()
    @MinLength(8)
    @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
        message: 'Password must contain uppercase, lowercase, and number/special character',
    })
    password: string;

    @ApiProperty({ example: 'John' })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    firstName: string;

    @ApiProperty({ example: 'Doe' })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    lastName: string;

    @ApiProperty({ example: 'Acme Corporation' })
    @IsString()
    @MinLength(2)
    @MaxLength(100)
    companyName: string;

    @ApiProperty({ example: 'acme-corp' })
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be lowercase, alphanumeric with hyphens only',
    })
    companySlug: string;
}

export class LoginDto {
    @ApiProperty({ example: 'john.doe@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'SecureP@ss123' })
    @IsString()
    @MinLength(8)
    password: string;
}
