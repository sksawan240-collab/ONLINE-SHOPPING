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
import payuRoutes from './server/routes/payuRoutes';

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

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "base-uri 'self'; " +
      "object-src 'none'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "font-src 'self' data:; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self' https:;"
    );
    next();
  });

  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.use(express.json({
    limit: '10mb',
    verify: (req: any, _res, buf: Buffer) => {
      req.rawBody = buf.toString('utf8');
    },
  }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  await initDatabaseConnection();

  app.use('/api/auth', authRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/cart', cartRoutes);
  app.use('/api/wishlist', wishlistRoutes);
  app.use('/api/orders', orderRoutes);
  app.use('/api/payu', payuRoutes);

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
      app.use(express.static(distPath));
      app.get(/^(?!\/api).*/, (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    } else {
      app.get('*', (_req: Request, res: Response) => {
        res.status(404).send('Frontend build not found. Run: npm run build');
      });
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
