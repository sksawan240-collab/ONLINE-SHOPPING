import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Package,
  MapPin,
  Heart,
  User as UserIcon,
  Bell,
  Lock,
  LogOut,
  RotateCcw,
  Truck,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { api } from '../services/api';
import { Order, Address, NotificationItem } from '../types';
import {
  INDIAN_STATE_NAMES,
  getDistrictsForState,
  isValidIndianPinCode,
  DEFAULT_COUNTRY,
} from '../data/indiaStates';

export const CustomerDashboard: React.FC = () => {
  const { user, logout, logoutAll, refreshProfile } = useAuth();
  const { items: wishlistItems, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'orders';

  // Orders
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState<Order | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [orderActionMsg, setOrderActionMsg] = useState<string | null>(null);

  // Addresses
  const [addresses, setAddresses] = useState<Address[]>(user?.addresses || []);
  const [newStreet, setNewStreet] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newPostal, setNewPostal] = useState('');
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Profile Edit
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [emailPreferences, setEmailPreferences] = useState(user?.emailPreferences || {
    orderEmails: true,
    shipmentEmails: true,
    promotionalEmails: true,
    newLaunchEmails: true,
    newsletter: true,
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const setTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Load orders
  useEffect(() => {
    if (activeTab === 'orders') {
      setOrdersLoading(true);
      api.orders.list()
        .then(res => {
          if (res.success) {
            setOrders(res.orders || []);
          }
        })
        .finally(() => setOrdersLoading(false));
    }
  }, [activeTab]);

  // Load notifications
  useEffect(() => {
    if (activeTab === 'notifications') {
      api.notifications.list()
        .then(res => {
          if (res.success) {
            setNotifications(res.notifications || []);
            setUnreadCount(res.unreadCount || 0);
          }
        })
        .catch(() => {});
    }
  }, [activeTab]);

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrderForReturn || !returnReason.trim()) return;

    setReturnLoading(true);
    try {
      const res = await api.orders.requestReturn(selectedOrderForReturn._id, returnReason);
      if (res.success) {
        setOrderActionMsg(`Return request recorded for order ${selectedOrderForReturn.orderId}.`);
        setSelectedOrderForReturn(null);
        setReturnReason('');
        // Refresh orders
        const ordersRes = await api.orders.list();
        if (ordersRes.success) setOrders(ordersRes.orders || []);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to submit return request.');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddressError(null);
    if (!newState || !newDistrict) {
      setAddressError('Please select both State and District.');
      return;
    }
    if (!isValidIndianPinCode(newPostal)) {
      setAddressError('Please enter a valid 6-digit Indian PIN code (e.g. 585102).');
      return;
    }
    try {
      const res = await api.auth.addAddress({
        street: newStreet,
        city: newCity,
        state: newState,
        district: newDistrict,
        postalCode: newPostal,
        country: DEFAULT_COUNTRY,
      });
      if (res.success) {
        setAddresses(res.addresses);
        setShowAddressForm(false);
        setNewStreet('');
        setNewCity('');
        setNewState('');
        setNewDistrict('');
        setNewPostal('');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to add address');
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const res = await api.auth.deleteAddress(id);
      if (res.success) {
        setAddresses(res.addresses);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to remove address');
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      const res = await api.auth.updateProfile({
        name,
        phone,
        emailPreferences,
      });
      if (res.success) {
        await refreshProfile();
        setProfileMsg('Profile and preferences updated.');
        setTimeout(() => setProfileMsg(null), 3000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);
    try {
      const res = await api.auth.changePassword({ currentPassword, newPassword });
      if (res.success) {
        setPasswordMsg('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to change password');
    }
  };

  const handleMarkAllNotifications = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-full bg-stone-900 text-white flex items-center justify-center font-serif text-2xl font-bold uppercase shadow-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-stone-900">{user?.name}</h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-stone-100 text-stone-700">
                  {user?.role?.replace('_', ' ')}
                </span>
                {user?.isVerified && (
                  <span className="text-[10px] text-emerald-700 font-semibold px-2 py-0.5 rounded bg-emerald-50">
                    Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">{user?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => logout()}
              className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-100 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
            <button
              onClick={() => logoutAll()}
              className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 transition-colors flex items-center gap-1.5"
              title="Invalidates sessions across all browsers and devices"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Sign Out All Devices</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation & Content Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Navigation Sidebar */}
          <aside className="lg:col-span-3 space-y-1 bg-white p-3 rounded-2xl border border-stone-200/80 shadow-2xs h-fit">
            {[
              { id: 'orders', label: 'My Orders & Returns', icon: Package },
              { id: 'addresses', label: 'Saved Delivery Addresses', icon: MapPin },
              { id: 'wishlist', label: 'Wishlist & Saved Pieces', icon: Heart },
              { id: 'profile', label: 'Profile & Email Preferences', icon: UserIcon },
              { id: 'security', label: 'Account Security & Password', icon: Lock },
              { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setTab(tab.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.badge !== undefined && tab.badge > 0 && (
                    <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[10px] flex items-center justify-center font-bold">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </aside>

          {/* Main Tab Panel */}
          <main className="lg:col-span-9 bg-white p-6 sm:p-8 rounded-2xl border border-stone-200/80 shadow-2xs min-h-[480px]">
            {/* 1. ORDERS TAB */}
            {activeTab === 'orders' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">Your Atelier Orders</h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    View order status, real-time shipment progression, and submit return requests.
                  </p>
                </div>

                {orderActionMsg && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{orderActionMsg}</span>
                  </div>
                )}

                {ordersLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map(n => <div key={n} className="h-24 bg-stone-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16 px-4 border border-dashed border-stone-200 rounded-xl">
                    <Package className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <h3 className="font-semibold text-stone-800 text-sm">You haven't placed any orders yet</h3>
                    <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
                      Explore our collections and experience European haute couture and tailoring.
                    </p>
                    <Link
                      to="/products"
                      className="mt-4 inline-block px-5 py-2 bg-stone-900 text-white text-xs font-semibold rounded-lg hover:bg-stone-800"
                    >
                      Shop Collections
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <div key={order._id} className="p-5 rounded-xl border border-stone-200 bg-stone-50/40 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-200/60 pb-3">
                          <div>
                            <span className="font-mono text-sm font-bold text-stone-900">{order.orderId}</span>
                            <span className="text-xs text-stone-500 ml-2">
                              Placed on {new Date(order.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-stone-900 text-white">
                              {order.orderStatus?.replace(/_/g, ' ')}
                            </span>
                            <span className="text-xs font-bold text-stone-900">₹{Number(order.total).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Order Items */}
                        <div className="divide-y divide-stone-100">
                          {order.items?.map((item, i) => (
                            <div key={i} className="py-2 flex items-center justify-between text-xs">
                              <div className="flex items-center gap-3">
                                <img
                                  src={item.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=100'}
                                  alt=""
                                  className="w-10 h-12 object-cover rounded-md flex-shrink-0"
                                />
                                <div>
                                  <p className="font-semibold text-stone-900">{item.name}</p>
                                  <p className="text-[11px] text-stone-500">Size: {item.size} · Color: {item.color} · Qty: {item.quantity}</p>
                                </div>
                              </div>
                              <span className="font-bold text-stone-800">₹{Number(item.subtotal).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-stone-200/60">
                          <Link
                            to={`/track-order?id=${order.orderId}`}
                            className="text-xs font-semibold text-amber-800 hover:text-amber-950 flex items-center gap-1"
                          >
                            <Truck className="w-3.5 h-3.5" />
                            <span>Track Consignment</span>
                          </Link>

                          {order.orderStatus === 'DELIVERED' && order.returnRequest?.status === 'NONE' && (
                            <button
                              onClick={() => setSelectedOrderForReturn(order)}
                              className="text-xs text-stone-600 hover:text-stone-900 flex items-center gap-1 font-medium"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Request Return</span>
                            </button>
                          )}

                          {order.returnRequest?.status !== 'NONE' && (
                            <span className="text-xs text-amber-700 font-medium">
                              Return Status: <strong>{order.returnRequest?.status}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Return Request Modal */}
                {selectedOrderForReturn && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="bg-white p-6 rounded-2xl max-w-md w-full space-y-4">
                      <h3 className="font-serif text-lg font-bold text-stone-900">
                        Request Return for {selectedOrderForReturn.orderId}
                      </h3>
                      <p className="text-xs text-stone-500">
                        Please indicate why you wish to return this garment so our atelier team can prepare a replacement or refund label.
                      </p>
                      <form onSubmit={handleReturnSubmit} className="space-y-3">
                        <textarea
                          required
                          rows={3}
                          value={returnReason}
                          onChange={e => setReturnReason(e.target.value)}
                          placeholder="e.g. Sizing runs slightly large, requesting exchange or refund..."
                          className="w-full p-3 bg-stone-50 border border-stone-300 rounded-lg text-xs"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForReturn(null)}
                            className="px-4 py-2 border rounded-lg text-xs font-semibold"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={returnLoading}
                            className="px-5 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
                          >
                            {returnLoading ? 'Submitting...' : 'Submit Request'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. SAVED ADDRESSES TAB */}
            {activeTab === 'addresses' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-stone-900">Saved Delivery Addresses</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Manage delivery addresses for expedited checkout.</p>
                  </div>
                  <button
                    onClick={() => setShowAddressForm(!showAddressForm)}
                    className="px-4 py-2 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Address</span>
                  </button>
                </div>

                {showAddressForm && (
                  <form onSubmit={handleAddAddress} className="p-4 bg-stone-50 rounded-xl border border-stone-200 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-stone-900">New Address</h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          value={newStreet}
                          onChange={e => setNewStreet(e.target.value)}
                          placeholder="Street Address *"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          required
                          value={newCity}
                          onChange={e => setNewCity(e.target.value)}
                          placeholder="City *"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <select
                          required
                          value={newState}
                          onChange={e => {
                            setNewState(e.target.value);
                            setNewDistrict('');
                          }}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                        >
                          <option value="">State / Union Territory *</option>
                          {INDIAN_STATE_NAMES.map(name => (
                            <option key={name} value={name}>
                              {name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          required
                          disabled={!newState}
                          value={newDistrict}
                          onChange={e => setNewDistrict(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="">{newState ? 'District *' : 'Select state first'}</option>
                          {getDistrictsForState(newState).map(district => (
                            <option key={district} value={district}>
                              {district}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          required
                          inputMode="numeric"
                          maxLength={6}
                          value={newPostal}
                          onChange={e => setNewPostal(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                          placeholder="PIN Code * (6 digits)"
                          className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                    {addressError && (
                      <p className="text-xs text-rose-600 font-medium">{addressError}</p>
                    )}
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddressForm(false)}
                        className="px-3 py-1.5 text-xs text-stone-600 hover:text-stone-900"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold"
                      >
                        Save Address
                      </button>
                    </div>
                  </form>
                )}

                {addresses.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-6 text-center">No addresses saved yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                      <div key={addr.id} className="p-4 rounded-xl border border-stone-200 bg-stone-50/50 flex justify-between items-start">
                        <div>
                          <p className="text-xs font-semibold text-stone-900">{addr.street}</p>
                          <p className="text-xs text-stone-600">
                            {addr.city}{addr.district ? `, ${addr.district}` : ''}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode}
                          </p>
                          <p className="text-[11px] text-stone-500 mt-1">{addr.country || 'India'}</p>
                        </div>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-stone-400 hover:text-rose-600"
                          title="Remove address"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. WISHLIST TAB */}
            {activeTab === 'wishlist' && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">Wishlist & Saved Pieces</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Garments you are admiring for future seasons.</p>
                </div>

                {wishlistItems.length === 0 ? (
                  <div className="text-center py-16 px-4 border border-dashed border-stone-200 rounded-xl">
                    <Heart className="w-10 h-10 text-stone-300 mx-auto mb-2" />
                    <h3 className="font-semibold text-stone-800 text-sm">Your wishlist is empty</h3>
                    <p className="text-xs text-stone-500 mt-1">
                      Browse our catalog and tap the heart icon on pieces you love.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {wishlistItems.map(item => (
                      <div key={item._id} className="border border-stone-200 rounded-xl p-3 flex flex-col justify-between">
                        <div>
                          <img
                            src={item.images?.[0] || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=200'}
                            alt=""
                            className="w-full aspect-3/4 object-cover rounded-lg mb-2"
                          />
                          <p className="text-xs font-semibold text-stone-900 line-clamp-1">{item.name}</p>
                          <p className="text-xs font-bold text-stone-900 mt-1">${(item.salePrice || item.price).toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2 mt-3 pt-2 border-t border-stone-100">
                          <button
                            onClick={() => addToCart(item._id, item.sizes?.[0] || 'M', 'Default', 1)}
                            className="flex-1 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
                          >
                            Move to Bag
                          </button>
                          <button
                            onClick={() => toggleWishlist(item._id)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg border"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 4. PROFILE & PREFERENCES TAB */}
            {activeTab === 'profile' && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">Personal Information</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Update contact details and communication options.</p>
                </div>

                {profileMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{profileMsg}</span>
                  </div>
                )}

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Email (Registered)</label>
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full px-3 py-2 bg-stone-100 border border-stone-200 rounded-lg text-stone-500 cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  {/* Email Communication Preferences */}
                  <div className="pt-4 border-t border-stone-100 space-y-3">
                    <h4 className="font-bold uppercase tracking-wider text-stone-900 text-xs">
                      Communication Preferences
                    </h4>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailPreferences.orderEmails}
                        onChange={e => setEmailPreferences({ ...emailPreferences, orderEmails: e.target.checked })}
                        className="rounded text-stone-900"
                      />
                      <span>Transactional Order Confirmation & Status Updates (Recommended)</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailPreferences.shipmentEmails}
                        onChange={e => setEmailPreferences({ ...emailPreferences, shipmentEmails: e.target.checked })}
                        className="rounded text-stone-900"
                      />
                      <span>Courier & Waybill Tracking Updates</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailPreferences.newLaunchEmails}
                        onChange={e => setEmailPreferences({ ...emailPreferences, newLaunchEmails: e.target.checked })}
                        className="rounded text-stone-900"
                      />
                      <span>New Collection Launch Notifications & Runway Previews</span>
                    </label>

                    <label className="flex items-center space-x-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailPreferences.promotionalEmails}
                        onChange={e => setEmailPreferences({ ...emailPreferences, promotionalEmails: e.target.checked })}
                        className="rounded text-stone-900"
                      />
                      <span>Exclusive Seasonal Vouchers & Private Invitations</span>
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="mt-4 px-6 py-2.5 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800 disabled:opacity-50"
                  >
                    {profileSaving ? 'Saving...' : 'Save Profile Preferences'}
                  </button>
                </form>
              </div>
            )}

            {/* 5. ACCOUNT SECURITY TAB */}
            {activeTab === 'security' && (
              <div className="space-y-6 max-w-md">
                <div>
                  <h2 className="font-serif text-xl font-bold text-stone-900">Account Security</h2>
                  <p className="text-xs text-stone-500 mt-0.5">Protect your account and update your password.</p>
                </div>

                {passwordMsg && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{passwordMsg}</span>
                  </div>
                )}

                {passwordError && (
                  <div className="p-3 bg-rose-50 text-rose-800 rounded-lg text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">Current Password</label>
                    <input
                      type="password"
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-700 font-semibold mb-1">New Password (Min. 6 chars)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg"
                    />
                  </div>

                  <button
                    type="submit"
                    className="mt-2 px-5 py-2.5 bg-stone-900 text-white rounded-lg font-semibold hover:bg-stone-800"
                  >
                    Update Password
                  </button>
                </form>
              </div>
            )}

            {/* 6. NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="font-serif text-xl font-bold text-stone-900">Notification Center</h2>
                    <p className="text-xs text-stone-500 mt-0.5">Stay abreast of order, shipment, and atelier alerts.</p>
                  </div>
                  {notifications.length > 0 && (
                    <button
                      onClick={handleMarkAllNotifications}
                      className="text-xs text-amber-800 hover:underline font-semibold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                {notifications.length === 0 ? (
                  <p className="text-xs text-stone-500 italic py-6 text-center">You're all caught up.</p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {notifications.map(n => (
                      <div key={n._id} className={`py-3 px-3 rounded-lg flex items-start justify-between text-xs ${!n.isRead ? 'bg-amber-50/50' : ''}`}>
                        <div>
                          <p className="font-semibold text-stone-900">{n.title}</p>
                          <p className="text-stone-600 mt-0.5">{n.message}</p>
                          <span className="text-[10px] text-stone-400 mt-1 block">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                        {n.link && (
                          <Link to={n.link} className="text-amber-800 hover:text-amber-950 font-semibold ml-4">
                            View
                          </Link>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
};