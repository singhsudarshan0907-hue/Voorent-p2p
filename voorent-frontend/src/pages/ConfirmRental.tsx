import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { getListingById } from '../services/api';
import { useRazorpay } from '../hooks/useRazorpay';
import { isDelhibNCRPincode } from '../utils/pincodes';
import type { Listing, PlanType } from '../types';

export default function ConfirmRental() {
  const { listingId } = useParams<{ listingId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [item, setItem] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>(
    (params.get('plan') || 'monthly') as PlanType
  );

  const { openCheckout } = useRazorpay();

  useEffect(() => {
    if (!listingId) return;
    getListingById(listingId)
      .then((r) => setItem(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />
      <div className="flex items-center justify-center flex-1 text-[#2D6A4F]">Loading…</div>
    </div>
  );
  if (!item) return <div className="p-4 text-center text-red-600">Item not found.</div>;

  const isServiceable = !item.pincode || isDelhibNCRPincode(item.pincode);

  const monthly      = item.monthlyRent;
  const upfront12    = item.monthlyRent * 12;
  const firstPayment = selectedPlan === 'upfront' ? upfront12 : monthly;

  const handlePay = () => {
    if (!listingId) return;
    setPaying(true);
    setError('');
    openCheckout({
      listingId,
      plan: selectedPlan as 'monthly' | 'upfront' | 'rent-to-own',
      onSuccess: (rentalId) => {
        setPaying(false);
        navigate(`/my-rentals?new=${rentalId}`);
      },
      onError: (msg) => { setPaying(false); setError(msg); },
      onDismiss: () => setPaying(false),
    });
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-[#999]">
          <button onClick={() => navigate(-1)} className="hover:text-[#2D6A4F]">← Back</button>
          <span>›</span>
          <span className="text-[#1A1A1A] font-medium">Confirm Rental</span>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-4xl mx-auto">

          {/* LEFT — Item summary + plan selection */}
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-6">Confirm your rental</h1>

            {/* Item card */}
            <div className="flex gap-4 p-4 rounded-2xl bg-white border border-[#E0E0E0] mb-6">
              <img src={item.imageUrl} alt={item.title}
                className="w-24 h-24 rounded-xl object-cover flex-shrink-0" />
              <div className="flex flex-col justify-center">
                <p className="font-bold text-[#1A1A1A] mb-1">{item.title}</p>
                <p className="text-sm text-[#999] mb-2">{item.condition}</p>
                <p className="font-bold text-lg" style={{ color: '#2D6A4F' }}>
                  ₹{monthly.toLocaleString()}<span className="text-sm font-normal text-[#555]">/month</span>
                </p>
              </div>
            </div>

            {/* Plan selection */}
            <h2 className="font-bold text-sm text-[#999] uppercase tracking-widest mb-3">Choose payment plan</h2>
            <div className="space-y-3">

              {/* Monthly EMI */}
              <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-[#2D6A4F] bg-[#F0FAF5]' : 'border-[#E0E0E0] bg-white hover:border-[#B0D0C0]'}`}>
                <input type="radio" name="plan" value="monthly" checked={selectedPlan === 'monthly'}
                  onChange={() => setSelectedPlan('monthly')} className="accent-[#2D6A4F] mt-1 w-4 h-4 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-[#1A1A1A]">No-cost EMI</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#2D6A4F', color: '#fff' }}>RECOMMENDED</span>
                  </div>
                  <p className="text-xl font-bold mb-1" style={{ color: '#2D6A4F' }}>
                    ₹{monthly.toLocaleString()}<span className="text-sm font-normal text-[#555]">/month</span>
                  </p>
                  <p className="text-sm text-[#555]">Auto-deducted from your debit card monthly</p>
                </div>
              </label>

              {/* Pay Upfront */}
              <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === 'upfront' ? 'border-[#2D6A4F] bg-[#F0FAF5]' : 'border-[#E0E0E0] bg-white hover:border-[#B0D0C0]'}`}>
                <input type="radio" name="plan" value="upfront" checked={selectedPlan === 'upfront'}
                  onChange={() => setSelectedPlan('upfront')} className="accent-[#2D6A4F] mt-1 w-4 h-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-[#1A1A1A] mb-1">Pay Upfront</p>
                  <p className="text-xl font-bold mb-1" style={{ color: '#2D6A4F' }}>
                    ₹{upfront12.toLocaleString()}<span className="text-sm font-normal text-[#555]"> for 12 months</span>
                  </p>
                  <p className="text-sm text-[#555]">Full 12-month payment in one go</p>
                </div>
              </label>
            </div>
          </div>

          {/* RIGHT — Summary + CTA */}
          <div>
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 sticky top-24">
              <h2 className="font-bold text-lg text-[#1A1A1A] mb-5">Order Summary</h2>

              <div className="space-y-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">Plan</span>
                  <span className="font-semibold text-[#1A1A1A]">{selectedPlan === 'monthly' ? 'No-cost EMI' : 'Pay Upfront'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">Lock-in period</span>
                  <span className="font-semibold text-[#1A1A1A]">12 months</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-[#555]">Security deposit</span>
                  <span className="font-semibold text-[#2D6A4F]">₹0 (None)</span>
                </div>
                <div className="h-px bg-[#E0E0E0]" />
                <div className="flex justify-between">
                  <span className="font-bold text-[#1A1A1A]">Due today</span>
                  <span className="font-bold text-xl" style={{ color: '#2D6A4F' }}>₹{firstPayment.toLocaleString()}</span>
                </div>
              </div>

              {/* Ownership note */}
              <div className="rounded-xl p-3 mb-5 flex gap-2" style={{ background: '#FFF8F0', border: '1px solid #FDDBB4' }}>
                <span className="flex-shrink-0">🏠</span>
                <p className="text-xs text-[#555]">
                  Complete all <strong>24 monthly payments</strong> and ownership transfers to you at no extra cost.
                </p>
              </div>

                      {!isServiceable && (
                <div className="p-4 rounded-xl mb-4 flex gap-3" style={{ background: '#FFF3F3', border: '1px solid #FBBCBC' }}>
                  <span className="text-lg flex-shrink-0">📍</span>
                  <div>
                    <p className="text-sm font-bold text-[#D62828] mb-0.5">Not serviceable in your area</p>
                    <p className="text-xs text-[#555]">We currently deliver only within Delhi NCR. This item's pincode is outside our service area.</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
                  <p className="text-xs text-red-600">{error} — please try again.</p>
                </div>
              )}

              <button onClick={handlePay} disabled={paying || !isServiceable}
                className="w-full py-4 rounded-2xl font-bold text-[#1A1A1A] text-base mb-3 disabled:opacity-60 hover:opacity-90 transition-opacity"
                style={{ background: '#F4A261' }}>
                {paying ? 'Opening payment…' : `Pay ₹${firstPayment.toLocaleString()} & confirm →`}
              </button>

              <p className="text-xs text-center text-[#999]">🔒 Secured by Razorpay · UPI · Cards · NetBanking</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
