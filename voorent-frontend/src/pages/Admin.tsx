import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import { getUserInfo, clearUserInfo } from '../utils/auth';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
// All admin fetch calls use credentials: 'include' so the httpOnly cookie is sent.
// No static key. Server-side [Authorize(Roles="admin")] is the gatekeeper.
const jsonHeaders = { 'Content-Type': 'application/json' };
const jsonOpts    = { credentials: 'include' as RequestCredentials };
const headers     = { ...jsonHeaders };  // GET requests (no body)

type Tab = 'listings' | 'users' | 'orders' | 'invoices' | 'payouts';

interface Summary {
  totalUsers: number; totalListings: number; pendingItems: number;
  activeItems: number; totalOrders: number; activeOrders: number;
  totalInvoices: number; totalRevenue: number;
}
interface AdminListing {
  id: string; title: string; category: string; condition: string;
  itemPrice: number; monthlyRent: number; status: string;
  imageUrl: string; createdAt: string; ownerPhone: string; ownerName: string;
  pincode?: string;
}
interface AdminUser {
  id: string; name: string; email: string; phone: string; role: string;
  upiId: string; createdAt: string; rentalCount: number; listingCount: number;
}
interface AdminOrder {
  id: string; status: string; planType: string; currentMonth: number;
  totalMonths: number; monthlyAmount: number; startDate: string;
  createdAt: string; customerName: string; customerPhone: string;
  listingTitle: string; listingId: string; deliveryAddress?: string;
}
interface AdminPayout {
  id: string; amount: number; status: string; paidAt: string | null;
  createdAt: string; ownerName: string; ownerPhone: string; upiId: string;
  listingTitle: string; plan: string;
}

interface AdminInvoice {
  id: string; invoiceNumber: string; amount: number; originalAmount: number | null;
  discountAmount: number; couponCode: string | null; notes: string | null;
  monthNumber: number; status: string; paidAt: string | null;
  dueDate: string | null; createdAt: string;
  customerName: string; customerPhone: string; listingTitle: string;
}
interface Coupon {
  id: string; code: string; discountType: string; discountValue: number;
  maxUses: number | null; usedCount: number; expiresAt: string | null;
  isActive: boolean; createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:   { bg: '#FFF8E1', text: '#F59E0B' },
  active:    { bg: '#E8F5E9', text: '#2D6A4F' },
  rented:    { bg: '#E3F2FD', text: '#1565C0' },
  rejected:  { bg: '#FFEBEE', text: '#C62828' },
  sold:      { bg: '#F3F4F6', text: '#555' },
  ACTIVE:      { bg: '#E8F5E9', text: '#2D6A4F' },
  UPCOMING:    { bg: '#E3F2FD', text: '#1565C0' },
  PROCESSING:  { bg: '#E3F2FD', text: '#1565C0' },
  COMPLETED: { bg: '#F3F4F6', text: '#555' },
  OVERDUE:   { bg: '#FFEBEE', text: '#D62828' },
  CANCELLED:         { bg: '#FEE2E2', text: '#991B1B' },
  RETURN_REQUESTED:  { bg: '#FFF3E0', text: '#E65100' },
  RETURNED:          { bg: '#F3E8FF', text: '#6B21A8' },
  DEFAULTER:         { bg: '#FFF1F2', text: '#9F1239' },
  paid:      { bg: '#E8F5E9', text: '#2D6A4F' },
  overdue:   { bg: '#FFEBEE', text: '#D62828' },
};

export default function Admin() {
  const navigate = useNavigate();
  const userInfo = getUserInfo();
  const isAuthenticated = userInfo?.role === 'admin';

  const handleAdminLogout = async () => {
    try {
      await fetch(`${BASE.replace('/api', '')}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    } finally {
      clearUserInfo();
      navigate('/login');
    }
  };

  const [tab, setTab] = useState<Tab>('listings');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [editListing, setEditListing] = useState<AdminListing | null>(null);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [editInvoice, setEditInvoice] = useState<AdminInvoice | null>(null);
  const [invoiceForm, setInvoiceForm] = useState({ amount: '', paidAt: '', dueDate: '', status: '', notes: '', couponCode: '' });
  const [couponMsg, setCouponMsg] = useState('');
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showCoupons, setShowCoupons] = useState(false);
  const [newCoupon, setNewCoupon] = useState({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '' });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filesModal, setFilesModal] = useState<{ id: string; title: string; photos: string[]; docs: { name: string; url: string; ext: string }[] } | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [editOrder, setEditOrder] = useState<AdminOrder | null>(null);
  const [editOrderForm, setEditOrderForm] = useState({ deliveryAddress: '', monthlyAmount: '' });

  const BACKEND = BASE.replace('/api', '');

  const openFiles = async (l: AdminListing) => {
    setFilesLoading(true);
    setFilesModal({ id: l.id, title: l.title, photos: [], docs: [] });
    try {
      const res = await fetch(`${BASE}/admin/listings/${l.id}/files`, { ...jsonOpts });
      const data = await res.json();
      setFilesModal({ id: l.id, title: l.title, photos: data.photos || [], docs: data.docs || [] });
    } catch { alert('Failed to load files.'); setFilesModal(null); }
    finally { setFilesLoading(false); }
  };

  const fetchSummary = useCallback(async () => {
    const res = await fetch(`${BASE}/admin/summary`, { ...jsonOpts });
    if (res.ok) setSummary(await res.json());
  }, []);

  const fetchTab = useCallback(async (t: Tab) => {
    setLoading(true);
    try {
      if (t === 'listings') {
        const res = await fetch(`${BASE}/admin/listings${statusFilter ? `?status=${statusFilter}` : ''}`, { ...jsonOpts });
        if (res.ok) setListings(await res.json());
      } else if (t === 'users') {
        const res = await fetch(`${BASE}/admin/users${search ? `?search=${search}` : ''}`, { ...jsonOpts });
        if (res.ok) setUsers(await res.json());
      } else if (t === 'orders') {
        const res = await fetch(`${BASE}/admin/orders${statusFilter ? `?status=${statusFilter}` : ''}`, { ...jsonOpts });
        if (res.ok) setOrders(await res.json());
      } else if (t === 'invoices') {
        const res = await fetch(`${BASE}/admin/invoices${statusFilter ? `?status=${statusFilter}` : ''}`, { ...jsonOpts });
        if (res.ok) setInvoices(await res.json());
      } else if (t === 'payouts') {
        const res = await fetch(`${BASE}/admin/payouts${statusFilter ? `?status=${statusFilter}` : ''}`, { ...jsonOpts });
        if (res.ok) setPayouts(await res.json());
      }
    } finally { setLoading(false); }
  }, [tab, statusFilter, search]);

  useEffect(() => { fetchSummary(); }, []);
  useEffect(() => { fetchTab(tab); }, [tab, statusFilter]);
  useEffect(() => {
    if (!openDropdown) return;
    const close = () => setOpenDropdown(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [openDropdown]);

  const approve = async (id: string) => {
    await fetch(`${BASE}/admin/listings/${id}/approve`, { method: 'POST', ...jsonOpts });
    fetchTab('listings'); fetchSummary();
  };
  const reject = async (id: string) => {
    await fetch(`${BASE}/admin/listings/${id}/reject`, { method: 'POST', ...jsonOpts, headers: jsonHeaders, body: JSON.stringify({ reason: '' }) });
    fetchTab('listings'); fetchSummary();
  };
  const cancelOrder = async (id: string) => {
    if (!confirm('Cancel this order?')) return;
    await fetch(`${BASE}/admin/orders/${id}/cancel`, { method: 'POST', ...jsonOpts });
    fetchTab('orders'); fetchSummary();
  };
  const saveEditListing = async () => {
    if (!editListing) return;
    await fetch(`${BASE}/admin/listings/${editListing.id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ title: editListing.title, status: editListing.status, itemPrice: editListing.itemPrice, pincode: editListing.pincode || null }),
    });
    setEditListing(null); fetchTab('listings');
  };

  const deliverOrder = async (id: string) => {
    if (!confirm('Mark this order as DELIVERED? Billing cycle will start from today.')) return;
    await fetch(`${BASE}/admin/orders/${id}/deliver`, { method: 'POST', ...jsonOpts });
    fetchTab('orders'); fetchSummary();
  };
  const returnOrder = async (id: string) => {
    if (!confirm('Mark this order as RETURNED? No further invoices will be generated.')) return;
    await fetch(`${BASE}/admin/orders/${id}/return`, { method: 'POST', ...jsonOpts });
    fetchTab('orders'); fetchSummary();
  };
  const defaulterOrder = async (id: string) => {
    if (!confirm('Mark this customer as DEFAULTER?')) return;
    await fetch(`${BASE}/admin/orders/${id}/defaulter`, { method: 'POST', ...jsonOpts });
    fetchTab('orders'); fetchSummary();
  };
  const processOrder = async (id: string) => {
    await fetch(`${BASE}/admin/orders/${id}/process`, { method: 'POST', ...jsonOpts });
    fetchTab('orders'); fetchSummary();
  };
  const openEditOrder = (o: AdminOrder) => {
    setEditOrder(o);
    setEditOrderForm({ deliveryAddress: o.deliveryAddress || '', monthlyAmount: o.monthlyAmount.toString() });
  };
  const saveEditOrder = async () => {
    if (!editOrder) return;
    const body: Record<string, unknown> = {};
    if (editOrderForm.deliveryAddress) body.deliveryAddress = editOrderForm.deliveryAddress;
    const amt = parseFloat(editOrderForm.monthlyAmount);
    if (!isNaN(amt)) body.monthlyAmount = amt;
    const res = await fetch(`${BASE}/admin/orders/${editOrder.id}/edit`, { method: 'PUT', ...jsonOpts, headers: jsonHeaders, body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok && data.invoicesUpdated > 0) alert(`Order updated. ${data.invoicesUpdated} invoice(s) amount updated.`);
    setEditOrder(null); fetchTab('orders');
  };
  const saveEditUser = async () => {
    if (!editUser) return;
    await fetch(`${BASE}/admin/users/${editUser.id}`, {
      method: 'PUT', headers,
      body: JSON.stringify({ name: editUser.name, role: editUser.role }),
    });
    setEditUser(null); fetchTab('users');
  };

  const openEditInvoice = (inv: AdminInvoice) => {
    setEditInvoice(inv);
    setCouponMsg('');
    setInvoiceForm({
      amount: inv.amount.toString(),
      paidAt: inv.paidAt ? inv.paidAt.slice(0, 16) : '',
      dueDate: inv.dueDate ? inv.dueDate.slice(0, 16) : '',
      status: inv.status,
      notes: inv.notes || '',
      couponCode: '',
    });
  };
  const saveEditInvoice = async () => {
    if (!editInvoice) return;
    const body: Record<string, unknown> = {
      status: invoiceForm.status,
      notes: invoiceForm.notes || null,
    };
    const amt = parseFloat(invoiceForm.amount);
    if (!isNaN(amt)) body.amount = amt;
    if (invoiceForm.paidAt) body.paidAt = new Date(invoiceForm.paidAt).toISOString();
    if (invoiceForm.dueDate) body.dueDate = new Date(invoiceForm.dueDate).toISOString();
    await fetch(`${BASE}/admin/invoices/${editInvoice.id}`, { method: 'PUT', ...jsonOpts, headers: jsonHeaders, body: JSON.stringify(body) });
    setEditInvoice(null); fetchTab('invoices');
  };
  const applyCouponToInvoice = async () => {
    if (!editInvoice || !invoiceForm.couponCode) return;
    const res = await fetch(`${BASE}/admin/invoices/${editInvoice.id}/apply-coupon`, {
      method: 'POST', headers, body: JSON.stringify({ code: invoiceForm.couponCode }),
    });
    const data = await res.json();
    if (res.ok) {
      setCouponMsg(`✅ Applied! Discount ₹${data.discount}, new amount ₹${data.newAmount}`);
      fetchTab('invoices');
    } else {
      setCouponMsg(`❌ ${data}`);
    }
  };
  const removeCouponFromInvoice = async () => {
    if (!editInvoice) return;
    const res = await fetch(`${BASE}/admin/invoices/${editInvoice.id}/remove-coupon`, { method: 'POST', ...jsonOpts });
    if (res.ok) { setCouponMsg('✅ Coupon removed.'); fetchTab('invoices'); }
  };

  const loadCoupons = async () => {
    const res = await fetch(`${BASE}/admin/coupons`, { ...jsonOpts });
    if (res.ok) setCoupons(await res.json());
  };
  const createCoupon = async () => {
    if (!newCoupon.code || !newCoupon.discountValue) return;
    const body = {
      code: newCoupon.code,
      discountType: newCoupon.discountType,
      discountValue: parseFloat(newCoupon.discountValue),
      maxUses: newCoupon.maxUses ? parseInt(newCoupon.maxUses) : null,
      expiresAt: newCoupon.expiresAt ? new Date(newCoupon.expiresAt).toISOString() : null,
    };
    const res = await fetch(`${BASE}/admin/coupons`, { method: 'POST', ...jsonOpts, headers: jsonHeaders, body: JSON.stringify(body) });
    if (res.ok) { setNewCoupon({ code: '', discountType: 'percent', discountValue: '', maxUses: '', expiresAt: '' }); loadCoupons(); }
  };
  const toggleCoupon = async (id: string) => {
    await fetch(`${BASE}/admin/coupons/${id}/toggle`, { method: 'PUT', ...jsonOpts });
    loadCoupons();
  };

  const toggleCouponsPanel = () => {
    if (!showCoupons) loadCoupons();
    setShowCoupons(v => !v);
  };

  const markPayoutPaid = async (id: string) => {
    await fetch(`${BASE}/payouts/${id}/mark-paid`, { method: 'PUT', ...jsonOpts });
    fetchTab('payouts');
  };

  const runInvoiceJob = async () => {
    const res = await fetch(`${BASE}/admin/run-invoice-job`, { method: 'POST', ...jsonOpts });
    const data = await res.json();
    alert(data.message ?? 'Done');
    fetchTab('invoices'); fetchSummary();
  };

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: 'listings', label: '📦 Items',    count: summary?.totalListings ?? 0 },
    { key: 'users',    label: '👥 Users',    count: summary?.totalUsers ?? 0 },
    { key: 'orders',   label: '🛒 Orders',   count: summary?.totalOrders ?? 0 },
    { key: 'invoices', label: '🧾 Invoices', count: summary?.totalInvoices ?? 0 },
    { key: 'payouts',  label: '💰 Payouts',  count: payouts.length },
  ];

  // ── Admin Gate — server enforces [Authorize(Roles="admin")] on all /api/admin/* ──
  // If not logged in as admin, redirect to login.
  if (!isAuthenticated) {
    navigate('/login');
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Admin Dashboard</h1>
          <button onClick={handleAdminLogout} className="text-sm font-semibold text-[#D62828] hover:opacity-80">Logout</button>
          </div>

          {/* Summary stats */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Users',    value: summary.totalUsers,    color: '#2D6A4F' },
                { label: 'Pending Items',  value: summary.pendingItems,  color: '#F59E0B' },
                { label: 'Active Orders',  value: summary.activeOrders,  color: '#1565C0' },
                { label: 'Revenue',        value: `₹${Math.round(summary.totalRevenue).toLocaleString()}`, color: '#2D6A4F' },
              ].map(s => (
                <div key={s.label} className="rounded-2xl bg-white border border-[#E0E0E0] p-4">
                  <p className="text-xs text-[#999] mb-1">{s.label}</p>
                  <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-0 border-b border-[#E0E0E0]">
            {TABS.map(t => (
              <button key={t.key} onClick={() => { setTab(t.key); setStatusFilter(''); setSearch(''); }}
                className="px-5 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap"
                style={{ borderColor: tab === t.key ? '#2D6A4F' : 'transparent', color: tab === t.key ? '#2D6A4F' : '#999' }}>
                {t.label} <span className="ml-1 text-xs px-1.5 py-0.5 rounded-full bg-[#F3F4F6] text-[#555]">{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-6">

        {/* Filters bar */}
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          {tab === 'users' && (
            <input value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchTab('users')}
              placeholder="Search by name or phone…"
              className="border-2 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#2D6A4F]"
              style={{ borderColor: '#E0E0E0', minWidth: 220 }} />
          )}
          {tab === 'listings' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border-2 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#2D6A4F]"
              style={{ borderColor: '#E0E0E0' }}>
              <option value="">All statuses</option>
              {['pending','active','rented','rejected','sold'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {tab === 'orders' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border-2 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#2D6A4F]"
              style={{ borderColor: '#E0E0E0' }}>
              <option value="">All statuses</option>
              {['PROCESSING','UPCOMING','ACTIVE','OVERDUE','RETURNED','DEFAULTER','COMPLETED','CANCELLED'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {tab === 'invoices' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border-2 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#2D6A4F]"
              style={{ borderColor: '#E0E0E0' }}>
              <option value="">All statuses</option>
              {['paid','pending','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          {tab === 'payouts' && (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border-2 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#2D6A4F]"
              style={{ borderColor: '#E0E0E0' }}>
              <option value="">All statuses</option>
              {['pending','paid'].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <button onClick={() => fetchTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
            Refresh
          </button>
          {tab === 'invoices' && (
            <button onClick={runInvoiceJob}
              className="px-4 py-2 rounded-xl text-sm font-bold border-2"
              style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
              ⚡ Run Invoice Job
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-[#999]">Loading…</div>
        ) : (

          /* ── ITEMS TAB ── */
          tab === 'listings' ? (
            <div className="space-y-3">
              {listings.map(l => {
                const sc = STATUS_COLORS[l.status] || { bg: '#F3F4F6', text: '#555' };
                return (
                  <div key={l.id} className="bg-white rounded-2xl border border-[#E0E0E0] p-5 flex gap-4 items-start hover:border-[#2D6A4F] transition-colors">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-[#F3F4F6] flex-shrink-0 flex items-center justify-center text-2xl">
                      {l.imageUrl ? <img src={l.imageUrl.startsWith('http') ? l.imageUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace('/api', '')}${l.imageUrl}`} className="w-full h-full object-cover" alt="" /> : '📦'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-bold text-[#1A1A1A] leading-snug">{l.title}</p>
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                          style={{ background: sc.bg, color: sc.text }}>{l.status}</span>
                      </div>
                      <p className="text-xs text-[#999] mb-2">{l.category} · {l.condition} · ₹{l.itemPrice.toLocaleString()} · Owner: {l.ownerName} ({l.ownerPhone})</p>
                      <p className="text-xs text-[#999]">{new Date(l.createdAt).toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="flex flex-col gap-2 flex-shrink-0">
                      {l.status === 'pending' && (<>
                        <button onClick={() => approve(l.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#2D6A4F' }}>
                          ✓ Approve
                        </button>
                        <button onClick={() => reject(l.id)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#D62828' }}>
                          ✕ Reject
                        </button>
                      </>)}
                      <button onClick={() => openFiles(l)}
                        className="px-4 py-2 rounded-xl text-xs font-bold border-2"
                        style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                        📁 Files
                      </button>
                      <button onClick={() => setEditListing(l)}
                        className="px-4 py-2 rounded-xl text-xs font-bold border-2"
                        style={{ borderColor: '#E0E0E0', color: '#555' }}>
                        ✏ Edit
                      </button>
                    </div>
                  </div>
                );
              })}
              {listings.length === 0 && <p className="text-center text-[#999] py-20">No items found</p>}
            </div>

          /* ── USERS TAB ── */
          ) : tab === 'users' ? (
            <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-[#F9F9F9]">
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Name</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Phone</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden lg:table-cell">Email</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Role</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Rentals</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Listings</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Joined</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u.id} className={`border-b border-[#F0F0F0] hover:bg-[#F9F9F9] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#1A1A1A]">{u.name || '—'}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-[#555]">{u.phone}</td>
                      <td className="px-5 py-4 text-[#555] hidden lg:table-cell">{u.email || '—'}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={u.role === 'owner' ? { background: '#E8F5E9', color: '#2D6A4F' } : { background: '#E3F2FD', color: '#1565C0' }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-[#555] hidden md:table-cell">{u.rentalCount}</td>
                      <td className="px-5 py-4 text-[#555] hidden md:table-cell">{u.listingCount}</td>
                      <td className="px-5 py-4 text-[#999] hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                      <td className="px-5 py-4">
                        <button onClick={() => setEditUser(u)}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold border-2"
                          style={{ borderColor: '#E0E0E0', color: '#555' }}>
                          ✏ Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && <p className="text-center text-[#999] py-20">No users found</p>}
            </div>

          /* ── ORDERS TAB ── */
          ) : tab === 'orders' ? (
            <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-[#F9F9F9]">
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Order</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Customer</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Item</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Status</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Progress</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Amount</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => {
                    const sc = STATUS_COLORS[o.status] || { bg: '#F3F4F6', text: '#555' };
                    return (
                      <tr key={o.id} className={`border-b border-[#F0F0F0] hover:bg-[#F9F9F9] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}>
                        <td className="px-5 py-4">
                          <p className="font-mono text-xs text-[#999]">#{o.id.slice(0,8).toUpperCase()}</p>
                          <p className="text-xs text-[#999] mt-0.5">{new Date(o.createdAt).toLocaleDateString('en-IN')}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-[#1A1A1A]">{o.customerName || '—'}</p>
                          <p className="text-xs font-mono text-[#999]">{o.customerPhone}</p>
                        </td>
                        <td className="px-5 py-4 text-[#555] hidden md:table-cell max-w-[160px] truncate">{o.listingTitle}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: sc.bg, color: sc.text }}>{o.status}</span>
                        </td>
                        <td className="px-5 py-4 text-[#555] hidden md:table-cell">
                          {o.currentMonth}/{o.totalMonths} months
                        </td>
                        <td className="px-5 py-4 font-bold text-[#1A1A1A]">₹{o.monthlyAmount.toLocaleString()}/mo</td>
                        <td className="px-5 py-4">
                          <div className="relative">
                            <button
                              onClick={(e) => { e.stopPropagation(); setOpenDropdown(openDropdown === o.id ? null : o.id); }}
                              className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 flex items-center gap-1"
                              style={{ borderColor: '#E0E0E0', color: '#555' }}>
                              ⚙ Actions <span className="text-[10px]">▾</span>
                            </button>
                            {openDropdown === o.id && (
                              <div className="absolute right-0 top-full mt-1 bg-white border border-[#E0E0E0] rounded-xl shadow-lg z-20 w-44 py-1 overflow-hidden"
                                onClick={e => e.stopPropagation()}>
                                <button onClick={() => { processOrder(o.id); setOpenDropdown(null); }}
                                  disabled={['ACTIVE','COMPLETED','RETURNED','CANCELLED'].includes(o.status)}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#F9F9F9] text-[#1565C0] disabled:text-[#ccc] disabled:cursor-not-allowed transition-colors">
                                  ⚡ Process
                                </button>
                                <button onClick={() => { deliverOrder(o.id); setOpenDropdown(null); }}
                                  disabled={['ACTIVE','COMPLETED','RETURNED','CANCELLED'].includes(o.status)}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#F9F9F9] text-[#2D6A4F] disabled:text-[#ccc] disabled:cursor-not-allowed transition-colors">
                                  🚚 Mark Delivered
                                </button>
                                <button onClick={() => { returnOrder(o.id); setOpenDropdown(null); }}
                                  disabled={!['ACTIVE','OVERDUE','DEFAULTER'].includes(o.status)}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#F9F9F9] text-[#6B21A8] disabled:text-[#ccc] disabled:cursor-not-allowed transition-colors">
                                  ↩ Mark Returned
                                </button>
                                <button onClick={() => { cancelOrder(o.id); setOpenDropdown(null); }}
                                  disabled={['COMPLETED','RETURNED','CANCELLED'].includes(o.status)}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#F9F9F9] text-[#D62828] disabled:text-[#ccc] disabled:cursor-not-allowed transition-colors">
                                  ✕ Mark Cancelled
                                </button>
                                <button onClick={() => { defaulterOrder(o.id); setOpenDropdown(null); }}
                                  disabled={!['ACTIVE','OVERDUE'].includes(o.status)}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#F9F9F9] text-[#9F1239] disabled:text-[#ccc] disabled:cursor-not-allowed transition-colors">
                                  ⚠ Mark Defaulter
                                </button>
                                <div className="border-t border-[#F0F0F0] mx-2 my-1" />
                                <button onClick={() => { openEditOrder(o); setOpenDropdown(null); }}
                                  className="w-full text-left px-4 py-2.5 text-xs font-semibold hover:bg-[#F9F9F9] text-[#555] transition-colors">
                                  ✏ Edit Order
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {orders.length === 0 && <p className="text-center text-[#999] py-20">No orders found</p>}
            </div>

          /* ── INVOICES TAB ── */
          ) : tab === 'invoices' ? (
            <div className="space-y-4">
              {/* Coupon management toggle */}
              <div className="flex justify-end">
                <button onClick={toggleCouponsPanel}
                  className="px-4 py-2 rounded-xl text-sm font-bold border-2"
                  style={{ borderColor: showCoupons ? '#2D6A4F' : '#E0E0E0', color: showCoupons ? '#2D6A4F' : '#555' }}>
                  🏷️ {showCoupons ? 'Hide' : 'Manage'} Coupons
                </button>
              </div>

              {/* Coupon management panel */}
              {showCoupons && (
                <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5 space-y-4">
                  <h3 className="font-bold text-[#1A1A1A]">Discount Coupons</h3>

                  {/* Create coupon form */}
                  <div className="bg-[#F9F9F9] rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-[#555] uppercase tracking-wide">Create New Coupon</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      <input placeholder="Code e.g. SAVE10" value={newCoupon.code}
                        onChange={e => setNewCoupon({...newCoupon, code: e.target.value.toUpperCase()})}
                        className="border-2 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                        style={{ borderColor: '#E0E0E0' }} />
                      <select value={newCoupon.discountType}
                        onChange={e => setNewCoupon({...newCoupon, discountType: e.target.value})}
                        className="border-2 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                        style={{ borderColor: '#E0E0E0' }}>
                        <option value="percent">% Percent</option>
                        <option value="fixed">₹ Fixed</option>
                      </select>
                      <input type="number" placeholder={newCoupon.discountType === 'percent' ? 'Value e.g. 10' : 'Amount e.g. 100'}
                        value={newCoupon.discountValue}
                        onChange={e => setNewCoupon({...newCoupon, discountValue: e.target.value})}
                        className="border-2 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                        style={{ borderColor: '#E0E0E0' }} />
                      <input type="number" placeholder="Max uses (optional)"
                        value={newCoupon.maxUses}
                        onChange={e => setNewCoupon({...newCoupon, maxUses: e.target.value})}
                        className="border-2 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                        style={{ borderColor: '#E0E0E0' }} />
                      <input type="date" placeholder="Expires (optional)"
                        value={newCoupon.expiresAt}
                        onChange={e => setNewCoupon({...newCoupon, expiresAt: e.target.value})}
                        className="border-2 rounded-xl px-3 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                        style={{ borderColor: '#E0E0E0' }} />
                      <button onClick={createCoupon}
                        className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
                        + Create
                      </button>
                    </div>
                  </div>

                  {/* Coupon list */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-[#E0E0E0]">
                          <th className="text-left py-2 px-3 font-semibold text-[#555]">Code</th>
                          <th className="text-left py-2 px-3 font-semibold text-[#555]">Discount</th>
                          <th className="text-left py-2 px-3 font-semibold text-[#555]">Used / Max</th>
                          <th className="text-left py-2 px-3 font-semibold text-[#555]">Expires</th>
                          <th className="py-2 px-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {coupons.map(c => (
                          <tr key={c.id} className="border-b border-[#F0F0F0]">
                            <td className="py-3 px-3 font-mono font-bold text-[#1A1A1A]">{c.code}</td>
                            <td className="py-3 px-3 text-[#555]">
                              {c.discountType === 'percent' ? `${c.discountValue}%` : `₹${c.discountValue}`}
                            </td>
                            <td className="py-3 px-3 text-[#555]">{c.usedCount} / {c.maxUses ?? '∞'}</td>
                            <td className="py-3 px-3 text-[#999]">
                              {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('en-IN') : '—'}
                            </td>
                            <td className="py-3 px-3">
                              <button onClick={() => toggleCoupon(c.id)}
                                className="px-3 py-1 rounded-lg text-xs font-bold"
                                style={c.isActive
                                  ? { background: '#E8F5E9', color: '#2D6A4F' }
                                  : { background: '#F3F4F6', color: '#999' }}>
                                {c.isActive ? 'Active' : 'Inactive'}
                              </button>
                            </td>
                          </tr>
                        ))}
                        {coupons.length === 0 && (
                          <tr><td colSpan={5} className="text-center text-[#999] py-6 text-sm">No coupons yet</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Invoice table */}
              <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E0E0E0] bg-[#F9F9F9]">
                      <th className="text-left px-5 py-3 font-semibold text-[#555]">Invoice #</th>
                      <th className="text-left px-5 py-3 font-semibold text-[#555]">Customer</th>
                      <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Item</th>
                      <th className="text-left px-5 py-3 font-semibold text-[#555]">Month</th>
                      <th className="text-left px-5 py-3 font-semibold text-[#555]">Amount</th>
                      <th className="text-left px-5 py-3 font-semibold text-[#555]">Status</th>
                      <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Date</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, i) => {
                      const ic = STATUS_COLORS[inv.status] || { bg: '#F3F4F6', text: '#555' };
                      return (
                        <tr key={inv.id} className={`border-b border-[#F0F0F0] hover:bg-[#F9F9F9] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}>
                          <td className="px-5 py-4">
                            <p className="font-bold text-[#1A1A1A]">{inv.invoiceNumber}</p>
                            {inv.couponCode && <p className="text-xs text-[#2D6A4F]">🏷️ {inv.couponCode} (-₹{inv.discountAmount})</p>}
                          </td>
                          <td className="px-5 py-4">
                            <p className="font-semibold text-[#1A1A1A]">{inv.customerName || '—'}</p>
                            <p className="text-xs font-mono text-[#999]">{inv.customerPhone}</p>
                          </td>
                          <td className="px-5 py-4 text-[#555] hidden md:table-cell max-w-[160px] truncate">{inv.listingTitle}</td>
                          <td className="px-5 py-4 text-[#555]">{inv.monthNumber}</td>
                          <td className="px-5 py-4">
                            <p className="font-bold text-[#1A1A1A]">₹{inv.amount.toLocaleString()}</p>
                            {inv.originalAmount && inv.originalAmount !== inv.amount && (
                              <p className="text-xs text-[#999] line-through">₹{inv.originalAmount.toLocaleString()}</p>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                              style={{ background: ic.bg, color: ic.text }}>{inv.status}</span>
                          </td>
                          <td className="px-5 py-4 text-[#999] hidden md:table-cell">
                            {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex gap-2">
                              <a href={`/invoice/${inv.id}?admin=1`} target="_blank" rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border-2 no-underline"
                                style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                                👁 View
                              </a>
                              <button onClick={() => openEditInvoice(inv)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold border-2"
                                style={{ borderColor: '#E0E0E0', color: '#555' }}>
                                ✏ Edit
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {invoices.length === 0 && <p className="text-center text-[#999] py-20">No invoices found</p>}
              </div>
            </div>

          /* ── PAYOUTS TAB ── */
          ) : (
            <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-[#F9F9F9]">
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Owner</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Item</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Plan</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Amount</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">UPI</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Status</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {payouts.map((p, i) => (
                    <tr key={p.id} className={`border-b border-[#F0F0F0] hover:bg-[#F9F9F9] ${i % 2 === 1 ? 'bg-[#FAFAFA]' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-[#1A1A1A]">{p.ownerName || '—'}</p>
                        <p className="text-xs font-mono text-[#999]">{p.ownerPhone}</p>
                      </td>
                      <td className="px-5 py-4 text-[#555] hidden md:table-cell max-w-[160px] truncate">{p.listingTitle}</td>
                      <td className="px-5 py-4 text-[#555] hidden md:table-cell capitalize">{p.plan}</td>
                      <td className="px-5 py-4 font-bold text-[#1A1A1A]">₹{p.amount.toLocaleString()}</td>
                      <td className="px-5 py-4">
                        {p.upiId
                          ? <span className="font-mono text-xs text-[#2D6A4F]">{p.upiId}</span>
                          : <span className="text-xs text-[#D62828]">Not set</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                          style={p.status === 'paid'
                            ? { background: '#E8F5E9', color: '#2D6A4F' }
                            : { background: '#FFF9C4', color: '#F57F17' }}>
                          {p.status === 'paid' ? '✓ Transferred' : '⏳ Pending'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {p.status === 'pending' && (
                          <button onClick={() => markPayoutPaid(p.id)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white"
                            style={{ background: '#2D6A4F' }}>
                            Mark Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {payouts.length === 0 && <p className="text-center text-[#999] py-20">No payouts yet</p>}
            </div>
          )
        )}
      </main>

      {/* Edit Listing Modal */}
      {editListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditListing(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">Edit Item</h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Title</label>
                <input value={editListing.title} onChange={e => setEditListing({...editListing, title: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]" style={{ borderColor: '#E0E0E0' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Item Price (₹)</label>
                <input type="number" value={editListing.itemPrice}
                  onChange={e => setEditListing({...editListing, itemPrice: parseFloat(e.target.value)})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]" style={{ borderColor: '#E0E0E0' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Status</label>
                <select value={editListing.status} onChange={e => setEditListing({...editListing, status: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]" style={{ borderColor: '#E0E0E0' }}>
                  {['pending','active','rented','rejected','sold'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Pincode (geocodes lat/lng)</label>
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  placeholder="e.g. 110001"
                  value={editListing.pincode || ''}
                  onChange={e => setEditListing({...editListing, pincode: e.target.value.replace(/\D/g,'')})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]" style={{ borderColor: '#E0E0E0' }} />
                <p className="text-xs text-[#999] mt-1">Saves lat/lng so item appears in location searches</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditListing(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#E0E0E0', color: '#555' }}>
                Cancel
              </button>
              <button onClick={saveEditListing}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Invoice Modal */}
      {editInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditInvoice(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Edit Invoice</h2>
            <p className="text-xs font-mono text-[#999] mb-4">{editInvoice.invoiceNumber} · {editInvoice.customerName} · {editInvoice.listingTitle}</p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Amount (₹)</label>
                <input type="number" value={invoiceForm.amount}
                  onChange={e => setInvoiceForm({...invoiceForm, amount: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]"
                  style={{ borderColor: '#E0E0E0' }} />
                {editInvoice.couponCode && (
                  <p className="text-xs text-[#2D6A4F] mt-1">🏷️ Coupon applied: {editInvoice.couponCode} (−₹{editInvoice.discountAmount})</p>
                )}
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Status</label>
                <select value={invoiceForm.status}
                  onChange={e => setInvoiceForm({...invoiceForm, status: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]"
                  style={{ borderColor: '#E0E0E0' }}>
                  {['paid','pending','overdue'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-[#555] mb-1 block">Paid At</label>
                  <input type="datetime-local" value={invoiceForm.paidAt}
                    onChange={e => setInvoiceForm({...invoiceForm, paidAt: e.target.value})}
                    className="w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D6A4F]"
                    style={{ borderColor: '#E0E0E0' }} />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#555] mb-1 block">Due Date</label>
                  <input type="datetime-local" value={invoiceForm.dueDate}
                    onChange={e => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                    className="w-full border-2 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#2D6A4F]"
                    style={{ borderColor: '#E0E0E0' }} />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Notes</label>
                <textarea value={invoiceForm.notes}
                  onChange={e => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                  rows={2} placeholder="Internal notes…"
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F] resize-none"
                  style={{ borderColor: '#E0E0E0' }} />
              </div>

              {/* Coupon section */}
              <div className="border-t border-[#E0E0E0] pt-3">
                <label className="text-xs font-semibold text-[#555] mb-2 block">Apply Discount Coupon</label>
                <div className="flex gap-2">
                  <input value={invoiceForm.couponCode}
                    onChange={e => setInvoiceForm({...invoiceForm, couponCode: e.target.value.toUpperCase()})}
                    placeholder="Enter coupon code"
                    className="flex-1 border-2 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#2D6A4F]"
                    style={{ borderColor: '#E0E0E0' }} />
                  <button onClick={applyCouponToInvoice}
                    className="px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
                    Apply
                  </button>
                  {editInvoice.couponCode && (
                    <button onClick={removeCouponFromInvoice}
                      className="px-4 py-2 rounded-xl text-sm font-bold border-2"
                      style={{ borderColor: '#D62828', color: '#D62828' }}>
                      Remove
                    </button>
                  )}
                </div>
                {couponMsg && <p className="text-xs mt-2" style={{ color: couponMsg.startsWith('✅') ? '#2D6A4F' : '#D62828' }}>{couponMsg}</p>}
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditInvoice(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2"
                style={{ borderColor: '#E0E0E0', color: '#555' }}>
                Cancel
              </button>
              <button onClick={saveEditInvoice}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Files Modal */}
      {filesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setFilesModal(null)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-3xl shadow-xl overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg">Uploaded Files</h2>
                <p className="text-xs text-[#888] mt-0.5">{filesModal.title}</p>
              </div>
              <button onClick={() => setFilesModal(null)} className="text-[#888] hover:text-[#333] text-2xl leading-none">&times;</button>
            </div>

            {filesLoading ? (
              <div className="text-center py-10 text-[#888]">Loading files…</div>
            ) : (
              <>
                {/* Photos */}
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-[#2D6A4F] mb-3">📸 Photos ({filesModal.photos.length})</h3>
                  {filesModal.photos.length === 0 ? (
                    <p className="text-sm text-[#888]">No photos uploaded.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {filesModal.photos.map((url, i) => (
                        <a key={i} href={BACKEND + url} target="_blank" rel="noreferrer">
                          <img
                            src={BACKEND + url}
                            alt={`Photo ${i + 1}`}
                            className="w-full h-36 object-cover rounded-xl border border-[#E0E0E0] hover:opacity-80 transition-opacity"
                          />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Documents */}
                <div>
                  <h3 className="text-sm font-bold text-[#2D6A4F] mb-3">📄 Documents ({filesModal.docs.length})</h3>
                  {filesModal.docs.length === 0 ? (
                    <p className="text-sm text-[#888]">No documents uploaded.</p>
                  ) : (
                    <div className="space-y-2">
                      {filesModal.docs.map((doc, i) => {
                        const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(doc.ext);
                        return (
                          <div key={i} className="flex items-center gap-3 border border-[#E0E0E0] rounded-xl p-3">
                            {isImage ? (
                              <img src={BACKEND + doc.url} alt={doc.name} className="w-16 h-16 object-cover rounded-lg border border-[#E0E0E0]" />
                            ) : (
                              <div className="w-16 h-16 flex items-center justify-center bg-[#F3F4F6] rounded-lg text-2xl">
                                {doc.ext === '.pdf' ? '📕' : '📄'}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold capitalize text-[#222]">{doc.name}</p>
                              <p className="text-xs text-[#888]">{doc.ext.replace('.', '').toUpperCase()}</p>
                            </div>
                            <a href={BACKEND + doc.url} target="_blank" rel="noreferrer"
                              className="px-4 py-2 rounded-xl text-xs font-bold border-2 whitespace-nowrap"
                              style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                              👁 View
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Order Modal */}
      {editOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditOrder(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-1">Edit Order</h2>
            <p className="text-xs font-mono text-[#999] mb-4">#{editOrder.id.slice(0,8).toUpperCase()} · {editOrder.customerName} · {editOrder.listingTitle}</p>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Delivery Address</label>
                <textarea value={editOrderForm.deliveryAddress}
                  onChange={e => setEditOrderForm({...editOrderForm, deliveryAddress: e.target.value})}
                  rows={3} placeholder="Full delivery address…"
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F] resize-none"
                  style={{ borderColor: '#E0E0E0' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Monthly Amount (₹)</label>
                <input type="number" value={editOrderForm.monthlyAmount}
                  onChange={e => setEditOrderForm({...editOrderForm, monthlyAmount: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]"
                  style={{ borderColor: '#E0E0E0' }} />
                <p className="text-xs text-[#999] mt-1">Changes apply to all pending invoices from current month onwards. Month 1 can be edited manually via the Invoices tab.</p>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditOrder(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#E0E0E0', color: '#555' }}>
                Cancel
              </button>
              <button onClick={saveEditOrder}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setEditUser(null)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-lg mb-4">Edit User</h2>
            <p className="text-xs font-mono text-[#999] mb-4">{editUser.phone}</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Name</label>
                <input value={editUser.name || ''} onChange={e => setEditUser({...editUser, name: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]" style={{ borderColor: '#E0E0E0' }} />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#555] mb-1 block">Role</label>
                <select value={editUser.role} onChange={e => setEditUser({...editUser, role: e.target.value})}
                  className="w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#2D6A4F]" style={{ borderColor: '#E0E0E0' }}>
                  {['customer','owner','admin'].map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border-2" style={{ borderColor: '#E0E0E0', color: '#555' }}>
                Cancel
              </button>
              <button onClick={saveEditUser}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: '#2D6A4F' }}>
                Save changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
