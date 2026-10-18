import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ShieldCheck,
  Truck,
  CreditCard,
  CheckCircle,
  Tag,
  ArrowRight,
  ShoppingBag,
  Sparkles,
  MapPin,
  Lock,
  Phone,
  Clock,
  X,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Address, Order } from '../types';

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, clearCart } = useCart();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [shippingAddress, setShippingAddress] = useState<Address>({
    id: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'United States',
  });

  const [deliveryOption, setDeliveryOption] = useState<'STANDARD' | 'EXPRESS'>('STANDARD');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'COD'>('UPI');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentIframeUrl, setPaymentIframeUrl] = useState<string | null>(null);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const orderIdRef = useRef<string | null>(null);

  // Coupon
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize address from user profile if available
  useEffect(() => {
    if (user?.addresses && user.addresses.length > 0) {
      const defaultAddr = user.addresses.find(a => a.isDefault) || user.addresses[0];
      setShippingAddress(defaultAddr);
    }
  }, [user]);

  // Calculations
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const taxableSubtotal = Math.max(0, subtotal - discountAmount);
  const shippingFee = deliveryOption === 'EXPRESS' ? 25.0 : (taxableSubtotal >= 200 ? 0.0 : 15.0);
  const taxAmount = Number((taxableSubtotal * 0.08).toFixed(2));
  const finalTotal = Number((taxableSubtotal + taxAmount + shippingFee).toFixed(2));

  const handleApplyCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError(null);
    try {
      const res = await api.coupons.validate(couponCode.trim(), subtotal);
      if (res.success && res.coupon) {
        setAppliedCoupon({
          code: res.coupon.code,
          discountAmount: res.coupon.discountAmount,
        });
      }
    } catch (err: any) {
      setCouponError(err.message || 'Invalid promotional code');
      setAppliedCoupon(null);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shippingAddress.street || !shippingAddress.city || !shippingAddress.postalCode) {
      setErrorMsg('Please complete all mandatory shipping address fields.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const orderPayload = {
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          sku: item.sku,
          image: item.image,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          price: item.price,
        })),
        shippingAddress,
        deliveryOption,
        paymentMethod: paymentMethod === 'COD' ? 'COD' : 'UPI',
        couponCode: appliedCoupon?.code || '',
      };

      if (paymentMethod === 'COD') {
        // Cash on Delivery - create order directly with UNPAID status
        const res = await api.orders.create(orderPayload);
        if (res.success && res.order) {
          setCreatedOrder(res.order);
          await clearCart();
        }
      } else {
        // UPI - create order (PENDING) + YouPI-PG payment session.
        // Do NOT show success or clear cart yet - wait for server-verified payment.
        const res = await api.payments.create(orderPayload);
        if (res.success && res.order && res.paymentId && res.checkoutUrl) {
          orderIdRef.current = res.order.orderId;
          setPaymentId(res.paymentId);
          setPaymentIframeUrl(res.checkoutUrl);
          setShowPaymentModal(true);
        } else if (res.success && res.order && !res.checkoutUrl) {
          // Session was created but gateway didn't return a checkout URL -
          // surface it instead of opening an empty modal that can never finish.
          setErrorMsg(res.message || 'Payment session created but no checkout URL was returned. Please contact support with your order.');
        } else {
          setErrorMsg(res.message || 'Failed to initialize payment session. Please try again.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to place order. Please verify your bag inventory.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Finalize a completed payment: close the modal, load the confirmed order and clear the bag.
  const finalizeSuccessfulPayment = async () => {
    setPolling(false);
    setShowPaymentModal(false);
    if (orderIdRef.current) {
      try {
        const orderRes = await api.orders.get(orderIdRef.current);
        if (orderRes.success && orderRes.order) {
          setCreatedOrder(orderRes.order);
          await clearCart();
        }
      } catch {
        setErrorMsg('Payment succeeded but we could not load your order confirmation. Please check your order history.');
      }
    }
  };

  // Poll YouPI-PG payment status (order only marked done after server verification).
  // Key fixes vs. the old version:
  //  - depends on real state (paymentId/showPaymentModal), not a ref
  //  - only closes the modal on a TERMINAL gateway status (isTerminal), never on
  //    transient states like INITIATED/ACTIVE/PROCESSING
  //  - counts consecutive poll failures and reports them instead of failing silently
  useEffect(() => {
    if (!paymentId || !showPaymentModal) return;

    let cancelled = false;
    let attempts = 0;
    let consecutiveErrors = 0;
    const maxAttempts = 90; // 90 x 2s = 3 minutes of verification window
    setPolling(true);

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      try {
        const res = await api.payments.status(paymentId);
        if (cancelled) return;
        consecutiveErrors = 0;

        if (res.success && res.isTerminal) {
          cancelled = true;
          clearInterval(interval);
          if (res.status === 'SUCCESS') {
            await finalizeSuccessfulPayment();
          } else {
            setPolling(false);
            setShowPaymentModal(false);
            setErrorMsg('Payment ' + (res.status || 'failed').toLowerCase() + '. No money was deducted — please try again.');
          }
        }
        // Non-terminal (INITIATED / QUEUED / ACTIVE / PROCESSING): keep the modal
        // open and keep polling — this is the normal in-progress state.
      } catch (err: any) {
        if (cancelled) return;
        consecutiveErrors += 1;
        // Surface persistent failures (gateway down / session vanished) instead
        // of swallowing them forever.
        if (consecutiveErrors >= 10) {
          cancelled = true;
          clearInterval(interval);
          setPolling(false);
          setShowPaymentModal(false);
          setErrorMsg(err?.message || 'Unable to verify payment status. Your payment has NOT been confirmed — please try again.');
        }
      } finally {
        if (!cancelled && attempts >= maxAttempts) {
          cancelled = true;
          clearInterval(interval);
          setPolling(false);
          setShowPaymentModal(false);
          setErrorMsg('Payment verification timed out. If you completed a payment, please check your orders before retrying.');
        }
      }
    };

    const interval = setInterval(poll, 2000);
    poll();

    return () => {
      cancelled = true;
      clearInterval(interval);
      setPolling(false);
    };
  }, [paymentId, showPaymentModal]);

  // Listen for postMessage events from the YouPI-PG iframe (cancel / failure /
  // success). The gateway notifies the embedding parent directly, so honour those
  // instead of leaving the modal stuck on a session the gateway already closed.
  useEffect(() => {
    if (!showPaymentModal) return;

    const onMessage = async (e: MessageEvent) => {
      const data = e.data;
      if (!data || typeof data.event !== 'string') return;
      if (!String(data.event).startsWith('youpi.')) return;

      if (data.event === 'youpi.payment_failed' || data.event === 'youpi.modal_close' || data.event === 'youpi.payment_cancelled' || data.event === 'youpi.payment_blocked_exit') {
        // Give the gateway a beat to persist the terminal state, then verify server-side.
        await new Promise(r => setTimeout(r, 800));
        if (paymentId) {
          try {
            const res = await api.payments.status(paymentId);
            if (res.success && res.isTerminal && res.status === 'SUCCESS') {
              await finalizeSuccessfulPayment();
              return;
            }
          } catch { /* fall through to generic close */ }
        }
        setShowPaymentModal(false);
        setPolling(false);
        if (data.event === 'youpi.payment_failed' || data.event === 'youpi.payment_blocked_exit') {
          setErrorMsg('Payment failed or was cancelled in the gateway. Please try again.');
        }
      } else if (data.event === 'youpi.payment_success') {
        await finalizeSuccessfulPayment();
      }
    };

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [showPaymentModal, paymentId]);

  // ORDER SUCCESS CONFIRMATION VIEW
  if (createdOrder) {
    return (
      <div className="min-h-screen bg-[#fafaf9] py-16 px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-stone-200/80 p-8 sm:p-12 shadow-lg text-center space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle className="w-8 h-8" />
          </div>

          <div>
            <span className="text-[11px] uppercase tracking-widest text-amber-800 font-bold">Authorized & Confirmed</span>
            <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">Thank You for Your Order</h1>
            <p className="text-xs text-stone-500 mt-1">
              Order ID: <strong className="text-stone-900 font-mono text-sm">{createdOrder.orderId}</strong>
            </p>
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/70 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-stone-500">Recipient:</span>
              <span className="font-semibold text-stone-900">{createdOrder.customer?.name} ({createdOrder.customer?.email})</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Delivery Address:</span>
              <span className="text-stone-800">
                {createdOrder.shippingAddress?.street}, {createdOrder.shippingAddress?.city}, {createdOrder.shippingAddress?.postalCode}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500">Estimated Arrival:</span>
              <span className="font-semibold text-emerald-700">{createdOrder.estimatedDelivery || 'Within 3-4 business days'}</span>
            </div>
            <div className="flex justify-between border-t border-stone-200 pt-2 font-bold text-sm text-stone-900">
              <span>Total Paid:</span>
              <span>${Number(createdOrder.total).toFixed(2)}</span>
            </div>
          </div>

          <p className="text-xs text-stone-500 leading-relaxed">
            A confirmation email along with your formal invoice has been dispatched to <strong>{createdOrder.customer?.email}</strong>.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-4">
            <Link
              to={`/track-order?id=${createdOrder.orderId}`}
              className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <span>Track Live Delivery</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/products"
              className="px-6 py-3 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-stone-200 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <ShoppingBag className="w-16 h-16 text-stone-300 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-stone-900">Your Shopping Bag is Empty</h2>
        <p className="text-xs text-stone-500 mt-2">
          Add items to your bag before proceeding to multi-step checkout.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-block px-6 py-2.5 bg-stone-900 text-white rounded-lg text-xs font-semibold"
        >
          Discover Collections
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf9] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="font-serif text-3xl font-bold text-stone-900 mb-8">Secure Checkout</h1>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handlePlaceOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
            {/* Left Steps (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Step 1: Shipping Address */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                  <MapPin className="w-5 h-5 text-stone-900" />
                  <h2 className="font-serif text-lg font-bold text-stone-900">1. White-Glove Shipping Address</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-stone-700 mb-1">Street Address *</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.street}
                      onChange={e => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                      placeholder="540 Madison Ave, Penthouse 4"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.city}
                      onChange={e => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      placeholder="New York"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={shippingAddress.state || ''}
                      onChange={e => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      placeholder="NY"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Postal Code *</label>
                    <input
                      type="text"
                      required
                      value={shippingAddress.postalCode}
                      onChange={e => setShippingAddress({ ...shippingAddress, postalCode: e.target.value })}
                      placeholder="10022"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-stone-700 mb-1">Country</label>
                    <select
                      value={shippingAddress.country}
                      onChange={e => setShippingAddress({ ...shippingAddress, country: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs focus:ring-1 focus:ring-stone-900 focus:bg-white"
                    >
                      <option value="United States">United States</option>
                      <option value="United Kingdom">United Kingdom</option>
                      <option value="France">France</option>
                      <option value="Italy">Italy</option>
                      <option value="Germany">Germany</option>
                      <option value="Canada">Canada</option>
                      <option value="Australia">Australia</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Delivery Option */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                  <Truck className="w-5 h-5 text-stone-900" />
                  <h2 className="font-serif text-lg font-bold text-stone-900">2. Delivery Service</h2>
                </div>

                <div className="space-y-3">
                  <label
                    onClick={() => setDeliveryOption('STANDARD')}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      deliveryOption === 'STANDARD' ? 'border-stone-900 bg-stone-50/50 shadow-xs' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryOption === 'STANDARD'}
                        onChange={() => setDeliveryOption('STANDARD')}
                        className="text-stone-900"
                      />
                      <div>
                        <p className="text-xs font-bold text-stone-900">DHL Express / Standard Courier</p>
                        <p className="text-[11px] text-stone-500">Delivered within 3 to 4 business days</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-stone-900">
                      {taxableSubtotal >= 200 ? 'Complimentary' : '$15.00'}
                    </span>
                  </label>

                  <label
                    onClick={() => setDeliveryOption('EXPRESS')}
                    className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                      deliveryOption === 'EXPRESS' ? 'border-stone-900 bg-stone-50/50 shadow-xs' : 'border-stone-200 hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="delivery"
                        checked={deliveryOption === 'EXPRESS'}
                        onChange={() => setDeliveryOption('EXPRESS')}
                        className="text-stone-900"
                      />
                      <div>
                        <p className="text-xs font-bold text-stone-900">FedEx Priority Overnight</p>
                        <p className="text-[11px] text-stone-500">Dispatched in dedicated temperature-controlled van</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-stone-900">$25.00</span>
                  </label>
                </div>
              </div>

              {/* Step 3: Payment Method */}
              <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4">
                <div className="flex items-center space-x-2 pb-2 border-b border-stone-100">
                  <Lock className="w-5 h-5 text-stone-900" />
                  <h2 className="font-serif text-lg font-bold text-stone-900">3. Payment Authorization</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI')}
                      className={`flex-1 py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'UPI' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Phone className="w-4 h-4" />
                      <span>UPI (YouPI-PG)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('COD')}
                      className={`flex-1 py-3 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        paymentMethod === 'COD' ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Truck className="w-4 h-4" />
                      <span>Cash on Delivery</span>
                    </button>
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-left text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <Clock className="w-3 h-3 text-amber-600 mt-0.5" />
                        <span className="text-amber-700 text-xs leading-relaxed">
                          You will be redirected to a secure UPI checkout iframe. Scan the QR code or use any UPI app (Google Pay, PhonePe, Paytm, etc.) to complete payment.
                        </span>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'COD' && (
                    <div className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <Truck className="w-3 h-3 text-stone-600 mt-0.5" />
                        <span className="text-stone-700 text-xs leading-relaxed">
                          Pay cash when your order is delivered. Order will be created as UNPAID until delivery confirmation.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Summary & Place Order (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-2xs space-y-4 sticky top-24">
                <h3 className="font-serif text-lg font-bold text-stone-900 pb-2 border-b border-stone-100">
                  Order Summary
                </h3>

                {/* Items preview */}
                <div className="divide-y divide-stone-100 max-h-56 overflow-y-auto pr-1 space-y-2">
                  {items.map(item => (
                    <div key={item.itemId} className="flex gap-3 py-2">
                      <img
                        src={item.image || 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?q=80&w=150'}
                        alt={item.name}
                        className="w-12 h-14 object-cover rounded-md flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0 text-xs">
                        <p className="font-semibold text-stone-900 truncate">{item.name}</p>
                        <p className="text-stone-500 text-[11px]">Qty: {item.quantity} · Size: {item.size}</p>
                      </div>
                      <span className="text-xs font-bold text-stone-900">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Promo Code input */}
                <div className="pt-2 border-t border-stone-100">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={e => setCouponCode(e.target.value.toUpperCase())}
                      placeholder="Voucher code (e.g. LUXE15)"
                      className="w-full px-3 py-2 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      className="px-4 py-2 bg-stone-800 text-white rounded-lg text-xs font-semibold hover:bg-stone-900"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-[11px] text-emerald-700 mt-1 font-medium">
                      Applied {appliedCoupon.code}: -${appliedCoupon.discountAmount.toFixed(2)}
                    </p>
                  )}
                  {couponError && (
                    <p className="text-[11px] text-rose-600 mt-1 font-medium">{couponError}</p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="space-y-2 text-xs text-stone-600 pt-2 border-t border-stone-100">
                  <div className="flex justify-between">
                    <span>Items Subtotal</span>
                    <span className="font-bold text-stone-900">${subtotal.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Voucher Discount</span>
                      <span>-${discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span className="font-bold text-stone-900">
                      {shippingFee === 0 ? 'Complimentary ($0.00)' : `$${shippingFee.toFixed(2)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Sales Tax (8%)</span>
                    <span>${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold text-stone-950 pt-2 border-t border-stone-200">
                    <span>Total Amount</span>
                    <span>${finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Place Order CTA */}
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-4 bg-stone-950 hover:bg-stone-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-xl disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>{isProcessing ? 'Processing Payment...' : `Place Order ($${finalTotal.toFixed(2)})`}</span>
                </button>

                <p className="text-[10px] text-stone-400 text-center leading-tight">
                  {paymentMethod === 'COD' ? 'Pay cash on delivery. Order will be created as UNPAID until delivery confirmation.' : 'Pay securely via UPI using any UPI app. Order confirmed after payment verification.'}
                </p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* YouPI-PG UPI Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-stone-900" />
                <h3 className="font-serif text-sm font-bold text-stone-900">Secure UPI Payment</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                aria-label="Close payment window"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="relative">
              {paymentIframeUrl ? (
                <iframe
                  ref={iframeRef}
                  src={paymentIframeUrl}
                  title="YouPI-PG Secure Checkout"
                  className="w-full h-[560px] border-0"
                  allow="payment"
                />
              ) : (
                <div className="h-[560px] flex flex-col items-center justify-center gap-3 text-xs text-stone-500">
                  <Clock className="w-8 h-8 text-stone-300 animate-pulse" />
                  <span>Preparing secure checkout...</span>
                </div>
              )}

              {polling && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-2 bg-stone-900/90 text-white text-[11px] rounded-full flex items-center gap-2 whitespace-nowrap">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Verifying payment with server...
                </div>
              )}
            </div>

            <p className="px-5 py-3 text-[10px] text-stone-400 border-t border-stone-100 text-center leading-tight">
              Powered by YouPI-PG. Order status is confirmed server-side after payment verification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};