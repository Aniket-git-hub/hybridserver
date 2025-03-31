// server.ts - Main Server File
import cookieParser from 'cookie-parser';
import cors, { CorsOptions } from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import http from 'http';
import morgan from 'morgan';
import os from 'os';
import path from 'path';
const logger = require('./utils/logger');

// Config
require('./config/env');
// const setupSocket = require('./socket/index');
// const { setIo } = require('./utils/socketManager');
import { connectDB } from './config/db';


// Middleware
const errorHandler = require('./middlewares/errorHandler');

// Routes
import authRoutes from './routes/V1/authRoutes';

// Function to get local IP address
const getLocalIPAddress = (): string => {
    const interfaces = os.networkInterfaces();
    for (const devName in interfaces) {
        const iface = interfaces[devName];
        if (!iface) continue;

        for (let i = 0; i < iface.length; i++) {
            const alias = iface[i];
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address;
            }
        }
    }
    return '127.0.0.1'; // fallback to localhost
};

// Initialize app
const app: Express = express();
const server: http.Server = http.createServer(app);


// // Set up socket.io
// const io = setupSocket(server);
// setIo(io);

// Middleware
const corsOptions: CorsOptions = {
    origin: process.env.CORS_ORIGIN || '*', // configure this in your .env
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'public')));
}

// API Routes
app.use('/api/v1/auth', authRoutes);

// Health check route
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running',
        environment: process.env.NODE_ENV || 'development',
    });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
connectDB()
    .then(() => {
        // Server startup logic here
        // This ensures server only starts after DB connection is verified
        const PORT: number = Number(process.env.PORT) || 5000;
        const LOCAL_IP: string = getLocalIPAddress();
        const HOST = '0.0.0.0'; // Bind to all network interfaces

        // Start server
        server.listen(PORT, HOST, () => {
            logger.info(`Server running on:`);
            logger.info(`- Local:   http://localhost:${PORT}`);
            logger.info(`- Network: http://${LOCAL_IP}:${PORT} (accessible from other devices)`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

        });
    })
    .catch(err => {
        console.error('Failed to connect to database. Server not started.');
        process.exit(1);
    });


// Handle unhandled promise rejections
process.on('unhandledRejection', (err: unknown) => {
    console.error('Unhandled Rejection:', err);
    server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
    console.error('Uncaught Exception:', err);
    server.close(() => process.exit(1));
});

export default server; 