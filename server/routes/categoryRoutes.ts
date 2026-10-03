import { Router, Response } from 'express';
import { db } from '../db/storage';
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
  logAuditEvent,
} from '../middleware/auth';

const router = Router();

// GET /api/categories (Public)
router.get('/', async (req, res: Response) => {
  try {
    const categories = await db.categories.find({ isVisible: true }, { sort: { order: 1 } });
    const allProducts = await db.products.find({ status: 'PUBLISHED' });

    // Calculate product counts per category
    const categoriesWithCount = categories.map((cat: any) => {
      const count = allProducts.filter((p: any) => p.category?.toLowerCase() === cat.name.toLowerCase()).length;
      return { ...cat, productCount: count };
    });

    return res.status(200).json({ success: true, categories: categoriesWithCount });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve categories.' });
  }
});

// POST /api/categories (Admin only)
router.post('/', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, description = '', image = '', subcategories = [], isVisible = true, order = 0 } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Category name is required.' });
    }

    const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^\w\-]+/g, '');
    const existing = await db.categories.findOne({ slug });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Category with this name already exists.' });
    }

    const newCategory = await db.categories.create({
      name: name.trim(),
      slug,
      description: description.trim(),
      image: image.trim(),
      subcategories: Array.isArray(subcategories) ? subcategories : [],
      isVisible: !!isVisible,
      order: parseInt(order, 10) || 0,
    });

    await logAuditEvent(req.user!, 'CATEGORY_CREATED', 'Category', newCategory._id, { name: newCategory.name });

    return res.status(201).json({ success: true, category: newCategory });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create category.' });
  }
});

// PATCH /api/categories/:id (Admin only)
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await db.categories.findByIdAndUpdate(id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    await logAuditEvent(req.user!, 'CATEGORY_UPDATED', 'Category', id, req.body);
    return res.status(200).json({ success: true, category: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update category.' });
  }
});

// DELETE /api/categories/:id (Admin only)
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const cat = await db.categories.findById(id);
    if (!cat) {
      return res.status(404).json({ success: false, message: 'Category not found.' });
    }
    await db.categories.findByIdAndDelete(id);
    await logAuditEvent(req.user!, 'CATEGORY_DELETED', 'Category', id, { name: cat.name });
    return res.status(200).json({ success: true, message: 'Category removed.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete category.' });
  }
});

export default router;
