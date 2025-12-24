const { DataSource } = require('typeorm');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_DATABASE || 'omnichannel',
});

async function updatePassword() {
    await dataSource.initialize();
    const hash = await bcrypt.hash('Admin@123', 10);
    await dataSource.query(
        'UPDATE users SET "passwordHash" = $1 WHERE email = $2',
        [hash, 'admin@omnichannel.app']
    );
    console.log('✅ Password updated for admin@omnichannel.app (Admin@123)');
    
    const demoHash = await bcrypt.hash('User@123', 10);
    await dataSource.query(
        'UPDATE users SET "passwordHash" = $1 WHERE email = $2',
        [demoHash, 'user@omnichannel.app']
    );
    console.log('✅ Password updated for user@omnichannel.app (User@123)');
    
    await dataSource.destroy();
}

updatePassword().catch(console.error);
