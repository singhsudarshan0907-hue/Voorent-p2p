import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import { getListings } from '../services/api';
import type { Listing } from '../types';

async function geocodePincode(pincode: string): Promise<{ lat: number; lng: number; label: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=IN&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en', 'User-Agent': 'Voorent/1.0' } }
    );
    const data = await res.json();
    if (!data?.length) return null;
    const { lat, lon, display_name } = data[0];
    const label = display_name.split(',').slice(0, 2).join(',').trim();
    return { lat: parseFloat(lat), lng: parseFloat(lon), label };
  } catch { return null; }
}

const TRUST = [
  { icon: '🚚', title: 'Free Delivery',    desc: 'Doorstep delivery included' },
  { icon: '🔒', title: 'Secure Payments',  desc: 'Razorpay-powered checkout' },
  { icon: '↩️', title: 'Easy Returns',     desc: 'No questions asked policy' },
  { icon: '🏠', title: 'Rent-to-Own',      desc: 'Own it after 24 months' },
];

const TESTIMONIALS = [
  { name: 'Priya S.', city: 'Bangalore', avatar: '👩', text: 'Moved into my new flat with zero upfront cost. Got a sofa and bed delivered in 2 days. Voorent made settling in so easy!', rating: 5 },
  { name: 'Rahul M.', city: 'Pune', avatar: '👨', text: 'The rent-to-own plan is a game changer. I\'m paying the same as rent but will own the fridge after 24 months. 100% recommend.', rating: 5 },
  { name: 'Sneha K.', city: 'Hyderabad', avatar: '👩', text: 'Listed my old washing machine and started earning ₹800/month. The whole process took 10 minutes. Great platform!', rating: 5 },
];

const FAQS = [
  { q: 'How does rent-to-own work?', a: 'Pay for 12 months upfront (or via no-cost credit card EMI), then pay for the next 12 months in month 11. After completing all 24 payments on time, ownership transfers to you at no extra cost — no hidden fees.' },
  { q: 'What if I want to return the item early?', a: 'All rentals have a 12-month lock-in. You can return the item early, but the full 12-month rental amount is still payable. No partial refund is given within the lock-in period.' },
  { q: 'How do I list my own items?', a: 'Click "List an Item", upload photos, set your item price, and submit. Our team reviews and approves listings within 24 hours. We handle delivery and payments on your behalf.' },
  { q: 'Is there a security deposit?', a: 'A security deposit may be charged depending on your KYC status, the item category, lock-in period, and other factors. If applicable, it will be communicated before you confirm your booking and is refundable at the end of the rental.' },
  { q: 'Where does Voorent P2P operate?', a: 'We currently serve Delhi NCR exclusively — covering Delhi, Noida, Greater Noida, Ghaziabad, Gurugram, and Faridabad. Items outside these pincodes are not serviceable at this time.' },
];

const CATEGORIES = [
  { label: 'Furniture',  emoji: '🛋️', desc: 'Sofas, beds, tables & more' },
  { label: 'Appliances', emoji: '🧊', desc: 'AC, fridge, washing machine' },
];

const SkeletonCard = () => (
  <div className="rounded-2xl overflow-hidden bg-white shadow-sm">
    <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: '4/3' }} />
    <div className="p-3 space-y-2">
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
    </div>
  </div>
);

export default function Home() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Location state — persisted in localStorage so Browse picks it up
  const [userLat, setUserLat] = useState<number | null>(() => {
    const v = localStorage.getItem('voorent_lat'); return v ? parseFloat(v) : null;
  });
  const [userLng, setUserLng] = useState<number | null>(() => {
    const v = localStorage.getItem('voorent_lng'); return v ? parseFloat(v) : null;
  });
  const [locationLabel, setLocationLabel] = useState<string>(
    () => localStorage.getItem('voorent_location_label') || ''
  );
  const [pincodeInput, setPincodeInput] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [showPincodeInput, setShowPincodeInput] = useState(false);

  const saveLocation = (lat: number, lng: number, label: string) => {
    setUserLat(lat); setUserLng(lng); setLocationLabel(label);
    localStorage.setItem('voorent_lat', String(lat));
    localStorage.setItem('voorent_lng', String(lng));
    localStorage.setItem('voorent_location_label', label);
  };

  const clearLocation = () => {
    setUserLat(null); setUserLng(null); setLocationLabel(''); setPincodeInput('');
    localStorage.removeItem('voorent_lat');
    localStorage.removeItem('voorent_lng');
    localStorage.removeItem('voorent_location_label');
  };

  const handleGps = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        saveLocation(pos.coords.latitude, pos.coords.longitude, 'Current location');
        setLocationLoading(false);
      },
      () => { setLocationLoading(false); alert('Could not get location. Try entering your pincode.'); }
    );
  };

  const handlePincodeSubmit = async () => {
    if (!/^\d{6}$/.test(pincodeInput)) return;
    setLocationLoading(true);
    const result = await geocodePincode(pincodeInput);
    setLocationLoading(false);
    if (!result) { alert('Pincode not found. Please try another.'); return; }
    saveLocation(result.lat, result.lng, result.label);
    setShowPincodeInput(false);
    setPincodeInput('');
  };

  useEffect(() => {
    getListings(undefined, undefined, userLat ?? undefined, userLng ?? undefined)
      .then((res) => setListings(res.data))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [userLat, userLng]);

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* ── Location bar ── */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm text-[#555] font-semibold flex-shrink-0">📍 Near:</span>
          {locationLabel ? (
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#2D6A4F]">{locationLabel}</span>
              <span className="text-xs text-[#999]">· within 12 km</span>
              <button onClick={clearLocation} className="text-xs text-[#D62828] font-semibold hover:underline ml-1">✕ Clear</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={handleGps} disabled={locationLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors hover:bg-[#F0FAF5]"
                style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                {locationLoading ? '…' : '🎯 Use my location'}
              </button>
              <span className="text-xs text-[#999]">or</span>
              {showPincodeInput ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text" inputMode="numeric" maxLength={6} placeholder="Enter pincode"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePincodeSubmit()}
                    className="border-2 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#2D6A4F] w-32"
                    style={{ borderColor: '#E0E0E0' }} autoFocus
                  />
                  <button onClick={handlePincodeSubmit} disabled={locationLoading || pincodeInput.length !== 6}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                    style={{ background: '#2D6A4F' }}>
                    {locationLoading ? '…' : 'Go'}
                  </button>
                  <button onClick={() => setShowPincodeInput(false)} className="text-xs text-[#999]">✕</button>
                </div>
              ) : (
                <button onClick={() => setShowPincodeInput(true)}
                  className="text-xs font-bold text-[#555] hover:text-[#2D6A4F] underline">
                  Enter pincode
                </button>
              )}
              <span className="text-xs text-[#BBB] hidden md:inline">— showing all listings</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ minHeight: 480 }}>
        <img
          src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop"
          alt="Beautiful furnished living room"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(27,67,50,0.88) 0%, rgba(27,67,50,0.40) 100%)' }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 flex flex-col justify-center h-full py-20">
          <span className="inline-block text-xs font-semibold text-white/80 mb-4 px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.15)' }}>✨ India's Smartest Furniture &amp; Appliances Platform</span>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-5" style={{ maxWidth: 640 }}>
            Your Furniture &amp; Appliances.<br />Your Choice.
          </h1>
          <div className="mb-8 space-y-1.5" style={{ maxWidth: 420 }}>
            <p className="text-base text-white/90 font-medium">Rent from people around you.</p>
            <p className="text-base font-bold" style={{ color: '#F4A261' }}>Rent to people around you.</p>
            <p className="text-base text-white/90 font-medium">Or sell directly to Voorent.</p>
            <p className="text-sm text-white/60 pt-1">Everything, through one smart platform.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/browse')}
              className="px-6 py-3 rounded-full font-bold text-[#1A1A1A] text-base min-h-[48px]"
              style={{ background: '#F4A261' }}
            >
              Browse Rentals →
            </button>
            <button
              onClick={() => navigate('/list')}
              className="px-6 py-3 rounded-full font-bold text-white text-base min-h-[48px]"
              style={{ border: '2px solid rgba(255,255,255,0.6)' }}
            >
              List an Item
            </button>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">How Voorent works</h2>
          <p className="text-[#555555] mb-10">Three simple steps to get premium items at your door</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Browse & Pick',  desc: 'Choose from verified furniture and appliance listings across categories.' },
              { step: '02', title: 'Pay Monthly',    desc: 'Pay a small monthly amount via UPI or card. No-cost EMI available.' },
              { step: '03', title: 'Own It',         desc: 'Continue for 24 months and the item is legally yours — no extra charges.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <span className="text-4xl font-black flex-shrink-0 leading-none mt-1" style={{ color: '#E0E0E0' }}>{s.step}</span>
                <div>
                  <h3 className="font-bold text-[#1A1A1A] text-lg mb-1">{s.title}</h3>
                  <p className="text-sm text-[#555555] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ──────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Shop by category</h2>
          <p className="text-[#555555] mb-8">Everything your home needs, available to rent today</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.label}
                onClick={() => navigate(`/browse?category=${cat.label}`)}
                className="flex flex-col items-start gap-3 p-5 rounded-2xl bg-white border border-[#E0E0E0] hover:border-[#2D6A4F] transition-all text-left"
                style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              >
                <span className="text-3xl">{cat.emoji}</span>
                <div>
                  <p className="font-bold text-[#1A1A1A]">{cat.label}</p>
                  <p className="text-xs text-[#555555] mt-0.5">{cat.desc}</p>
                </div>
              </button>
            ))}
            <button
              onClick={() => navigate('/browse')}
              className="flex flex-col items-start gap-3 p-5 rounded-2xl text-left col-span-2"
              style={{ background: '#2D6A4F' }}
            >
              <span className="text-3xl">🏠</span>
              <div>
                <p className="font-bold text-white text-base">Rent-to-Own bundles</p>
                <p className="text-xs text-white/70 mt-0.5">Save up to 20% when you rent 2+ items together</p>
              </div>
              <span className="text-xs font-semibold text-white/90">View bundles →</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Featured Listings ───────────────────────────────── */}
      <section className="bg-white py-14">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">Featured collections</h2>
              <p className="text-[#555555]">Handpicked, quality-verified items ready to rent</p>
            </div>
            <button onClick={() => navigate('/browse')} className="text-sm font-semibold hidden md:block" style={{ color: '#2D6A4F' }}>
              View all listings →
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
              : listings.slice(0, 8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(`/item/${item.id}`)}
                    className="rounded-2xl bg-white shadow-sm overflow-hidden text-left group hover:shadow-md transition-shadow"
                  >
                    <div className="relative overflow-hidden" style={{ aspectRatio: '4/3' }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onError={(e) => { (e.target as HTMLImageElement).style.display='none'; }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-[#F0FAF5] text-4xl">
                          {item.category === 'Appliances' ? '🧊' : '🛋️'}
                        </div>
                      )}
                      {item.isRentToOwn && (
                        <span className="absolute top-3 left-3 text-white text-[11px] font-bold px-2.5 py-1 rounded-full" style={{ background: '#2D6A4F' }}>
                          RENT-TO-OWN
                        </span>
                      )}
                      <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-[#555]">
                        {item.condition}
                      </span>
                    </div>
                    <div className="p-4">
                      <p className="font-semibold text-[#1A1A1A] text-sm line-clamp-2 mb-2 leading-snug">{item.title}</p>
                      <p className="text-lg font-bold" style={{ color: '#2D6A4F' }}>₹{item.monthlyRent.toLocaleString()}<span className="text-sm font-normal">/mo</span></p>
                      <p className="text-xs text-[#999] mt-0.5">or ₹{item.itemPrice.toLocaleString()} upfront</p>
                    </div>
                  </button>
                ))}
          </div>

          <div className="flex justify-center mt-8">
            <button onClick={() => navigate('/browse')} className="px-8 py-3 rounded-full font-bold text-sm border-2 min-h-[48px]" style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
              View all listings
            </button>
          </div>
        </div>
      </section>

      {/* ── Trust Badges ────────────────────────────────────── */}
      <section className="py-14">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-8 text-center">Why renters love Voorent</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST.map((t) => (
              <div key={t.title} className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-white border border-[#E0E0E0]">
                <span className="text-3xl">{t.icon}</span>
                <div>
                  <p className="font-bold text-[#1A1A1A] mb-1">{t.title}</p>
                  <p className="text-xs text-[#555555]">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats Banner ────────────────────────────────────── */}
      <section style={{ background: '#1B4332' }} className="py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '500+', label: 'Happy renters' },
              { value: '₹0', label: 'Security deposit' },
              { value: '2 days', label: 'Avg. delivery time' },
              { value: '24 mo', label: 'Own it completely' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-4xl font-black text-white mb-1">{s.value}</p>
                <p className="text-white/60 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────── */}
      <section className="py-14 bg-[#F9F9F9]">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1 text-center">What renters say</h2>
          <p className="text-[#555] mb-10 text-center">Real stories from real Voorent customers</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl p-6 border border-[#E0E0E0]">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <span key={i} className="text-yellow-400 text-lg">★</span>
                  ))}
                </div>
                <p className="text-[#333] text-sm leading-relaxed mb-5">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{t.avatar}</span>
                  <div>
                    <p className="font-bold text-[#1A1A1A] text-sm">{t.name}</p>
                    <p className="text-xs text-[#999]">{t.city}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-3xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1 text-center">Frequently asked questions</h2>
          <p className="text-[#555] mb-10 text-center">Everything you need to know about Voorent</p>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-[#E0E0E0] rounded-2xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  <span className="font-semibold text-[#1A1A1A] text-sm pr-4">{faq.q}</span>
                  <span className="text-[#2D6A4F] text-lg flex-shrink-0 transition-transform duration-200"
                    style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-[#555] leading-relaxed border-t border-[#F0F0F0] pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Owner CTA ───────────────────────────────────────── */}
      <section className="py-14 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-6" style={{ background: '#1B4332' }}>
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Have furniture sitting idle?</h2>
              <p className="text-white/70">List it on Voorent and earn a steady monthly income. We handle delivery, payments, and support.</p>
            </div>
            <button onClick={() => navigate('/list')} className="flex-shrink-0 px-8 py-4 rounded-full font-bold text-[#1A1A1A] text-base min-h-[52px]" style={{ background: '#F4A261' }}>
              List an Item →
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-[#E0E0E0] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-8 text-sm text-[#999]">

          {/* Brand + About */}
          <div className="max-w-xs">
            <p className="text-xl font-bold mb-1" style={{ color: '#2D6A4F' }}>Voorent</p>
            <p className="mb-3">A new initiative by Voorent Pvt. Ltd.</p>
            <div className="text-xs leading-relaxed space-y-0.5">
              <p className="font-semibold text-[#555]">About the Founders</p>
              <p>Prasoon Sharma &amp; Sudarshan Singh</p>
              <p>Alumni of NIT Durgapur</p>
              <p>Started Voorent in 2016</p>
            </div>
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
              <button onClick={() => navigate('/faq')} className="text-left hover:text-[#2D6A4F]">FAQ</button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1A1A1A] mb-1">Contact Us</p>
              <a href="mailto:support@voorent.com" className="hover:text-[#2D6A4F]">support@voorent.com</a>
              <a href="tel:+919318297171" className="hover:text-[#2D6A4F]">+91 93182 97171</a>
            </div>
          </div>

          <p className="text-xs self-end">© 2026 Voorent Pvt. Ltd. · All rights reserved.</p>
        </div>
      </footer>

      {/* Bottom nav — mobile only */}
      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
