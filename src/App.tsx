import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CartDrawer } from './components/cart/CartDrawer';
import { AuthModal } from './components/auth/AuthModal';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CheckoutPage } from './pages/CheckoutPage';

import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentFailedPage } from './pages/PaymentFailedPage';
import { PaymentPendingPage } from './pages/PaymentPendingPage';
import { OrderFailedPage } from './pages/OrderFailedPage';
import { OrderTrackingPage } from './pages/OrderTrackingPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { SalesManagerDashboard } from './pages/SalesManagerDashboard';
import { UserRole } from './types';

// Each role lands on its own dashboard only. ADMIN is checked before
// SALES_MANAGER because an admin is also treated as sales staff elsewhere.
export const dashboardPathForRole = (role: UserRole | undefined): string => {
  if (role === 'ADMIN') return '/admin';
  if (role === 'SALES_MANAGER') return '/sales-manager';
  return '/account';
};

// Role-protected Route Component
const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: string[];
  onOpenAuth: () => void;
}> = ({ children, allowedRoles, onOpenAuth }) => {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      onOpenAuth();
    }
  }, [isAuthenticated, isLoading, onOpenAuth]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-stone-900 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role || '')) {
    return (
      <div className="max-w-md mx-auto my-24 p-8 bg-white rounded-2xl border border-stone-200 text-center space-y-3">
        <h2 className="font-serif text-xl font-bold text-stone-900">Restricted Access</h2>
        <p className="text-xs text-stone-500">
          Your account role ({user?.role}) does not have permission to view this portal.
        </p>
        <button
          onClick={() => window.history.back()}
          className="mt-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold"
        >
          Return Back
        </button>
      </div>
    );
  }

  return <>{children}</>;
};

function AppContent() {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  const handleOpenAuth = (mode: 'login' | 'register' = 'login') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Runs after the login success animation: each role goes to its own dashboard only.
  const handleAuthenticated = useCallback((role: UserRole) => {
    setAuthModalOpen(false);
    navigate(dashboardPathForRole(role), { replace: false });
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9]">
      <Header onOpenAuth={() => handleOpenAuth('login')} />

      <div className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage onOpenAuth={() => handleOpenAuth('register')} />} />
          <Route path="/products" element={<CatalogPage onOpenAuth={() => handleOpenAuth('login')} />} />
          <Route path="/products/:idOrSlug" element={<ProductDetailPage onOpenAuth={() => handleOpenAuth('login')} />} />
          <Route path="/checkout" element={<CheckoutPage />} />

          {/* PayU payment result pages (server-verified) */}
          <Route path="/payment/success" element={<PaymentSuccessPage />} />
          <Route path="/payment/failed" element={<PaymentFailedPage />} />
          <Route path="/payment/pending" element={<PaymentPendingPage />} />
          <Route path="/order-failed" element={<OrderFailedPage />} />

          <Route path="/track-order" element={<OrderTrackingPage />} />

          {/* Customer Dashboard */}
          <Route
            path="/account"
            element={
              <ProtectedRoute onOpenAuth={() => handleOpenAuth('login')}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer"
            element={
              <ProtectedRoute onOpenAuth={() => handleOpenAuth('login')}>
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Admin Dashboard */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['ADMIN']} onOpenAuth={() => handleOpenAuth('login')}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Sales Manager Dashboard */}
          <Route
            path="/sales-manager"
            element={
              <ProtectedRoute allowedRoles={['SALES_MANAGER', 'ADMIN']} onOpenAuth={() => handleOpenAuth('login')}>
                <SalesManagerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>

      <Footer />

      {/* Global Slide-Over Cart Drawer */}
      <CartDrawer />

      {/* Global Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onAuthenticated={handleAuthenticated}
      />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <AppContent />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}