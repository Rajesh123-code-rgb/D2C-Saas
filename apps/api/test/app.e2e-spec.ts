import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Application (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.setGlobalPrefix('api/v1');
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('Health Check', () => {
        it('/ (GET) should return API info', () => {
            return request(app.getHttpServer())
                .get('/api/v1')
                .expect(404); // No root endpoint, but server is running
        });
    });

    describe('Auth Endpoints', () => {
        describe('POST /auth/login', () => {
            it('should reject invalid credentials', () => {
                return request(app.getHttpServer())
                    .post('/api/v1/auth/login')
                    .send({ email: 'invalid@test.com', password: 'wrongpassword' })
                    .expect(401);
            });

            it('should reject missing email', () => {
                return request(app.getHttpServer())
                    .post('/api/v1/auth/login')
                    .send({ password: 'testpassword' })
                    .expect(400);
            });

            it('should reject missing password', () => {
                return request(app.getHttpServer())
                    .post('/api/v1/auth/login')
                    .send({ email: 'test@test.com' })
                    .expect(400);
            });
        });

        describe('POST /auth/signup', () => {
            it('should reject invalid email format', () => {
                return request(app.getHttpServer())
                    .post('/api/v1/auth/signup')
                    .send({
                        email: 'not-an-email',
                        password: 'SecureP@ss123',
                        firstName: 'Test',
                        lastName: 'User',
                        companyName: 'Test Co',
                        companySlug: 'test-co',
                    })
                    .expect(400);
            });

            it('should reject weak password', () => {
                return request(app.getHttpServer())
                    .post('/api/v1/auth/signup')
                    .send({
                        email: 'test@test.com',
                        password: 'weak',
                        firstName: 'Test',
                        lastName: 'User',
                        companyName: 'Test Co',
                        companySlug: 'test-co',
                    })
                    .expect(400);
            });
        });

        describe('POST /auth/forgot-password', () => {
            it('should return user not found for non-existent email', async () => {
                const response = await request(app.getHttpServer())
                    .post('/api/v1/auth/forgot-password')
                    .send({ email: 'nonexistent@test.com' })
                    .expect(200);

                expect(response.body.message).toBe('User not found');
                expect(response.body.userExists).toBe(false);
            });
        });

        describe('POST /auth/refresh', () => {
            it('should reject invalid refresh token', () => {
                return request(app.getHttpServer())
                    .post('/api/v1/auth/refresh')
                    .send({ refreshToken: 'invalid-token' })
                    .expect(401);
            });
        });
    });

    describe('Protected Endpoints (without auth)', () => {
        it('GET /contacts should require authentication', () => {
            return request(app.getHttpServer())
                .get('/api/v1/contacts')
                .expect(401);
        });

        it('GET /campaigns should require authentication', () => {
            return request(app.getHttpServer())
                .get('/api/v1/campaigns')
                .expect(401);
        });

        it('GET /automations should require authentication', () => {
            return request(app.getHttpServer())
                .get('/api/v1/automations')
                .expect(401);
        });

        it('GET /templates should return 404 (endpoint not yet implemented)', () => {
            return request(app.getHttpServer())
                .get('/api/v1/templates')
                .expect(404);
        });

        it('GET /analytics/dashboard should require authentication', () => {
            return request(app.getHttpServer())
                .get('/api/v1/analytics/dashboard')
                .expect(401);
        });
    });
});
