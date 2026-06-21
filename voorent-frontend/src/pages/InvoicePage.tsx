import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface InvoiceDetail {
  id: string; invoiceNumber: string; rentalId: string; listingId: string;
  listingTitle: string; customerName: string; customerPhone: string;
  amount: number; originalAmount: number | null; discountAmount: number;
  couponCode: string | null; notes: string | null;
  monthNumber: number; totalMonths: number; status: string;
  dueDate: string | null; paidAt: string | null; createdAt: string;
}

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    axios.get<InvoiceDetail>(`${BASE}/invoices/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then(r => setInvoice(r.data)).catch(() => setError('Invoice not found or access denied.'));
  }, [id]);

  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>;
  if (!invoice) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;

  const fmt = (d: string | null) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '—';

  return (
    <>
      {/* Print button — hidden when printing */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button onClick={() => window.print()}
          className="px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow-lg"
          style={{ background: '#2D6A4F' }}>
          🖨️ Print / Save as PDF
        </button>
        <button onClick={() => window.close()}
          className="px-5 py-2.5 rounded-xl font-bold text-sm border-2 bg-white shadow-lg"
          style={{ borderColor: '#E0E0E0', color: '#555' }}>
          Close
        </button>
      </div>

      <div className="min-h-screen bg-gray-100 print:bg-white flex items-start justify-center py-10 print:py-0">
        {/* A4 sheet */}
        <div className="bg-white w-full max-w-2xl shadow-xl print:shadow-none p-10 print:p-8"
          style={{ minHeight: '29.7cm' }}>

          {/* Header */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-3xl font-black" style={{ color: '#2D6A4F' }}>Voorent</h1>
              <p className="text-xs text-gray-500 mt-1">voorent.com · support@voorent.com</p>
              <p className="text-xs text-gray-500">India</p>
            </div>
            <div className="text-right">
              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold mb-2"
                style={{ background: invoice.status === 'paid' ? '#E8F5E9' : '#FFEBEE',
                         color: invoice.status === 'paid' ? '#2D6A4F' : '#D62828' }}>
                {invoice.status.toUpperCase()}
              </div>
              <p className="text-2xl font-black text-gray-800">{invoice.invoiceNumber}</p>
              <p className="text-xs text-gray-400 mt-1">Issued {fmt(invoice.createdAt)}</p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-gray-200 mb-8" />

          {/* Bill To + Details */}
          <div className="grid grid-cols-2 gap-8 mb-10">
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Bill To</p>
              <p className="font-bold text-gray-800">{invoice.customerName || 'Customer'}</p>
              <p className="text-sm text-gray-500">{invoice.customerPhone}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Details</p>
              <div className="space-y-1 text-sm text-gray-600">
                {invoice.paidAt && <p><span className="text-gray-400">Paid on:</span> {fmt(invoice.paidAt)}</p>}
                {invoice.dueDate && <p><span className="text-gray-400">Due date:</span> {fmt(invoice.dueDate)}</p>}
                <p><span className="text-gray-400">Payment:</span> Month {invoice.monthNumber} of {invoice.totalMonths}</p>
              </div>
            </div>
          </div>

          {/* Line items table */}
          <div className="rounded-xl overflow-hidden border border-gray-100 mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: '#F0FAF5' }}>
                  <th className="text-left px-5 py-3 font-semibold text-gray-600">Description</th>
                  <th className="text-right px-5 py-3 font-semibold text-gray-600">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-gray-800">{invoice.listingTitle}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Rent-to-Own — Month {invoice.monthNumber} of {invoice.totalMonths}</p>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-800">
                    ₹{(invoice.originalAmount ?? invoice.amount).toLocaleString()}
                  </td>
                </tr>
                {invoice.couponCode && invoice.discountAmount > 0 && (
                  <tr className="border-t border-gray-100 bg-green-50">
                    <td className="px-5 py-3 text-green-700 text-sm">
                      🏷️ Discount — Coupon {invoice.couponCode}
                    </td>
                    <td className="px-5 py-3 text-right text-green-700 font-semibold">
                      −₹{invoice.discountAmount.toLocaleString()}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end mb-8">
            <div className="w-64">
              {invoice.originalAmount && invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span>Subtotal</span>
                  <span>₹{invoice.originalAmount.toLocaleString()}</span>
                </div>
              )}
              {invoice.discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600 mb-2">
                  <span>Discount</span>
                  <span>−₹{invoice.discountAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between font-black text-xl" style={{ color: '#2D6A4F' }}>
                <span>Total</span>
                <span>₹{invoice.amount.toLocaleString()}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1 text-right">GST included (if applicable)</p>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="rounded-xl bg-gray-50 p-4 mb-8">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="h-px bg-gray-200 mb-6" />
          <div className="flex justify-between items-center text-xs text-gray-400">
            <p>Thank you for choosing Voorent 🙏</p>
            <p>Questions? support@voorent.com</p>
          </div>
        </div>
      </div>
    </>
  );
}
