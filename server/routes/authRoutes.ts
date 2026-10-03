import { Router, Response } from 'express';
import { db } from '../db/storage';
import {
  hashPassword,
  comparePassword,
  generateTokens,
  verifyRefreshToken,
  requireAuth,
  AuthenticatedRequest,
  logAuditEvent,
} from '../middleware/auth';
import { sendEmail, emailTemplates } from '../services/emailService';

const router = Router();

// POST /api/auth/register
router.post('/register', async (req, res: Response) => {
  try {
    const {
      name,
      email,
      password,
      phone = '',
      role = 'CUSTOMER',
    } = req.body || {};

    if (role !== 'CUSTOMER') {
      return res.status(403).json({
        success: false,
        message: 'Public registration is limited to Customer accounts.',
        code: 'CUSTOMER_REGISTRATION_ONLY',
      });
    }

    if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const cleanPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!cleanName || !normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({ success: false, message: 'Please enter your full name.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existing = await db.users.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists. Please sign in.' });
    }

    const passwordHash = await hashPassword(password);
    const newUser = await db.users.create({
      name: cleanName,
      email: normalizedEmail,
      passwordHash,
      role: 'CUSTOMER',
      permissions: [],
      isVerified: true,
      phone: cleanPhone,
      addresses: [],
      emailPreferences: {
        orderEmails: true,
        shipmentEmails: true,
        promotionalEmails: true,
        newLaunchEmails: true,
        newsletter: true,
      },
      sessionVersion: 1,
      lastLogin: null,
    });

    // Best-effort welcome email. A mail failure must not prevent the user from signing in.
    sendEmail({
      to: newUser.email,
      subject: 'Welcome to LuxeAttire - Exclusive Fashion & Ready-to-Wear',
      html: emailTemplates.welcome(newUser.name),
      emailType: 'WELCOME',
    }).catch((err) => console.error('[Auth Register Welcome Email Error]:', err));

    return res.status(201).json({
      success: true,
      message: 'Account created successfully. You can now sign in with your email and password.',
      email: normalizedEmail,
      role: newUser.role,
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ success: false, message: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Email + password is the only requirement to be allowed in.
    const user = await db.users.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    await db.users.findByIdAndUpdate(user._id, {
      lastLogin: new Date().toISOString(),
    });

    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      name: user.name,
      sessionVersion: user.sessionVersion,
    });

    // Set cookie
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions,
        phone: user.phone,
        avatar: user.avatar,
        addresses: user.addresses || [],
        emailPreferences: user.emailPreferences,
        isVerified: user.isVerified !== false,
      },
      tokens,
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ success: false, message: 'Sign in failed.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', async (req, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token.' });
    }

    const user = await db.users.findById(decoded.id);
    if (!user || user.sessionVersion !== decoded.sessionVersion) {
      return res.status(401).json({ success: false, message: 'Session expired.' });
    }

    const tokens = generateTokens({
      id: user._id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      name: user.name,
      sessionVersion: user.sessionVersion,
    });

    return res.status(200).json({ success: true, tokens });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to refresh token.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res: Response) => {
  res.clearCookie('accessToken');
  return res.status(200).json({ success: true, message: 'Signed out successfully.' });
});

// POST /api/auth/logout-all
router.post('/logout-all', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const user = await db.users.findById(userId);
    if (user) {
      await db.users.findByIdAndUpdate(userId, {
        sessionVersion: (user.sessionVersion || 1) + 1,
      });
    }
    res.clearCookie('accessToken');
    return res.status(200).json({ success: true, message: 'Logged out from all devices.' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to logout from all devices.' });
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.users.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const orderCount = await db.orders.countDocuments({ 'customer.id': user._id });

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        permissions: user.permissions || [],
        phone: user.phone || '',
        avatar: user.avatar || '',
        addresses: user.addresses || [],
        emailPreferences: user.emailPreferences || {},
        isVerified: !!user.isVerified,
        orderCount,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user profile.' });
  }
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, phone, emailPreferences, avatar } = req.body;
    const userId = req.user!.id;

    const updated = await db.users.findByIdAndUpdate(userId, {
      ...(name && { name: name.trim() }),
      ...(phone !== undefined && { phone: phone.trim() }),
      ...(emailPreferences && { emailPreferences }),
      ...(avatar !== undefined && { avatar }),
    });

    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        id: updated._id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
        permissions: updated.permissions,
        phone: updated.phone,
        avatar: updated.avatar,
        addresses: updated.addresses,
        emailPreferences: updated.emailPreferences,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current and new password required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await db.users.findById(req.user!.id);
    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    const newHash = await hashPassword(newPassword);
    await db.users.findByIdAndUpdate(user._id, {
      passwordHash: newHash,
      sessionVersion: (user.sessionVersion || 1) + 1,
    });

    await logAuditEvent(req.user!, 'PASSWORD_CHANGED', 'User', user._id);

    return res.status(200).json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to change password.' });
  }
});

// POST /api/auth/addresses
router.post('/addresses', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { street, city, state, postalCode, country, isDefault } = req.body;
    if (!street || !city || !postalCode) {
      return res.status(400).json({ success: false, message: 'Street, city, and postal code are required.' });
    }

    const user = await db.users.findById(req.user!.id);
    const addresses = user.addresses || [];

    const newAddress = {
      id: 'addr_' + Date.now(),
      street,
      city,
      state: state || '',
      postalCode,
      country: country || 'United States',
      isDefault: isDefault || addresses.length === 0,
    };

    if (newAddress.isDefault) {
      addresses.forEach((a: any) => (a.isDefault = false));
    }

    addresses.push(newAddress);

    await db.users.findByIdAndUpdate(user._id, { addresses });
    return res.status(201).json({ success: true, message: 'Address saved.', addresses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to add address.' });
  }
});

// DELETE /api/auth/addresses/:id
router.delete('/addresses/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.users.findById(req.user!.id);
    const addresses = (user.addresses || []).filter((a: any) => a.id !== req.params.id);
    await db.users.findByIdAndUpdate(user._id, { addresses });
    return res.status(200).json({ success: true, message: 'Address removed.', addresses });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to delete address.' });
  }
});

export default router;
