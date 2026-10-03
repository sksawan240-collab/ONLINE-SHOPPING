import { Router, Response } from 'express';
import { db } from '../db/storage';
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
  logAuditEvent,
} from '../middleware/auth';

const router = Router();

// GET /api/coupons (Admin/SalesManager)
router.get('/', requireAuth, requireRole('ADMIN', 'SALES_MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const coupons = await db.coupons.find({}, { sort: { createdAt: -1 } });
    return res.status(200).json({ success: true, coupons });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve coupons.' });
  }
});

// POST /api/coupons (Admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { code, discountType = 'PERCENTAGE', discountValue, minPurchase = 0, maxDiscount, expiryDays = 30, usageLimit = 100 } = req.body;

    if (!code || !discountValue) {
      return res.status(400).json({ success: false, message: 'Code and discount value are required.' });
    }

    const cleanCode = code.trim().toUpperCase();
    const existing = await db.coupons.findOne({ code: cleanCode });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Coupon code already exists.' });
    }

    const expiryDate = new Date(Date.now() + (parseInt(expiryDays, 10) || 30) * 24 * 60 * 60 * 1000).toISOString();

    const newCoupon = await db.coupons.create({
      code: cleanCode,
      discountType,
      discountValue: parseFloat(discountValue),
      minPurchase: parseFloat(minPurchase) || 0,
      maxDiscount: maxDiscount ? parseFloat(maxDiscount) : undefined,
      expiryDate,
      usageLimit: parseInt(usageLimit, 10) || 100,
      usedCount: 0,
      isActive: true,
    });

    await logAuditEvent(req.user!, 'COUPON_CREATED', 'Coupon', newCoupon._id, { code: cleanCode });

    return res.status(201).json({ success: true, coupon: newCoupon });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create coupon.' });
  }
});

// POST /api/coupons/validate (Customer validation during checkout)
router.post('/validate', async (req, res: Response) => {
  try {
    const { code, subtotal } = req.body;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Coupon code is required.' });
    }

    const coupon = await db.coupons.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Invalid or inactive promotional code.' });
    }

    if (coupon.expiryDate && new Date(coupon.expiryDate).getTime() < Date.now()) {
      return res.status(400).json({ success: false, message: 'This coupon has expired.' });
    }

    if (coupon.usageLimit && (coupon.usedCount || 0) >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: 'This coupon has reached its maximum usage limit.' });
    }

    const subtotalNum = parseFloat(subtotal) || 0;
    if (coupon.minPurchase && subtotalNum < coupon.minPurchase) {
      return res.status(400).json({
        success: false,
        message: `Order must be at least $${coupon.minPurchase} to use this coupon.`,
      });
    }

    let calculatedDiscount = 0;
    if (coupon.discountType === 'PERCENTAGE') {
      calculatedDiscount = (subtotalNum * coupon.discountValue) / 100;
      if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
        calculatedDiscount = coupon.maxDiscount;
      }
    } else {
      calculatedDiscount = coupon.discountValue;
    }
    calculatedDiscount = Math.min(calculatedDiscount, subtotalNum);

    return res.status(200).json({
      success: true,
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount: Number(calculatedDiscount.toFixed(2)),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to validate coupon.' });
  }
});

// DELETE /api/coupons/:id (Admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    await db.coupons.findByIdAndDelete(id);
    await logAuditEvent(req.user!, 'COUPON_DELETED', 'Coupon', id);
    return res.status(200).json({ success: true, message: 'Coupon deleted.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete coupon.' });
  }
});

export default router;
