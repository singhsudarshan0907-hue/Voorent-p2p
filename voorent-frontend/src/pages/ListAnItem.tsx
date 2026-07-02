import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import axios from 'axios';
import { isDelhibNCRPincode } from '../utils/pincodes';

type Category  = 'Furniture' | 'Appliances' | 'Electronics';
type Condition = 'Like New' | 'Good' | 'Acceptable';
type Pricing   = 'consignment' | 'buyout';

interface FormData {
  category: Category;
  title: string;
  description: string;
  condition: Condition | '';
  itemPrice: string;
  pricingType: Pricing;
  pincode: string;
}

interface DocFiles {
  purchaseBill?: File;
  panCard?: File;
  aadhaarFront?: File;
  aadhaarBack?: File;
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const STEPS = ['Item Details', 'Add Photos', 'Set Price', 'Verify Ownership'];

export default function ListAnItem() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    category: 'Furniture',
    title: '',
    description: '',
    condition: '',
    itemPrice: '',
    pricingType: 'consignment',
    pincode: '',
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [docs, setDocs] = useState<DocFiles>({});
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApplied, setAiApplied] = useState(false);

  const price = parseFloat(form.itemPrice) || 0;
  const monthly = price > 0 ? Math.round(price / 12) : 0;
  const ownerCut60 = Math.round(price * 1.0);

  const validate = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.title.trim() || form.title.length < 3) e.title = 'Item name must be at least 3 characters.';
      if (!form.description.trim() || form.description.length < 20) e.description = 'Description must be at least 20 characters.';
      if (!form.condition) e.condition = 'Please select a condition.';
      if (!form.pincode || !/^\d{6}$/.test(form.pincode)) e.pincode = 'Enter a valid 6-digit pincode.';
      else if (!isDelhibNCRPincode(form.pincode)) e.pincode = 'Sorry, we are not serviceable in your area. We currently serve Delhi NCR only.';
    }
    if (step === 1) {
      if (photos.filter(Boolean).length === 0) e.photos = 'Please upload at least 1 photo.';
    }
    if (step === 3) {
      if (!docs.purchaseBill) e.purchaseBill = 'Purchase bill is required.';
      if (!docs.panCard) e.panCard = 'PAN card is required.';
      if (!docs.aadhaarFront) e.aadhaarFront = 'Aadhaar front photo is required.';
      if (!docs.aadhaarBack) e.aadhaarBack = 'Aadhaar back photo is required.';
    }
    if (step === 2) {
      if (!price || price < 500) e.itemPrice = 'Item value must be at least ₹500.';
      if (price > 200000) e.itemPrice = 'Item value cannot exceed ₹2,00,000.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, 3)); };
  const back = () => setStep((s) => Math.max(s - 1, 0));

  const analyzeWithAI = async () => {
    const photo = photos.find(Boolean);
    if (!photo) return;
    setAiLoading(true);
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(photo);
      });
      const mimeType = photo.type || 'image/jpeg';
      const res = await axios.post(`${BASE}/analyze/image`, { imageBase64: base64, mimeType }, { withCredentials: true });
      const ai = res.data;
      setForm(f => ({
        ...f,
        ...(ai.category === 'Furniture' || ai.category === 'Appliances' || ai.category === 'Electronics' ? { category: ai.category as Category } : {}),
        ...(ai.title    ? { title: ai.title }             : {}),
        ...(ai.description ? { description: ai.description } : {}),
        ...(ai.condition === 'Like New' || ai.condition === 'Good' || ai.condition === 'Acceptable' ? { condition: ai.condition as Condition } : {}),
      }));
      setAiApplied(true);
      setTimeout(() => setAiApplied(false), 4000);
    } catch {
      alert('AI analysis failed. Please fill in the details manually.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('title',       form.title);
      fd.append('description', form.description);
      fd.append('category',    form.category);
      fd.append('condition',   form.condition);
      fd.append('itemPrice',   String(price));
      fd.append('pricingType', form.pricingType);
      fd.append('pincode',     form.pincode);
      photos.filter(Boolean).forEach((photo) => fd.append('images', photo));

      // Append verification documents
      if (docs.purchaseBill)  fd.append('purchaseBill',  docs.purchaseBill);
      if (docs.panCard)       fd.append('panCard',       docs.panCard);
      if (docs.aadhaarFront)  fd.append('aadhaarFront',  docs.aadhaarFront);
      if (docs.aadhaarBack)   fd.append('aadhaarBack',   docs.aadhaarBack);

      // Cookie carries JWT — withCredentials sends it automatically
      await axios.post(`${BASE}/listings`, fd, { withCredentials: true });
      // Show success step instead of jumping straight to dashboard
      setStep(4);
    } catch {
      alert('Failed to publish — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const docConfigs: { key: keyof DocFiles; label: string; sub: string; icon: string }[] = [
    { key: 'purchaseBill',  label: 'Purchase bill',     sub: 'Proof of ownership (required)',    icon: '🧾' },
    { key: 'panCard',       label: 'PAN card',          sub: 'Identity verification (required)',  icon: '🪪' },
    { key: 'aadhaarFront',  label: 'Aadhaar — Front',   sub: 'Front side of Aadhaar (required)', icon: '📋' },
    { key: 'aadhaarBack',   label: 'Aadhaar — Back',    sub: 'Back side of Aadhaar (required)',  icon: '📋' },
  ];

  // ── Success screen (step 4) ────────────────────────────────────
  if (step === 4) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
        <TopNav />
        <div className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="bg-white rounded-3xl border border-[#E0E0E0] p-12 max-w-lg w-full text-center shadow-sm">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Listing submitted!</h1>
            <p className="text-[#555] text-sm mb-6 leading-relaxed">
              Your item is now <strong>under review</strong> by the Voorent team. We'll verify the details and approve it within <strong>24 hours</strong>. You'll get a WhatsApp notification once it goes live.
            </p>

            {/* What happens next */}
            <div className="bg-[#F0FAF5] rounded-2xl p-5 text-left mb-8">
              <p className="text-xs font-bold text-[#2D6A4F] uppercase tracking-widest mb-3">What happens next</p>
              {[
                { icon: '🔍', text: 'Voorent reviews your listing & documents (within 24 hrs)' },
                { icon: '✅', text: 'Once approved, it goes live on the marketplace' },
                { icon: '📲', text: 'You get a WhatsApp notification when approved' },
                { icon: '💰', text: 'Renters start paying — you earn every month' },
              ].map((s) => (
                <div key={s.text} className="flex items-start gap-3 mb-3 last:mb-0">
                  <span className="text-lg flex-shrink-0">{s.icon}</span>
                  <p className="text-sm text-[#555] leading-snug">{s.text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate('/dashboard/owner')}
                className="px-8 py-3 rounded-full font-bold text-white text-sm"
                style={{ background: '#2D6A4F' }}
              >
                View in Dashboard →
              </button>
              <button
                onClick={() => { setStep(0); setForm({ title:'', description:'', category:'Furniture', condition:'Like New', itemPrice:'', pricingType:'consignment', pincode:'' }); setPhotos([]); setDocs({}); }}
                className="px-8 py-3 rounded-full font-bold text-sm border-2"
                style={{ borderColor: '#2D6A4F', color: '#2D6A4F' }}
              >
                List another item
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Page header */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-2xl font-bold text-[#1A1A1A]">List an Item</h1>
          <p className="text-sm text-[#555] mt-1">Earn by renting your furniture or appliances</p>
        </div>
      </div>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT — Stepper sidebar */}
          <div className="hidden lg:block">
            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-5">
              <p className="text-xs font-bold text-[#999] uppercase tracking-widest mb-4">Progress</p>
              {STEPS.map((s, i) => (
                <div key={s} className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{
                      background: i < step ? '#2D6A4F' : i === step ? '#F0FAF5' : '#F3F4F6',
                      color: i < step ? '#fff' : i === step ? '#2D6A4F' : '#999',
                      border: i === step ? '2px solid #2D6A4F' : 'none',
                    }}>
                    {i < step ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm font-semibold ${i === step ? 'text-[#1A1A1A]' : i < step ? 'text-[#2D6A4F]' : 'text-[#999]'}`}>{s}</span>
                </div>
              ))}
            </div>

            {/* Benefits */}
            <div className="mt-4 bg-white rounded-2xl border border-[#E0E0E0] p-5">
              <p className="text-xs font-bold text-[#999] uppercase tracking-widest mb-3">Why list on Voorent?</p>
              {[
                { icon: '💰', text: 'Earn passive income monthly' },
                { icon: '🛡', text: 'Covered by Voorent Care' },
                { icon: '🚚', text: 'We handle delivery & returns' },
                { icon: '📋', text: 'Zero listing fee' },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-2 mb-2.5 text-sm text-[#555]">
                  <span>{b.icon}</span><span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Form */}
          <div className="lg:col-span-2">
            {/* Step progress bar (mobile) */}
            <div className="flex gap-1.5 mb-4 lg:hidden">
              {STEPS.map((_, i) => (
                <div key={i} className="flex-1 h-1.5 rounded-full transition-all"
                  style={{ background: i <= step ? '#2D6A4F' : '#E0E0E0' }} />
              ))}
            </div>

            <div className="bg-white rounded-2xl border border-[#E0E0E0] p-6 lg:p-8" style={{ minHeight: 560 }}>
              <h2 className="text-xl font-bold text-[#1A1A1A] mb-6">{STEPS[step]}</h2>

              {/* ── Step 0: Item Details ── */}
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <p className="text-xs font-bold text-[#999] tracking-widest mb-2">CATEGORY</p>
                    <div className="flex gap-3 flex-wrap">
                      {(['Furniture', 'Appliances', 'Electronics'] as Category[]).map((c) => (
                        <button key={c} onClick={() => setForm((f) => ({ ...f, category: c }))}
                          className="px-5 py-2.5 rounded-full text-sm font-semibold border-2 transition-all"
                          style={{ borderColor: form.category === c ? '#2D6A4F' : '#E0E0E0', background: form.category === c ? '#F0FAF5' : '#fff', color: form.category === c ? '#2D6A4F' : '#555' }}>
                          {c === 'Furniture' ? '🛋️' : c === 'Appliances' ? '🔌' : '📱'} {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#999] tracking-widest mb-2">ITEM NAME</label>
                    <input value={form.title}
                      onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); if (e.target.value.trim().length >= 3) setErrors((err) => ({ ...err, title: '' })); }}
                      placeholder="e.g. Ergonomic Office Chair"
                      className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D6A4F] transition-colors"
                      style={{ borderColor: errors.title ? '#D62828' : '#E0E0E0' }} />
                    {errors.title && <p className="text-xs text-[#D62828] mt-1">{errors.title}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#999] tracking-widest mb-2">DESCRIPTION</label>
                    <textarea value={form.description}
                      onChange={(e) => { setForm((f) => ({ ...f, description: e.target.value })); if (e.target.value.trim().length >= 20) setErrors((err) => ({ ...err, description: '' })); }}
                      placeholder="Mention dimensions, color, brand, and any unique features..."
                      rows={4}
                      className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-[#2D6A4F] transition-colors"
                      style={{ borderColor: errors.description ? '#D62828' : '#E0E0E0' }} />
                    {errors.description && <p className="text-xs text-[#D62828] mt-1">{errors.description}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#999] tracking-widest mb-2">CONDITION</label>
                    <select value={form.condition}
                      onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value as Condition }))}
                      className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D6A4F] bg-white transition-colors"
                      style={{ borderColor: errors.condition ? '#D62828' : '#E0E0E0' }}>
                      <option value="">Select Condition</option>
                      <option>Like New</option>
                      <option>Good</option>
                      <option>Acceptable</option>
                    </select>
                    {errors.condition && <p className="text-xs text-[#D62828] mt-1">{errors.condition}</p>}
                  </div>

                  {/* Pincode */}
                  <div>
                    <label className="block text-sm font-semibold text-[#1A1A1A] mb-2">📍 Your Pincode</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="e.g. 110001"
                      value={form.pincode}
                      onChange={(e) => setForm((f) => ({ ...f, pincode: e.target.value.replace(/\D/g, '') }))}
                      className="w-full border-2 rounded-xl px-4 py-3 text-sm outline-none focus:border-[#2D6A4F] transition-colors"
                      style={{ borderColor: errors.pincode ? '#D62828' : '#E0E0E0' }}
                    />
                    <p className="text-xs text-[#999] mt-1">Used to show your listing to nearby customers</p>
                    {errors.pincode && <p className="text-xs text-[#D62828] mt-1">{errors.pincode}</p>}
                  </div>

                  {form.condition && form.condition !== 'Acceptable' && (
                    <div className="p-4 rounded-xl flex items-start gap-3" style={{ background: '#F0FAF5', border: '1px solid #B0D0C0' }}>
                      <span className="text-xl">⭐</span>
                      <p className="text-sm text-[#2D6A4F]">
                        Items in <strong>Good</strong> or <strong>Like New</strong> condition are prioritised for our Rent-to-Own program.
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 rounded-xl bg-[#F9F9F9] border border-[#E0E0E0]">
                    <span className="text-sm text-[#555]">Listing Fee</span>
                    <span className="font-bold text-[#2D6A4F]">₹0.00 — Free</span>
                  </div>
                </div>
              )}

              {/* ── Step 1: Add Photos ── */}
              {step === 1 && (
                <div>
                  <p className="text-sm text-[#555] mb-5">Show what you're listing. Good photos attract renters faster.</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <label key={i} className="rounded-xl border-2 border-dashed overflow-hidden cursor-pointer hover:border-[#2D6A4F] transition-colors"
                        style={{ aspectRatio: '1', borderColor: photos[i] ? '#2D6A4F' : '#E0E0E0', background: photos[i] ? '#F0FAF5' : '#FAFAFA' }}>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const next = [...photos]; next[i] = e.target.files[0]; setPhotos(next);
                            }
                          }} />
                        {photos[i]
                          ? <img src={URL.createObjectURL(photos[i])} className="w-full h-full object-cover" alt="" />
                          : <div className="w-full h-full flex flex-col items-center justify-center">
                              <span className="text-3xl text-[#999]">+</span>
                              <span className="text-xs text-[#999] mt-1">Add photo</span>
                            </div>
                        }
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-[#999] mt-4 text-center">Min 1 photo · Max 8 · JPG/PNG up to 10MB each</p>
                  {errors.photos && <p className="text-xs text-[#D62828] mt-2 text-center font-semibold">{errors.photos}</p>}

                  {/* AI Analyze button — shows once at least 1 photo is added */}
                  {photos.some(Boolean) && (
                    <div className="mt-5 p-4 rounded-2xl border-2 border-dashed" style={{ borderColor: '#2D6A4F', background: '#F0FAF5' }}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-sm font-bold text-[#2D6A4F]">✨ Auto-fill with AI</p>
                          <p className="text-xs text-[#555] mt-0.5">Gemini will analyze your photo and suggest title, description & condition</p>
                        </div>
                        <button onClick={analyzeWithAI} disabled={aiLoading}
                          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2"
                          style={{ background: '#2D6A4F' }}>
                          {aiLoading ? <><span className="animate-spin">⏳</span> Analyzing…</> : '✨ Analyze Photo'}
                        </button>
                      </div>
                      {aiApplied && (
                        <p className="text-xs text-[#2D6A4F] font-semibold mt-3">✅ Details filled! Go back to Step 1 to review and edit.</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Step 2: Set Price ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-bold text-[#999] tracking-widest mb-2">ITEM VALUE (₹)</label>
                    <div className="flex items-center border-2 rounded-xl overflow-hidden transition-colors focus-within:border-[#2D6A4F]"
                      style={{ borderColor: errors.itemPrice ? '#D62828' : '#E0E0E0' }}>
                      <span className="px-4 text-lg font-bold text-[#555] border-r border-[#E0E0E0] py-3 bg-[#F9F9F9]">₹</span>
                      <input type="number" inputMode="numeric"
                        value={form.itemPrice}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => ({ ...f, itemPrice: v }));
                          const n = parseFloat(v);
                          if (n >= 500 && n <= 200000) setErrors((err) => ({ ...err, itemPrice: '' }));
                        }}
                        placeholder="e.g. 12000"
                        className="flex-1 px-4 py-3 text-base font-semibold outline-none" />
                    </div>
                    {errors.itemPrice && <p className="text-xs text-[#D62828] mt-1">{errors.itemPrice}</p>}

                    {monthly > 0 && (
                      <div className="mt-3 p-4 rounded-xl bg-[#F0FAF5] border border-[#2D6A4F]/20">
                        <p className="text-sm font-semibold" style={{ color: '#2D6A4F' }}>
                          Choose how you want to earn from the options below ↓
                        </p>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-sm text-[#1A1A1A] mb-3">How do you want to earn?</p>
                    <div className="space-y-3">

                      <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${form.pricingType === 'consignment' ? 'border-[#2D6A4F] bg-[#F0FAF5]' : 'border-[#E0E0E0] bg-white hover:border-[#B0D0C0]'}`}>
                        <input type="radio" name="pricing" value="consignment" checked={form.pricingType === 'consignment'}
                          onChange={() => setForm((f) => ({ ...f, pricingType: 'consignment' }))}
                          className="accent-[#2D6A4F] mt-1 w-4 h-4 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-[#1A1A1A]">Rent it out</p>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#2D6A4F', color: '#fff' }}>POPULAR</span>
                          </div>
                          <p className="text-sm text-[#555]">
                            Keep ownership of your item and earn passive income every month.{monthly > 0 && (
                              <span className="font-semibold text-[#2D6A4F]"> ₹{Math.round(monthly * 0.5).toLocaleString()}/month — ₹{Math.round(monthly * 0.5 * 12).toLocaleString()} in 12 months.</span>
                            )}
                          </p>
                        </div>
                      </label>

                      <label className={`flex gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${form.pricingType === 'buyout' ? 'border-[#2D6A4F] bg-[#F0FAF5]' : 'border-[#E0E0E0] bg-white hover:border-[#B0D0C0]'}`}>
                        <input type="radio" name="pricing" value="buyout" checked={form.pricingType === 'buyout'}
                          onChange={() => setForm((f) => ({ ...f, pricingType: 'buyout' }))}
                          className="accent-[#2D6A4F] mt-1 w-4 h-4 flex-shrink-0" />
                        <div>
                          <p className="font-bold text-[#1A1A1A] mb-1">Sell to Voorent</p>
                          <p className="text-sm text-[#555]">
                            Get full value upfront{price > 0 ? ` (₹${ownerCut60.toLocaleString()})` : ''}. We handle storage and delivery immediately.
                          </p>
                        </div>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-[#F9F9F9]">
                    <span>🛡</span>
                    <span className="text-sm text-[#555]">Your listing is protected by Voorent Care.</span>
                  </div>
                </div>
              )}

              {/* ── Step 3: Verify Ownership ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-[#555]">All documents are <strong>mandatory</strong>. Upload front and back of Aadhaar, PAN card, and purchase bill to verify your identity and item ownership.</p>
                  {docConfigs.map((doc) => {
                    const file = docs[doc.key];
                    const hasFile = !!file;
                    const hasErr = !!errors[doc.key];
                    return (
                      <label
                        key={doc.key}
                        className="flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-colors bg-white"
                        style={{ borderColor: hasFile ? '#2D6A4F' : hasErr ? '#D62828' : '#E0E0E0' }}
                      >
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          className="hidden"
                          onChange={(e) => {
                            const picked = e.target.files?.[0];
                            if (picked) setDocs((d) => ({ ...d, [doc.key]: picked }));
                          }}
                        />
                        <span className="text-3xl">{doc.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[#1A1A1A]">{doc.label}</p>
                          {hasFile ? (
                            <p className="text-xs font-medium truncate" style={{ color: '#2D6A4F' }}>
                              ✓ {file.name}
                            </p>
                          ) : (
                            <p className="text-sm" style={{ color: hasErr ? '#D62828' : '#999' }}>{doc.sub}</p>
                          )}
                        </div>
                        <span
                          className="text-sm font-bold px-4 py-2 rounded-full border-2 flex-shrink-0 transition-colors"
                          style={hasFile
                            ? { borderColor: '#2D6A4F', background: '#2D6A4F', color: '#fff' }
                            : { borderColor: '#2D6A4F', color: '#2D6A4F' }
                          }
                        >
                          {hasFile ? 'Done ✓' : 'Upload'}
                        </span>
                      </label>
                    );
                  })}
                  <div className="p-4 rounded-xl flex items-start gap-3 bg-[#F9F9F9] border border-[#E0E0E0]">
                    <span>🔒</span>
                    <p className="text-sm text-[#555]">Your documents are never shared with renters. Used only for identity verification to keep the marketplace safe.</p>
                  </div>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button onClick={back}
                    className="px-6 py-3 rounded-full font-bold text-sm border-2"
                    style={{ borderColor: '#E0E0E0', color: '#555' }}>
                    ← Back
                  </button>
                )}
                <div className="flex-1" />
                {step < 3 ? (
                  <button onClick={next}
                    className="px-8 py-3 rounded-full font-bold text-white text-sm"
                    style={{ background: '#2D6A4F' }}>
                    Next →
                  </button>
                ) : (
                  <button onClick={handleSubmit} disabled={submitting}
                    className="px-8 py-3 rounded-full font-bold text-white text-sm disabled:opacity-60"
                    style={{ background: '#2D6A4F' }}>
                    {submitting ? 'Publishing…' : 'Publish listing →'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── How it works section ── */}
      <section className="bg-white border-t border-[#E0E0E0] py-14">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-8 text-center">How listing works</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { step: '01', icon: '📋', title: 'Fill the form',     desc: 'Add item details, photos, and your asking price.' },
              { step: '02', icon: '✅', title: 'Voorent verifies',  desc: 'We review your listing within 24 hours.' },
              { step: '03', icon: '🚚', title: 'We deliver',        desc: 'Voorent picks up and delivers the item to renters.' },
              { step: '04', icon: '💰', title: 'You earn',          desc: 'Receive 50% of the monthly rent directly to your account.' },
            ].map((s) => (
              <div key={s.step} className="flex flex-col items-center text-center gap-3 p-5 rounded-2xl bg-[#F9F9F9] border border-[#E0E0E0]">
                <span className="text-3xl">{s.icon}</span>
                <p className="text-xs font-bold text-[#999]">STEP {s.step}</p>
                <p className="font-bold text-[#1A1A1A]">{s.title}</p>
                <p className="text-sm text-[#555] leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#E0E0E0] py-8 bg-white">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-3 text-sm text-[#999]">
          <p className="text-lg font-bold" style={{ color: '#2D6A4F' }}>Voorent</p>
          <div className="flex gap-5">
            <button onClick={() => navigate('/terms')} className="hover:text-[#2D6A4F] transition-colors">Terms of Service</button>
            <button onClick={() => navigate('/privacy')} className="hover:text-[#2D6A4F] transition-colors">Privacy Policy</button>
          </div>
          <p>© 2026 Voorent. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
