import { DataSource } from 'typeorm';
import { seedAuth } from './auth.seed';

const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'omnichannel',
    entities: ['src/modules/**/*.entity.ts'],
    synchronize: false,
});

async function runSeeds() {
    try {
        console.log('📦 Connecting to database...');
        await AppDataSource.initialize();
        console.log('✅ Database connected!');

        await seedAuth(AppDataSource);

        console.log('🌱 All seeds completed successfully!');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    } finally {
        await AppDataSource.destroy();
    }
}

runSeeds();
