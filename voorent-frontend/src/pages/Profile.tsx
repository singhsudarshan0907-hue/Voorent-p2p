import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import { getMyRentals } from '../services/api';

import type { Rental } from '../types/index';

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  ACTIVE:           { label: 'Active',           bg: '#E8F5E9', color: '#2D6A4F' },
  UPCOMING:         { label: 'Upcoming',         bg: '#FFF8E1', color: '#F59E0B' },
  COMPLETED:        { label: 'Completed',        bg: '#F5F5F5', color: '#777' },
  OVERDUE:          { label: 'Overdue',          bg: '#FFEBEE', color: '#D62828' },
  RETURN_REQUESTED: { label: 'Return Requested', bg: '#FFF3E0', color: '#E65100' },
};

export default function Profile() {
  const navigate = useNavigate();
  const [phone, setPhone]         = useState('');
  const [name, setName]           = useState('');
  const [editName, setEditName]   = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [upiId, setUpiId]         = useState('');
  const [upiInput, setUpiInput]   = useState('');
  const [editUpi, setEditUpi]     = useState(false);
  const [upiSaving, setUpiSaving] = useState(false);
  const [rentals, setRentals]     = useState<Rental[]>([]);
  const [loadingRentals, setLoadingRentals] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const rawPhone = payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/mobilephone'] || '';
      setPhone(rawPhone);
    } catch {}

    // Fetch profile from backend (source of truth)
    fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => r.json()).then(data => {
      if (data.name) {
        localStorage.setItem('user_name', data.name);
        setName(data.name);
        setNameInput(data.name);
      }
      if (data.upiId) { setUpiId(data.upiId); setUpiInput(data.upiId); }
    }).catch(() => {
      const savedName = localStorage.getItem('user_name') || '';
      setName(savedName);
      setNameInput(savedName);
    });

    getMyRentals()
      .then(r => setRentals(r.data))
      .catch(() => {})
      .finally(() => setLoadingRentals(false));
  }, []);

  const handleSaveName = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('user_name', nameInput);
      setName(nameInput);
      setEditName(false);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 400);
  };

  const handleSaveUpi = async () => {
    setUpiSaving(true);
    const token = localStorage.getItem('token');
    try {
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/users/upi`, {
        method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ upiId: upiInput }),
      });
      setUpiId(upiInput); setEditUpi(false);
    } catch { alert('Failed to save UPI ID.'); }
    finally { setUpiSaving(false); }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_name');
    navigate('/');
  };

  const displayPhone = phone ? `+91 ${phone.slice(-10)}` : '';
  const initials     = name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const ownerUser    = true;

  const activeCount    = rentals.filter(r => r.status === 'ACTIVE').length;
  const completedCount = rentals.filter(r => r.status === 'COMPLETED').length;
  const totalSpent     = rentals.reduce((s, r) => s + (r.monthlyRent * r.currentMonth), 0);

  return (
    <div className="flex flex-col min-h-screen bg-[#F4F6F4]">
      <TopNav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 pb-24 md:pb-10">

        {/* ── Hero banner ── */}
        <div className="rounded-2xl overflow-hidden mb-6 mt-6 relative"
          style={{ background: 'linear-gradient(135deg,#1B4332 0%,#2D6A4F 100%)' }}>
          <div className="px-8 py-8 flex items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 border-4 border-white/20"
              style={{ background: 'rgba(255,255,255,0.15)' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              {editName ? (
                <div className="flex items-center gap-2 mb-1">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="text-xl font-bold bg-white/20 text-white placeholder-white/60 rounded-lg px-3 py-1 outline-none border border-white/30 w-full max-w-xs"
                    placeholder="Your full name"
                  />
                  <button onClick={handleSaveName} disabled={saving}
                    className="text-xs font-bold px-3 py-1.5 rounded-full bg-white text-[#2D6A4F] flex-shrink-0">
                    {saving ? '…' : 'Save'}
                  </button>
                  <button onClick={() => { setEditName(false); setNameInput(name); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-full border border-white/40 text-white flex-shrink-0">
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white truncate">
                    {name || 'Set your name'}
                  </h1>
                  <button onClick={() => setEditName(true)}
                    className="text-xs text-white/70 hover:text-white border border-white/30 rounded-full px-2 py-0.5 flex-shrink-0 transition-colors">
                    Edit
                  </button>
                </div>
              )}
              <p className="text-white/70 text-sm">{displayPhone}</p>
              {saved && <p className="text-green-300 text-xs mt-1 font-semibold">✓ Name saved</p>}
            </div>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-3 border-t border-white/10">
            {[
              { label: 'Active Rentals', value: activeCount },
              { label: 'Completed',      value: completedCount },
              { label: 'Total Paid',     value: `₹${(totalSpent/1000).toFixed(1)}k` },
            ].map((s, i) => (
              <div key={i} className={`px-4 py-4 text-center ${i < 2 ? 'border-r border-white/10' : ''}`}>
                <p className="text-white font-bold text-xl">{s.value}</p>
                <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── UPI ID for payouts ── */}
        <section className="mb-6">
          <div className="bg-white rounded-2xl border border-[#E0E0E0] p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-bold text-[#1A1A1A] text-sm">UPI ID for Payouts</p>
                <p className="text-xs text-[#999]">Used to receive rent payments from Voorent</p>
              </div>
              {!editUpi && (
                <button onClick={() => setEditUpi(true)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border"
                  style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                  {upiId ? 'Edit' : 'Add'}
                </button>
              )}
            </div>
            {editUpi ? (
              <div className="flex gap-2 mt-2">
                <input
                  autoFocus value={upiInput}
                  onChange={e => setUpiInput(e.target.value)}
                  placeholder="yourname@upi"
                  className="flex-1 border border-[#E0E0E0] rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                />
                <button onClick={handleSaveUpi} disabled={upiSaving}
                  className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                  style={{ background: '#2D6A4F' }}>
                  {upiSaving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditUpi(false)}
                  className="px-3 py-2 rounded-xl text-sm border text-[#555]"
                  style={{ borderColor: '#E0E0E0' }}>
                  Cancel
                </button>
              </div>
            ) : (
              <p className="text-sm font-mono mt-1" style={{ color: upiId ? '#2D6A4F' : '#CCC' }}>
                {upiId || 'Not set'}
              </p>
            )}
          </div>
        </section>

        {/* ── Recent rentals ── */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-[#1A1A1A]">My Rentals</h2>
            <button onClick={() => navigate('/my-rentals')}
              className="text-sm font-semibold" style={{ color: '#2D6A4F' }}>
              View all →
            </button>
          </div>

          {loadingRentals ? (
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-8 text-center text-[#999] text-sm">
              Loading…
            </div>
          ) : rentals.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-8 text-center">
              <p className="text-4xl mb-3">📦</p>
              <p className="text-[#555] font-medium text-sm">No rentals yet</p>
              <button onClick={() => navigate('/browse')}
                className="mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white"
                style={{ background: '#2D6A4F' }}>
                Browse Items
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rentals.slice(0, 3).map(rental => {
                const cfg = STATUS_CONFIG[rental.status] || STATUS_CONFIG.ACTIVE;
                const pct = Math.round((rental.currentMonth / rental.totalMonths) * 100);
                return (
                  <div key={rental.id}
                    className="bg-white rounded-2xl border border-[#E0E0E0] p-4 flex gap-4 cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => navigate('/my-rentals')}>
                    {/* Image */}
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-[#F5F5F5]">
                      {rental.listingImage ? (
                        <img src={rental.listingImage} alt={rental.listingTitle}
                          className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🛋️</div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{rental.listingTitle}</p>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: cfg.bg, color: cfg.color }}>
                          {cfg.label}
                        </span>
                      </div>

                      <p className="text-xs text-[#777] mt-0.5">
                        ₹{rental.monthlyRent.toLocaleString()}/mo · {rental.planType}
                      </p>

                      {/* Progress bar */}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-[#999] mb-1">
                          <span>Month {rental.currentMonth} of {rental.totalMonths}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: '#2D6A4F' }} />
                        </div>
                      </div>

                      {rental.nextPaymentDate && rental.status === 'ACTIVE' && (
                        <p className="text-xs text-[#999] mt-1.5">
                          Next payment: {new Date(rental.nextPaymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
              {rentals.length > 3 && (
                <button onClick={() => navigate('/my-rentals')}
                  className="w-full py-3 rounded-2xl border border-[#E0E0E0] text-sm font-semibold text-[#555] bg-white hover:bg-[#F9F9F9] transition-colors">
                  View {rentals.length - 3} more rentals
                </button>
              )}
            </div>
          )}
        </section>

        {/* ── Owner banner ── */}
        {ownerUser && (
          <section className="mb-6">
            <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
              style={{ background: 'linear-gradient(135deg,#1B4332,#2D6A4F)' }}>
              <div>
                <p className="text-white font-bold mb-0.5">Owner Dashboard</p>
                <p className="text-white/70 text-xs">Track your listings, rentals & payouts</p>
              </div>
              <button onClick={() => navigate('/dashboard/owner')}
                className="flex-shrink-0 px-4 py-2 rounded-full font-bold text-[#1A1A1A] text-sm"
                style={{ background: '#F4A261' }}>
                View →
              </button>
            </div>
          </section>
        )}

        {/* ── Quick actions ── */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: '🛋️', label: 'Browse Items', sub: 'Find furniture & appliances', path: '/browse' },
              { icon: '⭐', label: 'My Rentals',   sub: 'Track active rentals',        path: '/my-rentals' },
              { icon: '🏠', label: 'List an Item', sub: 'Earn by renting your stuff',  path: '/list' },
              ...(ownerUser
                ? [{ icon: '📊', label: 'My Listings', sub: 'Manage your listings', path: '/dashboard/owner' }]
                : [{ icon: '💬', label: 'Get Help',    sub: 'Contact Voorent support', path: '/' }]
              ),
            ].map(a => (
              <button key={a.path + a.label} onClick={() => navigate(a.path)}
                className="bg-white rounded-2xl border border-[#E0E0E0] p-4 text-left hover:shadow-md transition-shadow">
                <span className="text-2xl block mb-2">{a.icon}</span>
                <p className="text-sm font-semibold text-[#1A1A1A]">{a.label}</p>
                <p className="text-xs text-[#999] mt-0.5">{a.sub}</p>
              </button>
            ))}
          </div>
        </section>

        {/* ── Account settings ── */}
        <section className="mb-6">
          <h2 className="text-base font-bold text-[#1A1A1A] mb-3">Account</h2>
          <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <p className="text-xs text-[#999] mb-0.5">Mobile Number</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">{displayPhone || '—'}</p>
            </div>
            <div className="px-5 py-4 border-b border-[#F0F0F0]">
              <p className="text-xs text-[#999] mb-0.5">Account Type</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">Standard</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-xs text-[#999] mb-0.5">Member Since</p>
              <p className="text-sm font-semibold text-[#1A1A1A]">
                {new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
        </section>

        {/* ── Logout ── */}
        <button onClick={handleLogout}
          className="w-full py-4 rounded-2xl font-semibold text-sm border-2 transition-colors hover:bg-red-50"
          style={{ borderColor: '#D62828', color: '#D62828' }}>
          Log out
        </button>
      </main>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
