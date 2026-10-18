import crypto from 'crypto';
import { verifyHmac, generateHmac } from '../../youpi-pg/packages/common/src/crypto';

const YOUPI_PG_API_URL = process.env.YOUPI_PG_API_URL || 'http://localhost:6100';
const YOUPI_PG_CHECKOUT_URL = process.env.YOUPI_PG_CHECKOUT_URL || 'http://localhost:7000';
const YOUPI_PG_MERCHANT_ID = process.env.YOUPI_PG_MERCHANT_ID || '';
const YOUPI_PG_WEBHOOK_SECRET = process.env.YOUPI_PG_WEBHOOK_SECRET || 'youpi_webhook_secret_2026';
const YOUPI_PG_RETURN_URL = process.env.YOUPI_PG_RETURN_URL || 'http://localhost:3000/payment-return';

/** Human-friendly guidance shown whenever the gateway process is unreachable. */
const GATEWAY_OFFLINE_HINT =
  'The YouPI-PG payment gateway is not running. Start it with "npm run pg:dev" ' +
  '(or "npm run dev" inside the youpi-pg folder) and keep it running while customers place orders.';

/**
 * Returns true when the error indicates the gateway process itself is
 * unreachable (connection refused / DNS failure), rather than a bad request.
 */
function isGatewayConnectionError(err: any): boolean {
  const cause = err?.cause;
  const code = cause?.code || err?.code;
  if (['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EHOSTUNREACH', 'ETIMEDOUT'].includes(code)) return true;
  // AggregateError (Node fetch) wraps per-address errors
  if (Array.isArray(cause?.errors) && cause.errors.some((e: any) => isGatewayConnectionError(e))) return true;
  return false;
}

interface YoupiCreatePaymentRequest {
  orderId: string;
  amount: string | number;
  currency?: string;
  returnUrl?: string;
  customer?: {
    phoneNumber: string;
    fullName?: string;
  };
  metadata?: Record<string, unknown>;
}

interface YoupiCreatePaymentResponse {
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: string;
  currency: string;
  status: string;
  checkoutUrl: string;
}

interface YoupiPaymentStatusResponse {
  paymentId: string;
  orderId: string;
  amount: string;
  currency: string;
  status: string;
  method: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

interface YoupiWebhookPayload {
  event: string;
  paymentId: string;
  orderId: string;
  amount: string;
  amountPaise: number;
  currency: string;
  method: string;
  completedAt?: string;
  metadata?: Record<string, unknown>;
}

interface PaymentResult {
  success: boolean;
  paymentId?: string;
  orderId?: string;
  status?: string;
  /** True only when the payment reached a final outcome (SUCCESS/FAILED/EXPIRED/CANCELLED). */
  isTerminal?: boolean;
  checkoutUrl?: string;
  message?: string;
}

/**
 * Creates a YouPI-PG payment session for a given order.
 * Returns the payment session details including the checkoutUrl for the iframe modal.
 */
export async function createYoupiPaymentSession(
  orderId: string,
  amount: number,
  customerInfo?: { phoneNumber?: string; fullName?: string; email?: string },
  metadata?: Record<string, unknown>
): Promise<PaymentResult> {
  try {
    const payload: YoupiCreatePaymentRequest = {
      orderId,
      amount: amount.toString(),
      currency: 'INR',
      returnUrl: YOUPI_PG_RETURN_URL,
      customer: customerInfo?.phoneNumber
        ? {
            phoneNumber: customerInfo.phoneNumber,
            fullName: customerInfo.fullName || '',
          }
        : undefined,
      metadata: {
        ...metadata,
        source: 'luxeattire-store',
        createdAt: new Date().toISOString(),
      },
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (YOUPI_PG_MERCHANT_ID) {
      headers['X-Merchant-Id'] = YOUPI_PG_MERCHANT_ID;
    }

    // Idempotency key based on orderId to prevent duplicate payments
    headers['Idempotency-Key'] = `order_${orderId}`;

    const sendCreateRequest = (hdrs: Record<string, string>) =>
      fetch(`${YOUPI_PG_API_URL}/api/v1/payments`, {
        method: 'POST',
        headers: hdrs,
        body: JSON.stringify(payload),
      });

    let response = await sendCreateRequest(headers);

    // If the configured merchant id is unknown to YouPI-PG, retry once without the
    // header so the gateway falls back to its default configured merchant.
    if (response.status === 400 && headers['X-Merchant-Id']) {
      const merchantErrorText = await response.text();
      if (/merchant/i.test(merchantErrorText)) {
        console.warn(
          `[YouPI-PG Service] Merchant "${headers['X-Merchant-Id']}" was rejected by the gateway. ` +
            'Retrying with the gateway default merchant.'
        );
        delete headers['X-Merchant-Id'];
        response = await sendCreateRequest(headers);
      } else {
        throw new Error(`YouPI-PG create payment failed [HTTP 400]: ${merchantErrorText}`);
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouPI-PG create payment failed [HTTP ${response.status}]: ${errorText}`);
    }

    const data: YoupiCreatePaymentResponse = await response.json();

    return {
      success: true,
      paymentId: data.paymentId,
      orderId: data.orderId,
      status: data.status,
      checkoutUrl: data.checkoutUrl,
      message: 'Payment session created successfully.',
    };
  } catch (err: any) {
    console.error('[YouPI-PG Service] createPaymentSession error:', err);
    if (isGatewayConnectionError(err)) {
      return {
        success: false,
        message: `Cannot reach the payment gateway at ${YOUPI_PG_API_URL}. ${GATEWAY_OFFLINE_HINT}`,
      };
    }
    return {
      success: false,
      message: err.message || 'Failed to create payment session.',
    };
  }
}

/**
 * Queries the YouPI-PG API for the current status of a payment session.
 */
export async function getYoupiPaymentStatus(paymentId: string): Promise<PaymentResult> {
  try {
    const headers: Record<string, string> = {};
    if (YOUPI_PG_MERCHANT_ID) {
      headers['X-Merchant-Id'] = YOUPI_PG_MERCHANT_ID;
    }

    const response = await fetch(`${YOUPI_PG_API_URL}/api/v1/payments/${paymentId}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`YouPI-PG get payment failed [HTTP ${response.status}]: ${errorText}`);
    }

    const data: YoupiPaymentStatusResponse = await response.json();

    const isSuccess = data.status === 'SUCCESS';
    const isTerminal = ['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(data.status);

    // The gateway answered and the session status was read successfully, even when
    // the payment is still in progress (INITIATED / QUEUED / ACTIVE / PROCESSING).
    // Callers must keep polling in that case instead of treating it as an error.
    return {
      success: true,
      isTerminal,
      paymentId: data.paymentId,
      orderId: data.orderId,
      status: data.status,
      message: isSuccess
        ? 'Payment verified successfully.'
        : isTerminal
          ? `Payment terminal status: ${data.status}`
          : `Payment status: ${data.status}`,
    };
  } catch (err: any) {
    console.error('[YouPI-PG Service] getPaymentStatus error:', err);
    if (isGatewayConnectionError(err)) {
      return {
        success: false,
        message: `Cannot reach the payment gateway at ${YOUPI_PG_API_URL}. ${GATEWAY_OFFLINE_HINT}`,
      };
    }
    return {
      success: false,
      message: err.message || 'Failed to get payment status.',
    };
  }
}

/**
 * Verifies an incoming YouPI-PG webhook HMAC-SHA256 signature.
 * Returns the parsed payload if valid, throws otherwise.
 */
export function verifyYoupiWebhook(
  rawPayload: string,
  signatureHeader: string | undefined
): YoupiWebhookPayload {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
    throw new Error('Invalid webhook signature header format. Expected sha256=...');
  }

  const actualSignature = signatureHeader.replace('sha256=', '');
  const isValid = verifyHmac(rawPayload, YOUPI_PG_WEBHOOK_SECRET, actualSignature);

  if (!isValid) {
    throw new Error('Webhook verification failed: signature mismatch.');
  }

  return JSON.parse(rawPayload) as YoupiWebhookPayload;
}

/**
 * Generates an HMAC-SHA256 signature for outgoing webhook payloads (if needed).
 */
export function generateYoupiWebhookSignature(payload: string): string {
  return `sha256=${generateHmac(payload, YOUPI_PG_WEBHOOK_SECRET)}`;
}

/**
 * Determines if a YouPI-PG payment status is terminal (final outcome).
 */
export function isYoupiTerminalStatus(status: string): boolean {
  return ['SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED'].includes(status);
}

/**
 * Maps YouPI-PG status to LuxeAttire order payment status.
 */
export function mapYoupiStatusToPaymentStatus(youpiStatus: string): 'PAID' | 'FAILED' | 'PENDING' {
  switch (youpiStatus) {
    case 'SUCCESS':
      return 'PAID';
    case 'FAILED':
    case 'EXPIRED':
    case 'CANCELLED':
      return 'FAILED';
    default:
      return 'PENDING';
  }
}

export {
  YOUPI_PG_API_URL,
  YOUPI_PG_CHECKOUT_URL,
  YOUPI_PG_MERCHANT_ID,
  YOUPI_PG_WEBHOOK_SECRET,
  YOUPI_PG_RETURN_URL,
};