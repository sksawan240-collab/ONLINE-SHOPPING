import { Router, Response } from 'express';
import { db } from '../db/storage';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/wishlist
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let wishlist = await db.wishlists.findOne({ userId });
    if (!wishlist) {
      wishlist = await db.wishlists.create({ userId, productIds: [] });
    }

    const products = [];
    for (const pid of wishlist.productIds || []) {
      const p = await db.products.findById(pid);
      if (p && p.status === 'PUBLISHED') {
        products.push(p);
      }
    }

    return res.status(200).json({ success: true, items: products, productIds: wishlist.productIds || [] });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch wishlist.' });
  }
});

// POST /api/wishlist/toggle
router.post('/toggle', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID required.' });
    }

    let wishlist = await db.wishlists.findOne({ userId });
    if (!wishlist) {
      wishlist = await db.wishlists.create({ userId, productIds: [] });
    }

    const productIds: string[] = [...(wishlist.productIds || [])];
    const index = productIds.indexOf(productId);
    let isInWishlist = false;

    if (index > -1) {
      productIds.splice(index, 1);
      isInWishlist = false;
    } else {
      productIds.push(productId);
      isInWishlist = true;
    }

    await db.wishlists.findByIdAndUpdate(wishlist._id, { productIds });

    return res.status(200).json({
      success: true,
      isInWishlist,
      count: productIds.length,
      productIds,
      message: isInWishlist ? 'Added to your wishlist.' : 'Removed from wishlist.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to toggle wishlist item.' });
  }
});

export default router;
