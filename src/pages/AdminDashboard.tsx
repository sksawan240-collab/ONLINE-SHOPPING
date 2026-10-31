import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart3,
  Package,
  Layers,
  ShoppingBag,
  Users,
  Settings,
  Shield,
  Truck,
  Plus,
  Edit,
  Trash2,
  Search,
  Eye,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Mail,
  FileText,
  DollarSign,
  TrendingUp,
  X,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import { Product, Category, Order, User, EmailLog, AuditLog, StoreSettings, OrderStatus } from '../types';
import { useAuth } from '../context/AuthContext';

const getStatusClass = (status: OrderStatus | undefined) => {
  switch (status) {
    case 'PLACED':
    case 'CONFIRMED':
      return 'bg-stone-100 text-stone-800';
    case 'PROCESSING':
    case 'PACKED':
      return 'bg-blue-100 text-blue-800';
    case 'SHIPPED':
    case 'OUT_FOR_DELIVERY':
      return 'bg-amber-100 text-amber-800';
    case 'DELIVERED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-stone-100 text-stone-800';
  }
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'analytics' | 'products' | 'categories' | 'inventory' | 'orders' | 'payments' | 'users' | 'cms' | 'audit' | 'emails'>('analytics');

  // Analytics State
  const [stats, setStats] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [categorySales, setCategorySales] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form State
  const [pName, setPName] = useState('');
  const [pBrand, setPBrand] = useState('Luxe Atelier');
  const [pCategory, setPCategory] = useState('Outerwear & Coats');
    const [pGender, setPGender] = useState<'Men' | 'Unisex'>('Men');
  const [pPrice, setPPrice] = useState('350');
  const [pDiscount, setPDiscount] = useState('0');
  const [pStock, setPStock] = useState('20');
  const [pLowStock, setPLowStock] = useState('5');
  const [pSku, setPSku] = useState('');
  const [pDesc, setPDesc] = useState('');
  const [pShortDesc, setPShortDesc] = useState('');
  const [pMaterial, setPMaterial] = useState('100% Cashmere & Virgin Wool');
  const [pSizes, setPSizes] = useState('S, M, L, XL');
  const [pColors, setPColors] = useState('Camel, Black, Charcoal');
  const [pImages, setPImages] = useState('');
  const [pStatus, setPStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED');
  const [pIsFeatured, setPIsFeatured] = useState(true);
  const [pIsNewArrival, setPIsNewArrival] = useState(true);
  const [pNotify, setPNotify] = useState(false);

  // Categories State
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCatModal, setShowCatModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImg, setCatImg] = useState('');

  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderStatusUpdate, setOrderStatusUpdate] = useState<OrderStatus | ''>('');
  const [orderCarrierUpdate, setOrderCarrierUpdate] = useState('');
  const [orderTrackingUpdate, setOrderTrackingUpdate] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Users State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserRole, setNewUserRole] = useState<'CUSTOMER' | 'SALES_MANAGER'>('SALES_MANAGER');
  const [newUserPerms, setNewUserPerms] = useState<string[]>([
    'products.read',
    'orders.read',
    'orders.update',
    'inventory.read',
  ]);

  // CMS Settings State
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroCta, setHeroCta] = useState('');
  const [heroBanner, setHeroBanner] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const [cmsMsg, setCmsMsg] = useState<string | null>(null);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Email Logs State
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [previewEmail, setPreviewEmail] = useState<EmailLog | null>(null);

  // Quick Seed status
  const [seeding, setSeeding] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  // PayU transactions state
  const [payuTxns, setPayuTxns] = useState<any[]>([]);
  const [payuLoading, setPayuLoading] = useState(false);
  const [payuSearch, setPayuSearch] = useState('');
  const [payuStatus, setPayuStatus] = useState('');
  const [payuMsg, setPayuMsg] = useState<string | null>(null);

  const loadPayuTxns = async () => {
    setPayuLoading(true); setPayuMsg(null);
    try {
      const res = await api.payments.payuAdminTransactions({ search: payuSearch || undefined, status: payuStatus || undefined, limit: 50 });
      if (res.success) setPayuTxns(res.transactions || []);
    } catch (e: any) {
      setPayuMsg(e?.message || 'Failed to load PayU transactions.');
    } finally { setPayuLoading(false); }
  };

  const handlePayuVerify = async (orderId: string) => {
    setPayuMsg(null);
    try {
      const res = await api.payments.payuAdminVerify(orderId);
      if (res.success) {
        setPayuMsg(`PayU verification for ${orderId}: ${(res.payuResult as any)?.status || 'checked'}. Order is now ${(res.order as any)?.paymentStatus}.`);
        loadPayuTxns();
      }
    } catch (e: any) {
      setPayuMsg(e?.message || 'Verification failed.');
    }
  };

  // 1. Load Analytics
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const res = await api.dashboard.admin();
      if (res.success) {
        setStats(res.stats);
        setTopProducts(res.topSellingProducts || []);
        setLowStockProducts(res.lowStockProducts || []);
        setCategorySales(res.categorySales || []);
        setRecentOrders(res.recentOrders || []);
      }
    } finally {
      setAnalyticsLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  // 2. Load tab specific data
  useEffect(() => {
    if (activeTab === 'products' || activeTab === 'inventory') {
      setProductsLoading(true);
      api.products.list({ limit: 100 })
        .then(res => res.success && setProducts(res.products || []))
        .finally(() => setProductsLoading(false));
    }
    if (activeTab === 'categories') {
      api.categories.list().then(res => res.success && setCategories(res.categories || []));
    }
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      api.orders.list({ limit: 100 })
        .then(res => res.success && setOrders(res.orders || []))
        .finally(() => setOrdersLoading(false));
    }
    if (activeTab === 'users') {
      setUsersLoading(true);
      api.admin.getUsers({ role: userRoleFilter || undefined })
        .then(res => res.success && setUsersList(res.users || []))
        .finally(() => setUsersLoading(false));
    }
    if (activeTab === 'cms') {
      api.admin.getSettings().then(res => {
        if (res.success && res.settings) {
          setSettings(res.settings);
          setHeroTitle(res.settings.hero.title);
          setHeroSubtitle(res.settings.hero.subtitle);
          setHeroCta(res.settings.hero.ctaText);
          setHeroBanner(res.settings.hero.bannerImage);
          setAnnouncementText(res.settings.announcementBar?.text || '');
        }
      });
    }
    if (activeTab === 'audit') {
      api.admin.getAuditLogs().then(res => res.success && setAuditLogs(res.logs || []));
    }
    if (activeTab === 'payments') {
      loadPayuTxns();
    }
    if (activeTab === 'emails') {
      api.emails.list().then(res => res.success && setEmailLogs(res.logs || []));
    }
  }, [activeTab, userRoleFilter]);

  // Product Create/Edit Handler
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const sizesArr = pSizes.split(',').map(s => s.trim()).filter(Boolean);
    const colorsArr = pColors.split(',').map(c => ({ name: c.trim(), hex: '#1c1917' })).filter(c => c.name);
    const imagesArr = pImages.split('\n').map(i => i.trim()).filter(Boolean);

    const payload = {
      name: pName,
      brand: pBrand,
      category: pCategory,
      gender: pGender,
      price: parseFloat(pPrice),
      discount: parseFloat(pDiscount) || 0,
      stock: parseInt(pStock, 10) || 0,
      lowStockThreshold: parseInt(pLowStock, 10) || 5,
      sku: pSku.trim() || undefined,
      description: pDesc,
      shortDescription: pShortDesc,
      material: pMaterial,
      sizes: sizesArr.length > 0 ? sizesArr : ['S', 'M', 'L', 'XL'],
      colors: colorsArr.length > 0 ? colorsArr : [{ name: 'Default', hex: '#000' }],
      images: imagesArr.length > 0 ? imagesArr : ['https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=800'],
      status: pStatus,
      isFeatured: pIsFeatured,
      isNewArrival: pIsNewArrival,
      notifySubscribers: pNotify,
    };

    try {
      if (editingProduct) {
        await api.products.update(editingProduct._id, payload);
      } else {
        await api.products.create(payload);
      }
      setShowProductModal(false);
      setEditingProduct(null);
      // Reload list
      const res = await api.products.list({ limit: 100 });
      if (res.success) setProducts(res.products || []);
      loadAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    }
  };

  const handleEditProductClick = (prod: Product) => {
    setEditingProduct(prod);
    setPName(prod.name);
    setPBrand(prod.brand);
    setPCategory(prod.category);
    setPGender(prod.gender);
    setPPrice(String(prod.price));
    setPDiscount(String(prod.discount));
    setPStock(String(prod.stock));
    setPLowStock(String(prod.lowStockThreshold || 5));
    setPSku(prod.sku);
    setPDesc(prod.description);
    setPShortDesc(prod.shortDescription || '');
    setPMaterial(prod.material);
    setPSizes(prod.sizes?.join(', ') || 'S, M, L, XL');
    setPColors(prod.colors?.map(c => typeof c === 'string' ? c : c.name).join(', ') || 'Black');
    setPImages(prod.images?.join('\n') || '');
    setPStatus(prod.status === 'ARCHIVED' ? 'DRAFT' : prod.status);
    setPIsFeatured(prod.isFeatured);
    setPIsNewArrival(prod.isNewArrival);
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Permanently remove this luxury piece from catalog and database?')) return;
    try {
      await api.products.delete(id);
      setProducts(products.filter(p => p._id !== id));
      loadAnalytics();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  // Category Save
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.categories.create({
        name: catName,
        description: catDesc,
        image: catImg || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=600',
        isVisible: true,
      });
      if (res.success) {
        setShowCatModal(false);
        setCatName('');
        setCatDesc('');
        setCatImg('');
        const catRes = await api.categories.list();
        if (catRes.success) setCategories(catRes.categories);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  // Order Status Update
  const handleUpdateOrderStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !orderStatusUpdate) return;
    try {
      const res = await api.orders.updateStatus(selectedOrder._id, orderStatusUpdate, {
        carrier: orderCarrierUpdate || selectedOrder.carrier,
        trackingNumber: orderTrackingUpdate || selectedOrder.trackingNumber,
        note: statusNote || undefined,
      });
      if (res.success) {
        setSelectedOrder(res.order);
        setOrders(orders.map(o => o._id === res.order._id ? res.order : o));
        setStatusNote('');
        loadAnalytics();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update order status');
    }
  };

  // User Management
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.admin.createUser({
        name: newUserName,
        email: newUserEmail,
        password: newUserPass,
        role: newUserRole,
        permissions: newUserRole === 'SALES_MANAGER' ? newUserPerms : [],
      });
      if (res.success) {
        setShowCreateUserModal(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPass('');
        const userRes = await api.admin.getUsers();
        if (userRes.success) setUsersList(userRes.users);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleToggleUserRole = async (targetUser: User, newRole: 'CUSTOMER' | 'SALES_MANAGER' | 'ADMIN') => {
    try {
      const res = await api.admin.updateUser(targetUser.id || targetUser._id!, {
        role: newRole,
        permissions: newRole === 'SALES_MANAGER' ? ['products.read', 'orders.read', 'inventory.read'] : [],
      });
      if (res.success) {
        setUsersList(usersList.map(u => (u.id === targetUser.id || u._id === targetUser._id) ? res.user : u));
      }
    } catch (err: any) {
      alert(err.message || 'Failed to change role');
    }
  };

  // CMS Save
  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.admin.updateSettings({
        hero: {
          title: heroTitle,
          subtitle: heroSubtitle,
          ctaText: heroCta,
          ctaLink: '/products',
          bannerImage: heroBanner,
        },
        announcementBar: {
          text: announcementText,
          isActive: true,
        },
      });
      if (res.success) {
        setCmsMsg('Storefront CMS settings published successfully.');
        setTimeout(() => setCmsMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    }
  };

  // 1-Click Database Seed
  const handleSeedCatalog = async () => {
    try {
      setSeeding(true);
      const res = await api.admin.seedCatalog(true);
      if (res.success) {
        setSeedSuccess(`Catalog populated with ${res.productsCount} luxury items and ${res.categoriesCount} categories.`);
        loadAnalytics();
        setTimeout(() => setSeedSuccess(null), 5000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to seed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-100/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header Bar */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-stone-900 text-white rounded-xl shadow-xs">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-stone-900">Administrator Control Center</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                  Full Authority
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Logged in as <strong>{user?.name}</strong> · Live database connection active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSeedCatalog}
              disabled={seeding}
              className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              title="Populates initial luxury clothing collections, categories, and active discount vouchers"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{seeding ? 'Populating...' : 'Seed Luxury Catalog'}</span>
            </button>
            <Link
              to="/"
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Client Storefront
            </Link>
          </div>
        </div>

        {seedSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{seedSuccess}</span>
          </div>
        )}

        {/* Admin Tab Switcher */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-2 border-b border-stone-200/80">
          {[
            { id: 'analytics', label: 'Analytics & Overview', icon: BarChart3 },
            { id: 'products', label: 'Products Catalog', icon: Package },
            { id: 'categories', label: 'Categories', icon: Layers },
            { id: 'inventory', label: 'Stock & Inventory', icon: AlertTriangle },
            { id: 'orders', label: 'Orders & Shipments', icon: ShoppingBag },
            { id: 'payments', label: 'PayU Payments', icon: DollarSign },
            { id: 'users', label: 'Users & Roles', icon: Users },
            { id: 'cms', label: 'Store CMS & Hero', icon: Settings },
            { id: 'audit', label: 'Audit Trail', icon: FileText },
            { id: 'emails', label: 'Email Logs & Templates', icon: Mail },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'bg-white text-stone-600 hover:bg-stone-50 border border-stone-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: ANALYTICS OVERVIEW */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-stone-500 font-medium">Total Gross Revenue</span>
                  <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                </div>
                <p className="text-2xl font-bold font-serif text-stone-900 mt-2">
                  ₹{stats?.totalRevenue ? stats.totalRevenue.toFixed(2) : '0.00'}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">Today: ₹{stats?.todaySales ? stats.todaySales.toFixed(2) : '0.00'}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-stone-500 font-medium">Total Orders Placed</span>
                  <div className="p-2 bg-blue-50 text-blue-700 rounded-lg"><ShoppingBag className="w-4 h-4" /></div>
                </div>
                <p className="text-2xl font-bold font-serif text-stone-900 mt-2">
                  {stats?.totalOrders || 0}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">Pending: {stats?.pendingOrders || 0} · Completed: {stats?.completedOrders || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-stone-500 font-medium">Verified Customers</span>
                  <div className="p-2 bg-amber-50 text-amber-700 rounded-lg"><Users className="w-4 h-4" /></div>
                </div>
                <p className="text-2xl font-bold font-serif text-stone-900 mt-2">
                  {stats?.totalCustomers || 0}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">New This Month: {stats?.newCustomers || 0}</p>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
                <div className="flex justify-between items-start">
                  <span className="text-xs text-stone-500 font-medium">Active Catalog Pieces</span>
                  <div className="p-2 bg-stone-100 text-stone-800 rounded-lg"><Package className="w-4 h-4" /></div>
                </div>
                <p className="text-2xl font-bold font-serif text-stone-900 mt-2">
                  {stats?.totalProducts || 0}
                </p>
                <p className="text-[11px] text-rose-600 mt-1">Low Stock Alerts: {stats?.lowStockCount || 0}</p>
              </div>
            </div>

            {/* Performance Breakdowns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Sales Breakdown */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
                <h3 className="font-serif text-base font-bold text-stone-900">Revenue by Category</h3>
                {categorySales.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-8 text-center">No sales data recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {categorySales.map((cat, i) => (
                      <div key={i} className="text-xs space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className="text-stone-800">{cat.category}</span>
                          <span className="text-stone-900">${cat.revenue.toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-stone-900 h-full rounded-full"
                            style={{
                              width: `${Math.min(100, (cat.revenue / (stats?.totalRevenue || 1)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low Stock Alerts */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
                <h3 className="font-serif text-base font-bold text-stone-900">Inventory Alerts</h3>
                {lowStockProducts.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-8 text-center">All atelier inventory levels are healthy.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {lowStockProducts.map(p => (
                      <div key={p._id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-stone-900">{p.name}</p>
                          <p className="text-[11px] text-stone-500 font-mono">SKU: {p.sku}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">
                          {p.stock} units left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Orders Table */}
            <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
              <h3 className="font-serif text-base font-bold text-stone-900">Latest Customer Orders</h3>
              {recentOrders.length === 0 ? (
                <p className="text-xs text-stone-400 italic py-8 text-center">No orders placed yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-stone-50 text-stone-500 font-semibold border-b border-stone-200">
                      <tr>
                        <th className="p-3">Order ID</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Amount</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {recentOrders.map(o => (
                        <tr key={o._id} className="hover:bg-stone-50/50">
                          <td className="p-3 font-mono font-bold text-stone-900">{o.orderId}</td>
                          <td className="p-3">{o.customer?.name} ({o.customer?.email})</td>
                          <td className="p-3 font-bold">${Number(o.total).toFixed(2)}</td>
                                                    <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusClass(o.orderStatus)}`}>
                              {o.orderStatus?.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-stone-500">{new Date(o.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: PRODUCTS MANAGEMENT */}
        {activeTab === 'products' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">Atelier Products Catalog</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Products created here instantly become visible on the public client storefront.
                </p>
              </div>

              <button
                onClick={() => {
                  setEditingProduct(null);
                  setPName('');
                  setPPrice('250');
                  setPStock('15');
                  setPDesc('');
                  setPImages('');
                  setShowProductModal(true);
                }}
                className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Product</span>
              </button>
            </div>

            {/* Products Table */}
            {productsLoading ? (
              <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
            ) : products.length === 0 ? (
              <div className="text-center py-16 px-4 border border-dashed border-stone-200 rounded-xl">
                <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                <h3 className="font-semibold text-stone-800 text-sm">No products in catalog</h3>
                <p className="text-xs text-stone-500 mt-1">Click "Create New Product" or "Seed Luxury Catalog" above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b border-stone-200">
                    <tr>
                      <th className="p-3">Piece</th>
                      <th className="p-3">SKU</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Gender</th>
                      <th className="p-3">Price</th>
                      <th className="p-3">Stock</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {products.map(prod => (
                      <tr key={prod._id} className="hover:bg-stone-50/50">
                        <td className="p-3 flex items-center space-x-3">
                          <img
                            src={prod.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=100'}
                            alt=""
                            className="w-10 h-12 object-cover rounded-md flex-shrink-0"
                          />
                          <div>
                            <p className="font-semibold text-stone-900 line-clamp-1">{prod.name}</p>
                            <p className="text-[11px] text-stone-500">{prod.brand}</p>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-stone-500">{prod.sku}</td>
                        <td className="p-3">{prod.category}</td>
                        <td className="p-3">{prod.gender}</td>
                        <td className="p-3 font-bold text-stone-900">
                          ${(prod.salePrice || prod.price).toFixed(2)}
                          {prod.discount > 0 && <span className="text-[10px] text-amber-700 ml-1">(-{prod.discount}%)</span>}
                        </td>
                        <td className="p-3">
                          <span className={`font-semibold ${prod.stock <= 5 ? 'text-rose-600' : 'text-stone-700'}`}>
                            {prod.stock} units
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            prod.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'
                          }`}>
                            {prod.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          <button
                            onClick={() => handleEditProductClick(prod)}
                            className="p-1.5 text-stone-600 hover:text-stone-950 rounded hover:bg-stone-100"
                            title="Edit Product"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod._id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded hover:bg-stone-100"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Product Modal (Create / Edit) */}
            {showProductModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto animate-fade-in">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center pb-2 border-b border-stone-200">
                    <h3 className="font-serif text-lg font-bold text-stone-900">
                      {editingProduct ? 'Edit Atelier Garment' : 'Create New Luxury Piece'}
                    </h3>
                    <button onClick={() => setShowProductModal(false)} className="text-stone-400 hover:text-stone-700">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block font-semibold text-stone-800 mb-1">Product Title *</label>
                        <input
                          type="text"
                          required
                          value={pName}
                          onChange={e => setPName(e.target.value)}
                          placeholder="e.g. Double-Faced Cashmere Overcoat"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Brand Name *</label>
                        <input
                          type="text"
                          required
                          value={pBrand}
                          onChange={e => setPBrand(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Category *</label>
                        <input
                          type="text"
                          required
                          value={pCategory}
                          onChange={e => setPCategory(e.target.value)}
                          placeholder="e.g. Outerwear & Coats"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Gender *</label>
                        <select
                          value={pGender}
                          onChange={e => setPGender(e.target.value as any)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        >
                                                    <option value="Men">Men</option>
                          <option value="Unisex">Unisex</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">SKU (Leave empty to auto-generate)</label>
                        <input
                          type="text"
                          value={pSku}
                          onChange={e => setPSku(e.target.value)}
                          placeholder="LUXE-OUT-001"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Base Price ($) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={pPrice}
                          onChange={e => setPPrice(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Discount (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={pDiscount}
                          onChange={e => setPDiscount(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Stock Quantity *</label>
                        <input
                          type="number"
                          required
                          value={pStock}
                          onChange={e => setPStock(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Low-Stock Alert Threshold</label>
                        <input
                          type="number"
                          value={pLowStock}
                          onChange={e => setPLowStock(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Available Sizes (Comma-separated)</label>
                        <input
                          type="text"
                          value={pSizes}
                          onChange={e => setPSizes(e.target.value)}
                          placeholder="XS, S, M, L, XL"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Colors (Comma-separated)</label>
                        <input
                          type="text"
                          value={pColors}
                          onChange={e => setPColors(e.target.value)}
                          placeholder="Midnight Charcoal, Camel, Noir"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block font-semibold text-stone-800 mb-1">Fabric & Material</label>
                        <input
                          type="text"
                          value={pMaterial}
                          onChange={e => setPMaterial(e.target.value)}
                          placeholder="e.g. 100% Grade-A Pure Mongolian Cashmere"
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block font-semibold text-stone-800 mb-1">Image URLs (One per line)</label>
                        <textarea
                          rows={2}
                          value={pImages}
                          onChange={e => setPImages(e.target.value)}
                          placeholder="https://images.unsplash.com/photo-..."
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono"
                        />
                      </div>

                      <div className="col-span-2">
                        <label className="block font-semibold text-stone-800 mb-1">Detailed Description</label>
                        <textarea
                          rows={3}
                          required
                          value={pDesc}
                          onChange={e => setPDesc(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                      </div>

                      <div>
                        <label className="block font-semibold text-stone-800 mb-1">Publication Status</label>
                        <select
                          value={pStatus}
                          onChange={e => setPStatus(e.target.value as any)}
                          className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        >
                          <option value="PUBLISHED">PUBLISHED (Immediately live in store)</option>
                          <option value="DRAFT">DRAFT (Hidden from catalog)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-4 pt-4">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pIsFeatured}
                            onChange={e => setPIsFeatured(e.target.checked)}
                          />
                          <span>Featured</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pIsNewArrival}
                            onChange={e => setPIsNewArrival(e.target.checked)}
                          />
                          <span>New Arrival</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={pNotify}
                            onChange={e => setPNotify(e.target.checked)}
                          />
                          <span>Dispatch Launch Emails</span>
                        </label>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
                      <button
                        type="button"
                        onClick={() => setShowProductModal(false)}
                        className="px-4 py-2 border rounded-lg text-xs font-semibold text-stone-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
                      >
                        Save Product
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CATEGORIES */}
        {activeTab === 'categories' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">Categories Management</h2>
                <p className="text-xs text-stone-500 mt-0.5">Define department collections and showcase graphics.</p>
              </div>
              <button
                onClick={() => setShowCatModal(true)}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-stone-800"
              >
                <Plus className="w-4 h-4" />
                <span>Add Category</span>
              </button>
            </div>

            {categories.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-8 text-center">No categories created yet.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {categories.map(cat => (
                  <div key={cat._id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex gap-4">
                    <img
                      src={cat.image || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=200'}
                      alt=""
                      className="w-16 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-serif text-sm font-bold text-stone-900">{cat.name}</h4>
                      <p className="text-xs text-stone-500 mt-1 line-clamp-2">{cat.description}</p>
                      <p className="text-[10px] text-amber-800 font-semibold mt-2">{cat.productCount || 0} Products Attached</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Category Modal */}
            {showCatModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-base font-bold text-stone-900">Create New Category</h3>
                    <button onClick={() => setShowCatModal(false)}><X className="w-5 h-5 text-stone-400" /></button>
                  </div>
                  <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Category Name *</label>
                      <input
                        type="text"
                        required
                        value={catName}
                        onChange={e => setCatName(e.target.value)}
                        placeholder="e.g. Evening Silk Gowns"
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={catDesc}
                        onChange={e => setCatDesc(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Banner Image URL</label>
                      <input
                        type="text"
                        value={catImg}
                        onChange={e => setCatImg(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowCatModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-stone-900 text-white rounded-lg">Save Category</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INVENTORY MANAGEMENT */}
        {activeTab === 'inventory' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">Real-Time Stock & Inventory</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Every unit purchased in checkout dynamically decrements inventory. Low stock alert triggered at threshold.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b">
                  <tr>
                    <th className="p-3">Garment</th>
                    <th className="p-3">SKU</th>
                    <th className="p-3">Current Stock</th>
                    <th className="p-3">Low-Stock Threshold</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Quick Stock Adjustment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {products.map(p => (
                    <tr key={p._id} className="hover:bg-stone-50/50">
                      <td className="p-3 font-semibold text-stone-900">{p.name}</td>
                      <td className="p-3 font-mono text-[11px] text-stone-500">{p.sku}</td>
                      <td className="p-3 font-bold text-stone-900">{p.stock} units</td>
                      <td className="p-3 text-stone-500">{p.lowStockThreshold || 5} units</td>
                      <td className="p-3">
                        {p.stock <= 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700">Out of Stock</span>
                        ) : p.stock <= (p.lowStockThreshold || 5) ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800">Low Stock Alert</span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700">Optimal</span>
                        )}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        <button
                          onClick={async () => {
                            const newStock = Math.max(0, p.stock - 1);
                            await api.products.update(p._id, { stock: newStock });
                            setProducts(products.map(item => item._id === p._id ? { ...item, stock: newStock } : item));
                          }}
                          className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 rounded text-xs font-bold"
                          title="Decrement stock"
                        >
                          -1
                        </button>
                        <button
                          onClick={async () => {
                            const newStock = p.stock + 5;
                            await api.products.update(p._id, { stock: newStock });
                            setProducts(products.map(item => item._id === p._id ? { ...item, stock: newStock } : item));
                          }}
                          className="px-2.5 py-1 bg-stone-900 text-white hover:bg-stone-800 rounded text-xs font-bold"
                          title="Restock +5"
                        >
                          +5
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ORDERS & SHIPMENTS */}
        {activeTab === 'orders' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">Order & Consignment Management</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Update live order tracking milestones, assign tracking numbers, and process client returns.
                </p>
              </div>
            </div>

            {ordersLoading ? (
              <div className="h-48 bg-stone-100 rounded-xl animate-pulse" />
            ) : orders.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-8 text-center">No orders registered in database yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-stone-50 text-stone-600 font-semibold border-b">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Total</th>
                      <th className="p-3">Payment</th>
                      <th className="p-3">Order Status</th>
                      <th className="p-3">Tracking</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {orders.map(o => (
                      <tr key={o._id} className="hover:bg-stone-50/50">
                        <td className="p-3 font-mono font-bold text-stone-900">{o.orderId}</td>
                        <td className="p-3">
                          <p className="font-semibold text-stone-900">{o.customer?.name}</p>
                          <p className="text-[11px] text-stone-500">{o.customer?.email}</p>
                        </td>
                        <td className="p-3 font-bold">${Number(o.total).toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            o.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {o.paymentStatus}
                          </span>
                        </td>
                                                <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getStatusClass(o.orderStatus)}`}>
                            {o.orderStatus?.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-stone-500">
                          {o.trackingNumber || 'Unassigned'}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setSelectedOrder(o);
                              setOrderStatusUpdate(o.orderStatus);
                              setOrderCarrierUpdate(o.carrier || 'DHL Express');
                              setOrderTrackingUpdate(o.trackingNumber || '');
                            }}
                            className="px-3 py-1 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
                          >
                            Update Status
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Order Status Update Modal */}
            {selectedOrder && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
                  <div className="flex justify-between items-center border-b pb-2">
                    <h3 className="font-serif text-base font-bold text-stone-900">
                      Manage Consignment: {selectedOrder.orderId}
                    </h3>
                    <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-stone-400" /></button>
                  </div>

                  <form onSubmit={handleUpdateOrderStatus} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Status Milestone</label>
                      <select
                        value={orderStatusUpdate}
                        onChange={e => setOrderStatusUpdate(e.target.value as OrderStatus)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      >
                        <option value="PLACED">PLACED</option>
                        <option value="CONFIRMED">CONFIRMED (Atelier approved)</option>
                        <option value="PROCESSING">PROCESSING (In Tailoring/Picking)</option>
                        <option value="PACKED">PACKED (Inspection Complete)</option>
                        <option value="SHIPPED">SHIPPED (Handed to Carrier)</option>
                        <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                        <option value="DELIVERED">DELIVERED</option>
                        <option value="CANCELLED">CANCELLED (Restocks Inventory)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Carrier Name</label>
                      <input
                        type="text"
                        value={orderCarrierUpdate}
                        onChange={e => setOrderCarrierUpdate(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Tracking Number / Waybill</label>
                      <input
                        type="text"
                        value={orderTrackingUpdate}
                        onChange={e => setOrderTrackingUpdate(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg font-mono"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">Timeline Audit Note</label>
                      <input
                        type="text"
                        value={statusNote}
                        onChange={e => setStatusNote(e.target.value)}
                        placeholder="e.g. Scanned at Milan Logistics Hub"
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setSelectedOrder(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-stone-900 text-white rounded-lg">Apply Milestone</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: PAYU PAYMENTS */}
        {activeTab === 'payments' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">PayU Transactions</h2>
                <p className="text-xs text-stone-500 mt-0.5">Successful, failed and pending payments. Status changes only after PayU server verification.</p>
              </div>
              <button onClick={loadPayuTxns} className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5">
                <RefreshCw className={`w-4 h-4 ${payuLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                <input value={payuSearch} onChange={e => setPayuSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadPayuTxns()} placeholder="Search order ID, TXN, PayU ID, email…" className="w-full pl-9 pr-3 py-2 bg-stone-50 border rounded-xl text-xs" />
              </div>
              <select value={payuStatus} onChange={e => setPayuStatus(e.target.value)} className="px-3 py-2 bg-stone-50 border rounded-xl text-xs">
                <option value="">All statuses</option>
                <option value="SUCCESS">Successful</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
              <button onClick={loadPayuTxns} className="px-4 py-2 bg-stone-100 rounded-xl text-xs font-semibold">Search</button>
            </div>
            {payuMsg && <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">{payuMsg}</div>}
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-stone-50 text-stone-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="text-left px-3 py-2">Order / TXN</th>
                    <th className="text-left px-3 py-2">Customer</th>
                    <th className="text-right px-3 py-2">Amount</th>
                    <th className="text-left px-3 py-2">PayU ID / Mode</th>
                    <th className="text-left px-3 py-2">Status</th>
                    <th className="text-left px-3 py-2">Verified</th>
                    <th className="text-right px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {payuTxns.map((t: any) => (
                    <tr key={t.orderId} className="hover:bg-stone-50/60">
                      <td className="px-3 py-2"><div className="font-mono font-bold text-stone-900">{t.orderId}</div><div className="font-mono text-[10px] text-stone-400">{t.txnid}</div><div className="text-[10px] text-stone-400">{t.env} · attempts {t.attempts}</div></td>
                      <td className="px-3 py-2"><div className="font-semibold">{t.customer?.name}</div><div className="text-stone-500">{t.customer?.email}</div></td>
                      <td className="px-3 py-2 text-right font-bold">₹{Number(t.total).toFixed(2)}</td>
                      <td className="px-3 py-2"><div className="font-mono">{t.mihpayid || '—'}</div><div className="text-[10px] uppercase text-stone-500">{t.mode || '—'}</div>{t.failReason && <div className="text-[10px] text-rose-600 max-w-[220px] truncate" title={t.failReason}>{t.failReason}</div>}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${t.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-800' : t.paymentStatus === 'FAILED' ? 'bg-rose-100 text-rose-800' : t.paymentStatus === 'REFUNDED' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>{t.paymentStatus}</span>
                      </td>
                      <td className="px-3 py-2 text-[10px] text-stone-500">{t.verifiedVia ? (<><div className="font-semibold text-emerald-700">{t.verifiedVia}</div><div>{t.verifiedAt ? new Date(t.verifiedAt).toLocaleString() : ''}</div></>) : '—'}</td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => handlePayuVerify(t.orderId)} className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-[10px] font-semibold">Re-verify at PayU</button>
                      </td>
                    </tr>
                  ))}
                  {payuTxns.length === 0 && !payuLoading && (
                    <tr><td colSpan={7} className="px-3 py-8 text-center text-stone-400 italic">No PayU transactions yet. They appear here once customers pay online.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: USERS & ROLES */}
        {activeTab === 'users' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="font-serif text-xl font-bold text-stone-900">User & Privilege Management</h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Assign roles (Customer, Sales Manager, Admin) and manage granular operational permissions.
                </p>
              </div>

              <button
                onClick={() => setShowCreateUserModal(true)}
                className="px-4 py-2 bg-stone-900 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 hover:bg-stone-800"
              >
                <Plus className="w-4 h-4" />
                <span>Create Staff Account</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-stone-50 text-stone-600 font-semibold border-b">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Verification</th>
                    <th className="p-3">Permissions</th>
                    <th className="p-3">Joined</th>
                    <th className="p-3 text-right">Role Switching</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {usersList.map(u => (
                    <tr key={u.id || u._id} className="hover:bg-stone-50/50">
                      <td className="p-3">
                        <p className="font-semibold text-stone-900">{u.name}</p>
                        <p className="text-[11px] text-stone-500">{u.email}</p>
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-800">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-3">
                        {u.isVerified ? (
                          <span className="text-emerald-700 font-semibold text-[11px]">Verified</span>
                        ) : (
                          <span className="text-amber-700 font-semibold text-[11px]">Unverified</span>
                        )}
                      </td>
                      <td className="p-3 text-[11px] text-stone-500 max-w-xs truncate">
                        {u.role === 'ADMIN' ? 'All (Super Administrator)' : (u.permissions?.join(', ') || 'Standard Client')}
                      </td>
                      <td className="p-3 text-stone-400 text-[11px]">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'Active'}
                      </td>
                      <td className="p-3 text-right space-x-2">
                        {u.role !== 'SALES_MANAGER' && (
                          <button
                            onClick={() => handleToggleUserRole(u, 'SALES_MANAGER')}
                            className="px-2.5 py-1 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded font-semibold text-[11px]"
                          >
                            Make Sales Manager
                          </button>
                        )}
                        {u.role !== 'CUSTOMER' && u.email !== user?.email && (
                          <button
                            onClick={() => handleToggleUserRole(u, 'CUSTOMER')}
                            className="px-2.5 py-1 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded font-semibold text-[11px]"
                          >
                            Set to Customer
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Create Staff Modal */}
            {showCreateUserModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-serif text-base font-bold text-stone-900">Provision Staff Account</h3>
                    <button onClick={() => setShowCreateUserModal(false)}><X className="w-5 h-5 text-stone-400" /></button>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                    <div>
                      <label className="block font-semibold mb-1">Name</label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={e => setNewUserName(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Email</label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={e => setNewUserEmail(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Password</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={newUserPass}
                        onChange={e => setNewUserPass(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Role</label>
                      <select
                        value={newUserRole}
                        onChange={e => setNewUserRole(e.target.value as any)}
                        className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                      >
                        <option value="SALES_MANAGER">Sales Manager</option>
                        <option value="CUSTOMER">Customer</option>
                      </select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => setShowCreateUserModal(false)} className="px-4 py-2 border rounded-lg">Cancel</button>
                      <button type="submit" className="px-5 py-2 bg-stone-900 text-white rounded-lg">Create Account</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 7: STORE CMS & HERO */}
        {activeTab === 'cms' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6 max-w-2xl">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">Storefront Content Management (CMS)</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Customize the public homepage Hero section, copy, and top announcement banner dynamically.
              </p>
            </div>

            {cmsMsg && (
              <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{cmsMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveCms} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Top Announcement Bar Text</label>
                <input
                  type="text"
                  value={announcementText}
                  onChange={e => setAnnouncementText(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hero Main Headline</label>
                <input
                  type="text"
                  required
                  value={heroTitle}
                  onChange={e => setHeroTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-serif text-sm font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hero Subtitle</label>
                <textarea
                  rows={2}
                  required
                  value={heroSubtitle}
                  onChange={e => setHeroSubtitle(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Primary CTA Button Text</label>
                <input
                  type="text"
                  required
                  value={heroCta}
                  onChange={e => setHeroCta(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Hero Background Banner Image URL</label>
                <input
                  type="text"
                  required
                  value={heroBanner}
                  onChange={e => setHeroBanner(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono"
                />
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors"
              >
                Publish Storefront Changes
              </button>
            </form>
          </div>
        )}

        {/* TAB 8: AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">Security & Operational Audit Log</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Immutable trace of admin creations, edits, orders, status updates, and user role modifications.
              </p>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-8 text-center">No audit records logged yet.</p>
            ) : (
              <div className="space-y-3">
                {auditLogs.map((log, i) => (
                  <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 flex items-start justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-stone-900 uppercase tracking-wide">
                          {log.action}
                        </span>
                        <span className="text-stone-400">·</span>
                        <span className="text-stone-600 font-medium">Entity: {log.entity}</span>
                      </div>
                      <p className="text-stone-500 mt-1">
                        Actor: <strong>{log.actor?.name}</strong> ({log.actor?.email}) · Role: {log.actor?.role}
                      </p>
                    </div>
                    <span className="text-[11px] text-stone-400">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 9: EMAIL LOGS & IN-APP INBOX */}
        {activeTab === 'emails' && (
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold text-stone-900">Email Notification Logs & Templates</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Every OTP, welcome letter, order confirmation, and status dispatch is recorded here. Click any email to preview its responsive HTML template.
              </p>
            </div>

            {emailLogs.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-8 text-center">No transactional emails logged yet.</p>
            ) : (
              <div className="divide-y divide-stone-100">
                {emailLogs.map(log => (
                  <div
                    key={log._id}
                    onClick={() => setPreviewEmail(log)}
                    className="py-3 px-3 hover:bg-stone-50 rounded-xl cursor-pointer flex items-center justify-between text-xs transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900">{log.subject}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900">
                          {log.emailType}
                        </span>
                      </div>
                      <p className="text-stone-500 text-[11px]">To: {log.recipient}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        {log.status}
                      </span>
                      <span className="text-[11px] text-stone-400">
                        {new Date(log.sentAt).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Email HTML Preview Modal */}
            {previewEmail && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
                <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <h3 className="font-bold text-stone-900 text-sm">{previewEmail.subject}</h3>
                      <p className="text-xs text-stone-500">To: {previewEmail.recipient} · {previewEmail.emailType}</p>
                    </div>
                    <button onClick={() => setPreviewEmail(null)}><X className="w-5 h-5 text-stone-400" /></button>
                  </div>
                  {/* Rendered HTML */}
                  <div
                    className="border border-stone-200 rounded-xl p-4 bg-stone-50 overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: previewEmail.htmlContent }}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};