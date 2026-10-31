import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { api } from '../services/api';

export const PaymentPendingPage: React.FC = () => {
  const [params] = useSearchParams();
  const orderId = params.get('orderId') || '';
  const [status, setStatus] = useState('PENDING');
  const [checks, setChecks] = useState(0);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    const poll = async () => {
      try {
        const res = await api.payments.payuStatus(orderId);
        if (!alive) return;
        setChecks(c => c + 1);
        if (res.success) {
          setStatus(res.paymentStatus);
          if (res.paymentStatus === 'PAID') {
            window.location.href = `/payment/success?orderId=${encodeURIComponent(orderId)}`;
            return;
          }
          if (res.paymentStatus === 'FAILED') {
            window.location.href = `/payment/failed?orderId=${encodeURIComponent(orderId)}&reason=failed`;
            return;
          }
        }
      } catch { /* keep polling */ }
      if (alive && checks < 20) setTimeout(poll, 5000);
    };
    poll();
    return () => { alive = false; };
  }, [orderId]);

  return (
    <div className="min-h-screen bg-[#fafaf9] py-16 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl border p-10 text-center space-y-4 shadow-lg">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto shadow-inner">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="font-serif text-2xl font-bold text-stone-900">Payment Awaiting Confirmation</h1>
        <p className="text-xs text-stone-500">Your payment is being confirmed with PayU and your bank. This usually takes a few seconds — please keep this page open.</p>
        {orderId && <p className="text-xs">Order: <strong className="font-mono">{orderId}</strong></p>}
        <p className="text-[11px] text-stone-400">Status: {status} · checked {checks}×</p>
        <div className="flex justify-center gap-3 pt-2">
          <Link to={orderId ? `/track-order?id=${orderId}` : '/products'} className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold">Track Order</Link>
          <Link to="/products" className="px-6 py-3 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold">Continue Shopping</Link>
        </div>
      </div>
    </div>
  );
};
