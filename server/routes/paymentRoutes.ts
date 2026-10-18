import { Router, Request, Response } from 'express';
import { db } from '../db/storage';
import { requireAuth, AuthenticatedRequest, logAuditEvent } from '../middleware/auth';
import {
  createYoupiPaymentSession,
  getYoupiPaymentStatus,
  verifyYoupiWebhook,
  mapYoupiStatusToPaymentStatus,
} from '../services/paymentService';

const router = Router();

/**
 * POST /api/payments/create
 * Creates a YouPI-PG payment session and initializes an order with PENDING payment status.
 */
router.post('/create', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      items,
      shippingAddress,
      billingAddress,
      couponCode = '',
      deliveryOption = 'STANDARD',
      customerInfo,
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required.' });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      return res.status(400).json({ success: false, message: 'Valid shipping address is required.' });
    }

    // ---- Server-side price validation (never trust frontend amounts) ----
    let calculatedSubtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = await db.products.findById(item.productId);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product ${item.name || item.productId} no longer exists.`,
        });
      }

      if (product.status !== 'PUBLISHED') {
        return res.status(400).json({
          success: false,
          message: `Product ${product.name} is currently unavailable for order.`,
        });
      }

      const qty = parseInt(item.quantity, 10) || 1;
      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Only ${product.stock} left in stock.`,
        });
      }

      const itemUnitPrice = product.salePrice || product.price;
      const lineSubtotal = Number((itemUnitPrice * qty).toFixed(2));
      calculatedSubtotal += lineSubtotal;

      validatedItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku,
        image: product.images?.[0] || '',
        size: item.size || 'M',
        color: item.color || 'Default',
        quantity: qty,
        price: itemUnitPrice,
        subtotal: lineSubtotal,
      });
    }

    // Validate coupon if supplied
    let discountAmount = 0;
    let appliedCoupon = null;
    if (couponCode && couponCode.trim().length > 0) {
      const codeUpper = couponCode.trim().toUpperCase();
      const coupon = await db.coupons.findOne({ code: codeUpper, isActive: true });

      if (coupon) {
        const isNotExpired = !coupon.expiryDate || new Date(coupon.expiryDate).getTime() > Date.now();
        const meetsMin = !coupon.minPurchase || calculatedSubtotal >= coupon.minPurchase;
        const withinLimit = !coupon.usageLimit || (coupon.usedCount || 0) < coupon.usageLimit;

        if (isNotExpired && meetsMin && withinLimit) {
          if (coupon.discountType === 'PERCENTAGE') {
            discountAmount = (calculatedSubtotal * coupon.discountValue) / 100;
            if (coupon.maxDiscount && discountAmount > coupon.maxDiscount) {
              discountAmount = coupon.maxDiscount;
            }
          } else {
            discountAmount = coupon.discountValue;
          }
          discountAmount = Math.min(discountAmount, calculatedSubtotal);
          appliedCoupon = coupon;

          await db.coupons.findByIdAndUpdate(coupon._id, {
            usedCount: (coupon.usedCount || 0) + 1,
          });
        }
      }
    }

    // Shipping fee
    let shippingFee = 0;
    if (deliveryOption === 'EXPRESS') {
      shippingFee = 25.0;
    } else {
      shippingFee = (calculatedSubtotal - discountAmount) >= 200 ? 0.0 : 15.0;
    }

    // Tax (8%)
    const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.08).toFixed(2));
    const finalTotal = Number((taxableAmount + taxAmount + shippingFee).toFixed(2));

    if (finalTotal <= 0) {
      return res.status(400).json({ success: false, message: 'Order total must be greater than zero.' });
    }

    // Deduct stock in real time
    for (const item of validatedItems) {
      const prod = await db.products.findById(item.productId);
      if (prod) {
        const remaining = Math.max(0, prod.stock - item.quantity);
        await db.products.findByIdAndUpdate(prod._id, { stock: remaining });
      }
    }

    // Generate order ID
    const crypto = await import('crypto');
    const orderId = `ORD-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const trackingNumber = 'LX' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Create order with PENDING payment status — not yet paid
    const newOrder = await db.orders.create({
      orderId,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
      items: validatedItems,
      subtotal: Number(calculatedSubtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      tax: taxAmount,
      shipping: shippingFee,
      total: finalTotal,
      couponCode: appliedCoupon ? appliedCoupon.code : '',
      paymentMethod: 'UPI',
      paymentStatus: 'PENDING',
      orderStatus: 'PLACED',
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      trackingNumber,
      carrier: deliveryOption === 'EXPRESS' ? 'FedEx Priority Overnight' : 'DHL Express',
      estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      timeline: [
        {
          status: 'PLACED',
          note: 'Order placed. Awaiting payment confirmation via YouPI-PG.',
          timestamp: new Date().toISOString(),
          updatedBy: 'Customer Checkout',
        },
      ],
      returnRequest: { status: 'NONE' },
    });

    // Create YouPI-PG payment session
    const paymentResult = await createYoupiPaymentSession(
      orderId,
      Math.round(finalTotal * 100),
      {
        phoneNumber: user.phone || '',
        fullName: user.name,
        email: user.email,
      },
      {
        orderId: newOrder._id,
        userId: user.id,
        shippingAddress,
        billingAddress,
      }
    );

    if (!paymentResult.success) {
      // Payment session creation failed — mark order as failed and restore stock
      await db.orders.findByIdAndUpdate(newOrder._id, {
        paymentStatus: 'FAILED',
        orderStatus: 'CANCELLED',
        timeline: [
          ...(newOrder.timeline || []),
          {
            status: 'CANCELLED',
            note: `Payment session creation failed: ${paymentResult.message}`,
            timestamp: new Date().toISOString(),
            updatedBy: 'System',
          },
        ],
      });

      // Restore stock
      for (const item of validatedItems) {
        const prod = await db.products.findById(item.productId);
        if (prod) {
          await db.products.findByIdAndUpdate(prod._id, { stock: prod.stock + item.quantity });
        }
      }

      return res.status(500).json({
        success: false,
        message: paymentResult.message || 'Failed to initialize payment session.',
      });
    }

    // In-app notification
    await db.notifications.create({
      userId: user.id,
      title: 'Order Placed - Awaiting Payment',
      message: `Your order ${orderId} for $${finalTotal.toFixed(2)} has been placed. Please complete payment via YouPI-PG.`,
      type: 'ORDER',
      link: `/track-order?id=${orderId}`,
      isRead: false,
    });

    await logAuditEvent(user, 'ORDER_CREATED_PENDING_PAYMENT', 'Order', newOrder._id, {
      orderId,
      paymentId: paymentResult.paymentId,
      total: finalTotal,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created. Please complete payment to confirm.',
      order: newOrder,
      paymentId: paymentResult.paymentId,
      checkoutUrl: paymentResult.checkoutUrl,
      amount: finalTotal,
    });
  } catch (err: any) {
    console.error('[Payment Routes] create error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
  }
});

/**
 * GET /api/payments/status/:paymentId
 * Queries YouPI-PG for the current status of a payment session.
 */
router.get('/status/:paymentId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { paymentId } = req.params;
    const user = req.user!;

    const statusResult = await getYoupiPaymentStatus(paymentId);
    if (!statusResult.success) {
      return res.status(500).json({ success: false, message: statusResult.message });
    }

    return res.status(200).json({
      success: true,
      paymentId: statusResult.paymentId,
      orderId: statusResult.orderId,
      status: statusResult.status,
      isTerminal: statusResult.isTerminal ?? false,
      message: statusResult.message,
    });
  } catch (err: any) {
    console.error('[Payment Routes] status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to get payment status.' });
  }
});

/**
 * POST /api/payments/webhook
 * Receives HMAC-signed webhook notifications from YouPI-PG.
 * Updates order payment status based on verified payment outcome.
 * Idempotent: skips processing if order already in terminal payment state.
 */
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    // Read raw body for HMAC verification
    let rawBody = '';
    req.on('data', (chunk) => { rawBody += chunk; });
    await new Promise<void>((resolve, reject) => {
      req.on('end', resolve);
      req.on('error', reject);
    });

    const signatureHeader = req.headers['x-gateway-signature'] as string | undefined;

    let webhookPayload;
    try {
      webhookPayload = verifyYoupiWebhook(rawBody, signatureHeader);
    } catch (err: any) {
      console.error('[Webhook] Signature verification failed:', err.message);
      return res.status(401).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const { event, paymentId, orderId, amount, amountPaise, currency, method, completedAt, metadata } = webhookPayload;

    // Find order by orderId
    const order = await db.orders.findOne({ orderId });
    if (!order) {
      console.error(`[Webhook] Order not found: ${orderId}`);
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Idempotency: skip if already in terminal payment state
    const currentPaymentStatus = order.paymentStatus;
    if (currentPaymentStatus === 'PAID' || currentPaymentStatus === 'FAILED') {
      console.log(`[Webhook] Order ${orderId} already in terminal state: ${currentPaymentStatus}`);
      return res.status(200).json({ success: true, message: 'Order already processed.' });
    }

    // Map YouPI event to payment status
    const newPaymentStatus = mapYoupiStatusToPaymentStatus(event);
    const isSuccess = event === 'SUCCESS';

    // Build timeline note
    const timelineNote = isSuccess
      ? `Payment confirmed via YouPI-PG (${method}). Amount: ${amount} ${currency}.`
      : `Payment ${event.toLowerCase()} via YouPI-PG (${method}).`;

    const updatedOrder = await db.orders.findByIdAndUpdate(order._id, {
      paymentStatus: newPaymentStatus,
      orderStatus: isSuccess ? 'PAYMENT_CONFIRMED' : 'CANCELLED',
      timeline: [
        ...(order.timeline || []),
        {
          status: isSuccess ? 'PAYMENT_CONFIRMED' : 'CANCELLED',
          note: timelineNote,
          timestamp: completedAt || new Date().toISOString(),
          updatedBy: 'YouPI-PG Webhook',
        },
      ],
      ...(isSuccess ? { paidAt: new Date().toISOString() } : {}),
    });

    console.log(`[Webhook] Order ${orderId} payment status updated to ${newPaymentStatus}`);

    return res.status(200).json({
      success: true,
      message: `Payment webhook processed: ${event}`,
      orderId,
      paymentStatus: newPaymentStatus,
    });
  } catch (err: any) {
    console.error('[Payment Routes] webhook error:', err);
    return res.status(500).json({ success: false, message: 'Webhook processing failed.' });
  }
});

export default router;