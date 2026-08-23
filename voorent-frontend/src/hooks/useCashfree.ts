import { useCallback } from 'react';
import { createCashfreeOrder, verifyCashfreePayment } from '../services/api';

// Cashfree JS SDK v3 types (minimal)
interface CashfreeInstance {
  checkout(opts: { paymentSessionId: string; redirectTarget?: string }): Promise<unknown>;
}
declare global {
  interface Window {
    Cashfree?: (opts: { mode: 'sandbox' | 'production' }) => CashfreeInstance;
  }
}

function loadCashfreeScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Cashfree) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type PayPlan = 'monthly' | 'upfront' | 'rent-to-own';

// Same signature as useRazorpay().openCheckout so ConfirmRental can swap gateways freely.
export function useCashfree() {
  const openCheckout = useCallback(async ({
    listingId,
    plan,
    deliveryAddress,
    onSuccess,
    onError,
    onDismiss,
  }: {
    listingId: string;
    plan: PayPlan;
    deliveryAddress: string;
    userPhone?: string;
    userName?: string;
    onSuccess?: (rentalId: string) => void;
    onError?: (err: string) => void;
    onDismiss?: () => void;
  }) => {
    const loaded = await loadCashfreeScript();
    if (!loaded || !window.Cashfree) {
      onError?.('Failed to load payment gateway. Please check your connection.');
      return;
    }

    let data;
    try {
      const res = await createCashfreeOrder(listingId, plan, deliveryAddress);
      data = res.data;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: string } })?.response?.data;
      onError?.(typeof msg === 'string' && msg ? msg : 'Could not create payment order. Please try again.');
      return;
    }

    const cashfree = window.Cashfree({ mode: data.mode === 'production' ? 'production' : 'sandbox' });

    try {
      // Opens Cashfree's modal checkout; resolves when the modal closes.
      await cashfree.checkout({ paymentSessionId: data.paymentSessionId, redirectTarget: '_modal' });
    } catch {
      onDismiss?.();
      return;
    }

    // Always confirm the payment server-side (authoritative) before creating the rental.
    try {
      const verify = await verifyCashfreePayment(data.orderId);
      onSuccess?.(verify.data.rentalId);
    } catch {
      // Not paid / cancelled — treat as dismiss so the user can retry.
      onDismiss?.();
    }
  }, []);

  return { openCheckout };
}
