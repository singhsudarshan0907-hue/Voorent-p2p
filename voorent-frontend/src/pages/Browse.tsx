import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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

const CONDITIONS = ['Like New', 'Good', 'Acceptable'] as const;
const CATEGORIES = [
  { key: 'All',        label: '🏠 All Items' },
  { key: 'Furniture',  label: '🛋️ Furniture' },
  { key: 'Appliances', label: '🔌 Appliances' },
  { key: 'Electronics', label: '📱 Electronics' },
] as const;

const CATEGORY_META: Record<string, { image: string; tagline: string; color: string }> = {
  All: {
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop',
    tagline: 'Furniture, appliances & electronics — rent and own over time',
    color: 'rgba(27,67,50,0.82)',
  },
  Furniture: {
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1600&auto=format&fit=crop',
    tagline: 'Sofas, beds, dining tables & more — rent and own over time',
    color: 'rgba(27,67,50,0.82)',
  },
  Appliances: {
    image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&auto=format&fit=crop',
    tagline: 'ACs, refrigerators, washing machines — delivered to your door',
    color: 'rgba(20,52,80,0.82)',
  },
  Electronics: {
    image: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=1600&auto=format&fit=crop',
    tagline: 'Laptops, TVs, cameras & more — rent for as long as you need',
    color: 'rgba(20,52,80,0.82)',
  },
};

export default function Browse() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const categoryParam = params.get('category') || 'All';
  const searchParam = params.get('search') || '';

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(categoryParam);
  const [searchQuery, setSearchQuery] = useState(searchParam);
  const [filterCondition, setFilterCondition] = useState<string[]>([]);
  const [rtoOnly, setRtoOnly] = useState(false);
  const [showFilter, setShowFilter] = useState(false);

  // Location state — reads from localStorage set by Home page
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
  const pincodeRef = useRef<HTMLInputElement>(null);

  // Sync when URL params change (TopNav search navigates here)
  useEffect(() => {
    setActiveCategory(categoryParam);
    setSearchQuery(searchParam);
  }, [categoryParam, searchParam]);

  useEffect(() => {
    setLoading(true);
    getListings(
      searchQuery ? undefined : (activeCategory === 'All' ? undefined : activeCategory),
      searchQuery || undefined,
      userLat ?? undefined,
      userLng ?? undefined,
    )
      .then((r) => setListings(r.data))
      .catch(() => setListings([]))
      .finally(() => setLoading(false));
  }, [activeCategory, searchQuery, userLat, userLng]);

  const saveLocation = (lat: number, lng: number, label: string) => {
    setUserLat(lat); setUserLng(lng); setLocationLabel(label);
    localStorage.setItem('voorent_lat', String(lat));
    localStorage.setItem('voorent_lng', String(lng));
    localStorage.setItem('voorent_location_label', label);
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

  const clearLocation = () => {
    setUserLat(null); setUserLng(null); setLocationLabel(''); setPincodeInput('');
    localStorage.removeItem('voorent_lat');
    localStorage.removeItem('voorent_lng');
    localStorage.removeItem('voorent_location_label');
  };

  const filtered = listings.filter((l) => {
    if (filterCondition.length > 0 && !filterCondition.includes(l.condition)) return false;
    if (rtoOnly && !l.isRentToOwn) return false;
    return true;
  });

  const meta = CATEGORY_META[activeCategory] || CATEGORY_META.Furniture;
  const isSearching = !!searchQuery;

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
              <button
                onClick={handleGps}
                disabled={locationLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors hover:bg-[#F0FAF5]"
                style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}
              >
                {locationLoading ? '…' : '🎯 Use my location'}
              </button>
              <span className="text-xs text-[#999]">or</span>
              {showPincodeInput ? (
                <div className="flex items-center gap-2">
                  <input
                    ref={pincodeRef}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter pincode"
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => e.key === 'Enter' && handlePincodeSubmit()}
                    className="border-2 rounded-xl px-3 py-1.5 text-xs outline-none focus:border-[#2D6A4F] w-32"
                    style={{ borderColor: '#E0E0E0' }}
                    autoFocus
                  />
                  <button onClick={handlePincodeSubmit} disabled={locationLoading || pincodeInput.length !== 6}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                    style={{ background: '#2D6A4F' }}>
                    {locationLoading ? '…' : 'Go'}
                  </button>
                  <button onClick={() => setShowPincodeInput(false)} className="text-xs text-[#999] hover:text-[#555]">✕</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPincodeInput(true)}
                  className="text-xs font-bold text-[#555] hover:text-[#2D6A4F] underline"
                >
                  Enter pincode
                </button>
              )}
              <span className="text-xs text-[#BBB] hidden md:inline">— showing all listings</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Category Hero Banner ── */}
      <div className="relative overflow-hidden" style={{ minHeight: 220 }}>
        <img src={meta.image} alt={activeCategory}
          className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: meta.color }} />
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-14 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            {isSearching ? (
              <>
                <p className="text-white/70 text-sm font-medium mb-2">Search results</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">"{searchQuery}"</h1>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-white/70 text-sm underline hover:text-white transition-colors"
                >
                  ✕ Clear search
                </button>
              </>
            ) : (
              <>
                <p className="text-white/70 text-sm font-medium mb-2">Browse{activeCategory !== 'All' ? ` / ${activeCategory}` : ''}</p>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">{activeCategory === 'All' ? 'All Items' : activeCategory}</h1>
                <p className="text-white/80 text-base max-w-lg">{meta.tagline}</p>
              </>
            )}
          </div>
          <div className="hidden" />
        </div>
      </div>

      {/* ── Category chips + count in one bar ── */}
      <div className="bg-white border-b border-[#E0E0E0] overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2" style={{ minWidth: 'max-content' }}>
            {CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setActiveCategory(cat.key)}
                className="px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all"
                style={{
                  background: activeCategory === cat.key ? '#2D6A4F' : '#F3F4F6',
                  color: activeCategory === cat.key ? '#fff' : '#555',
                  border: activeCategory === cat.key ? 'none' : '1.5px solid #E0E0E0',
                }}>
                {cat.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <p className="hidden md:block text-sm text-[#999]">
              <span className="font-bold text-[#1A1A1A]">{filtered.length}</span> items
              {filterCondition.length > 0 && <span className="ml-1 text-[#2D6A4F] font-semibold">· Filtered</span>}
            </p>
            <button onClick={() => setShowFilter(true)}
              className="md:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold"
              style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
              ⚙ Filter
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10">
        <div className="flex gap-8">

          {/* ── Desktop sidebar ── */}
          <aside className="hidden md:flex flex-col gap-5 flex-shrink-0" style={{ width: 240 }}>
            <div className="bg-white rounded-2xl p-6 border border-[#E0E0E0]">
              <h3 className="font-bold text-[#1A1A1A] text-base mb-5">Filters</h3>

              <p className="text-xs font-bold text-[#999] uppercase tracking-widest mb-3">Condition</p>
              <div className="flex flex-col gap-3 mb-6">
                {CONDITIONS.map((c) => (
                  <button key={c} onClick={() => setFilterCondition((prev) =>
                    prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                  )} className="flex items-center gap-3 text-sm text-left">
                    <span className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0"
                      style={{ borderColor: filterCondition.includes(c) ? '#2D6A4F' : '#CCC', background: filterCondition.includes(c) ? '#2D6A4F' : 'transparent' }}>
                      {filterCondition.includes(c) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>}
                    </span>
                    <span className="font-medium" style={{ color: filterCondition.includes(c) ? '#2D6A4F' : '#555' }}>{c}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-5 border-t border-[#E0E0E0]">
                <span className="text-sm font-semibold text-[#1A1A1A]">Rent-to-Own only</span>
                <button onClick={() => setRtoOnly((v) => !v)}
                  className="w-11 h-6 rounded-full transition-colors relative flex-shrink-0"
                  style={{ background: rtoOnly ? '#2D6A4F' : '#E0E0E0' }}>
                  <span className="absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all"
                    style={{ left: rtoOnly ? '24px' : '4px' }} />
                </button>
              </div>

              {(filterCondition.length > 0 || rtoOnly) && (
                <button onClick={() => { setFilterCondition([]); setRtoOnly(false); }}
                  className="mt-5 text-xs font-bold w-full text-center py-2 rounded-full border"
                  style={{ borderColor: '#E0E0E0', color: '#D62828' }}>
                  Reset all filters
                </button>
              )}
            </div>

            {/* Ownership note card */}
            <div className="rounded-2xl p-5" style={{ background: '#FFF8F0', border: '1px solid #FDDBB4' }}>
              <p className="font-bold text-[#1A1A1A] mb-1">🏠 Rent-to-Own</p>
              <p className="text-xs text-[#555] leading-relaxed">Pay monthly for 24 months and the item is legally yours — at no extra charge.</p>
            </div>

            {/* Bundle promo */}
            <div className="rounded-2xl p-5" style={{ background: '#2D6A4F' }}>
              <p className="font-bold text-white mb-1">Bundle & Save</p>
              <p className="text-xs text-white/70 mb-3">Rent 2+ items and save up to 20%</p>
              <button className="text-xs font-bold px-4 py-2 rounded-full" style={{ background: '#F4A261', color: '#1A1A1A' }}>
                View Bundles
              </button>
            </div>
          </aside>

          {/* ── Product grid ── */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="rounded-2xl overflow-hidden bg-white border border-[#E0E0E0]">
                    <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: '3/2' }} />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <span className="text-6xl">{userLat ? '📍' : '🔍'}</span>
                <h2 className="text-xl font-bold text-[#1A1A1A]">
                  {userLat ? 'No listings near you yet' : 'No items match your filters'}
                </h2>
                <p className="text-[#555] text-center">
                  {userLat
                    ? 'No items listed within 12 km of your location. Try expanding your area or browse all listings.'
                    : 'Try removing some filters to see more results.'}
                </p>
                {userLat ? (
                  <button onClick={clearLocation}
                    className="px-6 py-3 rounded-full font-bold border-2"
                    style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                    Show all listings
                  </button>
                ) : (
                  <button onClick={() => { setFilterCondition([]); setRtoOnly(false); }}
                    className="px-6 py-3 rounded-full font-bold border-2"
                    style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                    Reset filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((item) => (
                  <button key={item.id} onClick={() => navigate(`/item/${item.id}`)}
                    className="rounded-2xl overflow-hidden bg-white text-left group hover:shadow-lg transition-shadow border border-[#E0E0E0]">
                    <div className="relative overflow-hidden" style={{ aspectRatio: '3/2' }}>
                      <img src={item.imageUrl || ''} alt={item.title}
                        onError={(e) => { (e.target as HTMLImageElement).src=''; (e.target as HTMLImageElement).style.display='none'; }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      {item.isRentToOwn && (
                        <span className="absolute top-3 left-3 text-white text-[11px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: '#2D6A4F' }}>RENT-TO-OWN</span>
                      )}
                      <span className="absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/90 text-[#555]">
                        {item.condition}
                      </span>
                    </div>
                    <div className="p-5">
                      <p className="font-bold text-[#1A1A1A] text-sm line-clamp-2 mb-3 leading-snug" style={{ minHeight: 36 }}>{item.title}</p>
                      <p className="text-xl font-bold mb-0.5" style={{ color: '#2D6A4F' }}>
                        ₹{item.monthlyRent.toLocaleString()}<span className="text-sm font-normal text-[#555]">/mo</span>
                      </p>
                      <p className="text-xs text-[#999]">or ₹{item.itemPrice.toLocaleString()} upfront · 12 months</p>
                      {item.distanceKm != null && (
                        <p className="text-xs text-[#2D6A4F] font-semibold mt-1">📍 {item.distanceKm} km away</p>
                      )}
                      <div className="mt-4 w-full py-2.5 rounded-xl text-xs font-bold text-center text-white"
                        style={{ background: '#2D6A4F' }}>
                        View Details →
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Bottom CTA section */}
            {!loading && (
              <div className="mt-16 rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-6"
                style={{ background: '#1B4332' }}>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mb-1">Have items sitting idle?</h2>
                  <p className="text-white/70 text-sm">List on Voorent and earn monthly income. We handle delivery & support.</p>
                </div>
                <button onClick={() => navigate('/list')}
                  className="flex-shrink-0 px-7 py-3.5 rounded-full font-bold text-[#1A1A1A] text-sm"
                  style={{ background: '#F4A261' }}>
                  List an Item →
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── How rent-to-own works ── */}
      <section className="bg-white border-t border-[#E0E0E0] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#1A1A1A] mb-1">How rent-to-own works</h2>
          <p className="text-[#555] mb-10">Three simple steps — no paperwork, no hidden fees</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: '01', icon: '🛒', title: 'Pick an item', desc: 'Browse verified listings and choose the furniture or appliance you need.' },
              { step: '02', icon: '💳', title: 'Pay monthly', desc: 'Small fixed monthly payments via UPI, card, or net banking. No security deposit.' },
              { step: '03', icon: '🏠', title: 'Own it at 24 months', desc: 'Complete 24 payments and the item is legally yours — at no extra cost.' },
            ].map((s) => (
              <div key={s.step} className="flex gap-5">
                <span className="text-5xl font-black leading-none mt-1 flex-shrink-0" style={{ color: '#E8F5E9' }}>{s.step}</span>
                <div>
                  <p className="text-2xl mb-2">{s.icon}</p>
                  <h3 className="font-bold text-[#1A1A1A] text-lg mb-1">{s.title}</h3>
                  <p className="text-sm text-[#555] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="py-14" style={{ background: '#2D6A4F' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '₹0',    label: 'Security deposit' },
              { value: '500+',  label: 'Happy renters' },
              { value: '2 days', label: 'Avg. delivery' },
              { value: '24 mo', label: 'Own it completely' },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                <p className="text-white/60 text-sm">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust badges ── */}
      <section className="bg-white py-14 border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🚚', title: 'Free delivery',    desc: 'Doorstep delivery included' },
              { icon: '🔒', title: 'Secure payments',  desc: 'Powered by Razorpay' },
              { icon: '↩️', title: 'Easy returns',     desc: 'Cancel anytime, no questions' },
              { icon: '🛡️', title: 'Verified items',   desc: 'Every listing quality-checked' },
            ].map((t) => (
              <div key={t.title} className="flex items-start gap-4 p-5 rounded-2xl border border-[#E0E0E0]">
                <span className="text-2xl flex-shrink-0">{t.icon}</span>
                <div>
                  <p className="font-bold text-[#1A1A1A] text-sm">{t.title}</p>
                  <p className="text-xs text-[#999] mt-0.5">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E0E0E0] py-10 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-6 text-sm text-[#999]">
          <div>
            <p className="text-xl font-bold mb-1" style={{ color: '#2D6A4F' }}>Voorent</p>
            <p>India's trusted rent-to-own marketplace</p>
          </div>
          <div className="flex gap-10">
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1A1A1A] mb-1">Browse</p>
              <button onClick={() => setActiveCategory('Furniture')} className="text-left hover:text-[#2D6A4F]">Furniture</button>
              <button onClick={() => setActiveCategory('Appliances')} className="text-left hover:text-[#2D6A4F]">Appliances</button>
            </div>
            <div className="flex flex-col gap-2">
              <p className="font-semibold text-[#1A1A1A] mb-1">Company</p>
              <span>About</span><span>Contact</span><span>Privacy Policy</span>
            </div>
          </div>
          <p className="text-xs self-end">© 2026 Voorent. All rights reserved.</p>
        </div>
      </footer>

      {/* Mobile filter sheet */}
      {showFilter && (
        <div className="fixed inset-0 z-50" onClick={() => setShowFilter(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl p-5"
            onClick={(e) => e.stopPropagation()}>
            <h2 className="font-bold text-base mb-4">Filter</h2>
            <p className="text-sm font-semibold mb-2">Condition</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {CONDITIONS.map((c) => (
                <button key={c}
                  onClick={() => setFilterCondition((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])}
                  className="px-4 py-2 rounded-full text-sm font-semibold border-2"
                  style={{ borderColor: filterCondition.includes(c) ? '#2D6A4F' : '#E0E0E0', color: filterCondition.includes(c) ? '#2D6A4F' : '#555', background: filterCondition.includes(c) ? '#F0FAF5' : '#fff' }}>
                  {c}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold">Rent-to-Own only</span>
              <button onClick={() => setRtoOnly((v) => !v)}
                className="w-12 h-6 rounded-full transition-colors relative"
                style={{ background: rtoOnly ? '#2D6A4F' : '#E0E0E0' }}>
                <span className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                  style={{ left: rtoOnly ? '26px' : '2px' }} />
              </button>
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setFilterCondition([]); setRtoOnly(false); }}
                className="flex-1 py-3 rounded-full font-semibold text-sm border-2"
                style={{ borderColor: '#E0E0E0', color: '#555' }}>Reset</button>
              <button onClick={() => setShowFilter(false)}
                className="flex-1 py-3 rounded-full font-bold text-white text-sm"
                style={{ background: '#2D6A4F' }}>Apply</button>
            </div>
          </div>
        </div>
      )}

      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
