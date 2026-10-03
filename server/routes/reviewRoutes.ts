import { Router, Response } from 'express';
import { db } from '../db/storage';
import {
  requireAuth,
  AuthenticatedRequest,
  logAuditEvent,
} from '../middleware/auth';

const router = Router();

// GET /api/reviews/product/:productId
router.get('/product/:productId', async (req, res: Response) => {
  try {
    const { productId } = req.params;
    const reviews = await db.reviews.find({ productId, isApproved: true }, { sort: { createdAt: -1 } });
    return res.status(200).json({ success: true, reviews });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews.' });
  }
});

// POST /api/reviews (Customer submits review)
router.post('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { productId, rating, title = '', comment } = req.body;

    if (!productId || !rating || !comment) {
      return res.status(400).json({ success: false, message: 'Product, rating, and review text are required.' });
    }

    const product = await db.products.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    // Check if user purchased this product for verified purchase indicator
    const userOrders = await db.orders.find({ 'customer.id': user.id });
    const hasPurchased = userOrders.some((o: any) =>
      o.items?.some((i: any) => i.productId === productId)
    );

    const numRating = Math.min(5, Math.max(1, parseInt(rating, 10) || 5));

    const newReview = await db.reviews.create({
      productId,
      userId: user.id,
      userName: user.name,
      rating: numRating,
      title: title.trim(),
      comment: comment.trim(),
      verifiedPurchase: hasPurchased,
      isApproved: true,
      createdAt: new Date().toISOString(),
    });

    // Update product overall rating
    const allReviews = await db.reviews.find({ productId, isApproved: true });
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / (allReviews.length || 1);

    await db.products.findByIdAndUpdate(productId, {
      rating: Number(avgRating.toFixed(1)),
      numReviews: allReviews.length,
    });

    return res.status(201).json({ success: true, review: newReview, message: 'Review submitted. Thank you for your feedback!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to submit review.' });
  }
});

// PATCH /api/reviews/:id/moderate (Staff)
router.patch('/:id/moderate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'SALES_MANAGER') {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const { isApproved } = req.body;
    const updated = await db.reviews.findByIdAndUpdate(req.params.id, { isApproved: !!isApproved });

    if (!updated) {
      return res.status(404).json({ success: false, message: 'Review not found.' });
    }

    await logAuditEvent(req.user!, 'REVIEW_MODERATED', 'Review', req.params.id, { isApproved });

    return res.status(200).json({ success: true, review: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to moderate review.' });
  }
});

export default router;
