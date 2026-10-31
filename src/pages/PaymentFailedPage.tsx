import React, { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { XCircle, ArrowRight, ShoppingBag, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

/** Posts a hidden HTML form to PayU (required: server-generated hash, no CORS issues).
 * MUST be called synchronously in the Place Order click chain — no await/clearCart
 * before it, otherwise the navigation loses its user gesture / React unmounts. */
export function postToPayU(payuUrl: string, fields: Record<string, string>) {
  const requiredFields = ['key', 'txnid', 'amount', 'productinfo', 'firstname', 'email', 'hash', 'surl', 'furl'];
  const missingFields = requiredFields.filter(field => !fields[field]);
  if (missingFields.length > 0) {
    throw new Error(`Missing required PayU fields: ${missingFields.join(', ')}. Please try again.`);
  }
  // Remove any stale PayU form from a previous attempt
  const stale = document.getElementById('payu-checkout-form');
  if (stale && stale.parentNode) stale.parentNode.removeChild(stale);

  const form = document.createElement('form');
  form.id = 'payu-checkout-form';
  form.method = 'POST';
  form.action = payuUrl;
  form.style.display = 'none';

  for (const [k, v] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = k;
    input.value = String(v ?? '');
    form.appendChild(input);
  }

  document.body.appendChild(form);
  // Synchronous submit — keeps the user-gesture chain so the gateway always opens
  form.submit();
}

export const PaymentFailedPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const orderId = params.get('orderId') || '';
  const reason = params.get('reason') || 'failed';
  const [retrying, setRetrying] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const reasonText: Record<string, string> = {
    failed: 'Your payment was not completed.',
    failure: 'Your payment was not completed.',
    cancel: 'You cancelled the payment before completing it.',
    cancelled: 'You cancelled the payment before completing it.',
    hash_mismatch: 'Security check failed. No money movement was confirmed.',
    amount_mismatch: 'Amount verification failed. Your order was not marked as paid.',
    unknown_order: 'We could not match this payment to an order.',
    callback_error: 'A technical error interrupted confirmation. Check status before retrying.',
  };

  const handleRetry = async () => {
    if (!orderId) { navigate('/checkout'); return; }
    setRetrying(true); setErr(null);
    try {
      const res = await api.payments.payuRetry(orderId);
      if (res.success && res.payuUrl && res.payuFields) {
        postToPayU(res.payuUrl, res.payuFields);
      } else {
        setErr(res.message || 'Could not restart payment.');
      }
    } catch (e: any) {
      setErr(e?.message || 'Could not restart payment.');
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafaf9] py-16 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border p-8 sm:p-12 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto shadow-inner">
          <XCircle className="w-8 h-8 text-rose-600" />
        </div>
        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-rose-50 text-rose-800">Payment Not Completed</span>
          <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">We Couldn't Complete Your Payment</h1>
          <p className="text-xs text-stone-500">{reasonText[reason] || reasonText.failed} No confirmed payment was recorded for this attempt.</p>
          {orderId && <p className="text-xs text-stone-500">Order Reference: <strong className="font-mono text-stone-900">{orderId}</strong></p>}
        </div>
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{err}</div>}
        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          {orderId ? (
            <button onClick={handleRetry} disabled={retrying} className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} /> {retrying ? 'Restarting…' : 'Retry Payment'} <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <Link to="/checkout" className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider">Return to Checkout</Link>
          )}
          <Link to="/products" className="px-6 py-3 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-2">
            <ShoppingBag className="w-4 h-4" /> Continue Shopping
          </Link>
        </div>
        <p className="text-[10px] text-stone-400">If you were debited despite this message, the amount is auto-reversed by your bank within 3–5 business days.</p>
      </div>
    </div>
  );
};