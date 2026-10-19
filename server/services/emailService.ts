import nodemailer from 'nodemailer';
import { db } from '../db/storage';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  emailType: string;
}

// Nodemailer transport initialization
function createTransporter() {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || '587', 10);
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }
  return null;
}

// Create the transporter lazily. This is important because server.ts loads dotenv
// before handling requests; creating it at module import time can incorrectly see
// EMAIL_* variables as missing and silently skip real delivery.
let transporter: any = undefined;

function getTransporter(): any {
  if (transporter === undefined) {
    transporter = createTransporter();
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, emailType }: EmailPayload): Promise<{ success: boolean; status: string; error?: string }> {
  const from = process.env.EMAIL_FROM || 'LuxeAttire <support@luxeattire.fashion>';
  let deliveryStatus = 'NOT_CONFIGURED';
  let errorMsg: string | undefined;

  try {
    const activeTransporter = getTransporter();
    if (!activeTransporter) {
      errorMsg = 'SMTP is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD, and EMAIL_FROM.';
      console.error(`[Email Service] Cannot send ${emailType} email to ${to}: ${errorMsg}`);
    } else {
      await activeTransporter.sendMail({
        from,
        to,
        subject,
        html,
      });
      deliveryStatus = 'SENT';
      console.log(`[Email Service] Sent ${emailType} email to ${to}`);
    }
  } catch (err: any) {
    console.error(`[Email Service] Failed sending email to ${to}:`, err.message);
    deliveryStatus = 'FAILED';
    errorMsg = err.message;
  }

  // Persist a log, but never persist the OTP email body in the database.
  try {
    await db.emailLogs.create({
      recipient: to,
      emailType,
      subject,
      status: deliveryStatus,
      htmlContent: emailType === 'REGISTRATION_OTP'
        ? 'Registration OTP email content redacted for security.'
        : html,
      sentAt: new Date().toISOString(),
      errorMessage: errorMsg,
    });
  } catch (logErr) {
    console.error('[Email Service] Error saving email log:', logErr);
  }

  return {
    success: deliveryStatus === 'SENT',
    status: deliveryStatus,
    error: errorMsg,
  };
}

// Email Templates generator
export const emailTemplates = {
  otpVerification(name: string, otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 36px 32px; text-align: center; color: #ffffff; }
          .logo { font-size: 26px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #fbbf24; }
          .tagline { font-size: 13px; color: #94a3b8; margin-top: 6px; letter-spacing: 1px; }
          .content { padding: 40px 32px; }
          .otp-box { background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin: 28px 0; }
          .otp-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #0f172a; font-family: monospace; }
          .footer { background: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">NAVEOR</div>
            <div class="tagline">WEAR YOUR STORY</div>
          </div>
          <div class="content">
            <h2 style="margin-top: 0; font-size: 22px; color: #0f172a;">Verify Your Email Address</h2>
            <p>Hello ${name},</p>
            <p>Thank you for joining Naveor. Please use the verification code below to confirm your account. This code is valid for <strong>10 minutes</strong>.</p>
            <div class="otp-box">
              <div class="otp-code">${otp}</div>
            </div>
            <p style="font-size: 13px; color: #64748b;">If you did not request this verification code, please disregard this email or contact support.</p>
          </div>
          <div class="footer">
            © 2026 Naveor Inc. All rights reserved. · Secure Authentication Service
          </div>
        </div>
      </body>
      </html>
    `;
  },

  welcome(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05); }
          .header { background: linear-gradient(135deg, #0f172a 0%, #312e81 100%); padding: 48px 32px; text-align: center; color: #ffffff; }
          .logo { font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #fbbf24; }
          .content { padding: 40px 32px; line-height: 1.6; }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; font-weight: 600; border-radius: 8px; margin-top: 20px; font-size: 14px; }
          .footer { background: #f8fafc; padding: 24px 32px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">NAVEOR</div>
            <h1 style="font-size: 24px; margin: 16px 0 0 0; color: #ffffff;">Welcome to the Inner Circle</h1>
          </div>
          <div class="content">
            <p>Dear ${name},</p>
            <p>Your account is now fully verified. Welcome to Naveor, where contemporary craftsmanship meets uncompromising luxury.</p>
            <p>As a valued member, enjoy tailored styling suggestions, expedited express shipping, and exclusive invitations to seasonal private sales.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}" class="btn">Explore The New Collection</a>
            </div>
          </div>
          <div class="footer">
            © 2026 Naveor Inc. · 540 Madison Ave, New York, NY 10022
          </div>
        </div>
      </body>
      </html>
    `;
  },

  orderConfirmation(order: any): string {
    const itemsHtml = order.items.map((item: any) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 12px 0;">
          <strong>${item.name}</strong><br>
          <span style="font-size: 12px; color: #64748b;">Size: ${item.size || 'Standard'} | Color: ${item.color || 'Default'} | Qty: ${item.quantity}</span>
        </td>
        <td style="padding: 12px 0; text-align: right; font-weight: 600;">$${Number(item.subtotal).toFixed(2)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 32px; text-align: center; color: #ffffff; }
          .order-id { font-size: 18px; font-weight: 700; color: #38bdf8; margin-top: 8px; }
          .content { padding: 32px; }
          .table { width: 100%; border-collapse: collapse; margin: 24px 0; }
          .totals { margin-top: 16px; border-top: 2px solid #e2e8f0; padding-top: 16px; }
          .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
          .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 22px; color: #ffffff;">Order Confirmed</h1>
            <div class="order-id">${order.orderId}</div>
          </div>
          <div class="content">
            <p>Thank you for shopping with us, <strong>${order.customer?.name}</strong>!</p>
            <p>Your order has been received and is being prepared with utmost care.</p>
            <table class="table">
              <thead>
                <tr style="text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #cbd5e1;">
                  <th style="padding-bottom: 8px;">Item</th>
                  <th style="padding-bottom: 8px; text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="totals">
              <div style="text-align: right; font-size: 14px; margin-bottom: 6px;">Subtotal: $${Number(order.subtotal).toFixed(2)}</div>
              ${order.discount > 0 ? `<div style="text-align: right; font-size: 14px; color: #16a34a; margin-bottom: 6px;">Discount: -$${Number(order.discount).toFixed(2)}</div>` : ''}
              <div style="text-align: right; font-size: 14px; margin-bottom: 6px;">Shipping: ${order.shipping === 0 ? 'Free' : `$${Number(order.shipping).toFixed(2)}`}</div>
              <div style="text-align: right; font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 8px;">Total Paid: $${Number(order.total).toFixed(2)}</div>
            </div>
            <div style="margin-top: 24px; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px;">
              <strong>Delivery Address:</strong><br>
              ${order.shippingAddress?.street || ''}, ${order.shippingAddress?.city || ''}${order.shippingAddress?.district ? `, ${order.shippingAddress.district}` : ''}, ${order.shippingAddress?.state || ''} ${order.shippingAddress?.postalCode || ''}, ${order.shippingAddress?.country || 'India'}
            </div>
            <div style="text-align: center; margin-top: 32px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/track-order?id=${order.orderId}" class="btn">Track Order Status</a>
            </div>
          </div>
          <div class="footer">
            Questions? Contact customer care at support@luxeattire.fashion
          </div>
        </div>
      </body>
      </html>
    `;
  },

  orderStatusUpdate(order: any, newStatus: string, note?: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; color: #1e293b; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
          .header { background: #0f172a; padding: 32px; text-align: center; color: #ffffff; }
          .status-badge { display: inline-block; background: #38bdf8; color: #0f172a; font-weight: 700; padding: 6px 16px; border-radius: 20px; font-size: 14px; margin-top: 12px; }
          .content { padding: 32px; }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; font-size: 14px; }
          .footer { background: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 20px; color: #ffffff;">Order Status Update</h1>
            <div class="status-badge">${newStatus.replace(/_/g, ' ')}</div>
          </div>
          <div class="content">
            <p>Dear ${order.customer?.name},</p>
            <p>Your order <strong>${order.orderId}</strong> has been updated to: <strong>${newStatus.replace(/_/g, ' ')}</strong>.</p>
            ${note ? `<div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 20px 0; font-style: italic;">"${note}"</div>` : ''}
            ${order.trackingNumber ? `<p><strong>Carrier:</strong> ${order.carrier || 'Standard Shipping'}<br><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
            <div style="text-align: center; margin-top: 28px;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/track-order?id=${order.orderId}" class="btn">View Live Tracking</a>
            </div>
          </div>
          <div class="footer">
            © 2026 LuxeAttire Inc.
          </div>
        </div>
      </body>
      </html>
    `;
  },

  newProductLaunch(product: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; }
          .image { width: 100%; height: 320px; object-fit: cover; }
          .content { padding: 32px; text-align: center; }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 12px; }
          .price { font-size: 20px; color: #0284c7; font-weight: 700; margin-bottom: 16px; }
          .btn { display: inline-block; background: #0f172a; color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          ${product.images?.[0] ? `<img src="${product.images[0]}" class="image" alt="${product.name}" />` : ''}
          <div class="content">
            <div style="font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: #64748b; margin-bottom: 8px;">New Release</div>
            <h1 class="title">${product.name}</h1>
            <div class="price">$${Number(product.salePrice || product.price).toFixed(2)}</div>
            <p style="color: #64748b; line-height: 1.6; margin-bottom: 24px;">${product.shortDescription || product.description}</p>
            <a href="${process.env.APP_URL || 'http://localhost:3000'}/products/${product.slug || product._id}" class="btn">Shop The Launch</a>
          </div>
        </div>
      </body>
      </html>
    `;
  },
};
