import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Search,
  Package,
  CheckCircle,
  Clock,
  Truck,
  MapPin,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { api } from '../services/api';
import { OrderStatus } from '../types';

export const OrderTrackingPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderIdInput, setOrderIdInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const queryId = searchParams.get('id');

  const fetchTracking = async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await api.orders.track(id.trim());
      if (res.success && res.order) {
        setOrderData(res.order);
      } else {
        setErrorMsg('No order shipment record found with this ID.');
        setOrderData(null);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to locate order tracking data.');
      setOrderData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (queryId) {
      setOrderIdInput(queryId);
      fetchTracking(queryId);
    }
  }, [queryId]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (orderIdInput.trim()) {
      setSearchParams({ id: orderIdInput.trim() });
      fetchTracking(orderIdInput.trim());
    }
  };

  // Status Milestones sequence
  const milestones: { status: OrderStatus; label: string; icon: any }[] = [
    { status: 'PLACED', label: 'Order Placed', icon: Clock },
    { status: 'CONFIRMED', label: 'Confirmed by Atelier', icon: ShieldCheck },
    { status: 'PROCESSING', label: 'In Preparation', icon: Package },
    { status: 'PACKED', label: 'Packed & Inspected', icon: Package },
    { status: 'SHIPPED', label: 'Shipped via Carrier', icon: Truck },
    { status: 'OUT_FOR_DELIVERY', label: 'Out for Delivery', icon: Truck },
    { status: 'DELIVERED', label: 'Delivered', icon: CheckCircle },
  ];

  const getMilestoneIndex = (status: string): number => {
    const map: Record<string, number> = {
      PLACED: 0,
      PAYMENT_CONFIRMED: 0,
      CONFIRMED: 1,
      PROCESSING: 2,
      PACKED: 3,
      SHIPPED: 4,
      OUT_FOR_DELIVERY: 5,
      DELIVERED: 6,
      CANCELLED: -1,
      RETURN_REQUESTED: 7,
      RETURNED: 7,
      REFUNDED: 8,
    };
    return map[status] ?? 0;
  };

  const currentStep = orderData ? getMilestoneIndex(orderData.orderStatus) : -1;
  const isCancelled = orderData?.orderStatus === 'CANCELLED';
  const isReturned = orderData?.orderStatus?.includes('RETURN') || orderData?.orderStatus === 'REFUNDED';

  return (
    <div className="min-h-screen bg-[#fafaf9] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <span className="text-[11px] uppercase tracking-widest text-amber-800 font-bold">
            Real-Time Courier Tracking
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">
            Track Your Consignment
          </h1>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Input your unique Order Identifier (e.g., ORD-2026-XXXXXXXX) to view real-time status and route milestones.
          </p>
        </div>

        {/* Search input bar */}
        <form onSubmit={handleSearch} className="max-w-xl mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              required
              value={orderIdInput}
              onChange={e => setOrderIdInput(e.target.value.toUpperCase())}
              placeholder="ORD-2026-XXXXXXXX"
              className="w-full pl-10 pr-4 py-3 bg-white border border-stone-300 rounded-xl text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-stone-900 shadow-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold uppercase tracking-wider transition-colors shadow-md disabled:opacity-50"
          >
            {loading ? 'Locating...' : 'Track'}
          </button>
        </form>

        {errorMsg && (
          <div className="max-w-xl mx-auto p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Tracking Details Display */}
        {orderData && (
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-10 shadow-sm space-y-8 animate-fade-in">
            {/* Top metadata cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200/70 text-xs">
              <div>
                <p className="text-stone-500">Order ID</p>
                <p className="font-mono font-bold text-stone-900 text-sm mt-0.5">{orderData.orderId}</p>
              </div>
              <div>
                <p className="text-stone-500">Current Status</p>
                <p className="font-bold text-stone-900 mt-0.5 uppercase tracking-wide">
                  {orderData.orderStatus?.replace(/_/g, ' ')}
                </p>
              </div>
              <div>
                <p className="text-stone-500">Carrier</p>
                <p className="font-semibold text-stone-900 mt-0.5">{orderData.carrier || 'Standard Courier'}</p>
              </div>
              <div>
                <p className="text-stone-500">Waybill / Tracking</p>
                <p className="font-mono font-bold text-amber-800 mt-0.5">{orderData.trackingNumber || 'Pending Dispatch'}</p>
              </div>
            </div>

            {/* Cancelled Notice */}
            {isCancelled && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>This order was cancelled. Any authorized charges were refunded to your payment method.</span>
              </div>
            )}

            {/* Returned Notice */}
            {isReturned && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2">
                <RotateCcw className="w-5 h-5 flex-shrink-0" />
                <span>Return / Exchange in progress for this order: {orderData.orderStatus.replace(/_/g, ' ')}.</span>
              </div>
            )}

            {/* Stepper Timeline */}
            {!isCancelled && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-6">
                  Shipment Progression
                </h3>

                <div className="relative">
                  {/* Stepper line */}
                  <div className="hidden sm:block absolute top-1/2 left-0 right-0 h-1 bg-stone-200 -translate-y-1/2 z-0" />

                  <div className="grid grid-cols-2 sm:grid-cols-7 gap-4 relative z-10">
                    {milestones.map((m, idx) => {
                      const isCompleted = idx <= currentStep;
                      const isCurrent = idx === currentStep;
                      const IconComponent = m.icon;

                      return (
                        <div key={m.status} className="flex flex-col items-center text-center">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all shadow-xs ${
                              isCompleted
                                ? 'bg-stone-900 text-white'
                                : 'bg-white border-2 border-stone-300 text-stone-400'
                            } ${isCurrent ? 'ring-4 ring-amber-400/40 scale-110' : ''}`}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <span
                            className={`mt-2 text-[11px] font-semibold ${
                              isCompleted ? 'text-stone-900' : 'text-stone-400'
                            }`}
                          >
                            {m.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Audit Log / Event Timeline */}
            {orderData.timeline && orderData.timeline.length > 0 && (
              <div className="pt-4 border-t border-stone-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-stone-900 mb-4">
                  Consignment Event Log
                </h3>
                <div className="space-y-3">
                  {orderData.timeline.map((ev: any, i: number) => (
                    <div key={i} className="flex items-start space-x-3 text-xs">
                      <div className="w-2 h-2 rounded-full bg-stone-900 mt-1.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <strong className="text-stone-900 uppercase tracking-wide">
                            {ev.status?.replace(/_/g, ' ')}
                          </strong>
                          <span className="text-stone-400 text-[11px]">
                            {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-stone-600 mt-0.5">{ev.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Destination Address */}
            {orderData.shippingAddress && (
              <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs">
                <strong className="text-stone-900 block mb-1">Destination Address:</strong>
                <p className="text-stone-600">
                  {orderData.shippingAddress.street}, {orderData.shippingAddress.city}, {orderData.shippingAddress.state} {orderData.shippingAddress.postalCode}, {orderData.shippingAddress.country}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
