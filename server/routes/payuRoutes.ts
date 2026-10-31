import { Router, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/storage';
import { requireAuth, requirePermission, AuthenticatedRequest, logAuditEvent } from '../middleware/auth';
import { sendEmail, emailTemplates } from '../services/emailService';
import {
  getPayuConfig, isPayuConfigured, payuPaymentUrl,
  formatPayuAmount, generatePayuRequestHash, verifyPayuResponseHash,
  verifyPaymentWithPayu, generatePayuCommandHash, payuVerifyUrl, safePayuLog,
} from '../services/payuService';

const router = Router();

function generateOrderId(): string {
  return `ORD-2026-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

/** Simple in-memory rate limiter for payment initiation (per user, 15 req / 10 min). */
const rl = new Map<string, number[]>();
function payuRateLimit(req: AuthenticatedRequest, res: Response, next: any) {
  const key = req.user?.id || req.ip || 'anon';
  const now = Date.now();
  const arr = (rl.get(key) || []).filter(t => now - t < 10 * 60 * 1000);
  if (arr.length >= 15) {
    return res.status(429).json({ success: false, message: 'Too many payment attempts. Please wait a few minutes.' });
  }
  arr.push(now);
  rl.set(key, arr);
  next();
}

function sanitizePhone(raw: any): string {
  const d = String(raw || '').replace(/\D/g, '');
  const m = d.length > 10 ? d.slice(-10) : d;
  return /^[6-9]\d{9}$/.test(m) ? m : '9999999999';
}

function firstNameOf(full: string): string {
  const t = String(full || '').trim().split(/\s+/)[0] || 'Customer';
  return t.slice(0, 60);
}

/** POST /api/payu/create — validate cart, create PENDING order, return PayU fields. */
router.post('/create', requireAuth, payuRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isPayuConfigured()) {
      return res.status(503).json({ success: false, code: 'PAYU_NOT_CONFIGURED', message: 'Online payments are not enabled yet. Use Cash on Delivery.' });
    }
    const cfg = getPayuConfig();
    const { items, shippingAddress, billingAddress, couponCode = '', deliveryOption = 'STANDARD', phone } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order items are required.' });
    }
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city) {
      return res.status(400).json({ success: false, message: 'Valid shipping address is required.' });
    }
    if (!/^[1-9][0-9]{5}$/.test(String(shippingAddress.postalCode || '').trim())) {
      return res.status(400).json({ success: false, message: 'Enter a valid 6-digit Indian PIN code.' });
    }
    shippingAddress.country = 'India';

    let sub = 0;
    const vItems: any[] = [];
    for (const item of items) {
      const product = await db.products.findById(item.productId);
      if (!product) return res.status(400).json({ success: false, message: 'A product no longer exists.' });
      if (product.status !== 'PUBLISHED') return res.status(400).json({ success: false, message: `${product.name} is unavailable.` });
      const qty = Math.max(1, Math.min(10, parseInt(item.quantity, 10) || 1));
      if (product.stock < qty) return res.status(400).json({ success: false, message: `Only ${product.stock} left of "${product.name}".` });
      const unit = product.salePrice ?? product.price;
      const line = Number((unit * qty).toFixed(2));
      sub += line;
      vItems.push({ productId: product._id, name: product.name, sku: product.sku, image: product.images?.[0] || '', size: item.size || 'M', color: item.color || 'Default', quantity: qty, price: unit, subtotal: line });
    }

    let disc = 0;
    let coupon: any = null;
    if (couponCode && String(couponCode).trim()) {
      const c = await db.coupons.findOne({ code: String(couponCode).trim().toUpperCase(), isActive: true });
      if (c) {
        const ok = (!c.expiryDate || new Date(c.expiryDate).getTime() > Date.now())
          && (!c.minPurchase || sub >= c.minPurchase)
          && (!c.usageLimit || (c.usedCount || 0) < c.usageLimit);
        if (ok) {
          disc = c.discountType === 'PERCENTAGE' ? (sub * c.discountValue) / 100 : c.discountValue;
          if (c.maxDiscount && disc > c.maxDiscount) disc = c.maxDiscount;
          disc = Math.min(disc, sub);
          coupon = c;
        }
      }
    }
    const ship = deliveryOption === 'EXPRESS' ? 25.0 : ((sub - disc) >= 200 ? 0.0 : 15.0);
    const tax = Number((Math.max(0, sub - disc) * 0.08).toFixed(2));
    const total = Number((Math.max(0, sub - disc) + tax + ship).toFixed(2));
    if (total < 1) return res.status(400).json({ success: false, message: 'Total must be at least Rs.1 for online payment.' });

    const cartSig = crypto.createHash('sha256').update(JSON.stringify(vItems.map(i => [i.productId, i.quantity, i.size]))).digest('hex');
    const recent = await db.orders.find({ 'customer.id': user.id, paymentMethod: 'PAYU', paymentStatus: 'PENDING' });
    const dupe = (recent || []).find((o: any) => o.payu?.cartSig === cartSig && o.total === total && (Date.now() - new Date(o.createdAt || 0).getTime()) < 10 * 60 * 1000);
    if (dupe) {
      const f = buildPayuForm(dupe, cfg);
      return res.status(200).json({ success: true, reused: true, order: dupe, payuUrl: payuPaymentUrl(), payuFields: f.fields });
    }

    const orderId = generateOrderId();
    const txnid = `TXN${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const newOrder = await db.orders.create({
      orderId,
      customer: { id: user.id, name: user.name, email: user.email, phone: sanitizePhone(phone || (user as any).phone) },
      items: vItems,
      subtotal: Number(sub.toFixed(2)), discount: Number(disc.toFixed(2)), tax, shipping: ship, total,
      couponCode: coupon ? coupon.code : '',
      paymentMethod: 'PAYU', paymentStatus: 'PENDING', orderStatus: 'PLACED',
      shippingAddress, billingAddress: billingAddress || shippingAddress,
      trackingNumber: 'LX' + crypto.randomBytes(4).toString('hex').toUpperCase(),
      carrier: deliveryOption === 'EXPRESS' ? 'FedEx Priority Overnight' : 'DHL Express',
      estimatedDelivery: new Date(Date.now() + 4 * 86400000).toLocaleDateString(),
      payu: { txnid, cartSig, env: cfg.env, amount: formatPayuAmount(total), status: 'INITIATED', surl: `${cfg.backendUrl}/api/payu/callback`, furl: `${cfg.backendUrl}/api/payu/callback`, initiatedAt: new Date().toISOString(), attempts: 1 },
      timeline: [{ status: 'PLACED', note: `PayU payment initiated (TXN ${txnid}) for Rs.${formatPayuAmount(total)}. Awaiting payment.`, timestamp: new Date().toISOString(), updatedBy: 'PayU Checkout' }],
      returnRequest: { status: 'NONE' },
    });
    if (coupon) await db.coupons.findByIdAndUpdate(coupon._id, { usedCount: (coupon.usedCount || 0) + 1 });
    const form = buildPayuForm(newOrder, cfg);
    await logAuditEvent(user, 'PAYU_INITIATED', 'Order', newOrder._id, { orderId, txnid, total, env: cfg.env });
    console.log('[PayU] Initiated', JSON.stringify(safePayuLog({ orderId, txnid, env: cfg.env })));
    return res.status(201).json({ success: true, order: newOrder, payuUrl: payuPaymentUrl(), payuFields: form.fields });
  } catch (e: any) {
    console.error('[PayU Create Error]:', e?.message);
    return res.status(500).json({ success: false, message: 'Failed to initiate PayU payment.' });
  }
});

function buildPayuForm(order: any, cfg: ReturnType<typeof getPayuConfig>) {
  const txnid = order.payu?.txnid;
  const amountStr = formatPayuAmount(order.total);
  const productinfo = `LuxeAttire Order ${order.orderId}`.slice(0, 100);
  const firstname = firstNameOf(order.customer?.name);
  const email = String(order.customer?.email || '').slice(0, 100);
  const phone = sanitizePhone(order.customer?.phone);
  const surl = `${cfg.backendUrl}/api/payu/callback`;
  const furl = `${cfg.backendUrl}/api/payu/callback`;
  const udf1 = String(order.orderId || '').slice(0, 100);
  const udf2 = String(order.customer?.id || '').slice(0, 100);
  const hash = generatePayuRequestHash({
    key: cfg.merchantKey, txnid, amount: amountStr,
    productinfo, firstname, email, udf1, udf2, salt: cfg.merchantSalt,
  });
  const fields: Record<string, string> = {
    key: cfg.merchantKey, txnid, amount: amountStr, productinfo,
    firstname, email, phone, surl, furl, hash, udf1, udf2,
    service_provider: 'payu_paisa',
  };
  return { fields };
}

/** Find order by txnid or udf1(orderId). */
async function findOrderByTxn(resp: Record<string, any>) {
  const txnid = String(resp.txnid || '');
  const udf1 = String(resp.udf1 || '');
  let order: any = null;
  if (txnid) {
    const list = await db.orders.find({ 'payu.txnid': txnid });
    order = list?.[0] || null;
  }
  if (!order && udf1) order = await db.orders.findOne({ orderId: udf1 });
  return order;
}

async function markPaid(order: any, resp: Record<string, any>, verifiedVia: string) {
  if (order.paymentStatus === 'PAID') return order; // idempotent
  const mihpayid = String(resp.mihpayid || resp.payuMoneyId || '');
  const mode = String(resp.mode || resp.pg_type || 'PAYU');
  const payuUpdate = {
    ...(order.payu || {}),
    status: 'SUCCESS', mihpayid, mode,
    bankRef: String(resp.bank_ref_num || resp.bankRefNum || ''),
    verifiedVia, verifiedAt: new Date().toISOString(),
    lastResponse: safePayuLog(resp),
  };
  const timeline = [...(order.timeline || []), {
    status: 'PAYMENT_CONFIRMED',
    note: `PayU payment verified (${verifiedVia}). TXN ${order.payu?.txnid}, PayU ID ${mihpayid}, Rs.${formatPayuAmount(order.total)}.`,
    timestamp: new Date().toISOString(), updatedBy: 'PayU Verify',
  }];
  const updated = await db.orders.findByIdAndUpdate(order._id, {
    paymentStatus: 'PAID', orderStatus: 'PAYMENT_CONFIRMED', payu: payuUpdate, timeline,
  });
  // Decrement stock only on first confirmed payment
  for (const item of order.items || []) {
    const prod = await db.products.findById(item.productId);
    if (prod) await db.products.findByIdAndUpdate(prod._id, { stock: Math.max(0, prod.stock - item.quantity) });
  }
  const cart = await db.carts.findOne({ userId: order.customer?.id });
  if (cart) await db.carts.findByIdAndUpdate(cart._id, { items: [] });
  await db.notifications.create({
    userId: order.customer?.id, title: 'Payment Confirmed',
    message: `Your payment of Rs.${formatPayuAmount(order.total)} for order ${order.orderId} is confirmed.`,
    type: 'ORDER', link: `/track-order?id=${order.orderId}`, isRead: false,
  }).catch(() => null);
  sendEmail({ to: order.customer?.email, subject: `Payment Confirmed - ${order.orderId}`, html: emailTemplates.orderConfirmation(updated || order), emailType: 'ORDER_CONFIRMATION' }).catch((e: any) => console.error('[PayU Email]:', e?.message));
  return updated || order;
}

async function markFailed(order: any, resp: Record<string, any>, reason: string) {
  if (order.paymentStatus === 'PAID') return order; // never downgrade a paid order
  if (order.paymentStatus === 'FAILED' && order.payu?.status === 'FAILED') return order;
  const payuUpdate = { ...(order.payu || {}), status: 'FAILED', failReason: reason.slice(0, 300), verifiedAt: new Date().toISOString(), lastResponse: safePayuLog(resp) };
  const timeline = [...(order.timeline || []), { status: 'PLACED', note: `PayU payment failed/cancelled: ${reason}.`, timestamp: new Date().toISOString(), updatedBy: 'PayU Callback' }];
  return (await db.orders.findByIdAndUpdate(order._id, { paymentStatus: 'FAILED', payu: payuUpdate, timeline })) || order;
}

/**
 * POST /api/payu/callback — PayU surl/furl POST (application/x-www-form-urlencoded).
 * Verifies reverse hash + server-side verify_payment before marking PAID.
 * Then redirects the browser to the frontend result page.
 */
router.post('/callback', async (req: any, res: Response) => {
  const cfg = getPayuConfig();
  try {
    const resp: Record<string, any> = { ...(req.body || {}) };
    console.log('[PayU] Callback', JSON.stringify(safePayuLog({ txnid: resp.txnid, status: resp.status, mihpayid: resp.mihpayid, amount: resp.amount })));
    const order = await findOrderByTxn(resp);
    const fe = cfg.frontendUrl;
    if (!order) {
      return res.redirect(302, `${fe}/payment/failed?reason=unknown_order`);
    }
    // 1. Reverse-hash validation
    const hashOk = verifyPayuResponseHash(resp, cfg.merchantSalt, cfg.merchantKey);
    if (!hashOk) {
      await markFailed(order, resp, 'Response hash mismatch (possible tampering)');
      return res.redirect(302, `${fe}/payment/failed?orderId=${encodeURIComponent(order.orderId)}&reason=hash_mismatch`);
    }
    // 2. Amount check (protect against manipulation)
    const postedAmt = Number(resp.amount);
    if (Math.abs(postedAmt - Number(order.total)) > 0.01) {
      await markFailed(order, resp, `Amount mismatch: expected ${order.total}, got ${resp.amount}`);
      return res.redirect(302, `${fe}/payment/failed?orderId=${encodeURIComponent(order.orderId)}&reason=amount_mismatch`);
    }
    // 3. Status + server-side verify_payment
    const payuStatus = String(resp.status || '').toLowerCase();
    if (payuStatus === 'success') {
      const v = await verifyPaymentWithPayu(String(resp.txnid));
      if (v.ok && v.status === 'success') {
        await markPaid(order, resp, 'callback+verify_payment');
        return res.redirect(302, `${fe}/payment/success?orderId=${encodeURIComponent(order.orderId)}&txnid=${encodeURIComponent(String(resp.txnid))}`);
      }
      // Hash valid + PayU says success but verify API inconclusive — keep pending, let status page reconcile
      const payuUpdate = { ...(order.payu || {}), status: 'AWAITING_VERIFY', verifiedAt: new Date().toISOString(), lastResponse: safePayuLog(resp) };
      const timeline = [...(order.timeline || []), { status: 'PLACED', note: 'PayU reported success; server verification inconclusive. Awaiting confirmation.', timestamp: new Date().toISOString(), updatedBy: 'PayU Callback' }];
      await db.orders.findByIdAndUpdate(order._id, { payu: payuUpdate, timeline });
      return res.redirect(302, `${fe}/payment/pending?orderId=${encodeURIComponent(order.orderId)}&txnid=${encodeURIComponent(String(resp.txnid))}`);
    }
    await markFailed(order, resp, String(resp.error_Message || resp.error || resp.field9 || payuStatus || 'failed'));
    return res.redirect(302, `${fe}/payment/failed?orderId=${encodeURIComponent(order.orderId)}&reason=${encodeURIComponent(payuStatus || 'failed')}`);
  } catch (e: any) {
    console.error('[PayU Callback Error]:', e?.message);
    return res.redirect(302, `${cfg.frontendUrl}/payment/failed?reason=callback_error`);
  }
});

/** GET /api/payu/status/:orderId — owner-only, server-verified status (for success/pending pages). */
router.get('/status/:orderId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const order = await db.orders.findOne({ orderId: String(req.params.orderId || '').trim() });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    const isStaff = user.role === 'ADMIN' || user.role === 'SALES_MANAGER';
    if (!isStaff && order.customer?.id !== user.id && order.customer?.email !== user.email) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    // Reconcile: if PayU order still pending, ask PayU directly (handles delayed callbacks)
    let verified: any = null;
    if (order.paymentMethod === 'PAYU' && order.paymentStatus === 'PENDING' && order.payu?.txnid && isPayuConfigured()) {
      const v = await verifyPaymentWithPayu(String(order.payu.txnid));
      verified = v;
      if (v.ok && v.status === 'success') {
        const fresh: any = { status: 'success', txnid: order.payu.txnid, mihpayid: v.transactionDetails?.mihpayid || v.transactionDetails?.payuMoneyId || '', mode: v.transactionDetails?.mode || '', amount: formatPayuAmount(order.total) };
        await markPaid(order, fresh, 'status-reconcile');
        const done = await db.orders.findOne({ orderId: order.orderId });
        return res.status(200).json({ success: true, verified: true, paymentStatus: 'PAID', order: done });
      }
      if (v.ok && (v.status === 'failure' || v.status === 'failed')) {
        await markFailed(order, { txnid: order.payu.txnid, status: 'failure' }, 'PayU verify reports failure');
        const done = await db.orders.findOne({ orderId: order.orderId });
        return res.status(200).json({ success: true, verified: true, paymentStatus: 'FAILED', order: done });
      }
    }
    const fresh = await db.orders.findOne({ orderId: order.orderId });
    return res.status(200).json({ success: true, verified: !!verified?.ok, paymentStatus: fresh?.paymentStatus || order.paymentStatus, order: fresh || order });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'Failed to check payment status.' });
  }
});

/** POST /api/payu/retry/:orderId — regenerate hash for a pending/failed PayU order (owner only). */
router.post('/retry/:orderId', requireAuth, payuRateLimit, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    if (!isPayuConfigured()) return res.status(503).json({ success: false, message: 'Online payments not enabled.' });
    const cfg = getPayuConfig();
    const order = await db.orders.findOne({ orderId: String(req.params.orderId || '').trim() });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.customer?.id !== user.id && order.customer?.email !== user.email) return res.status(403).json({ success: false, message: 'Access denied.' });
    if (order.paymentMethod !== 'PAYU') return res.status(400).json({ success: false, message: 'Only PayU orders can be retried.' });
    if (order.paymentStatus === 'PAID') return res.status(400).json({ success: false, message: 'Order is already paid.' });
    // Stock re-check before retry
    for (const item of order.items || []) {
      const prod = await db.products.findById(item.productId);
      if (!prod || prod.status !== 'PUBLISHED') return res.status(400).json({ success: false, message: `"${item.name}" is no longer available.` });
      if (prod.stock < item.quantity) return res.status(400).json({ success: false, message: `Only ${prod.stock} left of "${item.name}".` });
    }
    const txnid = `TXN${Date.now()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const payuUpdate = { ...(order.payu || {}), txnid, amount: formatPayuAmount(order.total), status: 'REINITIATED', attempts: ((order.payu as any)?.attempts || 0) + 1, reinitiatedAt: new Date().toISOString() };
    const timeline = [...(order.timeline || []), { status: 'PLACED', note: `PayU payment retry initiated (new TXN ${txnid}).`, timestamp: new Date().toISOString(), updatedBy: 'Customer Retry' }];
    const updated = (await db.orders.findByIdAndUpdate(order._id, { paymentStatus: 'PENDING', payu: payuUpdate, timeline })) || { ...order, payu: payuUpdate };
    const form = buildPayuForm(updated, cfg);
    return res.status(200).json({ success: true, order: updated, payuUrl: payuPaymentUrl(), payuFields: form.fields });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'Failed to retry payment.' });
  }
});

/** GET /api/payu/config — public, safe subset (env + availability only, never secrets). */
router.get('/config', async (_req: any, res: Response) => {
  const cfg = getPayuConfig();
  return res.status(200).json({ success: true, env: cfg.env, enabled: isPayuConfigured(), payUrl: payuPaymentUrl() });
});

/** GET /api/payu/admin/transactions — staff search by orderId / txnid / status. */
router.get('/admin/transactions', requireAuth, requirePermission('orders.read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { search = '', status = '', page = '1', limit = '15' } = req.query as any;
    let all = await db.orders.find({ paymentMethod: 'PAYU' });
    const q = String(search).toLowerCase().trim();
    if (q) {
      all = all.filter((o: any) =>
        o.orderId?.toLowerCase().includes(q) ||
        String(o.payu?.txnid || '').toLowerCase().includes(q) ||
        String(o.payu?.mihpayid || '').toLowerCase().includes(q) ||
        o.customer?.email?.toLowerCase().includes(q));
    }
    if (status) {
      if (status === 'SUCCESS') all = all.filter((o: any) => o.paymentStatus === 'PAID');
      else if (status === 'PENDING') all = all.filter((o: any) => o.paymentStatus === 'PENDING');
      else if (status === 'FAILED') all = all.filter((o: any) => o.paymentStatus === 'FAILED');
      else if (status === 'REFUNDED') all = all.filter((o: any) => o.paymentStatus === 'REFUNDED');
    }
    all.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(50, Math.max(1, parseInt(limit, 10) || 15));
    const total = all.length;
    const rows = all.slice((pageNum - 1) * lim, (pageNum - 1) * lim + lim).map((o: any) => ({
      orderId: o.orderId, _id: o._id, customer: o.customer, total: o.total,
      paymentStatus: o.paymentStatus, orderStatus: o.orderStatus,
      txnid: o.payu?.txnid || '', mihpayid: o.payu?.mihpayid || '', mode: o.payu?.mode || '',
      env: o.payu?.env || '', verifiedVia: o.payu?.verifiedVia || '', verifiedAt: o.payu?.verifiedAt || '',
      attempts: o.payu?.attempts || 0, failReason: o.payu?.failReason || '',
      createdAt: o.createdAt, updatedAt: o.updatedAt,
    }));
    return res.status(200).json({ success: true, transactions: rows, pagination: { total, page: pageNum, totalPages: Math.ceil(total / lim) || 1, limit: lim } });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'Failed to list PayU transactions.' });
  }
});

/** POST /api/payu/admin/verify/:orderId — staff triggers server-side re-verification. */
router.post('/admin/verify/:orderId', requireAuth, requirePermission('orders.read'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const order = await db.orders.findOne({ orderId: String(req.params.orderId || '').trim() });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentMethod !== 'PAYU' || !order.payu?.txnid) return res.status(400).json({ success: false, message: 'Not a PayU order.' });
    const v = await verifyPaymentWithPayu(String(order.payu.txnid));
    await logAuditEvent(req.user!, 'PAYU_ADMIN_VERIFY', 'Order', order._id, { orderId: order.orderId, result: v.status || v.error });
    if (v.ok && v.status === 'success') {
      await markPaid(order, { status: 'success', txnid: order.payu.txnid, mihpayid: (v.transactionDetails as any)?.mihpayid || '', amount: formatPayuAmount(order.total) }, 'admin-verify');
    }
    const fresh = await db.orders.findOne({ orderId: order.orderId });
    return res.status(200).json({ success: true, payuResult: v, order: fresh });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: 'Verification failed.' });
  }
});

export default router;




