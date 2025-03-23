// utils/ErrorResponse.ts - Custom Error Response Class

/**
 * Custom error class for API responses
 */
class ErrorResponse extends Error {
    statusCode: number;

    /**
     * Create an ErrorResponse
     * @param {string} message - Error message
     * @param {number} statusCode - HTTP status code
     */
    constructor(message: string, statusCode: number) {
        super(message);
        this.statusCode = statusCode;

        // Capture stack trace
        Error.captureStackTrace(this, this.constructor);
    }
}

export = ErrorResponse;
