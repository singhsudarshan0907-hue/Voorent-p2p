import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Company details
const COMPANY = {
  name: 'Voorent Private Limited',
  address: '258, Basement, Sector 27, Gurugram',
  state: 'Haryana 122022',
  gstin: '06AAFCV6132Q2ZT',
};

const GST_RATE = 0.18; // 18% GST = 9% SGST + 9% CGST

interface InvoiceDetail {
  id: string; invoiceNumber: string; rentalId: string; listingId: string;
  listingTitle: string; customerName: string; customerPhone: string;
  customerAddress?: string; customerPincode?: string;
  amount: number; originalAmount: number | null; discountAmount: number;
  couponCode: string | null; notes: string | null;
  monthNumber: number; totalMonths: number; status: string;
  dueDate: string | null; paidAt: string | null; createdAt: string;
}

const ADMIN_KEY = 'voorent-admin-dev-2024';

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isAdmin = searchParams.get('admin') === '1';
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const hdrs: Record<string, string> = isAdmin
      ? { 'X-Admin-Key': ADMIN_KEY }
      : { Authorization: `Bearer ${token}` };
    axios.get<InvoiceDetail>(`${BASE}/invoices/${id}`, { headers: hdrs })
      .then(r => setInvoice(r.data))
      .catch(() => setError('Invoice not found or access denied.'));
  }, [id, isAdmin]);

  if (error) return <div className="flex items-center justify-center min-h-screen text-red-600">{error}</div>;
  if (!invoice) return <div className="flex items-center justify-center min-h-screen text-gray-400">Loading…</div>;

  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  // GST calculations
  const inclGST = invoice.amount;
  const exclGST = Math.round((inclGST / (1 + GST_RATE)) * 100) / 100;
  const sgst = Math.round(((inclGST - exclGST) / 2) * 100) / 100;
  const cgst = sgst;
  const discount = invoice.discountAmount || 0;

  return (
    <>
      {/* Print button */}
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
        <div className="bg-white w-full max-w-3xl shadow-xl print:shadow-none p-10 print:p-8"
          style={{ minHeight: '29.7cm', fontFamily: 'Arial, sans-serif' }}>

          {/* ── Header: Company + Customer ── */}
          <div className="grid grid-cols-2 gap-8 mb-6">
            {/* Left: Company */}
            <div>
              <p className="font-black text-lg text-gray-800">{COMPANY.name}</p>
              <p className="text-sm text-gray-600">{COMPANY.address},</p>
              <p className="text-sm text-gray-600">{COMPANY.state}</p>
              <p className="text-sm text-gray-600">GSTIN: {COMPANY.gstin}</p>
            </div>
            {/* Right: Customer */}
            <div>
              <p className="font-bold text-gray-800">{invoice.customerName || 'Customer'}</p>
              {invoice.customerAddress && <p className="text-sm text-gray-600">{invoice.customerAddress}</p>}
              {invoice.customerPincode && <p className="text-sm text-gray-600">{invoice.customerPincode}</p>}
              <p className="text-sm text-gray-600">Contact : {invoice.customerPhone}</p>
            </div>
          </div>

          {/* ── Generated On + Invoice Number ── */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="border border-gray-300 px-4 py-2">
              <p className="text-sm font-semibold text-gray-700">
                Generated On : {fmt(invoice.createdAt)}
              </p>
            </div>
            <div className="border border-gray-300 px-4 py-2 flex items-center gap-3">
              <p className="text-sm font-semibold text-gray-700">
                Invoice Number : {invoice.invoiceNumber}
              </p>
              <span className="text-xs font-bold px-2 py-0.5 rounded"
                style={{
                  background: invoice.status === 'paid' ? '#E8F5E9' : '#FFEBEE',
                  color: invoice.status === 'paid' ? '#2D6A4F' : '#D62828'
                }}>
                {invoice.status === 'paid' ? 'Paid' : 'Unpaid'}
              </span>
            </div>
          </div>

          {/* ── Order Details Header ── */}
          <div className="text-center text-white font-bold py-2 mb-0 text-sm"
            style={{ background: 'linear-gradient(to right, #1B2A6B, #C0392B)' }}>
            Your Order Details
          </div>

          {/* ── Items Table ── */}
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="border border-gray-300">
                <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700">Items</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Duration</th>
                <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-gray-700">Quantity</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Rent<br/>(Excl.GST)</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">SGST</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">CGST</th>
                <th className="border border-gray-300 px-3 py-2 text-right font-semibold text-gray-700">Rent<br/>(Incl.GST)</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border border-gray-300">
                <td className="border border-gray-300 px-3 py-3 text-gray-800">{invoice.listingTitle}</td>
                <td className="border border-gray-300 px-3 py-3 text-center text-gray-600">
                  {invoice.totalMonths} Months
                </td>
                <td className="border border-gray-300 px-3 py-3 text-center text-gray-600">1</td>
                <td className="border border-gray-300 px-3 py-3 text-right text-gray-800">Rs. {exclGST.toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-3 text-right text-gray-800">Rs. {sgst.toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-3 text-right text-gray-800">Rs. {cgst.toFixed(2)}</td>
                <td className="border border-gray-300 px-3 py-3 text-right font-semibold text-gray-800">Rs. {inclGST.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>

          {/* ── Totals (right-aligned) ── */}
          <div className="flex justify-end mb-8">
            <table className="text-sm border-collapse" style={{ minWidth: '260px' }}>
              <tbody>
                <tr className="border border-gray-300">
                  <td className="px-4 py-2 font-semibold text-gray-700 border border-gray-300">Total Amount</td>
                  <td className="px-4 py-2 text-right text-gray-800 border border-gray-300">Rs. {inclGST.toFixed(2)}</td>
                </tr>
                <tr className="border border-gray-300">
                  <td className="px-4 py-2 font-semibold text-gray-700 border border-gray-300">Discount ( {discount > 0 ? invoice.couponCode : '0'} )</td>
                  <td className="px-4 py-2 text-right text-gray-800 border border-gray-300">Rs. -{discount.toFixed(2)}</td>
                </tr>
                <tr className="border border-gray-300 bg-gray-50">
                  <td className="px-4 py-2 font-bold text-gray-800 border border-gray-300">Final Amount</td>
                  <td className="px-4 py-2 text-right font-bold text-gray-800 border border-gray-300">
                    Rs. {(inclGST - discount).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Notes ── */}
          {invoice.notes && (
            <div className="rounded bg-gray-50 p-4 mb-6">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Notes</p>
              <p className="text-sm text-gray-600">{invoice.notes}</p>
            </div>
          )}

          {/* ── Footer ── */}
          <div className="border-t border-gray-200 pt-4 flex justify-between items-center text-xs text-gray-400">
            <p>Thank you for choosing Voorent 🙏</p>
            <p>Questions? support@voorent.com · +91 93183 97171</p>
          </div>
        </div>
      </div>
    </>
  );
}
