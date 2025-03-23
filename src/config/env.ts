import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Define environment variables with default values
export const ENV = {
    NODE_ENV: process.env.NODE_ENV || "development",
    PORT: Number(process.env.PORT) || 5000,
    MONGO_URI: process.env.MONGO_URI || "mongodb://localhost:27017/math_duel",
    JWT_SECRET: process.env.JWT_SECRET || "your_jwt_secret_key",
    JWT_EXPIRE: process.env.JWT_EXPIRE || "30d",
    JWT_COOKIE_EXPIRE: Number(process.env.JWT_COOKIE_EXPIRE) || 30,
    CLIENT_URL: process.env.CLIENT_URL || "http://localhost:3000",
};
