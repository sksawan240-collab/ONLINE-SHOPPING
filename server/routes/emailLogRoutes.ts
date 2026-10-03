import { Router, Response } from 'express';
import { db } from '../db/storage';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/emails/logs
router.get('/logs', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    let logs = await db.emailLogs.find({}, { sort: { sentAt: -1 } });

    // Non-staff only see emails sent to their email
    if (user.role !== 'ADMIN' && user.role !== 'SALES_MANAGER') {
      logs = logs.filter((l: any) => l.recipient?.toLowerCase() === user.email.toLowerCase());
    }

    return res.status(200).json({
      success: true,
      logs: logs.slice(0, 50),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve email logs.' });
  }
});

export default router;
