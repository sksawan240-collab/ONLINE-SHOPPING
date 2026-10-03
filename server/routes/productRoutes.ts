import { Router, Response } from 'express';
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

// Helper to slugify string
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-') + '-' + Math.random().toString(36).substring(2, 6);
}

// GET /api/products (Public with role-based visibility)
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      search,
      category,
      brand,
      gender,
      minPrice,
      maxPrice,
      size,
      color,
      isFeatured,
      isNewArrival,
      isBestSeller,
      isTrending,
      status,
      sort = 'newest',
      page = '1',
      limit = '12',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 12));

    const isStaff = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SALES_MANAGER');

    let allProducts = await db.products.find();

    // Visibility filter: Public callers only see PUBLISHED products
    if (!isStaff) {
      allProducts = allProducts.filter((p: any) => p.status === 'PUBLISHED');
    } else if (status) {
      allProducts = allProducts.filter((p: any) => p.status === status);
    }

    // Filter by Search (Name, Description, SKU, Brand, Category, Tags)
    if (search && typeof search === 'string' && search.trim().length > 0) {
      const q = search.toLowerCase().trim();
      allProducts = allProducts.filter((p: any) => {
        return (
          p.name?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q) ||
          (Array.isArray(p.tags) && p.tags.some((t: string) => t.toLowerCase().includes(q)))
        );
      });
    }

    // Filter by Category
    if (category) {
      allProducts = allProducts.filter((p: any) => p.category?.toLowerCase() === (category as string).toLowerCase());
    }

    // Filter by Brand
    if (brand) {
      allProducts = allProducts.filter((p: any) => p.brand?.toLowerCase() === (brand as string).toLowerCase());
    }

    // Filter by Gender
    if (gender && gender !== 'All') {
      allProducts = allProducts.filter((p: any) => p.gender === gender || p.gender === 'Unisex');
    }

    // Filter by Price
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      if (!isNaN(min)) {
        allProducts = allProducts.filter((p: any) => (p.salePrice || p.price) >= min);
      }
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      if (!isNaN(max)) {
        allProducts = allProducts.filter((p: any) => (p.salePrice || p.price) <= max);
      }
    }

    // Filter by Size
    if (size) {
      allProducts = allProducts.filter((p: any) => Array.isArray(p.sizes) && p.sizes.includes(size));
    }

    // Filter by Color
    if (color) {
      allProducts = allProducts.filter((p: any) => {
        if (!Array.isArray(p.colors)) return false;
        return p.colors.some((c: any) => (typeof c === 'string' ? c : c.name)?.toLowerCase() === (color as string).toLowerCase());
      });
    }

    // Flags
    if (isFeatured === 'true') allProducts = allProducts.filter((p: any) => p.isFeatured);
    if (isNewArrival === 'true') allProducts = allProducts.filter((p: any) => p.isNewArrival);
    if (isBestSeller === 'true') allProducts = allProducts.filter((p: any) => p.isBestSeller);
    if (isTrending === 'true') allProducts = allProducts.filter((p: any) => p.isTrending);

    // Sorting
    allProducts.sort((a: any, b: any) => {
      const priceA = a.salePrice || a.price || 0;
      const priceB = b.salePrice || b.price || 0;
      if (sort === 'price-asc') return priceA - priceB;
      if (sort === 'price-desc') return priceB - priceA;
      if (sort === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sort === 'popularity') return (b.numReviews || 0) - (a.numReviews || 0);
      // default: newest
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    const total = allProducts.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginatedProducts = allProducts.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      products: paginatedProducts,
      pagination: {
        total,
        page: pageNum,
        totalPages,
        limit: limitNum,
        hasMore: pageNum < totalPages,
      },
    });
  } catch (err: any) {
    console.error('[Products List Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve products.' });
  }
});

// GET /api/products/meta/filters (Distinct filters from actual catalog)
router.get('/meta/filters', async (req, res: Response) => {
  try {
    const products = await db.products.find({ status: 'PUBLISHED' });

    const categoriesSet = new Set<string>();
    const brandsSet = new Set<string>();
    const sizesSet = new Set<string>();
    const colorsMap = new Map<string, string>();

    let minPrice = Number.MAX_VALUE;
    let maxPrice = 0;

    for (const p of products) {
      if (p.category) categoriesSet.add(p.category);
      if (p.brand) brandsSet.add(p.brand);
      if (Array.isArray(p.sizes)) {
        p.sizes.forEach((s: string) => sizesSet.add(s));
      }
      if (Array.isArray(p.colors)) {
        p.colors.forEach((c: any) => {
          if (typeof c === 'string') {
            colorsMap.set(c, '#64748b');
          } else if (c?.name) {
            colorsMap.set(c.name, c.hex || '#64748b');
          }
        });
      }
      const price = p.salePrice || p.price || 0;
      if (price < minPrice) minPrice = price;
      if (price > maxPrice) maxPrice = price;
    }

    if (products.length === 0) {
      minPrice = 0;
      maxPrice = 0;
    }

    return res.status(200).json({
      success: true,
      filters: {
        categories: Array.from(categoriesSet),
        brands: Array.from(brandsSet),
        sizes: Array.from(sizesSet),
        colors: Array.from(colorsMap.entries()).map(([name, hex]) => ({ name, hex })),
        minPrice,
        maxPrice,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch catalog filter metadata.' });
  }
});

// GET /api/products/:idOrSlug
router.get('/:idOrSlug', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { idOrSlug } = req.params;
    let product = await db.products.findById(idOrSlug);
    if (!product) {
      product = await db.products.findOne({ slug: idOrSlug });
    }

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found in catalog.' });
    }

    const isStaff = req.user && (req.user.role === 'ADMIN' || req.user.role === 'SALES_MANAGER');
    if (!isStaff && product.status !== 'PUBLISHED') {
      return res.status(404).json({ success: false, message: 'Product is currently unavailable.' });
    }

    // Fetch related products in the same category
    const related = await db.products.find({
      category: product.category,
      status: 'PUBLISHED',
      _id: { $ne: product._id },
    }, { limit: 4 });

    // Fetch reviews for this product
    const reviews = await db.reviews.find({ productId: product._id, isApproved: true });

    return res.status(200).json({
      success: true,
      product,
      related,
      reviews,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve product details.' });
  }
});

// POST /api/products (Admin or SalesManager with products.write)
router.post('/', requireAuth, requirePermission('products.write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      name,
      description,
      shortDescription,
      brand,
      category,
      subcategory,
      gender = 'Unisex',
      sizes = ['S', 'M', 'L', 'XL'],
      colors = [{ name: 'Black', hex: '#000000' }],
      material = '100% Organic Cotton',
      price,
      discount = 0,
      sku,
      barcode,
      stock = 0,
      lowStockThreshold = 5,
      tags = [],
      images = [],
      videoUrl,
      isFeatured = false,
      isNewArrival = true,
      isBestSeller = false,
      isTrending = false,
      status = 'PUBLISHED',
      notifySubscribers = false,
    } = req.body;

    if (!name || price === undefined || !brand || !category) {
      return res.status(400).json({
        success: false,
        message: 'Name, price, brand, and category are mandatory.',
      });
    }

    const numPrice = parseFloat(price);
    const numDiscount = Math.min(100, Math.max(0, parseFloat(discount) || 0));
    const salePrice = Number((numPrice * (1 - numDiscount / 100)).toFixed(2));
    const generatedSku = sku?.trim() || `LUXE-${category.substring(0, 3).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

    // Verify SKU uniqueness
    const existingSku = await db.products.findOne({ sku: generatedSku });
    if (existingSku) {
      return res.status(409).json({ success: false, message: 'SKU already assigned to another product.' });
    }

    const slug = slugify(name);

    const newProduct = await db.products.create({
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      shortDescription: shortDescription?.trim() || '',
      brand: brand.trim(),
      category: category.trim(),
      subcategory: subcategory?.trim() || '',
      gender,
      sizes,
      colors,
      material,
      price: numPrice,
      discount: numDiscount,
      salePrice,
      sku: generatedSku,
      barcode: barcode || '',
      stock: parseInt(stock, 10) || 0,
      lowStockThreshold: parseInt(lowStockThreshold, 10) || 5,
      tags: Array.isArray(tags) ? tags : [],
      images: Array.isArray(images) && images.length > 0 ? images : ['https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=800&auto=format&fit=crop'],
      videoUrl: videoUrl || '',
      isFeatured: !!isFeatured,
      isNewArrival: !!isNewArrival,
      isBestSeller: !!isBestSeller,
      isTrending: !!isTrending,
      status: status || 'PUBLISHED',
      rating: 5,
      numReviews: 0,
    });

    await logAuditEvent(req.user!, 'PRODUCT_CREATED', 'Product', newProduct._id, {
      name: newProduct.name,
      sku: newProduct.sku,
      price: newProduct.salePrice,
      stock: newProduct.stock,
    });

    // If published and notifySubscribers is checked, dispatch new launch notifications
    if (status === 'PUBLISHED' && notifySubscribers) {
      const subscribedUsers = await db.users.find({
        isVerified: true,
        'emailPreferences.newLaunchEmails': true,
      });

      for (const subscriber of subscribedUsers) {
        sendEmail({
          to: subscriber.email,
          subject: `Exclusive Launch: ${newProduct.name}`,
          html: emailTemplates.newProductLaunch(newProduct),
          emailType: 'NEW_LAUNCH',
        }).catch(e => console.error('[Launch Notification Err]:', e));
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Product created and catalog updated.',
      product: newProduct,
    });
  } catch (err: any) {
    console.error('[Create Product Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to create product.' });
  }
});

// PATCH /api/products/:id (Admin or SalesManager with products.write)
router.patch('/:id', requireAuth, requirePermission('products.write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await db.products.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    const updates = { ...req.body };

    if (updates.price !== undefined || updates.discount !== undefined) {
      const price = updates.price !== undefined ? parseFloat(updates.price) : existing.price;
      const discount = updates.discount !== undefined ? parseFloat(updates.discount) : existing.discount;
      updates.salePrice = Number((price * (1 - discount / 100)).toFixed(2));
    }

    const updated = await db.products.findByIdAndUpdate(id, updates);

    await logAuditEvent(req.user!, 'PRODUCT_UPDATED', 'Product', id, {
      changedFields: Object.keys(updates),
    });

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully.',
      product: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update product.' });
  }
});

// DELETE /api/products/:id (Admin or SalesManager with products.write)
router.delete('/:id', requireAuth, requirePermission('products.write'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const product = await db.products.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found.' });
    }

    await db.products.findByIdAndDelete(id);

    await logAuditEvent(req.user!, 'PRODUCT_DELETED', 'Product', id, {
      name: product.name,
      sku: product.sku,
    });

    return res.status(200).json({
      success: true,
      message: 'Product successfully removed from database.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete product.' });
  }
});

export default router;
