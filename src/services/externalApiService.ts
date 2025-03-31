// src/services/externalApiService.ts
import axios from 'axios';
import { createId } from '@paralleldrive/cuid2';
import { eq } from 'drizzle-orm';
import { db } from '../config/db';
import { apiRequestLogs } from '../models/schemas/logs';
import ErrorResponse from '../utils/errorResponse';
import config from '../config/config';

// Configure axios instance for external API
const apiClient = axios.create({
    baseURL: config.externalApi.baseUrl,
    headers: {
        'X-API-KEY': config.externalApi.apiKey,
        'Content-Type': 'application/json'
    }
});

/**
 * Log API request to database
 */
const logApiRequest = async (companyId: string, endpoint: string, requestType: string, parameters: any, responseCode: number, responseBody: any, executionTimeMs: number) => {
    try {
        await db.insert(apiRequestLogs).values({
            id: createId(),
            companyId,
            endpoint,
            requestType,
            parameters,
            responseCode,
            responseBody,
            executionTimeMs
        });
    } catch (error) {
        console.error('Failed to log API request:', error);
    }
};

/**
 * Check challans for a vehicle registration number
 */
export const checkVehicleChallans = async (companyId: string, registrationNumber: string) => {
    const startTime = Date.now();
    const endpoint = '/challan/check';
    const parameters = { reg_number: registrationNumber, type: 1 };

    try {
        const response = await apiClient.post(endpoint, parameters);
        const executionTime = Date.now() - startTime;

        // Log the API request
        await logApiRequest(
            companyId,
            endpoint,
            'POST',
            parameters,
            response.status,
            response.data,
            executionTime
        );

        if (!response.data.success) {
            throw new ErrorResponse(`Failed to check challans: ${response.data.message}`, 400);
        }

        return response.data;
    } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorResponse = error.response?.data || { message: error.message };
        const statusCode = error.response?.status || 500;

        // Log the failed API request
        await logApiRequest(
            companyId,
            endpoint,
            'POST',
            parameters,
            statusCode,
            errorResponse,
            executionTime
        );

        throw new ErrorResponse(`Failed to check challans: ${error.message}`, statusCode);
    }
};

/**
 * Get vehicle registration certificate details
 */
export const getVehicleRcDetails = async (companyId: string, registrationNumber: string) => {
    const startTime = Date.now();
    const endpoint = '/rc/details';
    const parameters = { reg_number: registrationNumber };

    try {
        const response = await apiClient.post(endpoint, parameters);
        const executionTime = Date.now() - startTime;

        // Log the API request
        await logApiRequest(
            companyId,
            endpoint,
            'POST',
            parameters,
            response.status,
            response.data,
            executionTime
        );

        if (!response.data.success) {
            throw new ErrorResponse(`Failed to get RC details: ${response.data.message}`, 400);
        }

        return response.data;
    } catch (error) {
        const executionTime = Date.now() - startTime;
        const errorResponse = error.response?.data || { message: error.message };
        const statusCode = error.response?.status || 500;

        // Log the failed API request
        await logApiRequest(
            companyId,
            endpoint,
            'POST',
            parameters,
            statusCode,
            errorResponse,
            executionTime
        );

        throw new ErrorResponse(`Failed to get RC details: ${error.message}`, statusCode);
    }
};