// src/services/emailService.ts
import fs from 'fs';
import nodemailer from 'nodemailer';
import path from 'path';
import { ENV } from '../config/env';
import ErrorResponse from '../utils/errorResponse';
import handlebars from '../utils/handlebarsHelpers';

// Configure nodemailer
const transporter = nodemailer.createTransport({
    service: "zoho",
    host: ENV.EMAIL_HOST,
    port: ENV.EMAIL_PORT,
    secure: ENV.EMAIL_SECURE, // true for 465, false for other ports
    auth: {
        user: ENV.EMAIL_FROM,
        pass: ENV.EMAIL_PASSWORD,
    },
});

/**
 * Compile email template with Handlebars
 */
const compileTemplate = (templateName: string, data: any) => {
    try {
        const templatePath = path.join(__dirname, `../templates/emails/${templateName}.hbs`);
        const templateSource = fs.readFileSync(templatePath, 'utf8');
        const template = handlebars.compile(templateSource);
        return template(data);
    } catch (error) {
        console.error(`Error compiling template ${templateName}:`, error);
        throw new ErrorResponse(`Failed to compile email template: ${templateName}`, 500);
    }
};

/**
 * Send an email using a template
 */
export const sendTemplatedEmail = async (
    to: string,
    subject: string,
    templateName: string,
    data: any
) => {
    try {
        const html = compileTemplate(templateName, data);

        const mailOptions = {
            from: `${ENV.EMAIL_FROM_NAME} <${ENV.EMAIL_FROM}>`,
            to,
            subject,
            html,
        };

        const info = await transporter.sendMail(mailOptions);
        return info;
    } catch (error: any) {
        console.error('Error sending email:', error);
        throw new ErrorResponse(`Failed to send email: ${error.message}`, 500);
    }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (to: string, name: string, companyName: string) => {
    return sendTemplatedEmail(
        to,
        `Welcome to ${ENV.APP_NAME}`,
        'welcome',
        {
            name,
            companyName,
            appName: ENV.APP_NAME,
            loginUrl: `${ENV.FRONTEND_URL}/login`
        }
    );
};

/**
 * Send verification email
 */
export const sendVerificationEmail = async (to: string, name: string, token: string) => {
    const verificationUrl = `${ENV.FRONTEND_URL}/verify-email/${token}`;

    return sendTemplatedEmail(
        to,
        'Verify Your Email Address',
        'email-verification',
        {
            name,
            verificationUrl,
            appName: ENV.APP_NAME,
            expiresIn: '24 hours'
        }
    );
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (to: string, name: string, token: string) => {
    const resetUrl = `${ENV.FRONTEND_URL}/reset-password/${token}`;

    return sendTemplatedEmail(
        to,
        'Reset Your Password',
        'password-reset',
        {
            name,
            resetUrl,
            appName: ENV.APP_NAME,
            expiresIn: '1 hour'
        }
    );
};

/**
 * Send password changed confirmation
 */
export const sendPasswordChangedEmail = async (to: string, name: string) => {
    return sendTemplatedEmail(
        to,
        'Your Password Has Been Changed',
        'password-changed',
        {
            name,
            appName: ENV.APP_NAME,
            loginUrl: `${ENV.FRONTEND_URL}/login`,
            supportEmail: ENV.SUPPORT_EMAIL
        }
    );
};

/**
 * Send invitation email
 */
export const sendInvitationEmail = async (
    to: string,
    inviterName: string,
    companyName: string,
    role: string,
    token: string
) => {
    const invitationUrl = `${ENV.FRONTEND_URL}/accept-invitation/${token}`;

    return sendTemplatedEmail(
        to,
        `You've Been Invited to Join ${companyName} on ${ENV.APP_NAME}`,
        'invitation',
        {
            inviterName,
            companyName,
            appName: ENV.APP_NAME,
            role,
            invitationUrl,
            expiresIn: '48 hours'
        }
    );
};

/**
 * Send compliance expiry notification
 */
export const sendComplianceExpiryEmail = async (
    to: string,
    name: string,
    vehicleNumber: string,
    documentType: string,
    expiryDate: string,
    daysRemaining: number
) => {
    const dashboardUrl = `${ENV.FRONTEND_URL}/dashboard`;

    return sendTemplatedEmail(
        to,
        `Action Required: ${documentType} Expiring Soon for ${vehicleNumber}`,
        'compliance-expiry',
        {
            name,
            vehicleNumber,
            documentType,
            expiryDate,
            daysRemaining,
            dashboardUrl,
            appName: ENV.APP_NAME,
        }
    );
};

/**
 * Send challan notification
 */
export const sendChallanNotificationEmail = async (
    to: string,
    name: string,
    vehicleNumber: string,
    challanNumber: string,
    challanDate: string,
    challanAmount: number,
    offenceDetails: string
) => {
    const dashboardUrl = `${ENV.FRONTEND_URL}/challans`;

    return sendTemplatedEmail(
        to,
        `New Challan Detected for Vehicle ${vehicleNumber}`,
        'challan-notification',
        {
            name,
            vehicleNumber,
            challanNumber,
            challanDate,
            challanAmount,
            offenceDetails,
            dashboardUrl,
            appName: ENV.APP_NAME
        }
    );
};

/**
 * Send subscription confirmation email with invoice
 */
export const sendSubscriptionConfirmationEmail = async (
    to: string,
    name: string,
    companyName: string,
    planName: string,
    startDate: string,
    endDate: string,
    amount: number,
    invoiceNumber: string,
    invoiceUrl: string
) => {
    return sendTemplatedEmail(
        to,
        `Your ${planName} Subscription is Active`,
        'subscription-confirmation',
        {
            name,
            companyName,
            planName,
            startDate,
            endDate,
            amount,
            invoiceNumber,
            invoiceUrl,
            appName: ENV.APP_NAME,
            dashboardUrl: `${ENV.FRONTEND_URL}/dashboard`
        }
    );
};