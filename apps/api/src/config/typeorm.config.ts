import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

export default new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'omnichannel',
    entities: [join(process.cwd(), 'src/modules/**/*.entity{.ts,.js}')],
    migrations: [join(process.cwd(), 'src/database/migrations/*{.ts,.js}')],
    synchronize: false, // Always false for migrations
    logging: true,
});
