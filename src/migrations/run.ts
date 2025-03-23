// src/migrations/run.ts
import { migrate } from 'drizzle-orm/mysql2/migrator';
import path from 'path';
import { db } from '../config/db';
const logger = require('../utils/logger');

async function runMigrations() {
    logger.info('Running migrations...');

    try {
        await migrate(db, { migrationsFolder: path.join(__dirname) });
        logger.info('Migrations completed successfully');
        process.exit(0);
    } catch (error) {
        logger.error(`Error running migrations: ${error}`);
        process.exit(1);
    }
}

// Run migrations if this file is executed directly
if (require.main === module) {
    runMigrations();
}

export default runMigrations;