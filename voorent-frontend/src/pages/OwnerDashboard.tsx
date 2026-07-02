import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import { contactVoorent } from '../services/api';
import { isLoggedIn } from '../utils/auth';
import axios from 'axios';

interface ActiveRental {
  renterName: string;
  currentMonth: number;
  totalMonths: number;
  status: string;
  nextPayment: string | null;
  monthlyAmount: number;
}

interface OwnerListing {
  id: string;
  title: string;
  imageUrl: string;
  condition: string;
  category: string;
  itemPrice: number;
  monthlyRent: number;
  status: string;
  activeRental: ActiveRental | null;
}

interface Payout {
  id: string;
  amount: number;
  status: 'paid' | 'pending';
  paidAt: string | null;
  createdAt: string;
  listingTitle: string;
  plan: string;
  monthNumber: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:   { bg: '#E8F5E9', text: '#2D6A4F' },
  rented:   { bg: '#E3F2FD', text: '#1565C0' },
  pending:  { bg: '#FFF9C4', text: '#F57F17' },
  rejected: { bg: '#FFEBEE', text: '#C62828' },
  sold:     { bg: '#F3F4F6', text: '#555555' },
};

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'listings' | 'payouts'>('listings');
  const [listings, setListings] = useState<OwnerListing[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [upiId, setUpiId] = useState('');
  const [upiInput, setUpiInput] = useState('');
  const [savingUpi, setSavingUpi] = useState(false);
  const [upiSaved, setUpiSaved] = useState(false);
  const [upiError, setUpiError] = useState('');
  const UPI_REGEX = /^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/;

  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    // Cookie carries JWT — withCredentials sends it automatically
    const credOpts = { withCredentials: true };
    Promise.allSettled([
      axios.get(`${BASE}/listings/owner`, credOpts),
      axios.get(`${BASE}/payouts`, credOpts),
      axios.get(`${BASE}/users/me`, credOpts),
    ])
      .then(([listRes, payRes, userRes]) => {
        if (listRes.status === 'fulfilled') setListings(listRes.value.data);
        if (payRes.status === 'fulfilled')  setPayouts(payRes.value.data);
        if (userRes.status === 'fulfilled') {
          const id = userRes.value.data.upiId || '';
          setUpiId(id);
          setUpiInput(id);
        }
      })
      .finally(() => setLoading(false));
  }, [navigate]);

  const handleSaveUpi = async () => {
    setUpiError('');
    if (!upiInput.trim()) { setUpiError('UPI ID cannot be empty.'); return; }
    if (!UPI_REGEX.test(upiInput.trim())) {
      setUpiError('Invalid UPI ID. Format: yourname@bankname (e.g. name@upi, 9876543210@paytm)');
      return;
    }
    setSavingUpi(true);
    setUpiSaved(false);
    try {
      await axios.put(`${BASE}/users/upi`, { upiId: upiInput.trim() }, { withCredentials: true });
      setUpiId(upiInput.trim());
      setUpiSaved(true);
      setTimeout(() => setUpiSaved(false), 3000);
    } catch { /* ignore */ } finally { setSavingUpi(false); }
  };

  const totalEarned = payouts.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingPayout = payouts.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const activeRentals = listings.filter(l => l.status === 'rented').length;
  const pendingApproval = listings.filter(l => l.status === 'pending').length;
  // Projected monthly if all rented listings pay
  const projectedMonthly = listings
    .filter(l => l.activeRental)
    .reduce((s, l) => s + (l.activeRental?.monthlyAmount ?? l.monthlyRent), 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Pending approval banner */}
      {pendingApproval > 0 && (
        <div className="bg-[#FFF9C4] border-b border-[#F9A825]">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center gap-3">
            <span className="text-xl">⏳</span>
            <p className="text-sm font-semibold text-[#F57F17]">
              {pendingApproval} listing{pendingApproval > 1 ? 's' : ''} waiting for Voorent approval — usually within 24 hours. You'll get a WhatsApp notification once approved.
            </p>
          </div>
        </div>
      )}

      {/* Hero header */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1B4332 0%, #2D6A4F 100%)' }}>
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-white/60 text-sm mb-1">Owner Dashboard</p>
            <h1 className="text-3xl font-bold text-white mb-2">Your rental business</h1>
            <p className="text-white/70 text-sm">Track listings, rentals, and earnings in one place</p>
          </div>
          <button onClick={() => navigate('/list')}
            className="flex-shrink-0 px-6 py-3 rounded-full font-bold text-[#1A1A1A] text-sm"
            style={{ background: '#F4A261' }}>
            + List an Item
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 py-5 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total Earned', value: `₹${totalEarned.toLocaleString()}`, color: '#2D6A4F', icon: '💰' },
            { label: 'Pending Payout', value: `₹${pendingPayout.toLocaleString()}`, color: '#F57F17', icon: '⏳' },
            { label: 'Active Rentals', value: activeRentals.toString(), color: '#1565C0', icon: '🏠' },
            { label: 'Monthly Income', value: `₹${projectedMonthly.toLocaleString()}`, color: '#2D6A4F', icon: '📈' },
            { label: 'Pending Review', value: pendingApproval.toString(), color: pendingApproval > 0 ? '#F57F17' : '#999', icon: '📋' },
          ].map((stat) => (
            <div key={stat.label} className="flex items-center gap-3">
              <span className="text-2xl">{stat.icon}</span>
              <div>
                <p className="text-xs text-[#999] leading-none mb-1">{stat.label}</p>
                <p className="text-xl font-bold leading-none" style={{ color: stat.color }}>{stat.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Tabs */}
        <div className="flex border-b border-[#E0E0E0] mb-6">
          {(['listings', 'payouts'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="px-6 py-3 text-sm font-semibold border-b-2 capitalize transition-colors"
              style={{ borderColor: tab === t ? '#2D6A4F' : 'transparent', color: tab === t ? '#2D6A4F' : '#999' }}>
              {t === 'listings' ? `My Listings (${listings.length})` : `Payouts (${payouts.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1,2,3].map((i) => <div key={i} className="h-56 rounded-2xl bg-white animate-pulse border border-[#E0E0E0]" />)}
          </div>
        ) : tab === 'listings' ? (
          listings.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-6 max-w-md mx-auto text-center">
              <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl"
                style={{ background: '#F0FAF5' }}>
                🛋️
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#1A1A1A] mb-2">No active listings yet</h2>
                <p className="text-[#555] leading-relaxed">
                  You haven't listed anything yet. Start earning passive income by renting out your furniture or appliances.
                </p>
              </div>
              <div className="w-full bg-white rounded-2xl border border-[#E0E0E0] p-5 text-left">
                <p className="text-xs font-bold text-[#999] uppercase tracking-widest mb-3">What you get</p>
                {[
                  { icon: '💰', text: 'Earn 50% of monthly rent — passive income' },
                  { icon: '🚚', text: 'Voorent handles pickup & delivery' },
                  { icon: '🛡️', text: 'Items covered by Voorent Care' },
                  { icon: '📋', text: 'Zero listing fee, no hidden charges' },
                ].map(b => (
                  <div key={b.text} className="flex items-center gap-3 mb-3 text-sm text-[#555]">
                    <span className="text-lg">{b.icon}</span><span>{b.text}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/list')}
                className="w-full py-4 rounded-full font-bold text-white text-base"
                style={{ background: '#2D6A4F' }}>
                + List your first item →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {listings.map((item) => {
                const colors = STATUS_COLORS[item.status] || STATUS_COLORS.pending;
                const progress = item.activeRental
                  ? Math.round((item.activeRental.currentMonth / item.activeRental.totalMonths) * 100)
                  : 0;

                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative" style={{ aspectRatio: '16/9' }}>
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl.startsWith('http') ? item.imageUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}${item.imageUrl}`}
                          alt={item.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-full h-full bg-[#F0F0F0] flex items-center justify-center text-4xl">📦</div>
                      )}
                      <span className="absolute top-3 right-3 text-xs font-bold px-2.5 py-1 rounded-full"
                        style={{ background: colors.bg, color: colors.text }}>
                        {item.status.toUpperCase()}
                      </span>
                      <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/50 text-white">
                        {item.category}
                      </span>
                    </div>

                    <div className="p-4">
                      <p className="font-bold text-[#1A1A1A] mb-0.5 truncate">{item.title}</p>
                      <p className="text-xs text-[#999] mb-3">{item.condition}</p>

                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-bold text-lg" style={{ color: '#2D6A4F' }}>₹{item.monthlyRent.toLocaleString()}<span className="text-sm font-normal text-[#555]">/mo</span></p>
                          <p className="text-xs text-[#999]">₹{item.itemPrice.toLocaleString()} item price</p>
                        </div>
                        {item.activeRental && (
                          <div className="text-right">
                            <p className="text-xs text-[#999]">Renter</p>
                            <p className="text-sm font-semibold text-[#1A1A1A]">{item.activeRental.renterName}</p>
                          </div>
                        )}
                      </div>

                      {/* Rental progress */}
                      {item.activeRental && (
                        <div className="mb-3">
                          <div className="flex justify-between text-xs text-[#999] mb-1.5">
                            <span>Month {item.activeRental.currentMonth} of {item.activeRental.totalMonths}</span>
                            <span>{progress}% paid</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#E0E0E0]">
                            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#2D6A4F' }} />
                          </div>
                          {item.activeRental.nextPayment && (
                            <p className="text-xs text-[#999] mt-1">
                              Next payment: {new Date(item.activeRental.nextPayment).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </p>
                          )}
                        </div>
                      )}

                      {item.status === 'pending' && (
                        <div className="mb-3 p-2.5 rounded-xl text-xs text-[#F57F17]" style={{ background: '#FFF9C4' }}>
                          ⏳ Awaiting admin approval before going live
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          try {
                            await contactVoorent(`Owner query for listing: ${item.title} (ID: ${item.id})`);
                            alert('✅ Message sent! Voorent support will reach out on WhatsApp shortly.');
                          } catch {
                            alert('Failed to send — please try again or WhatsApp us at +91 93182 97171.');
                          }
                        }}
                        className="w-full text-xs font-semibold py-2 rounded-xl border-2 transition-colors hover:bg-[#F0FAF5]"
                        style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                        Contact Voorent
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* Payouts tab */
          <div className="max-w-2xl flex flex-col gap-6">
            {/* Summary card */}
            <div className="rounded-2xl p-6 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #1B4332, #2D6A4F)' }}>
              <div>
                <p className="text-white/60 text-sm mb-1">Total earned to date</p>
                <p className="text-4xl font-bold text-white">₹{totalEarned.toLocaleString()}</p>
                {pendingPayout > 0 && (
                  <p className="text-white/70 text-sm mt-2">₹{pendingPayout.toLocaleString()} pending release</p>
                )}
              </div>
              {pendingPayout > 0 && (
                <div className="text-right flex-shrink-0">
                  <button onClick={() => contactVoorent(`Payout request: ₹${pendingPayout} pending. UPI: ${upiId || 'not set'}`)}
                    className="px-5 py-2.5 rounded-full font-bold text-[#1A1A1A] text-sm"
                    style={{ background: '#F4A261' }}>
                    Request Payout
                  </button>
                  <p className="text-white/50 text-xs mt-2">Processed within 7 working days</p>
                </div>
              )}
            </div>

            {/* UPI details */}
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5">
              <p className="font-bold text-[#1A1A1A] mb-1">Payout UPI ID</p>
              <p className="text-xs text-[#999] mb-4">We'll transfer your earnings to this UPI ID. Make sure it's correct.</p>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={upiInput}
                  onChange={(e) => { setUpiInput(e.target.value); setUpiError(''); }}
                  placeholder="yourname@upi"
                  className="flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#2D6A4F]"
                  style={{ borderColor: upiError ? '#C62828' : '#E0E0E0' }}
                />
                <button onClick={handleSaveUpi} disabled={savingUpi || upiInput === upiId}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                  style={{ background: '#2D6A4F' }}>
                  {savingUpi ? 'Saving…' : upiSaved ? '✓ Saved' : 'Save'}
                </button>
              </div>
              {upiError && <p className="text-xs text-[#C62828] mt-2">⚠ {upiError}</p>}
              {!upiId && !upiError && (
                <p className="text-xs text-[#F57F17] mt-2">⚠ Add your UPI ID before requesting a payout.</p>
              )}
            </div>

            {/* Payout history */}
            {payouts.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-3 bg-white rounded-2xl border border-[#E0E0E0]">
                <span className="text-4xl">💳</span>
                <p className="font-bold text-[#1A1A1A]">No payouts yet</p>
                <p className="text-sm text-[#555]">Payouts appear here after renters make payments</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
                <p className="px-5 py-3 text-xs font-bold text-[#999] uppercase tracking-widest border-b border-[#F0F0F0]">
                  Payout History · Rental: 50% · Buyout: 100%
                </p>
                {payouts.map((p, i) => (
                  <div key={p.id} className="flex justify-between items-center px-5 py-4 border-b border-[#F0F0F0] last:border-b-0"
                    style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                    <div>
                      <p className="font-bold text-[#1A1A1A]">₹{Number(p.amount).toLocaleString()}</p>
                      <p className="text-xs text-[#555] mt-0.5 truncate max-w-xs">{p.listingTitle}</p>
                      <p className="text-xs text-[#999] mt-0.5">
                        {p.plan === 'buyout' ? 'Buyout' : `Month ${p.monthNumber}`} · {new Date(p.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-full flex-shrink-0"
                      style={{ background: p.status === 'paid' ? '#E8F5E9' : '#FFF9C4', color: p.status === 'paid' ? '#2D6A4F' : '#F57F17' }}>
                      {p.status === 'paid' ? '✓ Transferred' : '⏳ Pending'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
