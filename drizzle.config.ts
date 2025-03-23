// drizzle.config.ts
import type { Config } from "drizzle-kit";

export default {
    schema: "./src/models/index.ts",
    out: "./src/migrations",
    dialect: "mysql",
    dbCredentials: {
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        host: process.env.DB_HOST || "localhost",
        port: 3306,
        database: process.env.DB_NAME || "test",
    },
} satisfies Config;
