import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, ShoppingBag } from 'lucide-react';
import { api } from '../services/api';
import { Order } from '../types';

/** PayU success landing — shows confirmation ONLY after backend verification. */
export const PaymentSuccessPage: React.FC = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) { setLoading(false); setError('Missing order reference.'); return; }
    let tries = 0;
    let alive = true;
    const check = async () => {
      tries += 1;
      try {
        const res = await api.payments.payuStatus(orderId);
        if (!alive) return;
        if (res.success && res.order) {
          setOrder(res.order);
          if (res.paymentStatus === 'PAID') { setVerified(true); setLoading(false); return; }
          if (res.paymentStatus === 'FAILED') {
            window.location.href = `/payment/failed?orderId=${encodeURIComponent(orderId)}&reason=failed`;
            return;
          }
        }
      } catch (e: any) {
        if (tries >= 8 && alive) { setError(e?.message || 'Could not verify payment.'); setLoading(false); return; }
      }
      if (tries < 10 && alive) setTimeout(check, 3000);
      else if (alive) setLoading(false);
    };
    check();
    return () => { alive = false; };
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf9] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl border p-10 text-center space-y-4 shadow-lg">
          <div className="w-10 h-10 mx-auto rounded-full border-2 border-stone-900 border-t-transparent animate-spin" />
          <h1 className="font-serif text-xl font-bold text-stone-900">Verifying Your Payment…</h1>
          <p className="text-xs text-stone-500">Confirming with PayU on our secure server. Do not close this page.</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#fafaf9] py-16 px-4">
        <div className="max-w-md mx-auto bg-white rounded-2xl border p-10 text-center space-y-4 shadow-lg">
          <h1 className="font-serif text-xl font-bold">We could not verify this payment</h1>
          <p className="text-xs text-stone-500">{error || 'Order not found.'}</p>
          <Link to="/products" className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold">Continue Shopping</Link>
        </div>
      </div>
    );
  }

  if (!verified) {
    window.location.href = `/payment/pending?orderId=${encodeURIComponent(orderId)}`;
    return null;
  }

  const payu: any = (order as any).payu || {};
  return (
    <div className="min-h-screen bg-[#fafaf9] py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border p-8 sm:p-12 shadow-lg text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center mx-auto shadow-inner">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <div>
          <span className="text-[11px] uppercase tracking-widest text-emerald-800 font-bold bg-emerald-50 px-3 py-1 rounded-full">Payment Verified</span>
          <h1 className="font-serif text-3xl font-bold text-stone-900 mt-2">Thank You — Payment Successful</h1>
          <p className="text-xs text-stone-500 mt-1">Order <strong className="font-mono text-stone-900">{order.orderId}</strong> is confirmed.</p>
        </div>
        <div className="p-5 bg-stone-50 rounded-xl border text-left text-xs space-y-2">
          <div className="flex justify-between"><span className="text-stone-500">Amount Paid</span><strong>₹{Number(order.total).toFixed(2)}</strong></div>
          {payu.mihpayid && <div className="flex justify-between"><span className="text-stone-500">PayU Transaction ID</span><strong className="font-mono">{payu.mihpayid}</strong></div>}
          {payu.txnid && <div className="flex justify-between"><span className="text-stone-500">Merchant TXN</span><strong className="font-mono">{payu.txnid}</strong></div>}
          {payu.mode && <div className="flex justify-between"><span className="text-stone-500">Paid Via</span><strong className="uppercase">{payu.mode}</strong></div>}
          <div className="flex justify-between"><span className="text-stone-500">Ship To</span><span className="text-right">{order.shippingAddress?.street}, {order.shippingAddress?.city} {order.shippingAddress?.postalCode}</span></div>
        </div>
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link to={`/track-order?id=${order.orderId}`} className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
            Track Order <ArrowRight className="w-4 h-4" />
          </Link>
          <Link to="/products" className="px-6 py-3 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

