import { Router, Response } from 'express';
import { db } from '../db/storage';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/notifications
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await db.notifications.find({ userId }, { sort: { createdAt: -1 } });
    const unreadCount = notifications.filter(n => !n.isRead).length;

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications.' });
  }
});

// PATCH /api/notifications/mark-all-read
router.patch('/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const notifications = await db.notifications.find({ userId });
    for (const n of notifications) {
      if (!n.isRead) {
        await db.notifications.findByIdAndUpdate(n._id, { isRead: true });
      }
    }
    return res.status(200).json({ success: true, message: 'All notifications marked as read.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update notifications.' });
  }
});

// PATCH /api/notifications/:id/read
router.patch('/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.notifications.findByIdAndUpdate(req.params.id, { isRead: true });
    return res.status(200).json({ success: true, notification: updated });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

export default router;
