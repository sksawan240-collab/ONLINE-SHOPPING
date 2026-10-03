import { Router, Response } from 'express';
import { db } from '../db/storage';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/cart
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    let cart = await db.carts.findOne({ userId });

    if (!cart) {
      cart = await db.carts.create({ userId, items: [] });
    }

    // Populate current live product data and check inventory
    const populatedItems = [];
    for (const item of cart.items || []) {
      const product = await db.products.findById(item.productId);
      if (product && product.status === 'PUBLISHED') {
        populatedItems.push({
          itemId: item.itemId || `${item.productId}_${item.size}_${item.color}`,
          productId: product._id,
          name: product.name,
          slug: product.slug,
          sku: product.sku,
          image: product.images?.[0] || '',
          price: product.salePrice || product.price,
          originalPrice: product.price,
          size: item.size,
          color: item.color,
          quantity: Math.min(item.quantity, Math.max(1, product.stock)),
          availableStock: product.stock,
          inStock: product.stock > 0,
        });
      }
    }

    const subtotal = populatedItems.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

    return res.status(200).json({
      success: true,
      cart: {
        items: populatedItems,
        subtotal: Number(subtotal.toFixed(2)),
        itemCount: populatedItems.reduce((acc, curr) => acc + curr.quantity, 0),
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch cart.' });
  }
});

// POST /api/cart/items
router.post('/items', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { productId, size = 'M', color = 'Default', quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required.' });
    }

    const product = await db.products.findById(productId);
    if (!product || product.status !== 'PUBLISHED') {
      return res.status(404).json({ success: false, message: 'Product is not available for purchase.' });
    }

    if (product.stock <= 0) {
      return res.status(400).json({ success: false, message: 'Selected item is currently out of stock.' });
    }

    let cart = await db.carts.findOne({ userId });
    if (!cart) {
      cart = await db.carts.create({ userId, items: [] });
    }

    const items = [...(cart.items || [])];
    const existingIndex = items.findIndex(
      i => i.productId === productId && i.size === size && i.color === color
    );

    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    if (existingIndex > -1) {
      const newQty = items[existingIndex].quantity + qtyToAdd;
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units are in stock. Cannot add more.`,
        });
      }
      items[existingIndex].quantity = newQty;
    } else {
      if (qtyToAdd > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units are in stock.`,
        });
      }
      items.push({
        itemId: `${productId}_${size}_${color}_${Date.now()}`,
        productId,
        size,
        color,
        quantity: qtyToAdd,
        addedAt: new Date().toISOString(),
      });
    }

    await db.carts.findByIdAndUpdate(cart._id, { items });

    return res.status(200).json({
      success: true,
      message: 'Added to your bag.',
      itemCount: items.reduce((acc, curr) => acc + curr.quantity, 0),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update shopping bag.' });
  }
});

// PATCH /api/cart/items/:itemId
router.patch('/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await db.carts.findOne({ userId });
    if (!cart) {
      return res.status(404).json({ success: false, message: 'Cart not found.' });
    }

    const items = [...(cart.items || [])];
    const index = items.findIndex(i => i.itemId === itemId || `${i.productId}_${i.size}_${i.color}` === itemId);
    if (index === -1) {
      return res.status(404).json({ success: false, message: 'Item not in cart.' });
    }

    const target = items[index];
    const product = await db.products.findById(target.productId);
    if (!product) {
      items.splice(index, 1);
      await db.carts.findByIdAndUpdate(cart._id, { items });
      return res.status(200).json({ success: true, message: 'Item unavailable, removed from bag.' });
    }

    const newQty = parseInt(quantity, 10);
    if (newQty <= 0) {
      items.splice(index, 1);
    } else {
      if (newQty > product.stock) {
        return res.status(400).json({
          success: false,
          message: `Only ${product.stock} units available in inventory.`,
        });
      }
      items[index].quantity = newQty;
    }

    await db.carts.findByIdAndUpdate(cart._id, { items });
    return res.status(200).json({ success: true, message: 'Bag updated.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update cart.' });
  }
});

// DELETE /api/cart/items/:itemId
router.delete('/items/:itemId', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { itemId } = req.params;

    const cart = await db.carts.findOne({ userId });
    if (!cart) return res.status(200).json({ success: true });

    const items = (cart.items || []).filter(
      (i: any) => i.itemId !== itemId && `${i.productId}_${i.size}_${i.color}` !== itemId
    );
    await db.carts.findByIdAndUpdate(cart._id, { items });

    return res.status(200).json({ success: true, message: 'Item removed from bag.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to remove item.' });
  }
});

// DELETE /api/cart/clear
router.delete('/clear', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const cart = await db.carts.findOne({ userId });
    if (cart) {
      await db.carts.findByIdAndUpdate(cart._id, { items: [] });
    }
    return res.status(200).json({ success: true, message: 'Bag cleared.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to clear bag.' });
  }
});

export default router;
