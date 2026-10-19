import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/storage';
import {
  requireAuth,
  optionalAuth,
  requirePermission,
  AuthenticatedRequest,
  logAuditEvent,
} from '../middleware/auth';
import { sendEmail, emailTemplates } from '../services/emailService';

const router = Router();

// Helper to generate unique order ID: ORD-2026-XXXXXXXX
function generateOrderId(): string {
  const randomSuffix = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `ORD-2026-${randomSuffix}`;
}

// POST /api/orders (Create Order)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod = 'CREDIT_CARD',
      couponCode = '',
      deliveryOption = 'STANDARD',
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required.' });
    }

    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      return res.status(400).json({ success: false, message: 'Valid shipping address is required.' });
    }

    // Normalize addresses to India (store operates across India only)
    if (!/^[1-9][0-9]{5}$/.test(String(shippingAddress.postalCode || '').trim())) {
      return res.status(400).json({ success: false, message: 'Please enter a valid 6-digit Indian PIN code.' });
    }
    shippingAddress.country = 'India';
    if (billingAddress && billingAddress.postalCode) {
      billingAddress.country = 'India';
    }

    // UPI payments must be created via /api/payments/create endpoint
    if (paymentMethod === 'UPI') {
      return res.status(400).json({
        success: false,
        message: 'UPI payments must be initialized via /api/payments/create. Use paymentMethod=COD for Cash on Delivery.',
      });
    }

    // Server-side inventory and price verification
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

    // Validate Coupon if supplied
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

          // Increment coupon used count
          await db.coupons.findByIdAndUpdate(coupon._id, {
            usedCount: (coupon.usedCount || 0) + 1,
          });
        }
      }
    }

    // Shipping fee calculation
    let shippingFee = 0;
    if (deliveryOption === 'EXPRESS') {
      shippingFee = 25.0;
    } else {
      shippingFee = (calculatedSubtotal - discountAmount) >= 200 ? 0.0 : 15.0;
    }

    // Tax calculation (estimated 8%)
    const taxableAmount = Math.max(0, calculatedSubtotal - discountAmount);
    const taxAmount = Number((taxableAmount * 0.08).toFixed(2));
    const finalTotal = Number((taxableAmount + taxAmount + shippingFee).toFixed(2));

    const orderId = generateOrderId();
    const trackingNumber = 'LX' + crypto.randomBytes(4).toString('hex').toUpperCase();

    // Deduct stock in real time
    for (const item of validatedItems) {
      const prod = await db.products.findById(item.productId);
      if (prod) {
        const remaining = Math.max(0, prod.stock - item.quantity);
        await db.products.findByIdAndUpdate(prod._id, { stock: remaining });
      }
    }

    const newOrder = await db.orders.create({
      orderId,
      customer: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      items: validatedItems,
      subtotal: Number(calculatedSubtotal.toFixed(2)),
      discount: Number(discountAmount.toFixed(2)),
      tax: taxAmount,
      shipping: shippingFee,
      total: finalTotal,
      couponCode: appliedCoupon ? appliedCoupon.code : '',
      paymentMethod,
      paymentStatus: paymentMethod === 'COD' ? 'UNPAID' : 'PENDING',
      orderStatus: 'PLACED',
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      trackingNumber,
      carrier: deliveryOption === 'EXPRESS' ? 'FedEx Priority Overnight' : 'DHL Express',
      estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      timeline: [
        {
          status: 'PLACED',
          note: paymentMethod === 'COD'
            ? 'Order placed with Cash on Delivery. Payment will be collected on delivery.'
            : 'Order placed. Payment pending confirmation.',
          timestamp: new Date().toISOString(),
          updatedBy: 'Customer Checkout',
        },
      ],
      returnRequest: { status: 'NONE' },
    });

    // Clear active cart for user
    const cart = await db.carts.findOne({ userId: user.id });
    if (cart) {
      await db.carts.findByIdAndUpdate(cart._id, { items: [] });
    }

    // In-app Notification
    const isCod = paymentMethod === 'COD';
    await db.notifications.create({
      userId: user.id,
      title: isCod ? 'Order Placed - Cash on Delivery' : 'Order Placed - Awaiting Payment',
      message: isCod
        ? `Your order ${orderId} for $${finalTotal.toFixed(2)} has been placed with Cash on Delivery. Payment will be collected on delivery.`
        : `Your order ${orderId} for $${finalTotal.toFixed(2)} has been placed. Payment is pending confirmation.`,
      type: 'ORDER',
      link: `/track-order?id=${orderId}`,
      isRead: false,
    });

    // Send confirmation email
    sendEmail({
      to: user.email,
      subject: `Order Confirmation - ${orderId}`,
      html: emailTemplates.orderConfirmation(newOrder),
      emailType: 'ORDER_CONFIRMATION',
    }).catch(e => console.error('[Order Email Error]:', e));

    await logAuditEvent(user, 'ORDER_CREATED', 'Order', newOrder._id, {
      orderId,
      total: finalTotal,
      itemCount: validatedItems.length,
    });

    return res.status(201).json({
      success: true,
      message: 'Order created successfully.',
      order: newOrder,
    });
  } catch (err: any) {
    console.error('[Create Order Error]:', err);
    return res.status(500).json({ success: false, message: 'Checkout processing failed.' });
  }
});

// GET /api/orders (Customer gets their own; Staff gets filtered catalog of orders)
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const isStaff = user.role === 'ADMIN' || user.role === 'SALES_MANAGER';
    const { status, search, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 15));

    let allOrders = await db.orders.find();

    if (!isStaff) {
      // Customer can ONLY see their own orders
      allOrders = allOrders.filter((o: any) => o.customer?.id === user.id || o.customer?.email === user.email);
    } else {
      if (status) {
        allOrders = allOrders.filter((o: any) => o.orderStatus === status);
      }
      if (search && typeof search === 'string') {
        const q = search.toLowerCase().trim();
        allOrders = allOrders.filter((o: any) => {
          return (
            o.orderId?.toLowerCase().includes(q) ||
            o.customer?.name?.toLowerCase().includes(q) ||
            o.customer?.email?.toLowerCase().includes(q) ||
            o.trackingNumber?.toLowerCase().includes(q)
          );
        });
      }
    }

    // Sort newest first
    allOrders.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

    const total = allOrders.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = allOrders.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      orders: paginated,
      pagination: {
        total,
        page: pageNum,
        totalPages,
        limit: limitNum,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve orders.' });
  }
});

// GET /api/orders/track/:orderId (Public or Customer tracking)
router.get('/track/:orderId', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const order = await db.orders.findOne({ orderId: orderId.trim() });

    if (!order) {
      return res.status(404).json({ success: false, message: 'No shipment record found for this Order ID.' });
    }

    return res.status(200).json({
      success: true,
      order: {
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        paymentStatus: order.paymentStatus,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        estimatedDelivery: order.estimatedDelivery,
        timeline: order.timeline || [],
        createdAt: order.createdAt,
        itemCount: order.items?.length || 0,
        total: order.total,
        shippingAddress: order.shippingAddress,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to track order.' });
  }
});

// GET /api/orders/:id
router.get('/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let order = await db.orders.findById(req.params.id);
    if (!order) {
      order = await db.orders.findOne({ orderId: req.params.id });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const isStaff = user.role === 'ADMIN' || user.role === 'SALES_MANAGER';
    if (!isStaff && order.customer?.id !== user.id && order.customer?.email !== user.email) {
      return res.status(403).json({ success: false, message: 'Access denied: You cannot view this order.' });
    }

    return res.status(200).json({ success: true, order });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve order details.' });
  }
});

// PATCH /api/orders/:id/status (Staff)
router.patch('/:id/status', requireAuth, requirePermission('orders.update'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { orderStatus, note, carrier, trackingNumber } = req.body;

    const order = await db.orders.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const timeline = order.timeline || [];
    timeline.push({
      status: orderStatus,
      note: note || `Order updated to ${orderStatus.replace(/_/g, ' ')}`,
      timestamp: new Date().toISOString(),
      updatedBy: req.user!.name,
    });

    const updates: any = {
      orderStatus,
      timeline,
      ...(carrier && { carrier }),
      ...(trackingNumber && { trackingNumber }),
    };

    // If cancelled, return inventory
    if (orderStatus === 'CANCELLED' && order.orderStatus !== 'CANCELLED') {
      for (const item of order.items || []) {
        const prod = await db.products.findById(item.productId);
        if (prod) {
          await db.products.findByIdAndUpdate(prod._id, { stock: prod.stock + item.quantity });
        }
      }
    }

    const updated = await db.orders.findByIdAndUpdate(id, updates);

    // Send order status email
    sendEmail({
      to: order.customer.email,
      subject: `Order Update: ${order.orderId} is now ${orderStatus.replace(/_/g, ' ')}`,
      html: emailTemplates.orderStatusUpdate(updated, orderStatus, note),
      emailType: 'ORDER_STATUS_UPDATE',
    }).catch(e => console.error('[Order Status Email Error]:', e));

    // Send in-app notification
    await db.notifications.create({
      userId: order.customer.id,
      title: 'Order Status Update',
      message: `Your order ${order.orderId} status changed to ${orderStatus.replace(/_/g, ' ')}.`,
      type: 'ORDER',
      link: `/track-order?id=${order.orderId}`,
    });

    await logAuditEvent(req.user!, 'ORDER_STATUS_UPDATED', 'Order', id, {
      orderId: order.orderId,
      oldStatus: order.orderStatus,
      newStatus: orderStatus,
    });

    return res.status(200).json({ success: true, order: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// POST /api/orders/:id/return (Customer requests return)
router.post('/:id/return', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Return reason is required.' });
    }

    const order = await db.orders.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.customer.id !== req.user!.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const updated = await db.orders.findByIdAndUpdate(id, {
      orderStatus: 'RETURN_REQUESTED',
      returnRequest: {
        reason: reason.trim(),
        status: 'REQUESTED',
        refundAmount: order.total,
        requestedAt: new Date().toISOString(),
      },
      timeline: [
        ...(order.timeline || []),
        {
          status: 'RETURN_REQUESTED',
          note: `Customer requested return: ${reason}`,
          timestamp: new Date().toISOString(),
          updatedBy: req.user!.name,
        },
      ],
    });

    return res.status(200).json({ success: true, message: 'Return request submitted.', order: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to request return.' });
  }
});

// PATCH /api/orders/:id/return-process (Staff)
router.patch('/:id/return-process', requireAuth, requirePermission('refunds.manage'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { returnStatus, resolutionNotes } = req.body;

    const order = await db.orders.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    const currentReturn = order.returnRequest || {};
    const updates: any = {
      returnRequest: {
        ...currentReturn,
        status: returnStatus,
        resolutionNotes,
        processedAt: new Date().toISOString(),
      },
    };

    if (returnStatus === 'REFUND_COMPLETED') {
      updates.paymentStatus = 'REFUNDED';
      updates.orderStatus = 'REFUNDED';

      // Restock items
      for (const item of order.items || []) {
        const prod = await db.products.findById(item.productId);
        if (prod) {
          await db.products.findByIdAndUpdate(prod._id, { stock: prod.stock + item.quantity });
        }
      }
    }

    const updated = await db.orders.findByIdAndUpdate(id, updates);

    await logAuditEvent(req.user!, 'RETURN_PROCESSED', 'Order', id, {
      orderId: order.orderId,
      returnStatus,
    });

    return res.status(200).json({ success: true, order: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to process return.' });
  }
});

export default router;
