import { Router, Response } from 'express';
import { db } from '../db/storage';
import {
  requireAuth,
  requireRole,
  AuthenticatedRequest,
} from '../middleware/auth';

const router = Router();

// GET /api/admin/dashboard
router.get('/admin', requireAuth, requireRole('ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.orders.find();
    const products = await db.products.find();
    const users = await db.users.find();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).getTime();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const startOfYear = new Date(now.getFullYear(), 0, 1).getTime();

    let totalRevenue = 0;
    let todaySales = 0;
    let weeklySales = 0;
    let monthlySales = 0;
    let yearlySales = 0;

    let pendingOrders = 0;
    let completedOrders = 0;
    let cancelledOrders = 0;
    let returnedOrders = 0;

    const productSalesCount: Record<string, { name: string; quantity: number; revenue: number; image: string }> = {};
    const categorySales: Record<string, number> = {};

    for (const order of orders) {
      if (order.paymentStatus === 'PAID' && order.orderStatus !== 'CANCELLED') {
        const orderTotal = Number(order.total) || 0;
        totalRevenue += orderTotal;

        const orderTime = new Date(order.createdAt).getTime();
        if (orderTime >= startOfToday) todaySales += orderTotal;
        if (orderTime >= startOfWeek) weeklySales += orderTotal;
        if (orderTime >= startOfMonth) monthlySales += orderTotal;
        if (orderTime >= startOfYear) yearlySales += orderTotal;

        for (const item of order.items || []) {
          const pid = item.productId;
          if (!productSalesCount[pid]) {
            productSalesCount[pid] = {
              name: item.name,
              quantity: 0,
              revenue: 0,
              image: item.image || '',
            };
          }
          productSalesCount[pid].quantity += item.quantity;
          productSalesCount[pid].revenue += item.subtotal;
        }
      }

      if (['PLACED', 'PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(order.orderStatus)) {
        pendingOrders++;
      } else if (order.orderStatus === 'DELIVERED') {
        completedOrders++;
      } else if (order.orderStatus === 'CANCELLED') {
        cancelledOrders++;
      } else if (['RETURN_REQUESTED', 'RETURNED', 'REFUNDED'].includes(order.orderStatus)) {
        returnedOrders++;
      }
    }

    // Category Sales breakdown
    for (const p of products) {
      const sales = productSalesCount[p._id];
      if (sales) {
        const cat = p.category || 'Uncategorized';
        categorySales[cat] = (categorySales[cat] || 0) + sales.revenue;
      }
    }

    const customers = users.filter((u: any) => u.role === 'CUSTOMER');
    const newCustomers = customers.filter(
      (u: any) => new Date(u.createdAt).getTime() >= startOfMonth
    ).length;

    const lowStockProducts = products.filter(
      (p: any) => p.stock <= (p.lowStockThreshold || 5)
    );

    const topSellingProducts = Object.values(productSalesCount)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Recent orders
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 7);

    return res.status(200).json({
      success: true,
      stats: {
        totalRevenue: Number(totalRevenue.toFixed(2)),
        todaySales: Number(todaySales.toFixed(2)),
        weeklySales: Number(weeklySales.toFixed(2)),
        monthlySales: Number(monthlySales.toFixed(2)),
        yearlySales: Number(yearlySales.toFixed(2)),
        totalOrders: orders.length,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        returnedOrders,
        totalCustomers: customers.length,
        newCustomers,
        totalProducts: products.length,
        lowStockCount: lowStockProducts.length,
      },
      topSellingProducts,
      lowStockProducts: lowStockProducts.slice(0, 5),
      categorySales: Object.entries(categorySales).map(([category, revenue]) => ({ category, revenue: Number(revenue.toFixed(2)) })),
      recentOrders,
    });
  } catch (err: any) {
    console.error('[Admin Dashboard Error]:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate admin analytics.' });
  }
});

// GET /api/sales-manager/dashboard
router.get('/sales-manager', requireAuth, requireRole('SALES_MANAGER', 'ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orders = await db.orders.find();
    const products = await db.products.find();

    const pendingOrders = orders.filter((o: any) =>
      ['PLACED', 'PAYMENT_CONFIRMED', 'CONFIRMED', 'PROCESSING', 'PACKED'].includes(o.orderStatus)
    );

    const readyToShip = orders.filter((o: any) => o.orderStatus === 'PACKED');
    const returnRequests = orders.filter((o: any) => o.orderStatus === 'RETURN_REQUESTED');
    const lowStock = products.filter((p: any) => p.stock <= (p.lowStockThreshold || 5));

    const todayOrders = orders.filter((o: any) => {
      const today = new Date().toDateString();
      return new Date(o.createdAt).toDateString() === today;
    });

    const todayRevenue = todayOrders
      .filter((o: any) => o.paymentStatus === 'PAID')
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    return res.status(200).json({
      success: true,
      stats: {
        totalOrders: orders.length,
        pendingCount: pendingOrders.length,
        readyToShipCount: readyToShip.length,
        returnsCount: returnRequests.length,
        lowStockCount: lowStock.length,
        todayOrdersCount: todayOrders.length,
        todayRevenue: Number(todayRevenue.toFixed(2)),
      },
      recentPending: pendingOrders.slice(0, 8),
      lowStockItems: lowStock.slice(0, 8),
      returnRequests: returnRequests.slice(0, 5),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales manager dashboard.' });
  }
});

// GET /api/customer/dashboard
router.get('/customer', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userOrders = await db.orders.find({ 'customer.id': userId });

    const totalSpent = userOrders
      .filter((o: any) => o.paymentStatus === 'PAID')
      .reduce((sum: number, o: any) => sum + (o.total || 0), 0);

    const activeOrders = userOrders.filter((o: any) =>
      !['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(o.orderStatus)
    );

    const deliveredOrders = userOrders.filter((o: any) => o.orderStatus === 'DELIVERED');

    const recentOrders = [...userOrders]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    const unreadNotifications = await db.notifications.countDocuments({ userId, isRead: false });

    return res.status(200).json({
      success: true,
      stats: {
        totalOrders: userOrders.length,
        activeOrdersCount: activeOrders.length,
        deliveredCount: deliveredOrders.length,
        totalSpent: Number(totalSpent.toFixed(2)),
        unreadNotifications,
      },
      recentOrders,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customer overview.' });
  }
});

export default router;
