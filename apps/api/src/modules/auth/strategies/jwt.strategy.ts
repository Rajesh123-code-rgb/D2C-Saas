import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (request) => {
                    let token = null;
                    if (request && request.cookies) {
                        token = request.cookies['token'];
                    }
                    return token;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(), // Fallback to Authorization header
            ]),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        });
    }

    async validate(payload: any) {
        const user = await this.authService.validateUser(payload.sub);

        if (!user) {
            throw new UnauthorizedException();
        }

        return {
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role,
            user,
        };
    }
}
