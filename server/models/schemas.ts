import mongoose, { Schema } from 'mongoose';

// User Schema
export const UserSchema = new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['CUSTOMER', 'SALES_MANAGER', 'ADMIN'], default: 'CUSTOMER' },
  permissions: [{ type: String }],
  isVerified: { type: Boolean, default: true },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  addresses: [{
    id: String,
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
    isDefault: Boolean,
  }],
  emailPreferences: {
    orderEmails: { type: Boolean, default: true },
    shipmentEmails: { type: Boolean, default: true },
    promotionalEmails: { type: Boolean, default: true },
    newLaunchEmails: { type: Boolean, default: true },
    newsletter: { type: Boolean, default: true },
  },
  sessionVersion: { type: Number, default: 1 },
  lastLogin: { type: Date },
}, { timestamps: true });

// Product Schema
export const ProductSchema = new Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  description: { type: String, required: true },
  shortDescription: { type: String, default: '' },
  brand: { type: String, required: true, index: true },
  category: { type: String, required: true, index: true },
  subcategory: { type: String, default: '' },
    gender: { type: String, enum: ['Men', 'Unisex'], required: true, index: true },
  sizes: [{ type: String }], // e.g. XS, S, M, L, XL, XXL
  colors: [{
    name: String,
    hex: String,
  }],
  material: { type: String, default: '100% Premium Cotton' },
  price: { type: Number, required: true, min: 0 },
  discount: { type: Number, default: 0, min: 0, max: 100 },
  salePrice: { type: Number, required: true, min: 0 },
  sku: { type: String, required: true, unique: true, index: true },
  barcode: { type: String, default: '' },
  stock: { type: Number, required: true, default: 0, min: 0 },
  lowStockThreshold: { type: Number, default: 5 },
  tags: [{ type: String }],
  attributes: { type: Map, of: String },
  images: [{ type: String }],
  videoUrl: { type: String, default: '' },
  isFeatured: { type: Boolean, default: false },
  isNewArrival: { type: Boolean, default: false },
  isBestSeller: { type: Boolean, default: false },
  isTrending: { type: Boolean, default: false },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'PUBLISHED', index: true },
  rating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
}, { timestamps: true });

// Category Schema
export const CategorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  slug: { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  subcategories: [{ type: String }],
  isVisible: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
}, { timestamps: true });

// Order Schema
export const OrderSchema = new Schema({
  orderId: { type: String, required: true, unique: true, index: true },
  customer: {
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: String,
  },
  items: [{
    productId: { type: String, required: true },
    name: { type: String, required: true },
    sku: String,
    image: String,
    size: String,
    color: String,
    quantity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    subtotal: { type: Number, required: true },
  }],
  subtotal: { type: Number, required: true },
  discount: { type: Number, default: 0 },
  tax: { type: Number, default: 0 },
  shipping: { type: Number, default: 0 },
  total: { type: Number, required: true },
  couponCode: { type: String, default: '' },
  paymentMethod: { type: String, default: 'CARD' },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PAID' },
  orderStatus: {
    type: String,
    enum: [
      'PLACED',
      'PAYMENT_CONFIRMED',
      'CONFIRMED',
      'PROCESSING',
      'PACKED',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
      'RETURN_REQUESTED',
      'RETURNED',
      'REFUNDED'
    ],
    default: 'PLACED',
    index: true,
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String,
  },
  trackingNumber: { type: String, default: '' },
  carrier: { type: String, default: 'FedEx Express' },
  estimatedDelivery: { type: String, default: '' },
  timeline: [{
    status: String,
    note: String,
    timestamp: { type: Date, default: Date.now },
    updatedBy: String,
  }],
  returnRequest: {
    reason: String,
    status: { type: String, enum: ['NONE', 'REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'RECEIVED', 'REFUND_COMPLETED'], default: 'NONE' },
    refundAmount: Number,
    requestedAt: Date,
    processedAt: Date,
    resolutionNotes: String,
  }
}, { timestamps: true });

// Coupon Schema
export const CouponSchema = new Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true },
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], default: 'PERCENTAGE' },
  discountValue: { type: Number, required: true, min: 1 },
  minPurchase: { type: Number, default: 0 },
  maxDiscount: { type: Number },
  expiryDate: { type: Date, required: true },
  usageLimit: { type: Number, default: 100 },
  usedCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Review Schema
export const ReviewSchema = new Schema({
  productId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: { type: String, default: '' },
  comment: { type: String, required: true },
  verifiedPurchase: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },
}, { timestamps: true });

// Notification Schema
export const NotificationSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: { type: String, enum: ['ORDER', 'SHIPMENT', 'PROMO', 'ACCOUNT', 'RETURN'], default: 'ORDER' },
  link: { type: String, default: '' },
  isRead: { type: Boolean, default: false },
}, { timestamps: true });

// Email Log Schema
export const EmailLogSchema = new Schema({
  recipient: { type: String, required: true, index: true },
  emailType: { type: String, required: true },
  subject: { type: String, required: true },
  status: { type: String, enum: ['SENT', 'SIMULATED', 'FAILED'], default: 'SENT' },
  htmlContent: { type: String },
  sentAt: { type: Date, default: Date.now },
  errorMessage: { type: String },
}, { timestamps: true });

// Audit Log Schema
export const AuditLogSchema = new Schema({
  actor: {
    id: String,
    name: String,
    email: String,
    role: String,
  },
  action: { type: String, required: true },
  entity: { type: String, required: true },
  entityId: { type: String },
  metadata: { type: Schema.Types.Mixed },
  timestamp: { type: Date, default: Date.now },
});
