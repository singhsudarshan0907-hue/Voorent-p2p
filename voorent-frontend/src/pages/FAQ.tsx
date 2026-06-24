import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSection {
  title: string;
  icon: string;
  items: FAQItem[];
}

const FAQS: FAQSection[] = [
  {
    title: 'General',
    icon: '💡',
    items: [
      {
        q: 'What is Voorent P2P?',
        a: 'Voorent P2P is a managed peer-to-peer marketplace where individuals can rent out their second-hand furniture and appliances to renters in Delhi NCR. Unlike traditional rentals, every item is verified by Voorent — we handle pickup, delivery, KYC, and payment so you don\'t have to.',
      },
      {
        q: 'Where does Voorent P2P operate?',
        a: 'We currently operate exclusively within Delhi NCR, covering Delhi, Noida, Greater Noida, Ghaziabad, Gurugram, and Faridabad. Items listed or ordered from outside these pincodes are not serviceable at this time.',
      },
      {
        q: 'What kind of items can be rented?',
        a: 'Furniture (sofas, beds, dining tables, wardrobes, etc.) and home appliances (washing machines, refrigerators, TVs, etc.). All items are second-hand and verified by Voorent before going live.',
      },
      {
        q: 'Is Voorent P2P the same as voorent.com?',
        a: 'Voorent P2P (p2p.voorent.com) is a separate platform focused on peer-to-peer rentals of second-hand items. The main voorent.com offers brand-new or refurbished items managed entirely by Voorent.',
      },
    ],
  },
  {
    title: 'For Renters',
    icon: '🏠',
    items: [
      {
        q: 'How do I rent an item?',
        a: 'Browse listings, select an item you like, choose a plan (monthly or upfront), and complete payment via Razorpay. Voorent will then schedule delivery at your convenience.',
      },
      {
        q: 'What payment plans are available?',
        a: 'You can choose between:\n• Monthly EMI — pay each month, auto-debited on the same date.\n• Upfront (12 months) — pay for the full year at a time.\nAfter completing all 24 monthly payments on the Rent-to-Own plan, ownership of the item transfers to you at no extra cost.',
      },
      {
        q: 'Do I need to pay a security deposit?',
        a: 'No security deposit is required on Voorent P2P. However, Voorent may require one month\'s advance rental at the time of booking. This advance is refundable if you cancel at least 2 days before the scheduled delivery.',
      },
      {
        q: 'Can I cancel my rental?',
        a: 'You can cancel before delivery for a full refund of any advance paid, provided you cancel at least 2 days before the estimated delivery date. Post-delivery cancellations are subject to the lock-in period and applicable charges.',
      },
      {
        q: 'What happens after 24 months?',
        a: 'If you have chosen the Rent-to-Own plan and completed all 24 monthly payments, ownership of the item is legally transferred to you at no extra cost — no hidden fees.',
      },
      {
        q: 'What if I receive a broken or non-working item?',
        a: 'If an item arrives broken or stops working within the first 7 days due to a pre-existing defect, contact us immediately at support@voorent.com. Voorent will arrange a free pickup and either replace the item or issue a refund. This does not apply to damage caused by the renter.',
      },
      {
        q: 'Can I complain about colour, scratches, or minor marks?',
        a: 'No. All items on Voorent P2P are second-hand. Minor scratches, scuffs, fading, or discolouration due to age and prior use are expected and not grounds for a complaint or refund. Only major functional defects are covered.',
      },
    ],
  },
  {
    title: 'For Sellers / Owners',
    icon: '📦',
    items: [
      {
        q: 'How do I list my item?',
        a: 'Sign up, complete your KYC verification, and submit your listing with photos, description, condition, and pincode. Voorent reviews and approves listings before they go live — typically within 24 hours.',
      },
      {
        q: 'What documents do I need for KYC?',
        a: 'You need to submit:\n• Aadhaar card (government-issued photo ID)\n• PAN card\n• Purchase bill or proof of ownership of the item\n\nKYC is mandatory for all sellers. No listing goes live without verification.',
      },
      {
        q: 'Can Voorent change my listed price?',
        a: 'Yes, Voorent reviews all pricing before publishing. If your quoted price is significantly above market rate, Voorent will inform you of a suggested revised price and seek your approval. Your listing will not go live at a price you haven\'t agreed to.',
      },
      {
        q: 'Who handles delivery and pickup?',
        a: 'Voorent handles all logistics — pickup from your location, delivery to the renter, and return at the end of the rental. You don\'t need to arrange transportation.',
      },
      {
        q: 'Is my item safe while rented out?',
        a: 'Yes. Voorent is responsible for the security of your item during the rental period. If the item is damaged beyond normal wear and tear, Voorent will assess the damage and return the item to you. If the damage was caused by Voorent\'s mishandling, Voorent will compensate you fairly.',
      },
      {
        q: 'When and how do I get paid?',
        a: 'Payments are processed via the platform. Your earnings are disbursed after each successful rental payment cycle. Contact support@voorent.com for specific payout timelines.',
      },
      {
        q: 'What if a renter damages my item?',
        a: 'Voorent conducts a quality assessment upon return. If damage beyond normal wear and tear is found, the cost is recovered from the renter and the item is returned to you. In case of severe damage, you will be compensated at market value.',
      },
    ],
  },
  {
    title: 'Delivery & Installation',
    icon: '🚚',
    items: [
      {
        q: 'Is delivery free?',
        a: 'Standard delivery and basic installation are included in the rental plan. Additional charges may apply if your premises have access difficulties such as high floors with no lift, narrow passages, or if the item requires special installation (e.g., wall mounting).',
      },
      {
        q: 'What if my building has no lift or has access issues?',
        a: 'Our delivery team will assess the situation on arrival and communicate any additional charges before proceeding. You must approve and pay the additional charge before installation begins.',
      },
      {
        q: 'Do I need to be present during delivery?',
        a: 'Yes. You or an authorised adult representative must be present at the delivery address during the agreed delivery window. If no one is available, a failed delivery charge of ₹1,000 will be applied and delivery rescheduled.',
      },
      {
        q: 'What if delivery cannot be completed?',
        a: 'If delivery is not possible due to space constraints, access restrictions, or invalid documentation, the item is returned to Voorent\'s facility. Applicable logistics charges will be deducted from your advance. Voorent is not liable for any inconvenience caused.',
      },
      {
        q: 'How soon after booking will the item be delivered?',
        a: 'Delivery is typically scheduled within 2–5 business days of payment confirmation, subject to availability and your location within Delhi NCR.',
      },
    ],
  },
  {
    title: 'Payments & Billing',
    icon: '💳',
    items: [
      {
        q: 'How is billing handled?',
        a: 'Voorent follows a uniform monthly billing cycle from the 1st of every month. If your rental starts mid-month, a pro-rata charge applies for that month. Rent is due by the 7th of each month.',
      },
      {
        q: 'What happens if I miss a payment?',
        a: 'A 2% per month interest is charged from the date of default. If payment is missed for 2 consecutive months, Voorent may terminate the rental agreement and repossess the item without further notice.',
      },
      {
        q: 'Are my card details stored?',
        a: 'No. All payments are processed by Razorpay. Voorent does not store any card, bank account, or UPI details.',
      },
      {
        q: 'Can I get a discount or use a promo code?',
        a: 'Voorent offers promotional discounts from time to time. Promo codes are valid for new bookings only and cannot be applied retroactively. Voorent reserves the right to modify or cancel any offer at any time without notice.',
      },
    ],
  },
  {
    title: 'KYC & Verification',
    icon: '🔒',
    items: [
      {
        q: 'Why does Voorent require KYC?',
        a: 'KYC ensures the security of all parties. Sellers need to prove ownership of items, and renters need to be verified for asset safety. This protects everyone on the platform.',
      },
      {
        q: 'Is my personal information safe?',
        a: 'Yes. Voorent handles all personal data in accordance with the Information Technology Act, 2000 and applicable Indian privacy laws. Please see our Privacy Policy for full details.',
      },
      {
        q: 'What if my KYC is rejected?',
        a: 'Voorent will notify you of the reason for rejection and what additional documents may be required. Re-submission is allowed once the issues are resolved.',
      },
    ],
  },
  {
    title: 'Returns & Complaints',
    icon: '↩️',
    items: [
      {
        q: 'How do I return an item at end of rental?',
        a: 'Contact Voorent via support@voorent.com or through your account dashboard to schedule a return pickup. Voorent will arrange collection at no additional cost for standard returns.',
      },
      {
        q: 'What if I want to end my rental early?',
        a: 'Early termination before the lock-in period ends may attract applicable charges. Contact support@voorent.com to discuss your options.',
      },
      {
        q: 'Who do I contact for complaints or support?',
        a: 'Email us at support@voorent.com. We aim to respond within 24 hours on business days.',
      },
    ],
  },
];

function FAQAccordion({ item }: { item: FAQItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#F0F0F0] last:border-b-0">
      <button
        className="w-full text-left py-4 flex items-start justify-between gap-4"
        onClick={() => setOpen(!open)}
      >
        <span className="text-sm font-semibold text-[#1A1A1A] leading-snug">{item.q}</span>
        <span className="text-xl flex-shrink-0 mt-0.5 transition-transform" style={{ color: '#2D6A4F', transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>+</span>
      </button>
      {open && (
        <p className="text-sm text-[#555] leading-relaxed pb-4 whitespace-pre-line">{item.a}</p>
      )}
    </div>
  );
}

export default function FAQ() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Hero */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#2D6A4F' }}>Help Centre</p>
          <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3">Frequently Asked Questions</h1>
          <p className="text-[#555] text-lg">Everything you need to know about renting and listing on Voorent P2P.</p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="space-y-8">
          {FAQS.map((section) => (
            <section key={section.title}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{section.icon}</span>
                <h2 className="text-lg font-bold text-[#1A1A1A]">{section.title}</h2>
              </div>
              <div className="bg-white rounded-2xl border border-[#E0E0E0] px-6">
                {section.items.map((item) => (
                  <FAQAccordion key={item.q} item={item} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-10 p-8 bg-white rounded-2xl border border-[#E0E0E0] text-center">
          <p className="text-lg font-bold text-[#1A1A1A] mb-2">Still have questions?</p>
          <p className="text-sm text-[#555] mb-5">Our support team is happy to help.</p>
          <a href="mailto:support@voorent.com"
            className="inline-block px-6 py-3 rounded-full font-semibold text-white text-sm"
            style={{ background: '#2D6A4F' }}>
            Email us — support@voorent.com
          </a>
          <div className="flex justify-center gap-6 mt-5 text-sm">
            <button onClick={() => navigate('/terms')} className="font-medium hover:underline" style={{ color: '#2D6A4F' }}>Terms & Conditions</button>
            <button onClick={() => navigate('/privacy')} className="font-medium hover:underline" style={{ color: '#2D6A4F' }}>Privacy Policy</button>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-[#E0E0E0] py-6 text-center text-xs text-[#999]">
        © 2026 Voorent Pvt. Ltd. · All rights reserved.
      </footer>
    </div>
  );
}
