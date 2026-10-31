import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  ShoppingBag,
  Package,
  AlertTriangle,
  RotateCcw,
  CheckCircle,
  Truck,
  Shield,
  X,
  Lock,
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Order, Product } from '../types';

export const SalesManagerDashboard: React.FC = () => {
  const { user, hasPermission, isAdmin } = useAuth();

  const [stats, setStats] = useState<any>(null);
  const [recentPending, setRecentPending] = useState<Order[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Product[]>([]);
  const [returnRequests, setReturnRequests] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Selected Order for status update
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [statusNote, setStatusNote] = useState('');

  // Selected Order for Return processing
  const [selectedReturnOrder, setSelectedReturnOrder] = useState<Order | null>(null);
  const [returnStatus, setReturnStatus] = useState('APPROVED');
  const [resolutionNotes, setResolutionNotes] = useState('');

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.dashboard.salesManager();
      if (res.success) {
        setStats(res.stats);
        setRecentPending(res.recentPending || []);
        setLowStockItems(res.lowStockItems || []);
        setReturnRequests(res.returnRequests || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    try {
      const res = await api.orders.updateStatus(selectedOrder._id, (newStatus || selectedOrder.orderStatus) as any, {
        carrier: carrier || selectedOrder.carrier,
        trackingNumber: trackingNumber || selectedOrder.trackingNumber,
        note: statusNote || undefined,
      });
      if (res.success) {
        setSelectedOrder(null);
        setStatusNote('');
        loadDashboard();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReturnOrder) return;
    try {
      const res = await api.orders.processReturn(selectedReturnOrder._id, {
        returnStatus,
        resolutionNotes,
      });
      if (res.success) {
        setSelectedReturnOrder(null);
        setResolutionNotes('');
        loadDashboard();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to process return');
    }
  };

  const permissionsList = [
    { key: 'products.read', label: 'View Products' },
    { key: 'products.write', label: 'Manage Products' },
    { key: 'orders.read', label: 'View Orders' },
    { key: 'orders.update', label: 'Update Orders' },
    { key: 'inventory.read', label: 'Monitor Inventory' },
    { key: 'refunds.manage', label: 'Process Returns & Refunds' },
    { key: 'shipments.manage', label: 'Manage Shipments' },
  ];

  return (
    <div className="min-h-screen bg-stone-100/70 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-stone-900 text-white rounded-xl shadow-xs">
              <Briefcase className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-serif text-2xl font-bold text-stone-900">Sales Manager Portal</h1>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-blue-50 text-blue-800">
                  Operations & Fulfillment
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Logged in as <strong>{user?.name}</strong> · Role: {user?.role}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-4 py-2 bg-amber-700 text-white text-xs font-semibold rounded-lg hover:bg-amber-800 transition-colors"
              >
                Switch to Admin Center
              </Link>
            )}
            <Link
              to="/"
              className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-semibold rounded-lg transition-colors"
            >
              Storefront
            </Link>
          </div>
        </div>

        {/* Permissions Indicator Ribbon */}
        <div className="bg-white p-4 rounded-xl border border-stone-200/80 text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold uppercase tracking-wider text-stone-900 text-[11px]">
              Assigned Operational Permissions
            </span>
            <span className="text-[10px] text-stone-400">Configured by Super Administrator</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {permissionsList.map(p => {
              const isAllowed = isAdmin || hasPermission(p.key);
              return (
                <span
                  key={p.key}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                    isAllowed
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-stone-100 text-stone-400 border border-stone-200 line-through'
                  }`}
                >
                  {isAllowed ? <CheckCircle className="w-3 h-3 text-emerald-600" /> : <Lock className="w-3 h-3" />}
                  <span>{p.label}</span>
                </span>
              );
            })}
          </div>
        </div>

        {/* Operational Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
            <span className="text-xs text-stone-500 font-medium">Pending Orders</span>
            <p className="text-2xl font-bold font-serif text-stone-900 mt-2">{stats?.pendingCount || 0}</p>
            <p className="text-[11px] text-amber-700 mt-1">Requires atelier picking/packing</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
            <span className="text-xs text-stone-500 font-medium">Ready for Dispatch</span>
            <p className="text-2xl font-bold font-serif text-stone-900 mt-2">{stats?.readyToShipCount || 0}</p>
            <p className="text-[11px] text-blue-700 mt-1">Packed & awaiting courier pickup</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
            <span className="text-xs text-stone-500 font-medium">Return Requests</span>
            <p className="text-2xl font-bold font-serif text-stone-900 mt-2">{stats?.returnsCount || 0}</p>
            <p className="text-[11px] text-stone-500 mt-1">Awaiting review & authorization</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-2xs">
            <span className="text-xs text-stone-500 font-medium">Low Stock Alerts</span>
            <p className="text-2xl font-bold font-serif text-rose-700 mt-2">{stats?.lowStockCount || 0}</p>
            <p className="text-[11px] text-rose-600 mt-1">Units at or below threshold</p>
          </div>
        </div>

        {/* Pending Orders & Returns Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Orders */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-base font-bold text-stone-900">Orders Requiring Action</h3>
              <span className="text-xs text-stone-500 font-medium">({recentPending.length})</span>
            </div>

            {recentPending.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-8 text-center">No pending orders awaiting fulfillment.</p>
            ) : (
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                {recentPending.map(o => (
                  <div key={o._id} className="py-3 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-stone-900">{o.orderId}</span>
                      <p className="text-[11px] text-stone-500">{o.customer?.name} · ₹{Number(o.total).toFixed(2)}</p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 bg-stone-100 rounded text-[10px] font-bold">
                        {o.orderStatus}
                      </span>
                    </div>

                    {(isAdmin || hasPermission('orders.update')) && (
                      <button
                        onClick={() => {
                          setSelectedOrder(o);
                          setNewStatus(o.orderStatus);
                          setCarrier(o.carrier || 'DHL Express');
                          setTrackingNumber(o.trackingNumber || '');
                        }}
                        className="px-3 py-1.5 bg-stone-900 text-white rounded-lg text-xs font-semibold hover:bg-stone-800"
                      >
                        Advance Order
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Return Requests */}
          <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-serif text-base font-bold text-stone-900">Client Return Requests</h3>
              <span className="text-xs text-stone-500 font-medium">({returnRequests.length})</span>
            </div>

            {returnRequests.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-8 text-center">No active return requests.</p>
            ) : (
              <div className="divide-y divide-stone-100 max-h-96 overflow-y-auto">
                {returnRequests.map(o => (
                  <div key={o._id} className="py-3 space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="font-mono font-bold text-stone-900">{o.orderId}</span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded">
                        {o.returnRequest?.status || 'REQUESTED'}
                      </span>
                    </div>
                    <p className="text-stone-600 text-[11px]">
                      Reason: <em>"{o.returnRequest?.reason}"</em>
                    </p>
                    <div className="flex justify-between items-center pt-1">
                      <span className="text-[11px] text-stone-500">Customer: {o.customer?.name}</span>
                      {(isAdmin || hasPermission('refunds.manage')) && (
                        <button
                          onClick={() => {
                            setSelectedReturnOrder(o);
                            setReturnStatus('APPROVED');
                          }}
                          className="px-3 py-1 bg-amber-700 text-white rounded-lg text-xs font-semibold hover:bg-amber-800"
                        >
                          Process Return
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Advance Order Modal */}
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-serif text-base font-bold text-stone-900">
                  Advance Order: {selectedOrder.orderId}
                </h3>
                <button onClick={() => setSelectedOrder(null)}><X className="w-5 h-5 text-stone-400" /></button>
              </div>

              <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">New Milestone</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                  >
                    <option value="PROCESSING">PROCESSING (Packing in progress)</option>
                    <option value="PACKED">PACKED (Ready for pickup)</option>
                    <option value="SHIPPED">SHIPPED (En route)</option>
                    <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Carrier Name</label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={e => setCarrier(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Waybill / Tracking Number</label>
                  <input
                    type="text"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border rounded-lg font-mono"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Status Note</label>
                  <input
                    type="text"
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                    placeholder="e.g. Dispatched from atelier distribution"
                    className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedOrder(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-stone-900 text-white rounded-lg">Confirm Status</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Process Return Modal */}
        {selectedReturnOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4">
              <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-serif text-base font-bold text-stone-900">
                  Process Return: {selectedReturnOrder.orderId}
                </h3>
                <button onClick={() => setSelectedReturnOrder(null)}><X className="w-5 h-5 text-stone-400" /></button>
              </div>

              <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Return Resolution Status</label>
                  <select
                    value={returnStatus}
                    onChange={e => setReturnStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                  >
                    <option value="APPROVED">APPROVED (Return label sent)</option>
                    <option value="PICKUP_SCHEDULED">PICKUP_SCHEDULED</option>
                    <option value="RECEIVED">RECEIVED (Inspected at atelier)</option>
                    <option value="REFUND_COMPLETED">REFUND_COMPLETED (Restocks inventory & marks refunded)</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Resolution Notes</label>
                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    placeholder="e.g. Return inspected in original unworn condition. Full refund authorized."
                    className="w-full px-3 py-2 bg-stone-50 border rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedReturnOrder(null)} className="px-4 py-2 border rounded-lg">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-amber-700 text-white rounded-lg">Submit Resolution</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};