import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User } from '../src/modules/users/user.entity';
import { Tenant } from '../src/modules/tenants/tenant.entity';

describe('Auth Flow (e2e)', () => {
    let app: INestApplication;
    let accessToken: string;
    let refreshToken: string;
    const testEmail = `test-${Date.now()}@e2e-test.com`;
    const testPassword = 'SecureP@ss123';

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
        // Cleanup: Delete test user and tenant
        try {
            const userRepo = app.get(getRepositoryToken(User));
            const tenantRepo = app.get(getRepositoryToken(Tenant));
            const user = await userRepo.findOne({ where: { email: testEmail } });
            if (user) {
                await userRepo.delete({ email: testEmail });
                await tenantRepo.delete({ id: user.tenantId });
            }
        } catch (e) {
            // Cleanup failed, but test is complete
        }
        await app.close();
    });

    describe('Complete Auth Flow', () => {
        it('1. Should signup new user and return tokens', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    firstName: 'E2E',
                    lastName: 'Test',
                    companyName: 'E2E Test Company',
                    companySlug: `e2e-test-${Date.now()}`,
                })
                .expect(201);

            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('tenant');
            expect(response.body.user.email).toBe(testEmail);

            accessToken = response.body.accessToken;
            refreshToken = response.body.refreshToken;
        });

        it('2. Should access protected route with valid token', async () => {
            const response = await request(app.getHttpServer())
                .get('/api/v1/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);

            // Response is an array of contacts (empty for new user)
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('3. Should login with existing credentials', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword,
                })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
            expect(response.body).toHaveProperty('refreshToken');
            expect(response.body.user.email).toBe(testEmail);

            // Update tokens
            accessToken = response.body.accessToken;
            refreshToken = response.body.refreshToken;
        });

        it('4. Should refresh access token', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({ refreshToken })
                .expect(200);

            expect(response.body).toHaveProperty('accessToken');
            accessToken = response.body.accessToken;
        });

        it('5. Should access protected route with refreshed token', async () => {
            return request(app.getHttpServer())
                .get('/api/v1/contacts')
                .set('Authorization', `Bearer ${accessToken}`)
                .expect(200);
        });

        it('6. Should request password reset OTP', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/forgot-password')
                .send({ email: testEmail })
                .expect(200);

            expect(response.body).toHaveProperty('message');
            // In development mode, OTP is returned
            if (response.body.otp) {
                expect(response.body.otp).toHaveLength(6);
            }
        });

        it('7. Should logout (invalidate refresh token)', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/logout')
                .send({ refreshToken })
                .expect(200);

            // Old refresh token should now be invalid
            await request(app.getHttpServer())
                .post('/api/v1/auth/refresh')
                .send({ refreshToken })
                .expect(401);
        });

        it('8. Should login again after logout', async () => {
            const response = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: testPassword,
                })
                .expect(200);

            accessToken = response.body.accessToken;
            refreshToken = response.body.refreshToken;
        });

        it('9. Should logout from all devices', async () => {
            // First, get another refresh token by logging in again
            const login1 = await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({ email: testEmail, password: testPassword });

            const refreshToken1 = login1.body.refreshToken;
            expect(refreshToken1).toBeDefined();

            // Logout all - this revokes all refresh tokens for the user
            const logoutResponse = await request(app.getHttpServer())
                .post('/api/v1/auth/logout-all')
                .set('Authorization', `Bearer ${login1.body.accessToken}`)
                .expect(200);

            expect(logoutResponse.body).toHaveProperty('message');
        });
    });

    describe('Auth Edge Cases', () => {
        it('should reject login with wrong password', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/login')
                .send({
                    email: testEmail,
                    password: 'WrongP@ssword123',
                })
                .expect(401);
        });

        it('should reject signup with duplicate email', async () => {
            await request(app.getHttpServer())
                .post('/api/v1/auth/signup')
                .send({
                    email: testEmail,
                    password: testPassword,
                    firstName: 'Dup',
                    lastName: 'User',
                    companyName: 'Dup Company',
                    companySlug: `dup-${Date.now()}`,
                })
                .expect(409);
        });

        it('should reject expired/invalid token', async () => {
            await request(app.getHttpServer())
                .get('/api/v1/contacts')
                .set('Authorization', 'Bearer invalid.jwt.token')
                .expect(401);
        });
    });
});
