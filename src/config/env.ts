import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Define environment variables with default values
export const ENV = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: Number(process.env.PORT) || 5000,

    // Database Config
    MONGO_URI: process.env.MONGO_URI || "",
    DB_HOST: process.env.DB_HOST || "localhost",
    DB_USER: process.env.DB_USER || "your_db_user",
    DB_PASSWORD: process.env.DB_PASSWORD || "your_password",
    DB_NAME: process.env.DB_NAME || "your_database",

    // Authentication & Security
    JWT_SECRET: process.env.JWT_SECRET || "your_jwt_secret_key",
    JWT_EXPIRE: process.env.JWT_EXPIRE || "30d",
    JWT_COOKIE_EXPIRE: Number(process.env.JWT_COOKIE_EXPIRE) || 30,

    // API & External Integrations
    EXTERNAL_API_URL: process.env.EXTERNAL_API_URL || "https://api.example.com",
    EXTERNAL_API_KEY: process.env.EXTERNAL_API_KEY || "your_api_key_here",

    // Payment Gateway
    RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "",
    RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET || "",
    RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET || "",

    // Scheduler Configurations
    ENABLE_SCHEDULERS: process.env.ENABLE_SCHEDULERS === "true",
    CHALLAN_CHECK_INTERVAL: Number(process.env.CHALLAN_CHECK_INTERVAL) || 0,
    COMPLIANCE_CHECK_INTERVAL: Number(process.env.COMPLIANCE_CHECK_INTERVAL) || 0,
    SUBSCRIPTION_CHECK_INTERVAL: Number(process.env.SUBSCRIPTION_CHECK_INTERVAL) || 0,

    // General Config
    APP_NAME: process.env.APP_NAME || "MyApp",
    FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:3000",
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "support@example.com",

    // Email Config
    EMAIL_HOST: process.env.EMAIL_HOST || "",
    EMAIL_PORT: Number(process.env.EMAIL_PORT) || 587,
    EMAIL_SECURE: process.env.EMAIL_SECURE === "true",
    EMAIL_USER: process.env.EMAIL_USER || "",
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || "",
    EMAIL_FROM: process.env.EMAIL_FROM || "noreply@example.com",
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || "Support",

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || "INFO",
};
