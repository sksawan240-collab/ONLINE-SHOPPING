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
const cspPolicy =
  "default-src 'self'; " +
  "base-uri 'self'; " +
  "frame-ancestors 'none'; " +
  "object-src 'none'; " +
  "script-src 'self'; " +
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com; " +
  "img-src 'self' data: blob: https:; " +
  "connect-src 'self' https: wss: ws:;";

async function startServer() {
  const app = express();

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Content-Security-Policy', cspPolicy);
    next();
  });

  await initDatabaseConnection();

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

  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'LuxeAttire E-Commerce API',
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath, { maxAge: '1d', etag: false }));

      app.get('/', (req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });

      app.get('*', (req: Request, res: Response) => {
        if (req.path.startsWith('/api/')) {
          return res.status(404).json({ success: false, message: 'API endpoint not found' });
        }
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      console.warn('[Server] dist directory not found. Running in development mode instead.');
    }
  }

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[Server Error]:', err);
    res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Internal server error occurred.',
      code: err.code || 'INTERNAL_ERROR',
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[LuxeAttire Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('[Fatal Server Startup Error]:', err);
  process.exit(1);
});
