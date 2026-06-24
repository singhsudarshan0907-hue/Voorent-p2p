import { useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';

const SECTIONS = [
  {
    title: '1. General Information & Acceptance of Terms',
    body: `This website, p2p.voorent.com, is owned, hosted and operated by Voorent Pvt. Ltd ("VPL"), a company incorporated in India under the Companies Act, 2013, having its registered office at House 95, Ground Floor, Pocket 17, Sector 24, Rohini, New Delhi - 110085.

By accessing or using the Voorent P2P platform ("Service"), you signify your agreement to these Terms of Use and agree to be bound by them. VPL reserves the right to update or modify these Terms at any time without prior notice. Your continued use of the Service after any such change constitutes your agreement to follow and be bound by the Terms as modified.

These terms apply to all users including renters, sellers/owners, and visitors. This electronic record is prepared under the Information Technology Act, 2000.`,
  },
  {
    title: '2. About Voorent P2P',
    body: `Voorent P2P is a managed peer-to-peer rental marketplace connecting verified sellers of second-hand furniture and home appliances with renters in Delhi NCR. Voorent actively manages delivery, KYC verification, pricing review, logistics, and dispute resolution. Voorent acts as an operational intermediary and is not the owner of listed items unless explicitly stated.

Voorent currently operates exclusively within Delhi NCR (Delhi, Noida, Greater Noida, Ghaziabad, and Gurugram/Faridabad). Listings or rentals from outside these areas are not serviceable.`,
  },
  {
    title: '3. Eligibility',
    body: `You must be at least 18 years of age and a resident of India to use our Service. By creating an account, you represent and warrant that all information you provide is accurate, complete, and current. One account per person is permitted.`,
  },
  {
    title: '4. User Accounts & Obligations',
    body: `• You are responsible for maintaining the confidentiality of your account credentials and all activities conducted through your account.
• You agree to notify Voorent immediately of any unauthorised use of your account.
• The accuracy of all registration data provided to Voorent is the sole responsibility of the user.
• You agree that any data entered may be subject to mandatory verification by Voorent.
• You shall keep your password and user identification confidential and not disclose them to any person.
• You shall promptly report to Voorent by email any inaccurate information pertaining to any listed item on the platform.
• You agree to indemnify and hold Voorent harmless from any wrong or false data you provide.`,
  },
  {
    title: '5. Seller Obligations & KYC Verification',
    body: `All sellers must complete Voorent's full KYC (Know Your Customer) process before any listing goes live. This includes:
• Valid government-issued photo ID (Aadhaar)
• PAN card
• Proof of item ownership (purchase bill or equivalent)

Voorent verifies the identity of every seller and reserves the right to reject any seller or listing at its sole discretion without reason.

By listing an item, the seller confirms that:
• They are the rightful owner of the item.
• The item is in the stated condition and functions correctly.
• They have the legal right to rent the item.
• All listing information is accurate and complete.

Sellers must respond to Voorent communications within 48 hours. Repeated non-response may result in listing suspension.`,
  },
  {
    title: '6. Pricing & Price Revisions',
    body: `Sellers may quote an initial price for their listed item. Voorent reviews all pricing before a listing goes live. If the quoted price is deemed too high relative to market rates, Voorent will:
• Inform the seller of the suggested revised price with reasons.
• Request the seller's approval for the revised price.
• Not publish the listing at a price the seller has not agreed to.

Voorent reserves the right to adjust pricing at any time based on market conditions, depreciation, or platform policy — with prior notice to the seller. All rental rates, packages, and promotional offers are set or approved by Voorent and subject to change.`,
  },
  {
    title: '7. Asset Security — Seller Protection',
    body: `Voorent is responsible for the security and safety of all items once they are in active rental:
• Items are handled with care during pickup, transportation, and delivery.
• If an item is damaged or lost due to Voorent's negligence during logistics, Voorent will compensate the seller fairly.
• If a renter returns a defective or significantly damaged item (beyond normal wear and tear), Voorent will assess the damage and, if confirmed, return the item to the seller.
• Sellers are not liable for normal wear and tear occurring during a rental period.
• Voorent does not guarantee items against depreciation due to age or prolonged use, which is normal for second-hand items.`,
  },
  {
    title: '8. Transportation & Logistics',
    body: `Voorent handles all logistics including:
• Pickup of the item from the seller's location.
• Delivery and installation at the renter's premises.
• Return pickup from the renter at the end of rental or upon termination.
• Reverse logistics back to the seller or Voorent's facility.

All transportation costs for standard delivery are included in the rental plan as advertised. Additional charges may apply in specific circumstances as described in Section 9.`,
  },
  {
    title: '9. Delivery, Installation & Additional Charges',
    body: `Standard delivery and basic installation are included in the rental plan, subject to normal access conditions.

Additional charges apply where delivery or installation requires extra effort due to:
• High floors with no lift access
• Narrow, restricted, or difficult passages
• Complex structural layouts or elevated installations
• Wall-mount or specialty installation requirements
• Insufficient space requiring repositioning or rearrangement
• Unusually long carry distance from the delivery vehicle to the premises

These charges are assessed on arrival. Voorent's delivery team will evaluate on-site conditions and communicate any additional charges before proceeding. Payment of additional charges must be made prior to installation.

If Delivery Cannot Be Completed:
Voorent may be unable to complete delivery due to — but not limited to — space constraints, access restrictions, incomplete or invalid KYC/documentation, or any condition that makes delivery unsafe or impractical. In such cases:
• The item will be returned to Voorent's facility.
• Applicable delivery, logistics, and handling charges will be deducted from the customer's advance or deposit.
• Voorent shall not be held liable for any inconvenience, loss, or delay arising from a non-delivery.`,
  },
  {
    title: '10. Customer Availability for Delivery',
    body: `The customer (renter) must be personally present or have an authorised adult representative available at the delivery address during the agreed delivery window.

If the customer or their representative is unavailable at the time of delivery:
• A failed delivery charge of ₹1,000 will be levied.
• Voorent will attempt to reschedule at the next available slot.
• Repeated unavailability may result in cancellation of the rental order.

Please ensure your contact number is reachable on delivery day. Voorent's delivery team will call ahead of arrival.`,
  },
  {
    title: '11. Item Condition, Wear & Tear, and Defect Policy',
    body: `All items on Voorent P2P are second-hand goods. By renting an item, the customer acknowledges:

Normal Wear & Tear (Not Covered):
Customers cannot raise complaints or disputes regarding:
• Minor scratches, scuffs, or surface marks consistent with prior use.
• Slight fading, discolouration, or change in shade due to age or sunlight.
• Minor cosmetic imperfections that do not affect the item's functionality.
Voorent is not liable for such characteristics in second-hand items.

Major Defects (Voorent's Responsibility):
If an item arrives in a broken or non-functional state, or stops working within the first 7 days due to a pre-existing defect (not caused by the renter), Voorent will:
• Arrange for the defective item to be picked up at no cost to the customer.
• Provide a replacement item or issue a refund, at Voorent's discretion.
• Return the defective piece to the respective seller for evaluation.

Customer-Caused Damage:
The user agrees to pay for any damage, destruction, loss, alteration, or modification of items regardless of cause. If any article is beyond repair, the market price for the same shall be charged. Voorent through its agents shall conduct a quality assessment of all items to ascertain the level of damages.`,
  },
  {
    title: '12. Payment Policies',
    body: `• Voorent shall charge one month's advance at the time of initial subscription. This amount is refundable if the user cancels two days prior to the estimated delivery date. If the user has accepted delivery, the deposit shall not be refunded.
• Voorent follows a uniform monthly billing cycle starting from the 1st of every month. Pro-rata rental applies if subscription begins after the 1st.
• Rental is payable by the 7th of every month. Failure to pay by the 7th attracts interest of 2% per month from the date of default.
• Non-payment of rental for two consecutive months shall attract termination of services.
• In case of cheque dishonour, an additional charge of ₹500 shall be levied. If the pending payment is not realised within 15 days, Voorent shall initiate criminal proceedings under the Negotiable Instruments Act, 1881.
• All payments on Voorent are processed securely via Razorpay. Voorent does not store card, bank, or UPI details.`,
  },
  {
    title: '13. Advance Rental Payment',
    body: `Voorent may require advance rental payment instead of monthly billing in any of the following situations:
• Issuance of a new or replacement item
• Unresolved KYC or documentation concerns
• Limited inventory availability
• Special discounts or promotional offers availed by the customer
• Any other operational, credit-related, or business reason at Voorent's sole discretion

Monthly payment is not a guaranteed option. If Voorent requires advance payment, the customer cannot revert to monthly billing unless Voorent expressly permits it in writing.

Customers who voluntarily wish to pay in advance may request to do so at the time of booking, subject to Voorent's approval. Advance payment is non-refundable for the period already covered, except as per Voorent's standard refund policy.`,
  },
  {
    title: '14. Default in Payment',
    body: `• Agreement termination: Voorent may immediately terminate the rental agreement if payment is overdue by 2 or more months.
• Asset repossession: Voorent has the right to pick up all rented items from the customer's premises upon default — without further notice or consent.
• Right of property entry: Upon a payment default of 2+ months, Voorent's authorised team may enter the customer's premises to inspect and recover rented assets. The customer consents to this right at the time of booking.
• Pending dues remain recoverable: Repossession does not waive any outstanding rental amounts, penalties, or associated costs — all dues remain payable.
• Legal action: Voorent reserves the right to initiate civil and/or criminal proceedings for non-payment, wrongful retention of assets, or any breach of the rental agreement.`,
  },
  {
    title: '15. Repossession of Assets',
    body: `All rented items remain the exclusive property of Voorent Pvt. Ltd. and/or the respective seller at all times. The customer has a limited right to use — not own — the items, unless all rent-to-own payments have been completed.

• Voorent can reclaim rented assets without a court order upon payment default or breach of agreement.
• By accepting these terms, the customer explicitly consents to Voorent entering the rental premises for the purpose of inspecting and recovering assets in the event of a default.
• Recovery of assets does not absolve the customer of any outstanding rental, penalty, or associated dues.`,
  },
  {
    title: '16. Promo Codes, Coupons & Discounts',
    body: `• Modify or cancel anytime: Voorent reserves the right to withdraw, change, or cancel any promotional offer at any time, without prior notice.
• No retroactive pricing: Discounts are locked at the time of transaction. Existing orders will not be repriced based on any new or lower offer.
• New promotions apply to new orders only: Any fresh offer launched by Voorent is valid strictly for new bookings and does not apply to ongoing or past transactions.
• Discount decisions are at Voorent's sole discretion: Voorent determines who is eligible for a discount, the applicable rate, and the duration — this is non-negotiable.`,
  },
  {
    title: '17. Voorent\'s Sole Discretion',
    body: `• Item allocation: Voorent determines which specific product, brand, or variant is delivered. Images on the platform are representative; actual items may vary within the same or equivalent category.
• Right to refuse service: Voorent reserves the right to decline any rental or listing request at its sole discretion, without being required to provide a reason.
• Pricing & offers: All rental rates, packages, and promotional offers are set by Voorent and are subject to change at any time without prior notice.
• Content moderation: Voorent reserves the right to refuse, edit, modify, or remove any listing or content at its sole discretion.`,
  },
  {
    title: '18. Legal Rights & Intellectual Property',
    body: `You acknowledge and agree that the materials on the Website — including text, software, scripts, graphics, photos, sounds, music, videos, interactive features ("Materials") and the trademarks, service marks and logos contained therein ("Marks") — are owned by or licensed to Voorent, and are subject to copyright and other intellectual property rights under Indian laws, foreign laws and international treaties.

Materials are provided to you AS IS for personal use only and may not be used, copied, reproduced, distributed, transmitted, broadcast, displayed, sold, or licensed for any other purpose without prior written consent of the respective owners.

You agree not to circumvent, disable or otherwise interfere with security-related features of the Website. You may not decompile or disassemble, reverse engineer, or otherwise attempt to discover any source code contained in the Service. You agree not to reproduce, duplicate, copy, sell, resell or exploit for any commercial purposes any aspect of the Service.`,
  },
  {
    title: '19. Trademarks',
    body: `All logos, brands, trademarks and service marks ("Marks") appearing on Voorent are the properties either owned or used under license by Voorent and/or its associates. All rights accruing from the same, statutory or otherwise, wholly vest with Voorent and/or its associates.

Access to this Website does not confer upon you any license or right to use these Marks in any form or manner whatsoever. Any violation constitutes an offence under the prevailing laws of India.

Voorent respects the Intellectual Property Rights of all parties. In a case where a user is found to be using any platform to infringe the Intellectual Property Rights of others, Voorent will be free to terminate this agreement forthwith without notice.`,
  },
  {
    title: '20. Claims of Infringement',
    body: `Voorent is not liable for any infringement of copyright arising out of materials posted on or transmitted through the site. If you are an owner of intellectual property rights and believe that any Content infringes upon your intellectual property rights, you may submit a notification to Voorent together with a request to delete the relevant Content.

The notification must contain: a physical or electronic signature of the authorized person; identification of the infringing content; contact information; a good faith statement that the use is not authorized; and a statement of accuracy under penalty of perjury.`,
  },
  {
    title: '21. Fair Use & Prohibited Activities',
    body: `The following are strictly prohibited:
• Use of "deep-link", "page-scrape", "robot", "spider" or other automatic devices to access or copy any portion of the Website.
• Testing the vulnerability of the website or any networked computer resource.
• Reverse look-up, trace, or search of any other user.
• Posting statements pertaining to caste, race, sex, place of birth, or other protected characteristics that may offend any user or community.
• Forging headers or manipulating identifiers to disguise the origin of any message.
• Falsely representing yourself on behalf of any other person or entity.
• Using the Website for any purpose that is unlawful or prohibited by these Terms.`,
  },
  {
    title: '22. Indemnity',
    body: `You agree to defend, indemnify and hold harmless Voorent, its officers, subsidiaries, affiliates, successors, assigns, directors, agents, service providers, suppliers and employees from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including attorneys' fees) arising from:
• Your use of and access to the Website and/or the Service
• Your violation of any term of these Terms
• Your violation of any third party right, including any copyright, trademark, trade secret or privacy right
• Any claim that your Content caused damage to a third party

This indemnification obligation will survive termination, modification or expiration of these Terms.`,
  },
  {
    title: '23. Limitation of Liability',
    body: `To the maximum extent permitted by applicable law, Voorent shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, goodwill, or other intangible losses arising from your use of the Service.

Voorent's total liability in any matter shall not exceed the total rental amount paid by you in the 3 months preceding the claim.`,
  },
  {
    title: '24. Governing Law & Dispute Resolution',
    body: `These Terms shall be governed by and construed in accordance with the laws of India. Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in New Delhi, India.

Voorent encourages users to reach out at support@voorent.com for any disputes before initiating legal proceedings.`,
  },
  {
    title: '25. Changes to Terms',
    body: `Voorent reserves the right to modify these Terms at any time. Any material change shall become effective on the lapse of five days following the aforesaid change. Your continued use of the Service after any changes constitutes acceptance of the updated Terms.

Last updated: June 2026`,
  },
];

export default function Terms() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Hero */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: '#2D6A4F' }}>Legal</p>
          <h1 className="text-4xl font-bold text-[#1A1A1A] mb-3">Terms & Conditions</h1>
          <p className="text-[#555] text-lg">Please read these terms carefully before using Voorent P2P.</p>
          <p className="text-sm text-[#999] mt-2">Effective date: June 2026 · Jurisdiction: New Delhi, India · Voorent Pvt. Ltd.</p>
        </div>
      </div>

      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="space-y-6">
          {SECTIONS.map((s) => (
            <section key={s.title} className="bg-white rounded-2xl border border-[#E0E0E0] p-8">
              <h2 className="text-base font-bold mb-4" style={{ color: '#2D6A4F' }}>{s.title}</h2>
              <p className="text-sm text-[#444] leading-relaxed whitespace-pre-line">{s.body}</p>
            </section>
          ))}
        </div>

        <div className="mt-10 p-6 bg-white rounded-2xl border border-[#E0E0E0] text-center">
          <p className="text-sm text-[#555] mb-4">Have questions about our terms?</p>
          <a href="mailto:support@voorent.com"
            className="inline-block px-6 py-3 rounded-full font-semibold text-white text-sm"
            style={{ background: '#2D6A4F' }}>
            Contact Us — support@voorent.com
          </a>
          <div className="flex justify-center gap-6 mt-5 text-sm">
            <button onClick={() => navigate('/privacy')} className="font-medium hover:underline" style={{ color: '#2D6A4F' }}>Privacy Policy</button>
            <button onClick={() => navigate('/faq')} className="font-medium hover:underline" style={{ color: '#2D6A4F' }}>FAQ</button>
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-[#E0E0E0] py-6 text-center text-xs text-[#999]">
        © 2026 Voorent Pvt. Ltd. · All rights reserved.
      </footer>
    </div>
  );
}
