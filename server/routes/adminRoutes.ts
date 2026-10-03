import { Router, Response } from 'express';
import { db } from '../db/storage';
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
  logAuditEvent,
  hashPassword,
} from '../middleware/auth';

const router = Router();

// GET /api/admin/users
router.get('/users', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, search, status, page = '1', limit = '15' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 15));

    let allUsers = await db.users.find();

    if (role) {
      allUsers = allUsers.filter((u: any) => u.role === role);
    }

    if (status === 'verified') {
      allUsers = allUsers.filter((u: any) => u.isVerified);
    } else if (status === 'unverified') {
      allUsers = allUsers.filter((u: any) => !u.isVerified);
    }

    if (search && typeof search === 'string') {
      const q = search.toLowerCase().trim();
      allUsers = allUsers.filter((u: any) =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q)
      );
    }

    const total = allUsers.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = allUsers.slice(startIndex, startIndex + limitNum).map((u: any) => {
      // Exclude passwordHash from response
      const { passwordHash, otpCode, ...safeUser } = u;
      return safeUser;
    });

    return res.status(200).json({
      success: true,
      users: paginated,
      pagination: {
        total,
        page: pageNum,
        totalPages,
        limit: limitNum,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve users.' });
  }
});

// POST /api/admin/users (Create User / Staff)
// NOTE: admins create staff accounts directly — no public OTP verification flow exists anymore.
router.post('/users', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, email, password, role = 'CUSTOMER', permissions = [], phone = '', isVerified = true } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password required.' });
    }

    if (!['CUSTOMER', 'SALES_MANAGER', 'ADMIN'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await db.users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await db.users.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
      permissions: role === 'SALES_MANAGER' ? permissions : [],
      isVerified: !!isVerified,
      phone: phone.trim(),
      addresses: [],
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
    });

    await logAuditEvent(req.user!, 'USER_CREATED_BY_ADMIN', 'User', newUser._id, {
      email: newUser.email,
      role: newUser.role,
      permissions: newUser.permissions,
    });

    const { passwordHash: _, ...safeUser } = newUser;
    return res.status(201).json({ success: true, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// PATCH /api/admin/users/:id (Update User / Assign permissions)
router.patch('/users/:id', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role, permissions, isVerified, name, phone, password } = req.body;

    const user = await db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updates: any = {};
    if (role !== undefined) updates.role = role;
    if (permissions !== undefined) updates.permissions = permissions;
    if (isVerified !== undefined) updates.isVerified = isVerified;
    if (name !== undefined) updates.name = name.trim();
    if (phone !== undefined) updates.phone = phone.trim();

    if (password && password.length >= 6) {
      updates.passwordHash = await hashPassword(password);
      updates.sessionVersion = (user.sessionVersion || 1) + 1; // invalidate existing tokens
    }

    const updated = await db.users.findByIdAndUpdate(id, updates);

    await logAuditEvent(req.user!, 'USER_UPDATED_BY_ADMIN', 'User', id, {
      changedRole: role,
      changedPermissions: permissions,
      isVerified,
    });

    const { passwordHash: _, ...safeUser } = updated;
    return res.status(200).json({ success: true, user: safeUser });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update user.' });
  }
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (id === req.user!.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own administrator account.' });
    }

    const user = await db.users.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    await db.users.findByIdAndDelete(id);

    await logAuditEvent(req.user!, 'USER_DELETED_BY_ADMIN', 'User', id, { email: user.email });

    return res.status(200).json({ success: true, message: 'User removed successfully.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete user.' });
  }
});

// GET /api/admin/audit-logs
router.get('/audit-logs', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '50', page = '1' } = req.query;
    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));

    const logs = await db.auditLogs.find({}, { sort: { timestamp: -1 } });
    const total = logs.length;
    const totalPages = Math.ceil(total / limitNum) || 1;
    const startIndex = (pageNum - 1) * limitNum;
    const paginated = logs.slice(startIndex, startIndex + limitNum);

    return res.status(200).json({
      success: true,
      logs: paginated,
      pagination: { total, page: pageNum, totalPages, limit: limitNum },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (req, res: Response) => {
  try {
    const settings = await db.settings.findById('default_store_settings');
    return res.status(200).json({ success: true, settings });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
});

// PATCH /api/admin/settings
router.patch('/settings', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.settings.findByIdAndUpdate('default_store_settings', req.body);
    await logAuditEvent(req.user!, 'SETTINGS_UPDATED', 'Settings', 'default_store_settings');
    return res.status(200).json({ success: true, settings: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update store settings.' });
  }
});

// POST /api/admin/seed (Optional initial store seed)
router.post('/seed', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { force = false } = req.body;
    const existingCount = await db.products.countDocuments();

    if (existingCount > 0 && !force) {
      return res.status(400).json({
        success: false,
        message: `Database already contains ${existingCount} products. Pass { force: true } if you intend to reseed.`,
      });
    }

    if (force) {
      await db.products.deleteMany({});
      await db.categories.deleteMany({});
    }

    // Seed Categories
    const categoriesData = [
      {
        name: 'Outerwear & Coats',
        slug: 'outerwear-coats',
        description: 'Tailored cashmere overcoats, Italian wool jackets, and structural blazers.',
        image: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800&auto=format&fit=crop',
        subcategories: ['Trench Coats', 'Overcoats', 'Tailored Blazers', 'Leather Jackets'],
        isVisible: true,
        order: 1,
      },
      {
        name: 'Dresses & Gowns',
        slug: 'dresses-gowns',
        description: 'Evening silk gowns, structural cocktail dresses, and fluid daywear.',
        image: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop',
        subcategories: ['Evening Gowns', 'Slip Dresses', 'Maxi Dresses', 'Party Dresses'],
        isVisible: true,
        order: 2,
      },
      {
        name: 'Knitwear & Sweaters',
        slug: 'knitwear-sweaters',
        description: 'Grade-A Mongolian cashmere jumpers, ribbed turtlenecks, and merino knits.',
        image: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=800&auto=format&fit=crop',
        subcategories: ['Cashmere Crewnecks', 'Cardigans', 'Turtlenecks', 'V-Necks'],
        isVisible: true,
        order: 3,
      },
      {
        name: 'Tailored Shirts & Tops',
        slug: 'tailored-shirts-tops',
        description: 'Egyptian Giza cotton poplin button-downs, silk blouses, and minimal tees.',
        image: 'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=800&auto=format&fit=crop',
        subcategories: ['Dress Shirts', 'Silk Blouses', 'Oxford Shirts', 'Linen Tops'],
        isVisible: true,
        order: 4,
      },
      {
        name: 'Trousers & Denim',
        slug: 'trousers-denim',
        description: 'Pleated wide-leg wool trousers, relaxed selvedge denim, and tailored chinos.',
        image: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?q=80&w=800&auto=format&fit=crop',
        subcategories: ['Wide-Leg Trousers', 'Selvedge Denim', 'Pleated Slacks', 'Tailored Shorts'],
        isVisible: true,
        order: 5,
      },
    ];

    for (const cat of categoriesData) {
      await db.categories.create(cat);
    }

    // Seed Real Luxury Products
    const sampleProducts = [
      {
        name: 'Atelier Double-Breasted Wool Overcoat',
        slug: 'atelier-double-breasted-wool-overcoat',
        description: 'Masterfully crafted from double-faced Italian virgin wool. Features notch lapels, horn buttons, dual welt pockets, and a timeless relaxed silhouette.',
        shortDescription: 'Double-faced Italian virgin wool overcoat with horn buttons.',
        brand: 'Luxe Atelier',
        category: 'Outerwear & Coats',
        subcategory: 'Overcoats',
        gender: 'Men',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Camel Tan', hex: '#c19a6b' },
          { name: 'Midnight Charcoal', hex: '#1e293b' },
          { name: 'Noir Black', hex: '#000000' },
        ],
        material: '90% Italian Virgin Wool, 10% Cashmere',
        price: 580.00,
        discount: 15,
        salePrice: 493.00,
        sku: 'LUXE-OUT-COAT-01',
        stock: 18,
        lowStockThreshold: 4,
        tags: ['Overcoat', 'Wool', 'Winter', 'Luxury', 'Outerwear'],
        images: [
          'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1000&auto=format&fit=crop',
        ],
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: true,
        isTrending: true,
        status: 'PUBLISHED',
        rating: 4.9,
        numReviews: 12,
      },
      {
        name: 'Monroe Silk Charmeuse Bias Maxi Slip',
        slug: 'monroe-silk-charmeuse-bias-maxi-slip',
        description: 'Cut on the bias from 100% 22-momme mulberry silk charmeuse. Glides gracefully along the body with delicate adjustable straps and French seam finishing.',
        shortDescription: '22-momme pure mulberry silk bias-cut slip dress.',
        brand: 'Lumière Haute',
        category: 'Dresses & Gowns',
        subcategory: 'Slip Dresses',
        gender: 'Women',
        sizes: ['XS', 'S', 'M', 'L'],
        colors: [
          { name: 'Emerald', hex: '#047857' },
          { name: 'Champagne Rose', hex: '#fbcfe8' },
          { name: 'Obsidian Black', hex: '#0f172a' },
        ],
        material: '100% Grade 6A Mulberry Silk',
        price: 360.00,
        discount: 0,
        salePrice: 360.00,
        sku: 'LUXE-DRS-SLIP-02',
        stock: 24,
        lowStockThreshold: 5,
        tags: ['Silk', 'Maxi', 'Evening', 'Cocktail', 'Summer'],
        images: [
          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=1000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?q=80&w=1000&auto=format&fit=crop',
        ],
        isFeatured: true,
        isNewArrival: true,
        isBestSeller: true,
        isTrending: false,
        status: 'PUBLISHED',
        rating: 5.0,
        numReviews: 8,
      },
      {
        name: 'Heritage Grade-A Cashmere Turtleneck',
        slug: 'heritage-grade-a-cashmere-turtleneck',
        description: 'Spun from sustainably harvested Mongolian cashmere. Unmatched cloud-soft warmth with ribbed collar, cuffs, and hem. Resistant to pilling.',
        shortDescription: 'Pure Mongolian 2-ply cashmere ribbed turtleneck.',
        brand: 'Sartorial Knit',
        category: 'Knitwear & Sweaters',
        subcategory: 'Turtlenecks',
        gender: 'Unisex',
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        colors: [
          { name: 'Oatmeal Heather', hex: '#e2d9cc' },
          { name: 'Deep Navy', hex: '#1e3a8a' },
          { name: 'Forest Green', hex: '#14532d' },
        ],
        material: '100% Grade-A Mongolian Cashmere',
        price: 295.00,
        discount: 20,
        salePrice: 236.00,
        sku: 'LUXE-KNT-TURT-03',
        stock: 35,
        lowStockThreshold: 6,
        tags: ['Cashmere', 'Sweater', 'Winter', 'Essential'],
        images: [
          'https://images.unsplash.com/photo-1576566588028-4147f3842f27?q=80&w=1000&auto=format&fit=crop',
          'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=1000&auto=format&fit=crop',
        ],
        isFeatured: false,
        isNewArrival: true,
        isBestSeller: true,
        isTrending: true,
        status: 'PUBLISHED',
        rating: 4.8,
        numReviews: 19,
      },
      {
        name: 'Sartoriale Giza Poplin Spread Collar Shirt',
        slug: 'sartoriale-giza-poplin-spread-collar-shirt',
        description: 'Woven with 140/2 double-twist Egyptian Giza cotton for a crisp hand and silky luster. Mother-of-pearl buttons and removable brass collar stays.',
        shortDescription: '140/2 Egyptian Giza poplin dress shirt.',
        brand: 'Luxe Atelier',
        category: 'Tailored Shirts & Tops',
        subcategory: 'Dress Shirts',
        gender: 'Men',
        sizes: ['15', '15.5', '16', '16.5', '17'],
        colors: [
          { name: 'Optic White', hex: '#ffffff' },
          { name: 'Sky Stripe', hex: '#bae6fd' },
          { name: 'Soft Lilac', hex: '#f3e8ff' },
        ],
        material: '100% Egyptian Giza Cotton',
        price: 195.00,
        discount: 10,
        salePrice: 175.50,
        sku: 'LUXE-SHT-GIZA-04',
        stock: 40,
        lowStockThreshold: 5,
        tags: ['Dress Shirt', 'Poplin', 'Formal', 'Business'],
        images: [
          'https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?q=80&w=1000&auto=format&fit=crop',
        ],
        isFeatured: false,
        isNewArrival: false,
        isBestSeller: true,
        isTrending: false,
        status: 'PUBLISHED',
        rating: 4.7,
        numReviews: 14,
      },
      {
        name: 'Florence Wide-Leg Pleated Wool Trousers',
        slug: 'florence-wide-leg-pleated-wool-trousers',
        description: 'High-waisted tailored trousers featuring deep front pleats, slant pockets, and an architectural wide-leg drop in fluid tropical wool.',
        shortDescription: 'High-waisted double-pleated trousers in fine tropical wool.',
        brand: 'Sartorial Knit',
        category: 'Trousers & Denim',
        subcategory: 'Wide-Leg Trousers',
        gender: 'Women',
        sizes: ['XS', 'S', 'M', 'L'],
        colors: [
          { name: 'Pecan Brown', hex: '#78350f' },
          { name: 'Caviar Black', hex: '#18181b' },
          { name: 'Dove Grey', hex: '#9ca3af' },
        ],
        material: '100% Fine Merino Tropical Wool',
        price: 285.00,
        discount: 0,
        salePrice: 285.00,
        sku: 'LUXE-TRS-FLOR-05',
        stock: 22,
        lowStockThreshold: 4,
        tags: ['Trousers', 'Pleated', 'Tailored', 'Minimalist'],
        images: [
          'https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=1000&auto=format&fit=crop',
        ],
        isFeatured: true,
        isNewArrival: false,
        isBestSeller: false,
        isTrending: true,
        status: 'PUBLISHED',
        rating: 4.9,
        numReviews: 7,
      },
      {
        name: 'Riviera Linen Chore Jacket',
        slug: 'riviera-linen-chore-jacket',
        description: 'Unstructured chore coat tailored from heavyweight 380gsm washed French flax linen. Patch pockets, contrast horn buttons, and unlined interior.',
        shortDescription: 'French flax heavyweight linen chore jacket.',
        brand: 'Luxe Atelier',
        category: 'Outerwear & Coats',
        subcategory: 'Tailored Blazers',
        gender: 'Men',
        sizes: ['S', 'M', 'L', 'XL'],
        colors: [
          { name: 'Natural Sand', hex: '#d6c7b2' },
          { name: 'Indigo Washed', hex: '#312e81' },
          { name: 'Olive Drab', hex: '#3f6212' },
        ],
        material: '100% French Flax Linen',
        price: 320.00,
        discount: 25,
        salePrice: 240.00,
        sku: 'LUXE-OUT-RIVI-06',
        stock: 14,
        lowStockThreshold: 3,
        tags: ['Linen', 'Jacket', 'Summer', 'Casual Chic'],
        images: [
          'https://images.unsplash.com/photo-1495105787522-5334e3ffa0ef?q=80&w=1000&auto=format&fit=crop',
        ],
        isFeatured: false,
        isNewArrival: true,
        isBestSeller: false,
        isTrending: true,
        status: 'PUBLISHED',
        rating: 4.6,
        numReviews: 5,
      },
    ];

    for (const prod of sampleProducts) {
      await db.products.create(prod);
    }

    // Seed Initial Active Coupons
    await db.coupons.create({
      code: 'LUXE15',
      discountType: 'PERCENTAGE',
      discountValue: 15,
      minPurchase: 100,
      maxDiscount: 150,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 500,
      usedCount: 0,
      isActive: true,
    });

    await db.coupons.create({
      code: 'WELCOME50',
      discountType: 'FIXED',
      discountValue: 50,
      minPurchase: 250,
      expiryDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      usageLimit: 1000,
      usedCount: 0,
      isActive: true,
    });

    await logAuditEvent(req.user!, 'DATABASE_SEEDED', 'Catalog', 'seed_initial');

    return res.status(200).json({
      success: true,
      message: 'Catalog seeded with premium authentic luxury collections and promotional vouchers.',
      categoriesCount: categoriesData.length,
      productsCount: sampleProducts.length,
    });
  } catch (err: any) {
    console.error('[Admin Seed Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to seed database.' });
  }
});

export default router;
