import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: `We collect the following information when you use Voorent:
• Mobile phone number (used for OTP-based login via WhatsApp)
• Name (optional, set by you in your profile)
• PAN card number and Aadhaar reference (for identity verification of item owners only)
• Item listing details including photos and descriptions
• Payment transaction records (processed by Razorpay — we do not store card details)
• Usage data such as pages visited, listings viewed, and search queries`,
  },
  {
    title: '2. How We Use Your Information',
    body: `We use your information to:
• Authenticate you securely via WhatsApp OTP
• Process rental bookings and payments
• Verify ownership of listed items
• Send important updates about your rentals and listings
• Improve our platform and services
• Comply with legal obligations under Indian law`,
  },
  {
    title: '3. WhatsApp Communication',
    body: `Voorent uses WhatsApp Business API (via MSG91) to send OTP codes for login and important transactional notifications. By registering on Voorent, you consent to receive these messages on your registered mobile number. We do not send promotional messages without your explicit consent. You can opt out of non-essential communications at any time by contacting us.`,
  },
  {
    title: '4. Payment Data',
    body: `All payment processing is handled by Razorpay, a PCI-DSS compliant payment gateway. Voorent does not store your credit card, debit card, or bank account details. We only store transaction identifiers and payment status for order management and dispute resolution. Razorpay's privacy policy applies to data processed through their platform.`,
  },
  {
    title: '5. Identity Documents',
    body: `Documents uploaded for owner verification (PAN card, Aadhaar, purchase bills) are stored securely on our servers and accessed only by authorised Voorent staff for verification purposes. These documents are never shared with renters or third parties. Aadhaar data is handled in compliance with the Aadhaar Act, 2016 — we only store a DigiLocker reference, not the full Aadhaar number.`,
  },
  {
    title: '6. Data Sharing',
    body: `We do not sell your personal data. We share data only with:
• Razorpay (payment processing)
• MSG91 (WhatsApp OTP delivery)
• Government authorities when required by law
We may share aggregated, anonymised data for analytics purposes — this cannot be used to identify you.`,
  },
  {
    title: '7. Data Storage & Security',
    body: `Your data is stored on secure servers hosted in India. We use industry-standard encryption (HTTPS/TLS) for all data in transit. Access to personal data is restricted to authorised Voorent personnel only. We retain your data for as long as your account is active or as required by law. You may request deletion of your account and associated data by contacting us.`,
  },
  {
    title: '8. Cookies',
    body: `Voorent does not use third-party tracking cookies. We use local browser storage (localStorage) solely for session management — to keep you logged in and remember your preferences. No data is shared with advertisers.`,
  },
  {
    title: '9. Your Rights',
    body: `Under applicable Indian law, you have the right to:
• Access the personal data we hold about you
• Correct inaccurate information
• Request deletion of your data (subject to legal retention requirements)
• Withdraw consent for non-essential communications
To exercise these rights, email us at privacy@voorent.com.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `Voorent is not intended for use by persons under the age of 18. We do not knowingly collect personal information from minors. If we become aware that a minor has created an account, we will delete the account and associated data promptly.`,
  },
  {
    title: '11. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time. We will notify you of significant changes via WhatsApp message to your registered number. Continued use of the Service after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '12. Contact Us',
    body: `For privacy-related queries or to exercise your data rights, contact us at:
Email: privacy@voorent.com
Address: Voorent, New Delhi, India`,
  },
];

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Hero */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <p className="text-xs font-bold text-[#2D6A4F] uppercase tracking-widest mb-2">Legal</p>
          <h1 className="text-3xl font-bold text-[#1A1A1A]">Privacy Policy</h1>
          <p className="text-sm text-[#777] mt-2">Last updated: June 2026</p>
        </div>
      </div>

      <main className="max-w-3xl mx-auto w-full px-6 py-10 pb-20">
        <div className="bg-white rounded-2xl border border-[#E0E0E0] p-8 space-y-8">
          <p className="text-sm text-[#555] leading-relaxed">
            At Voorent, we take your privacy seriously. This policy explains what data we collect, why we collect it, and how we protect it.
          </p>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 className="text-base font-bold text-[#1A1A1A] mb-2">{s.title}</h2>
              <p className="text-sm text-[#555] leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-4 text-sm">
          <button onClick={() => navigate('/terms')} className="font-semibold" style={{ color: '#2D6A4F' }}>
            Terms of Service →
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
