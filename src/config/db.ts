// config/db.ts
import dotenv from "dotenv";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
const logger = require('../utils/logger');


dotenv.config();

// Database connection pool settings
const poolConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

// Create the connection pool
const pool = mysql.createPool(poolConfig);

// Create the Drizzle ORM instance
export const db = drizzle(pool);

/**
 * Tests the database connection
 */
export const connectDB = async () => {
    try {
        // Test the connection by executing a simple query
        const [result] = await pool.execute('SELECT 1 as connection_test');

        logger.info(`MySQL Connected: ${process.env.DB_HOST}/${process.env.DB_NAME}`);
        return true;
    } catch (error: any) {
        logger.error(`Error connecting to MySQL: ${error.message}`);
        throw error;
    }
};

/**
 * Closes the database connection pool
 */
export const closeDB = async () => {
    try {
        await pool.end();
        logger.info('MySQL connection pool closed');
    } catch (error: any) {
        logger.error(`Error closing MySQL connection pool: ${error.message}`);
        throw error;
    }
};