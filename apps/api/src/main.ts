import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    const configService = app.get(ConfigService);

    // Security middleware
    app.use(helmet());
    app.use(compression());
    app.use(cookieParser()); // Parse cookies

    // Serve static files for uploads
    app.useStaticAssets(join(process.cwd(), 'uploads'), {
        prefix: '/uploads/',
    });

    // CORS - Allow multiple origins for development
    const allowedOrigins = (configService.get('CORS_ORIGIN') || 'http://localhost:3000')
        .split(',')
        .map((origin: string) => origin.trim());

    // Add common development ports if using default
    if (allowedOrigins.includes('http://localhost:3000')) {
        allowedOrigins.push('http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003');
    }

    app.enableCors({
        origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
            // Allow requests with no origin (like mobile apps or Postman)
            if (!origin) {
                callback(null, true);
                return;
            }
            if (allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                console.log(`CORS blocked origin: ${origin}`);
                callback(null, false);
            }
        },
        credentials: true,
    });

    // Global prefix
    app.setGlobalPrefix('api/v1');

    // Validation pipe
    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
            },
        })
    );

    // Swagger documentation
    if (process.env.NODE_ENV !== 'production') {
        const config = new DocumentBuilder()
            .setTitle('OmniChannel SaaS Platform API')
            .setDescription('Enterprise Omnichannel Communication, Marketing & Automation Platform')
            .setVersion('1.0')
            .addBearerAuth()
            .addTag('auth', 'Authentication & Authorization')
            .addTag('tenants', 'Tenant Management')
            .addTag('users', 'User Management')
            .addTag('inbox', 'Unified Inbox')
            .addTag('contacts', 'CRM & Contacts')
            .addTag('whatsapp', 'WhatsApp Channel')
            .addTag('instagram', 'Instagram Channel')
            .addTag('email', 'Email Channel')
            .addTag('campaigns', 'Marketing Campaigns')
            .addTag('automation', 'Automation Engine')
            .addTag('analytics', 'Analytics & Reporting')
            .build();

        const document = SwaggerModule.createDocument(app, config);
        SwaggerModule.setup('api/docs', app, document);
    }

    const port = configService.get('API_PORT') || 3001;
    await app.listen(port);

    console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║   OmniChannel SaaS Platform API                          ║
  ║   Version: 1.0.0                                         ║
  ║                                                           ║
  ║   Server running at: http://localhost:${port}             ║
  ║   API Documentation: http://localhost:${port}/api/docs   ║
  ║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
  ║                                                           ║
  ╚═══════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
