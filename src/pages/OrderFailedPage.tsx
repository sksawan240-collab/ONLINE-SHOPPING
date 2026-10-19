import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, ArrowRight, ShoppingBag } from 'lucide-react';

/**
 * Landing page for YOUPI-PG failure redirects (baseOrigin/order-failed?...).
 * The gateway sends customers here when a payment session fails, expires or is
 * cancelled, always with orderId / reason / paymentId query parameters.
 */
export const OrderFailedPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const paramOrderId = searchParams.get('orderId');
    const reason = (searchParams.get('reason') || 'FAILED').toUpperCase();
    setOrderId(paramOrderId);

    // Keep the customer's last payment pointer so /payment-return can still
    // verify if they head there, and so retrying checkout starts clean.
    try {
      const raw = localStorage.getItem('luxe_last_payment');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && paramOrderId && parsed.orderId === paramOrderId) {
          localStorage.removeItem('luxe_last_payment');
        }
      }
    } catch {
      /* ignore */
    }
    void reason;
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-[#fafaf9] py-16 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-2xl border border-stone-200/80 p-8 sm:p-12 shadow-lg text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-50 flex items-center justify-center mx-auto shadow-inner">
          <XCircle className="w-8 h-8 text-rose-600" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-[10px] uppercase tracking-widest font-bold bg-rose-50 text-rose-800">
            Payment Not Completed
          </span>
          <h1 className="font-serif text-3xl font-bold text-stone-900 mt-1">We Couldn't Complete Your Payment</h1>
          <p className="text-xs text-stone-500 leading-relaxed">
            The payment session did not complete. <strong>No amount will be deducted</strong> for an unconfirmed session —
            you can safely try again.
          </p>
          {orderId && (
            <p className="text-xs text-stone-500">
              Order Reference: <strong className="text-stone-900 font-mono text-sm">{orderId}</strong>
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-3 pt-2">
          <Link
            to="/checkout"
            className="px-6 py-3 bg-stone-900 text-white rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-stone-800 transition-colors shadow-md flex items-center justify-center gap-2"
          >
            <span>Retry Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <Link
            to="/products"
            className="px-6 py-3 bg-stone-100 text-stone-800 rounded-xl text-xs font-semibold uppercase tracking-wider hover:bg-stone-200 transition-colors flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Continue Shopping</span>
          </Link>
        </div>

        <p className="text-[10px] text-stone-400 leading-tight pt-2">
          If you were debited despite this message, the amount is auto-reversed by the bank within 3–5 business days.
        </p>
      </div>
    </div>
  );
};
