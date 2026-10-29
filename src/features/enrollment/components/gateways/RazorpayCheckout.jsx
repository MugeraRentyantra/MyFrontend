import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from '@/shared/components/ui';
import { APP_NAME } from '@/shared/constants';
import { Loader2 } from '@/shared/icons';
import { getErrorMessage } from '@/shared/utils/errors';
import { planLabel } from '../../utils/plans';

export const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise = null;

/** Loads Razorpay's checkout.js once per page load (shared by every checkout). */
export function loadRazorpay() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('The payment window can only open in a browser.'));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT_SRC;
      script.async = true;
      script.onload = () => {
        if (window.Razorpay) resolve(window.Razorpay);
        else {
          scriptPromise = null;
          reject(new Error("The payment window didn't load. Please try again."));
        }
      };
      script.onerror = () => {
        scriptPromise = null;
        script.remove();
        reject(new Error("Couldn't load the payment window. Check your connection and try again."));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Razorpay Standard Checkout adapter. Opens Razorpay's own secure window for the server-created
 * order. Razorpay's success callback only sends the student to the status page — the payment
 * counts once the server receives the verified webhook, never because of this redirect.
 *
 * Adapter props (shared with every gateway): { order, enrollment, user, open, onClose, onComplete }.
 */
export function RazorpayCheckout({ order, enrollment, user, open, onClose, onComplete }) {
  const [loading, setLoading] = useState(false);
  const callbacks = useRef({ onClose, onComplete });
  callbacks.current = { onClose, onComplete };

  // Read the latest display data without reopening the window when it changes.
  const details = useRef({ enrollment, user });
  details.current = { enrollment, user };

  useEffect(() => {
    if (!open || !order) return undefined;
    let cancelled = false;
    let instance = null;
    setLoading(true);

    loadRazorpay()
      .then((Razorpay) => {
        if (cancelled) return;
        const data = order.checkoutData ?? {};
        const { enrollment: currentEnrollment, user: currentUser } = details.current;
        instance = new Razorpay({
          key: data.key,
          order_id: data.orderId ?? data.order_id ?? order.orderId,
          amount: data.amount ?? order.amount,
          currency: data.currency ?? order.currency,
          name: data.name ?? data.merchantName ?? APP_NAME,
          description:
            data.description ?? (planLabel(currentEnrollment?.plan) || 'Internship enrollment'),
          prefill: data.prefill ?? { name: currentUser?.name, email: currentUser?.email },
          notes: data.notes,
          theme: data.theme,
          handler: () => callbacks.current.onComplete?.('submitted'),
          modal: {
            ondismiss: () => callbacks.current.onClose?.(),
          },
        });
        instance.open();
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoading(false);
        toast.error("We couldn't open the payment window", { description: getErrorMessage(error) });
        callbacks.current.onClose?.();
      });

    return () => {
      cancelled = true;
      setLoading(false);
      if (instance && typeof instance.close === 'function') {
        try {
          instance.close();
        } catch {
          // the window was already closed
        }
      }
    };
  }, [open, order]);

  if (!loading || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 animate-fade-in">
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-xl bg-white px-5 py-4 text-sm font-medium text-slate-700 shadow-elevated"
      >
        <Loader2 className="h-5 w-5 animate-spin text-brand-600" aria-hidden="true" />
        Opening secure checkout…
      </div>
    </div>,
    document.body,
  );
}

export default RazorpayCheckout;
