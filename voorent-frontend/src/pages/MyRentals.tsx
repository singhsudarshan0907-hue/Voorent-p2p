import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import { getMyRentals, contactVoorent } from '../services/api';
import { useRazorpay } from '../hooks/useRazorpay';
import { isLoggedIn } from '../utils/auth';
import axios from 'axios';
import type { Rental } from '../types';

interface Invoice {
  id: string;
  invoiceNumber: string;
  rentalId: string;
  listingTitle: string;
  amount: number;
  monthNumber: number;
  totalMonths: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  ACTIVE:            { bg: '#E8F5E9', text: '#2D6A4F' },
  UPCOMING:          { bg: '#E3F2FD', text: '#1565C0' },
  COMPLETED:         { bg: '#F3F4F6', text: '#555555' },
  OVERDUE:           { bg: '#FFEBEE', text: '#D62828' },
  RETURN_REQUESTED:  { bg: '#FFF3E0', text: '#E65100' },
};

const INV_COLORS: Record<string, { bg: string; text: string }> = {
  paid:    { bg: '#E8F5E9', text: '#2D6A4F' },
  pending: { bg: '#FFF9C4', text: '#F57F17' },
  overdue: { bg: '#FFEBEE', text: '#D62828' },
};

export default function MyRentals() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const newRentalId = searchParams.get('new');
  const [tab, setTab] = useState<'rentals' | 'invoices'>('rentals');
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [expandedRental, setExpandedRental] = useState<string | null>(null);
  const { openCheckout } = useRazorpay();

  const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    if (!isLoggedIn()) { navigate('/login'); return; }
    Promise.allSettled([
      getMyRentals(),
      axios.get<Invoice[]>(`${BASE}/invoices/my`, { withCredentials: true }),
    ]).then(([rentRes, invRes]) => {
      if (rentRes.status === 'fulfilled') setRentals(rentRes.value.data);
      if (invRes.status === 'fulfilled') setInvoices(invRes.value.data);
    }).finally(() => setLoading(false));
  }, [navigate]);

  const handleReturnRequest = async (rental: Rental) => {
    if (!confirm('Request to return this item? Voorent will contact you within 24 hours to arrange pickup.')) return;
    try {
      await axios.post(`${BASE}/rentals/${rental.id}/return-request`, {}, { withCredentials: true });
      alert('Return request submitted! We\'ll WhatsApp you within 24 hours.');
      const r = await getMyRentals();
      setRentals(r.data);
    } catch {
      alert('Failed to submit return request. Please contact Voorent directly.');
    }
  };

  const handlePayNow = (rental: Rental) => {
    setPayingId(rental.id);
    openCheckout({
      listingId: rental.listingId,
      plan: rental.planType,
      onSuccess: () => {
        setPayingId(null);
        getMyRentals().then((r) => setRentals(r.data)).catch(console.error);
        axios.get<Invoice[]>(`${BASE}/invoices/my`, { withCredentials: true })
          .then(r => setInvoices(r.data)).catch(console.error);
      },
      onError: (msg) => { setPayingId(null); alert(msg); },
      onDismiss: () => setPayingId(null),
    });
  };

  const rentalInvoices = (rentalId: string) =>
    invoices.filter(i => i.rentalId === rentalId).sort((a, b) => a.monthNumber - b.monthNumber);

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {newRentalId && (
        <div className="bg-[#E8F5E9] border-b border-[#A5D6A7]">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-bold text-[#2D6A4F]">Payment successful! Your rental is confirmed.</p>
              <p className="text-sm text-[#555]">Delivery within 3 business days. We'll WhatsApp you the details.</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 pt-6 pb-0">
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-4">My Rentals</h1>
          <div className="flex gap-0 border-b border-[#E0E0E0]">
            {([['rentals', `Rentals (${rentals.length})`], ['invoices', `Invoices (${invoices.length})`]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                className="px-5 py-3 text-sm font-semibold border-b-2 transition-colors"
                style={{
                  borderColor: tab === key ? '#2D6A4F' : 'transparent',
                  color: tab === key ? '#2D6A4F' : '#999',
                }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1,2,3,4].map(i => <div key={i} className="h-44 rounded-2xl bg-white animate-pulse border border-[#E0E0E0]" />)}
          </div>
        ) : tab === 'rentals' ? (
          rentals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-5">
              <span className="text-6xl">📦</span>
              <h2 className="text-xl font-bold text-[#1A1A1A]">No rentals yet</h2>
              <p className="text-[#555] text-center max-w-sm">Browse our collection to get started.</p>
              <button onClick={() => navigate('/browse')}
                className="px-8 py-3 rounded-full font-bold text-white" style={{ background: '#2D6A4F' }}>
                Browse items →
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {rentals.map((rental) => {
                const progress = Math.round((rental.currentMonth / rental.totalMonths) * 100);
                const colors = STATUS_COLORS[rental.status] || STATUS_COLORS.ACTIVE;
                const myInvoices = rentalInvoices(rental.id);
                const isExpanded = expandedRental === rental.id;
                return (
                  <div key={rental.id} className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden hover:shadow-md transition-shadow">
                    <div className="flex gap-4 p-5 border-b border-[#F0F0F0]">
                      {rental.listingImage ? (
                        <img src={rental.listingImage} alt={rental.listingTitle}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center text-3xl bg-[#F3F4F6]">🛋️</div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-bold text-[#1A1A1A] leading-snug">{rental.listingTitle}</p>
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                            style={{ background: colors.bg, color: colors.text }}>{rental.status}</span>
                        </div>
                        <p className="text-xs text-[#999] mb-2">Order #{rental.id.slice(0,8).toUpperCase()}</p>
                        <p className="text-xl font-bold" style={{ color: '#2D6A4F' }}>
                          ₹{rental.monthlyRent.toLocaleString()}<span className="text-sm font-normal text-[#555]">/mo</span>
                        </p>
                      </div>
                    </div>

                    {rental.status !== 'COMPLETED' && (
                      <div className="px-5 py-4 border-b border-[#F0F0F0]">
                        <div className="flex justify-between text-xs text-[#999] mb-2">
                          <span className="font-semibold">{progress}% complete</span>
                          <span>Month {rental.currentMonth} of {rental.totalMonths}</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#E0E0E0] overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, background: '#2D6A4F' }} />
                        </div>
                      </div>
                    )}

                    {/* Invoices for this rental */}
                    {myInvoices.length > 0 && (
                      <div className="border-b border-[#F0F0F0]">
                        <button onClick={() => setExpandedRental(isExpanded ? null : rental.id)}
                          className="w-full px-5 py-3 flex items-center justify-between text-sm font-semibold text-[#555] hover:bg-[#F9F9F9] transition-colors">
                          <span>🧾 {myInvoices.length} Invoice{myInvoices.length > 1 ? 's' : ''}</span>
                          <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                        </button>
                        {isExpanded && (
                          <div className="px-5 pb-4 space-y-2">
                            {myInvoices.map(inv => {
                              const ic = INV_COLORS[inv.status] || INV_COLORS.paid;
                              return (
                                <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-[#F9F9F9] border border-[#E0E0E0]">
                                  <div>
                                    <p className="text-xs font-bold text-[#1A1A1A]">{inv.invoiceNumber}</p>
                                    <p className="text-xs text-[#999]">Month {inv.monthNumber} of {inv.totalMonths}</p>
                                    {inv.paidAt && (
                                      <p className="text-xs text-[#999]">
                                        Paid {new Date(inv.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                      </p>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-right">
                                      <p className="font-bold text-sm text-[#1A1A1A]">₹{inv.amount.toLocaleString()}</p>
                                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                                        style={{ background: ic.bg, color: ic.text }}>{inv.status}</span>
                                    </div>
                                    <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer"
                                      className="text-xs font-bold px-2.5 py-1.5 rounded-lg border-2 flex-shrink-0"
                                      style={{ borderColor: '#E0E0E0', color: '#555' }}>
                                      ↓ PDF
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="px-5 py-4 flex gap-3">
                      {rental.status === 'ACTIVE' && (<>
                        <button onClick={() => handlePayNow(rental)} disabled={payingId === rental.id}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
                          style={{ background: '#2D6A4F', color: '#fff' }}>
                          {payingId === rental.id ? 'Opening…' : 'Pay Now'}
                        </button>
                        <button onClick={() => handleReturnRequest(rental)}
                          className="py-2.5 px-4 rounded-xl font-semibold text-sm border-2"
                          style={{ borderColor: '#E65100', color: '#E65100' }}>
                          Return
                        </button>
                      </>)}
                      {rental.status === 'OVERDUE' && (
                        <button onClick={() => handlePayNow(rental)} disabled={payingId === rental.id}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm disabled:opacity-60"
                          style={{ background: '#D62828', color: '#fff' }}>
                          {payingId === rental.id ? 'Opening…' : '⚠ Pay Now (Overdue)'}
                        </button>
                      )}
                      {rental.status === 'UPCOMING' && (
                        <button onClick={() => contactVoorent(`Upcoming rental: ${rental.id}`)}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2"
                          style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                          Contact Voorent
                        </button>
                      )}
                      {rental.status === 'RETURN_REQUESTED' && (
                        <div className="flex-1 py-2.5 rounded-xl text-sm text-center font-semibold"
                          style={{ background: '#FFF3E0', color: '#E65100' }}>
                          📦 Return requested — we'll contact you
                        </div>
                      )}
                      {rental.status === 'COMPLETED' && (
                        <button onClick={() => navigate(`/item/${rental.listingId}/review`)}
                          className="flex-1 py-2.5 rounded-xl font-semibold text-sm border-2"
                          style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                          Write a Review
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Invoices Tab ── */
          invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
              <span className="text-6xl">🧾</span>
              <h2 className="text-xl font-bold text-[#1A1A1A]">No invoices yet</h2>
              <p className="text-[#555] text-center">Invoices are auto-generated after each payment.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#E0E0E0] bg-[#F9F9F9]">
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Invoice #</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Item</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Month</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Amount</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555]">Status</th>
                    <th className="text-left px-5 py-3 font-semibold text-[#555] hidden md:table-cell">Date</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => {
                    const ic = INV_COLORS[inv.status] || INV_COLORS.paid;
                    return (
                      <tr key={inv.id} className={`border-b border-[#F0F0F0] hover:bg-[#F9F9F9] transition-colors ${idx % 2 === 0 ? '' : 'bg-[#FAFAFA]'}`}>
                        <td className="px-5 py-4 font-bold text-[#1A1A1A]">{inv.invoiceNumber}</td>
                        <td className="px-5 py-4 text-[#555] hidden md:table-cell max-w-xs truncate">{inv.listingTitle}</td>
                        <td className="px-5 py-4 text-[#555]">{inv.monthNumber}/{inv.totalMonths}</td>
                        <td className="px-5 py-4 font-bold text-[#1A1A1A]">₹{inv.amount.toLocaleString()}</td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                            style={{ background: ic.bg, color: ic.text }}>{inv.status}</span>
                        </td>
                        <td className="px-5 py-4 text-[#999] hidden md:table-cell">
                          {new Date(inv.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-5 py-4">
                          <a href={`/invoice/${inv.id}`} target="_blank" rel="noreferrer"
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border-2 whitespace-nowrap"
                            style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}>
                            ↓ Download
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </main>

      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
