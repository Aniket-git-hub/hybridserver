// src/services/paymentService.ts
import { createId } from '@paralleldrive/cuid2';
import crypto from 'crypto';
import { eq } from 'drizzle-orm';
import Razorpay from 'razorpay';
import config from '../config/config';
import { db } from '../config/db';
import { auditLogs } from '../models/schemas/logs';
import { paymentTransactions } from '../models/schemas/payments';
import { companySubscriptions } from '../models/schemas/subscriptions';
import { PaymentStatus, RenewalStatus, SubscriptionStatus, TransactionStatus } from '../models/types/enums';
import ErrorResponse from '../utils/errorResponse';
import { sendSubscriptionConfirmationEmail } from './emailService';

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: config.payment.razorpayKeyId,
    key_secret: config.payment.razorpayKeySecret
});

/**
 * Create a subscription payment order
 */
export const createSubscriptionOrder = async (
    companyId: string,
    planId: string,
    userId: string,
    amount: number,
    currency: string = 'INR',
    isYearly: boolean = false
) => {
    try {
        // Create Razorpay order
        const order = await razorpay.orders.create({
            amount: amount * 100, // Amount in smallest currency unit (paise for INR)
            currency,
            receipt: `sub_${createId().slice(0, 10)}`,
            notes: {
                companyId,
                planId,
                isYearly
            }
        });

        // Record the transaction
        const transactionId = createId();
        await db.insert(paymentTransactions).values({
            id: transactionId,
            companyId,
            amount,
            currency,
            paymentMethod: 'razorpay',
            transactionId: order.id,
            paymentGateway: 'razorpay',
            status: TransactionStatus.INITIATED,
            gatewayResponse: order
        });

        // Log audit
        await db.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId,
            action: 'CREATE_PAYMENT',
            entityType: 'SUBSCRIPTION',
            entityId: transactionId,
            newValues: { order, amount, currency, planId },
            ipAddress: '',
            userAgent: 'System'
        });

        return {
            orderId: order.id,
            transactionId,
            amount: order.amount / 100,
            currency: order.currency,
            receipt: order.receipt
        };
    } catch (error) {
        console.error('Razorpay order creation failed:', error);
        throw new ErrorResponse(`Failed to create payment order: ${error.message}`, 500);
    }
};

/**
 * Verify payment signature from Razorpay
 */
export const verifyPaymentSignature = (
    orderId: string,
    paymentId: string,
    signature: string
) => {
    const generatedSignature = crypto
        .createHmac('sha256', config.payment.razorpayKeySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

    return generatedSignature === signature;
};

/**
 * Process subscription payment success
 */
export const processSubscriptionPayment = async (
    companyId: string,
    userId: string,
    paymentId: string,
    orderId: string,
    signature: string
) => {
    // Verify signature
    const isValid = verifyPaymentSignature(orderId, paymentId, signature);

    if (!isValid) {
        throw new ErrorResponse('Invalid payment signature', 400);
    }

    // Find the transaction
    const transaction = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.transactionId, orderId)
    });

    if (!transaction) {
        throw new ErrorResponse('Transaction not found', 404);
    }

    // Get plan details from transaction
    const planData = transaction.gatewayResponse?.notes;

    if (!planData || !planData.planId) {
        throw new ErrorResponse('Plan information missing', 400);
    }

    // Get plan details
    const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, planData.planId)
    });

    if (!plan) {
        throw new ErrorResponse('Subscription plan not found', 404);
    }

    // Create subscription
    const startDate = new Date();
    const endDate = new Date();

    if (planData.isYearly) {
        endDate.setFullYear(endDate.getFullYear() + 1);
    } else {
        endDate.setMonth(endDate.getMonth() + 1);
    }

    const subscriptionId = createId();
    const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;

    await db.transaction(async (tx) => {
        // Create subscription
        await tx.insert(companySubscriptions).values({
            id: subscriptionId,
            companyId,
            planId: planData.planId,
            startDate,
            endDate,
            paymentStatus: PaymentStatus.PAID,
            amountPaid: transaction.amount,
            paymentMethod: 'razorpay',
            invoiceId: invoiceNumber,
            renewalStatus: RenewalStatus.MANUAL,
            status: SubscriptionStatus.ACTIVE
        });

        // Update transaction
        await tx.update(paymentTransactions)
            .set({
                status: TransactionStatus.COMPLETED,
                subscriptionId,
                invoiceNumber,
                receiptUrl: `/invoices/${invoiceNumber}`,
                updatedAt: new Date()
            })
            .where(eq(paymentTransactions.id, transaction.id));

        // Log audit
        await tx.insert(auditLogs).values({
            id: createId(),
            companyId,
            userId,
            action: 'PAYMENT_SUCCESS',
            entityType: 'SUBSCRIPTION',
            entityId: subscriptionId,
            newValues: {
                subscriptionId,
                paymentId,
                amount: transaction.amount,
                startDate,
                endDate
            },
            ipAddress: '',
            userAgent: 'System'
        });
    });

    // Get company and user details for email
    const company = await db.query.companies.findFirst({
        where: eq(companies.id, companyId)
    });

    const user = await db.query.users.findFirst({
        where: eq(users.id, userId)
    });

    // Send confirmation email
    await sendSubscriptionConfirmationEmail(
        user.email,
        user.name,
        company.name,
        plan.name,
        startDate.toLocaleDateString(),
        endDate.toLocaleDateString(),
        transaction.amount,
        invoiceNumber,
        `/invoices/${invoiceNumber}`
    );

    return {
        subscriptionId,
        invoiceNumber,
        startDate,
        endDate,
        planName: plan.name
    };
};

/**
 * Process subscription payment failure
 */
export const processPaymentFailure = async (
    transactionId: string,
    errorData: any
) => {
    const transaction = await db.query.paymentTransactions.findFirst({
        where: eq(paymentTransactions.transactionId, transactionId)
    });

    if (!transaction) {
        throw new ErrorResponse('Transaction not found', 404);
    }

    // Update transaction
    await db.update(paymentTransactions)
        .set({
            status: TransactionStatus.FAILED,
            failureReason: errorData.description || 'Payment failed',
            gatewayResponse: errorData,
            updatedAt: new Date()
        })
        .where(eq(paymentTransactions.id, transaction.id));

    return {
        transactionId: transaction.id,
        status: TransactionStatus.FAILED,
        message: errorData.description || 'Payment failed'
    };
};