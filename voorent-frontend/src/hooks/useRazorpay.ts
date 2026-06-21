import { useCallback } from 'react';
import { createRazorpayOrder, verifyRazorpayPayment } from '../services/api';

// Razorpay checkout.js types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string };
  notes?: Record<string, string>;
  theme?: { color: string };
  modal?: { ondismiss?: () => void };
  handler: (response: RazorpayResponse) => void;
  config?: {
    display?: {
      blocks?: Record<string, { name: string; instruments: object[] }>;
      sequence?: string[];
      preferences?: { show_default_blocks?: boolean };
    };
  };
}
interface RazorpayInstance { open(): void }
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type PayPlan = 'monthly' | 'upfront' | 'rent-to-own';

export function useRazorpay() {
  const openCheckout = useCallback(async ({
    listingId,
    plan,
    userPhone,
    userName,
    onSuccess,
    onError,
    onDismiss,
  }: {
    listingId: string;
    plan: PayPlan;
    userPhone?: string;
    userName?: string;
    onSuccess?: (rentalId: string) => void;
    onError?: (err: string) => void;
    onDismiss?: () => void;
  }) => {
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      onError?.('Failed to load payment gateway. Please check your connection.');
      return;
    }

    let orderData;
    try {
      const res = await createRazorpayOrder(listingId, plan);
      orderData = res.data;
    } catch {
      onError?.('Could not create payment order. Please try again.');
      return;
    }

    // Build No Cost EMI config for monthly/rent-to-own plans
    const isEmiPlan = plan === 'monthly' || plan === 'rent-to-own';
    const emiTenure = plan === 'rent-to-own' ? 24 : 12;

    const options: RazorpayOptions = {
      key:         orderData.keyId,
      amount:      orderData.amount,
      currency:    orderData.currency,
      name:        'Voorent',
      description: orderData.planLabel,
      order_id:    orderData.orderId,
      prefill: {
        name:    userName  || '',
        contact: userPhone || '',
      },
      notes: {
        plan,
        no_cost_emi: isEmiPlan ? 'true' : 'false',
      },
      theme: { color: '#2D6A4F' },
      modal: { ondismiss: onDismiss },

      // Show No Cost EMI block first for rental plans
      ...(isEmiPlan && {
        config: {
          display: {
            blocks: {
              no_cost_emi: {
                name: `No Cost EMI — ${emiTenure} months (0% interest)`,
                instruments: [{ method: 'emi' }],
              },
              other: {
                name: 'Other Payment Methods',
                instruments: [
                  { method: 'upi' },
                  { method: 'card' },
                  { method: 'netbanking' },
                ],
              },
            },
            sequence: ['block.no_cost_emi', 'block.other'],
            preferences: { show_default_blocks: false },
          },
        },
      }),

      handler: async (response) => {
        try {
          const verify = await verifyRazorpayPayment(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature
          );
          onSuccess?.(verify.data.rentalId);
        } catch {
          onError?.('Payment verification failed. Contact Voorent support.');
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }, []);

  return { openCheckout };
}
