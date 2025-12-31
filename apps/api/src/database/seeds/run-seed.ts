import { DataSource } from 'typeorm';
import { seedAuth } from './auth.seed';
import { seedSuperAdmin } from './super-admin.seed';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Database configuration
const AppDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: parseInt(process.env.DATABASE_PORT || '5432'),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'omnichannel',
    entities: ['src/**/*.entity.ts'],
    synchronize: false,
});

async function runSeeds() {
    try {
        console.log('🌱 Initializing database connection...');
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        console.log('\n🌱 Running seeds...\n');

        // Run auth seed
        await seedAuth(AppDataSource);

        // Run super admin seed
        await seedSuperAdmin(AppDataSource);

        // Run updated templates seed
        const { seedTemplates } = await import('./templates.seed');
        await seedTemplates(AppDataSource);

        console.log('\n🎉 All seeds completed successfully!');

        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('❌ Error running seeds:', error);
        process.exit(1);
    }
}

runSeeds();
