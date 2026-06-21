import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the Voorent platform ("Service"), you agree to be bound by these Terms of Service. If you do not agree, please do not use our Service. These terms apply to all users including renters, owners, and visitors.`,
  },
  {
    title: '2. About Voorent',
    body: `Voorent is a peer-to-peer rental marketplace that connects owners of furniture and home appliances with people who wish to rent them. Voorent acts as an intermediary platform and is not the owner of any listed items unless explicitly stated.`,
  },
  {
    title: '3. Eligibility',
    body: `You must be at least 18 years of age and a resident of India to use our Service. By creating an account, you represent and warrant that all information you provide is accurate and complete.`,
  },
  {
    title: '4. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials. You agree to notify Voorent immediately of any unauthorised use of your account. Voorent will not be liable for any loss resulting from unauthorised use of your account.`,
  },
  {
    title: '5. Listing Items',
    body: `Owners may list furniture and home appliances for rent on the platform. By listing an item, you confirm that you are the rightful owner, the item is in the stated condition, and you have the legal right to rent it. Voorent reserves the right to remove any listing at its discretion. All listings are subject to review and approval before becoming visible to renters.`,
  },
  {
    title: '6. Renting Items',
    body: `Renters agree to use rented items responsibly and return them in the same condition. Any damage beyond normal wear and tear may result in charges. Rental periods are as agreed at the time of booking. Early termination may be subject to applicable fees.`,
  },
  {
    title: '7. Payments',
    body: `All payments are processed securely through Razorpay. Voorent does not store your payment card details. Monthly rental fees are charged as per the agreed schedule. Voorent's service fee is included in the rental price shown to renters. Payouts to owners are processed within 7 working days of payment confirmation.`,
  },
  {
    title: '8. Cancellations & Refunds',
    body: `Cancellation requests must be submitted in writing to support@voorent.com. Refunds, if applicable, will be processed within 5–7 working days. Refund eligibility depends on the stage of the rental and the reason for cancellation. Voorent's decision on refunds is final.`,
  },
  {
    title: '9. Damage & Liability',
    body: `Renters are liable for any damage to rented items beyond normal wear and tear. Owners should accurately describe the condition of their items. Voorent provides basic coverage under the Voorent Care program for accidental damage, subject to terms and verification. Voorent is not liable for indirect, incidental, or consequential damages.`,
  },
  {
    title: '10. Prohibited Activities',
    body: `Users must not list stolen or illegally obtained items, provide false information, use the platform for any unlawful purpose, attempt to circumvent the platform by transacting directly to avoid fees, or engage in abusive or fraudulent behaviour.`,
  },
  {
    title: '11. Intellectual Property',
    body: `All content on the Voorent platform, including logos, text, and images, is the property of Voorent or its licensors. You may not reproduce, distribute, or create derivative works without prior written consent.`,
  },
  {
    title: '12. Termination',
    body: `Voorent reserves the right to suspend or terminate accounts that violate these terms, without prior notice. Users may close their account at any time by contacting us, subject to settlement of any outstanding obligations.`,
  },
  {
    title: '13. Governing Law',
    body: `These Terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in Delhi, India.`,
  },
  {
    title: '14. Changes to Terms',
    body: `Voorent reserves the right to update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new terms. We will notify users of significant changes via WhatsApp or in-app notification.`,
  },
  {
    title: '15. Contact Us',
    body: `For any questions regarding these Terms, please contact us at support@voorent.com or write to: Voorent, New Delhi, India.`,
  },
];

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Hero */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-xs font-bold text-[#2D6A4F] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Terms of Service</h1>
          <p className="text-sm text-[#777] mt-2">Last updated: June 2026</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto w-full px-6 py-10 pb-20">
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-8 space-y-8">
          <p className="text-sm text-[#555] leading-relaxed">
            Please read these Terms of Service carefully before using the Voorent platform. These terms constitute a legally binding agreement between you and Voorent.
          </p>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">{s.title}</h2>
              <p className="text-sm text-[#555] leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4 text-sm">
          <button onClick={() => navigate('/privacy')} className="font-semibold" style={{ color: '#2D6A4F' }}>
            Privacy Policy →
          </button>
          <button onClick={() => navigate('/')} className="text-[#999]">
            ← Back to Home
          </button>
        </div>
      </main>

      <footer className="border-t border-[#E0E0E0] py-6 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-xs text-[#999] text-center">
          © 2026 Voorent. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
