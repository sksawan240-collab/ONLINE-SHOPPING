# LuxeAttire — Full-Stack Clothing E-Commerce Platform

A production-ready, full-stack clothing shopping platform built with **React, TypeScript, Vite, Tailwind CSS, Node.js, Express, and MongoDB/Mongoose**, featuring role-based dashboards for **Super Administrators, Sales Managers, and Customers**.

---

## 1. Architectural Highlights

- **Dynamic Data Integrity (No Mock Data)**: All products, categories, inventories, shopping carts, unique order IDs, shipment milestones, customer reviews, promotional vouchers, email logs, and audit logs are dynamically managed and persisted in the database.
- **Three Distinct Dashboards**:
  1. **Admin Dashboard (`/admin`)**: Complete control over users, sales managers, product catalogs (with instant storefront publishing), categories, live inventory, orders & fulfillment, granular permissions, real-time analytics, storefront CMS settings, audit trails, and email logs.
  2. **Sales Manager Dashboard (`/sales-manager`)**: Operations and fulfillment portal with role permissions (`products.read`, `products.write`, `orders.read`, `orders.update`, `inventory.read`, `refunds.manage`, `shipments.manage`), pending order advancements, return processing, and low-stock alerts.
  3. **Customer Dashboard (`/account`)**: Order history, live tracking, return requests, saved delivery addresses, wishlist, profile settings, and email preferences.
- **Secure Authentication**:
  - Registration creates an active Customer account immediately; the account is granted access as soon as the submitted email and password match.
  - Admin and Sales Manager accounts are staff accounts created by an existing Admin from the Admin Dashboard. They can sign in with their assigned role and are routed to their respective dashboards.
  - Animated success handoff: registration confirms and returns to the sign-in view, then login confirms and routes each role to its own dashboard (customer `/account`, sales manager `/sales-manager`, admin `/admin`).
  - Welcome and transactional emails rendered using responsive HTML templates.
  - Password hashing with bcrypt, JWT access & refresh tokens, session versioning, and single-click "Logout from all devices".
- **Cart, Inventory & Order Management**:
  - Live inventory validation prevents overselling.
  - Server-calculated subtotals, promotional vouchers (`LUXE15`), estimated sales tax, and shipping tiers.
  - Generates unique Order IDs: `ORD-2026-XXXXXXXX`.
- **Order Tracking**:
  - Real-time milestone stepper: Placed → Confirmed → In Tailoring → Packed → Shipped → Out for Delivery → Delivered.

---

## 2. Technology Stack

### Frontend
- **Framework**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS v4, custom glassmorphism and luxury styling tokens
- **Routing**: React Router v7
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js & Express.js (TypeScript via `tsx`)
- **Authentication**: Short-lived opaque sessions held in server memory, bcrypt password hashing, and session versioning
- **Email Service**: Nodemailer SMTP integration + In-App Email Logs database
- **Storage**: Mongoose / MongoDB integration with self-contained fallback persistent document storage (`./data/luxeattire_db.json`) for seamless zero-config local execution.

---

## 3. Directory Structure

```
├── data/                       # Persistent JSON document storage
├── server/
│   ├── db/                     # Database adapter (MongoDB Mongoose + persistent storage)
│   ├── middleware/             # Auth, role-based access control, audit logging
│   ├── models/                 # Mongoose schemas (User, Product, Order, Coupon, etc.)
│   ├── routes/                 # REST API endpoints (auth, products, orders, etc.)
│   ├── services/               # Email service with responsive HTML templates
├── src/
│   ├── components/             # Reusable UI components
│   │   ├── auth/               # Email-and-password sign in / registration modal
│   │   ├── cart/               # Slide-over Cart Drawer
│   │   ├── layout/             # Header, Announcement Bar, Footer
│   │   └── product/            # ProductCard, QuickViewModal
│   ├── context/                # AuthContext, CartContext, WishlistContext
│   ├── pages/                  # Home, Catalog, ProductDetail, Checkout, Dashboards
│   ├── services/               # Frontend API client
│   └── types/                  # Shared TypeScript interfaces
├── server.ts                   # Express server entry point mounting Vite middlewares
├── package.json
└── tsconfig.json
```

---

## 4. Environment Variables (`.env`)

Copy `.env.example` to `.env` and fill in credentials as needed:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (e.g. `mongodb+srv://...`). Leave empty to use integrated persistent document store. |
| `EMAIL_HOST` | SMTP server host (e.g., `smtp.mailtrap.io` or `smtp.sendgrid.net`). |
| `EMAIL_PORT` | SMTP port (e.g., `587` or `465`). |
| `EMAIL_USER` | SMTP username. |
| `EMAIL_PASSWORD` | SMTP password / app password. |
| `EMAIL_FROM` | Sender display name and email. |
| `PORT` | Web server port (default: `3000`). |

---

## 5. Development & Production Commands

```bash
# Install dependencies
npm install

# Start development server (Full-stack Express + Vite)
npm run dev

# Run TypeScript type check
npm run lint

# Build for production
npm run build

# Start production server
npm run start
```

---

## 6. Account Registration & Catalog Seeding

1. **Customer-only Registration**: In **Create Account**, visitors can create a Customer account. Public registration rejects Admin and Sales Manager role requests. Staff accounts are created by an existing Admin from the Admin Dashboard, after which they can sign in normally.
2. **One-Click Luxury Catalog Seeding**: In the Admin Dashboard or on the Homepage empty state, click **"Seed Luxury Catalog"** to instantly populate the store with authentic luxury garments (Italian virgin wool coats, mulberry silk slips, Mongolian cashmere turtlenecks, tailored Giza poplin shirts) and active promotional discount vouchers (`LUXE15`, `WELCOME50`).
