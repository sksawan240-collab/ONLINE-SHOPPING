import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { initDatabaseConnection } from './server/db/storage';
import authRoutes from './server/routes/authRoutes';
import productRoutes from './server/routes/productRoutes';
import categoryRoutes from './server/routes/categoryRoutes';
import cartRoutes from './server/routes/cartRoutes';
import wishlistRoutes from './server/routes/wishlistRoutes';
import orderRoutes from './server/routes/orderRoutes';
import dashboardRoutes from './server/routes/dashboardRoutes';
import adminRoutes from './server/routes/adminRoutes';
import couponRoutes from './server/routes/couponRoutes';
import reviewRoutes from './server/routes/reviewRoutes';
import notificationRoutes from './server/routes/notificationRoutes';
import emailLogRoutes from './server/routes/emailLogRoutes';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Basic security and parsing middleware
  app.use(cors({
    origin: true,
    credentials: true,
  }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Initialize Database (MongoDB via Mongoose if MONGODB_URI set, or persistent disk storage)
  await initDatabaseConnection();

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/coupons', couponRoutes);
  app.use('/api/reviews', reviewRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/emails', emailLogRoutes);

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'LuxeAttire E-Commerce API',
    });
  });

  // Centralized Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error occurred.',
      code: err.code || 'INTERNAL_ERROR',
    });
  });

  if (!isProd) {
    // Vite middleware in dev
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      // Serve static assets with proper cache headers
      app.use(express.static(distPath, {
        maxAge: '1d',
        etag: false,
      }));
      
      // Catch-all route: serve index.html for all non-API routes (SPA routing)
      app.get('*', (req: Request, res: Response) => {
        // Don't serve index.html for API requests
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ success: false, message: 'API endpoint not found' });
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[Server] dist directory not found. Running in development mode instead.');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LuxeAttire Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Fatal Server Startup Error]:', err);
  process.exit(1);
});
