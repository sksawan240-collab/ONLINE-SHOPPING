export type UserRole = 'CUSTOMER' | 'SALES_MANAGER' | 'ADMIN';

export interface Address {
  id: string;
  street: string;
  city: string;
  state?: string;
  district?: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
}

export interface RegistrationData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface EmailPreferences {
  orderEmails?: boolean;
  shipmentEmails?: boolean;
  promotionalEmails?: boolean;
  newLaunchEmails?: boolean;
  newsletter?: boolean;
}

export interface User {
  id: string;
  _id?: string;
  name: string;
  email: string;
  role: UserRole;
  permissions?: string[];
  phone?: string;
  avatar?: string;
  addresses?: Address[];
  emailPreferences?: EmailPreferences;
  isVerified: boolean;
  orderCount?: number;
  createdAt?: string;
  lastLogin?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
}

export interface Product {
  _id: string;
  id?: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  brand: string;
  category: string;
  subcategory?: string;
    gender: 'Men' | 'Unisex';
  sizes: string[];
  colors: ProductColor[];
  material: string;
  price: number;
  discount: number;
  salePrice: number;
  sku: string;
  barcode?: string;
  stock: number;
  lowStockThreshold?: number;
  tags: string[];
  images: string[];
  videoUrl?: string;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  isTrending: boolean;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  rating: number;
  numReviews: number;
  createdAt?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  subcategories?: string[];
  isVisible: boolean;
  order?: number;
  productCount?: number;
}

export interface CartItem {
  itemId: string;
  productId: string;
  name: string;
  slug: string;
  sku?: string;
  image: string;
  price: number;
  originalPrice: number;
  size: string;
  color: string;
  quantity: number;
  availableStock: number;
  inStock: boolean;
}

export interface CartState {
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export enum OrderStatus {
  PLACED = 'PLACED',
  PAYMENT_CONFIRMED = 'PAYMENT_CONFIRMED',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  PACKED = 'PACKED',
  SHIPPED = 'SHIPPED',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  RETURN_REQUESTED = 'RETURN_REQUESTED',
  RETURNED = 'RETURNED',
  REFUNDED = 'REFUNDED',
  PAID = 'PAID',
}

export interface TimelineEvent {
  status: OrderStatus;
  note: string;
  timestamp: string;
  updatedBy: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku?: string;
  image?: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface ReturnRequest {
  reason?: string;
  status: 'NONE' | 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'PICKUP_SCHEDULED' | 'RECEIVED' | 'REFUND_COMPLETED';
  refundAmount?: number;
  requestedAt?: string;
  processedAt?: string;
  resolutionNotes?: string;
}

export interface Order {
  _id: string;
  orderId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  couponCode?: string;
  paymentMethod: string;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  payu?: {
    txnid?: string;
    mihpayid?: string;
    mode?: string;
    bankRef?: string;
    env?: string;
    amount?: string;
    status?: string;
    attempts?: number;
    failReason?: string;
    verifiedVia?: string;
    verifiedAt?: string;
  };
  orderStatus: OrderStatus;
  shippingAddress: Address;
  billingAddress?: Address;
  trackingNumber?: string;
  carrier?: string;
  estimatedDelivery?: string;
  timeline: TimelineEvent[];
  returnRequest?: ReturnRequest;
  createdAt: string;
}

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface PaymentSession {
  paymentId: string;
  orderId: string;
  checkoutUrl: string;
  amount: number;
  status: string;
}

export interface Coupon {
  _id: string;
  code: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  minPurchase?: number;
  maxDiscount?: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
}

export interface Review {
  _id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  title?: string;
  comment: string;
  verifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  userId: string;
  title: string;
  message: string;
  type: 'ORDER' | 'SHIPMENT' | 'PROMO' | 'ACCOUNT' | 'RETURN';
  link?: string;
  isRead: boolean;
  createdAt: string;
}

export interface EmailLog {
  _id: string;
  recipient: string;
  emailType: string;
  subject: string;
  status: 'SENT' | 'SIMULATED' | 'FAILED';
  htmlContent: string;
  sentAt: string;
  errorMessage?: string;
}

export interface AuditLog {
  _id: string;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  action: string;
  entity: string;
  entityId?: string;
  metadata?: any;
  timestamp: string;
}

export interface StoreSettings {
  hero: {
    title: string;
    subtitle: string;
    ctaText: string;
    ctaLink: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
    bannerImage: string;
    badge?: string;
  };
  announcementBar: {
    text: string;
    isActive: boolean;
  };
}