import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import StarRating from '../components/StarRating';
import { getListingById, getReviews, contactVoorent } from '../services/api';
import type { Listing, Review, PlanType } from '../types';

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Listing | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [plan, setPlan] = useState<PlanType>('monthly');
  const [imgIndex, setImgIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([getListingById(id), getReviews(id)])
      .then(([listRes, revRes]) => {
        setItem(listRes.data);
        setReviews(revRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />
      <div className="flex items-center justify-center flex-1" style={{ color: '#2D6A4F' }}>Loading…</div>
    </div>
  );
  if (!item) return <div className="p-4 text-center text-red-600">Item not found.</div>;

  const monthly   = item.monthlyRent;
  const upfront12 = item.monthlyRent * 12;
  const images    = item.images?.length ? item.images : [item.imageUrl];

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Breadcrumb */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-2 text-sm text-[#999]">
          <button onClick={() => navigate('/')} className="hover:text-[#2D6A4F]">Home</button>
          <span>›</span>
          <button onClick={() => navigate('/browse')} className="hover:text-[#2D6A4F]">Browse</button>
          <span>›</span>
          <span className="text-[#1A1A1A] font-medium truncate max-w-xs">{item.title}</span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 py-10">
        {/* ── Two-column desktop layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* LEFT — Image gallery */}
          <div>
            {/* Main image */}
            <div className="rounded-2xl overflow-hidden bg-white border border-[#E0E0E0] mb-3"
              style={{ aspectRatio: '4/3' }}>
              {images[imgIndex] ? (
                <img
                  src={images[imgIndex]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#F0FAF5]">
                  <span className="text-6xl mb-2">{item.category === 'Appliances' ? '🔌' : '🛋️'}</span>
                  <span className="text-sm text-[#999]">No photo uploaded</span>
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIndex(i)}
                    className="rounded-xl overflow-hidden border-2 transition-all flex-shrink-0"
                    style={{
                      width: 72, height: 72,
                      borderColor: i === imgIndex ? '#2D6A4F' : '#E0E0E0'
                    }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                { icon: '🚚', label: 'Free Delivery' },
                { icon: '↩️', label: 'Easy Returns' },
                { icon: '🔒', label: 'Secure Pay' },
              ].map((b) => (
                <div key={b.label} className="flex flex-col items-center gap-1 p-3 rounded-xl bg-white border border-[#E0E0E0] text-center">
                  <span className="text-xl">{b.icon}</span>
                  <span className="text-xs font-semibold text-[#555]">{b.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Details + Plan */}
          <div>
            {/* Badges */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: '#F3F4F6', color: '#555' }}>
                {item.category === 'Appliances' ? '🔌' : '🛋️'} {item.category}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full border"
                style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                {item.condition}
              </span>
              <span className="text-xs font-semibold px-3 py-1 rounded-full"
                style={{ background: '#E8F5E9', color: '#2D6A4F' }}>
                ✓ Seller Verified
              </span>
            </div>

            <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3 leading-tight">{item.title}</h1>
            <p className="text-[#555555] mb-6 leading-relaxed">{item.description}</p>

            {/* Plan selector */}
            <h2 className="font-bold text-lg text-[#1A1A1A] mb-4">Choose your plan</h2>

            <fieldset className="flex flex-col gap-3 mb-4" role="radiogroup">

              {/* No-cost EMI */}
              <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${plan === 'monthly' ? 'border-[#2D6A4F] bg-[#F0FAF5]' : 'border-[#E0E0E0] bg-white hover:border-[#B0D0C0]'}`}>
                <input type="radio" name="plan" value="monthly" checked={plan === 'monthly'}
                  onChange={() => setPlan('monthly')} className="accent-[#2D6A4F] mt-1 w-4 h-4 flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-bold text-[#1A1A1A]">No-cost EMI</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: '#2D6A4F', color: '#fff' }}>RECOMMENDED</span>
                  </div>
                  <p className="text-2xl font-bold mb-1" style={{ color: '#2D6A4F' }}>
                    ₹{monthly.toLocaleString()}<span className="text-base font-normal text-[#555]">/month</span>
                  </p>
                  <p className="text-sm text-[#555]">₹{monthly.toLocaleString()} × 12 months = <strong>₹{upfront12.toLocaleString()}</strong> total</p>
                  <p className="text-sm text-[#555] mt-1">Amount auto-deducted monthly from your debit card</p>
                </div>
              </label>

              {/* Pay Upfront */}
              <label className={`flex items-start gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${plan === 'upfront' ? 'border-[#2D6A4F] bg-[#F0FAF5]' : 'border-[#E0E0E0] bg-white hover:border-[#B0D0C0]'}`}>
                <input type="radio" name="plan" value="upfront" checked={plan === 'upfront'}
                  onChange={() => setPlan('upfront')} className="accent-[#2D6A4F] mt-1 w-4 h-4 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-[#1A1A1A] mb-1">Pay Upfront</p>
                  <p className="text-2xl font-bold mb-1" style={{ color: '#2D6A4F' }}>
                    ₹{upfront12.toLocaleString()}<span className="text-base font-normal text-[#555]"> for 12 months</span>
                  </p>
                  <p className="text-sm text-[#555]">Pay full 12-month amount upfront in one shot</p>
                </div>
              </label>
            </fieldset>

            {/* Ownership note */}
            <div className="rounded-2xl p-4 mb-6 flex gap-3" style={{ background: '#FFF8F0', border: '1px solid #FDDBB4' }}>
              <span className="text-xl flex-shrink-0">🏠</span>
              <p className="text-sm text-[#555555] leading-relaxed">
                On successfully completing all <strong>24 monthly payments</strong>, ownership of this item is legally transferred to you — at no extra cost.
              </p>
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate(`/checkout/${item.id}?plan=${plan}`)}
              className="w-full py-4 rounded-2xl font-bold text-[#1A1A1A] text-lg mb-3 transition-opacity hover:opacity-90"
              style={{ background: '#F4A261' }}
            >
              Rent this item →
            </button>
            <p className="text-xs text-center text-[#999]">🔒 Secure checkout powered by Razorpay</p>

            {/* Contact */}
            <button
              onClick={() => contactVoorent(`Regarding listing: ${item.title} (ID: ${item.id})`)}
              className="w-full mt-4 py-3 rounded-2xl font-semibold text-sm border-2 transition-colors hover:bg-[#F0FAF5]"
              style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}
            >
              💬 Have a question? Contact Voorent
            </button>
          </div>
        </div>

        {/* ── Reviews section ── */}
        <div className="mt-14 border-t border-[#E0E0E0] pt-10">
          <div className="flex items-center gap-3 mb-6">
            <h2 className="text-2xl font-bold text-[#1A1A1A]">Customer Reviews</h2>
            <StarRating rating={item.averageRating || 0} size={20} />
            <span className="font-bold text-lg text-[#1A1A1A]">{item.averageRating?.toFixed(1)}</span>
            <span className="text-sm text-[#999]">({item.reviewCount} reviews)</span>
          </div>

          {reviews.length === 0 ? (
            <p className="text-[#999] text-sm">No reviews yet. Be the first to rent this item!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reviews.slice(0, 4).map((r) => (
                <div key={r.id} className="p-5 rounded-2xl bg-white border border-[#E0E0E0]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-[#1A1A1A]">{r.reviewerName}</span>
                    <span className="text-xs text-[#999]">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <StarRating rating={r.rating} size={14} />
                  <p className="text-sm text-[#555555] mt-2 leading-relaxed">{r.reviewText}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Rent-to-own explainer ── */}
        <div className="mt-14 border-t border-[#E0E0E0] pt-10">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8">How Voorent works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: '📦', title: 'We deliver to you', desc: 'Item is inspected, sanitised, and delivered to your door within 2–3 business days. Delivery is free.' },
              { icon: '💳', title: 'Pay monthly',       desc: 'Small fixed monthly payments via UPI, card, or net banking. No security deposit, no hidden charges.' },
              { icon: '🏠', title: 'Own it at 24 months', desc: 'After 24 payments the item is legally transferred to you at zero extra cost. That\'s it.' },
            ].map((s) => (
              <div key={s.title} className="flex gap-4">
                <span className="text-3xl flex-shrink-0">{s.icon}</span>
                <div>
                  <h3 className="font-bold text-[#1A1A1A] mb-1">{s.title}</h3>
                  <p className="text-sm text-[#555] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Trust strip ── */}
        <div className="mt-12 mb-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: '✅', label: 'Quality verified'  },
            { icon: '🚚', label: 'Free delivery'     },
            { icon: '↩️', label: 'Return anytime'    },
            { icon: '🔒', label: 'Secure checkout'   },
          ].map((t) => (
            <div key={t.label} className="flex items-center gap-2 p-4 rounded-2xl bg-[#F0FAF5] text-sm font-semibold text-[#2D6A4F]">
              <span>{t.icon}</span><span>{t.label}</span>
            </div>
          ))}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E0E0E0] py-10 bg-white mt-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-6 text-sm text-[#999]">
          <div>
            <p className="text-xl font-bold mb-1" style={{ color: '#2D6A4F' }}>Voorent</p>
            <p>India's trusted rent-to-own marketplace</p>
          </div>
          <div className="flex gap-10">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1A1A1A] mb-1">Browse</p>
              <button onClick={() => navigate('/browse?category=Furniture')} className="text-left hover:text-[#2D6A4F]">Furniture</button>
              <button onClick={() => navigate('/browse?category=Appliances')} className="text-left hover:text-[#2D6A4F]">Appliances</button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1A1A1A] mb-1">Legal</p>
              <button onClick={() => navigate('/terms')} className="text-left hover:text-[#2D6A4F]">Terms of Service</button>
              <button onClick={() => navigate('/privacy')} className="text-left hover:text-[#2D6A4F]">Privacy Policy</button>
            </div>
          </div>
          <p className="text-xs self-end">© 2026 Voorent. All rights reserved.</p>
        </div>
      </footer>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
