import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import TopNav from '../components/TopNav';
import BottomNav from '../components/BottomNav';
import { getListingById, submitReview } from '../services/api';
import type { Listing } from '../types';

export default function WriteReview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getListingById(id)
      .then((r) => setListing(r.data))
      .catch(() => setError('Could not load item details.'))
      .finally(() => setLoadingListing(false));
  }, [id]);

  const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) { setError('Please select a star rating.'); return; }
    if (!id) return;

    setError('');
    setSubmitting(true);
    try {
      await submitReview(id, rating, reviewText.trim());
      setSubmitted(true);
    } catch (err: unknown) {
      const status = (err as { response?: { status: number } })?.response?.status;
      if (status === 403) {
        setError('You can only review items from completed rentals. Your rental needs to finish first.');
      } else if (status === 409) {
        setError('You have already submitted a review for this item.');
      } else if (status === 401) {
        navigate('/login');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
        <TopNav />
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl p-12 border border-[#E0E0E0] max-w-md w-full text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Review submitted!</h1>
            <p className="text-[#555] text-sm mb-2">
              Thanks for your feedback. Our team will review it before it goes live.
            </p>
            {listing && (
              <p className="text-xs text-[#999] mb-8">for <span className="font-semibold text-[#1A1A1A]">{listing.title}</span></p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => navigate('/my-rentals')}
                className="px-6 py-3 rounded-xl font-bold text-sm text-white"
                style={{ background: '#2D6A4F' }}
              >
                Back to My Rentals
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 rounded-xl font-semibold text-sm border border-[#E0E0E0] text-[#555]"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
        <div className="md:hidden"><BottomNav /></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9]">
      <TopNav />

      {/* Page header */}
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-3xl mx-auto px-6 py-5">
          <button
            onClick={() => navigate('/my-rentals')}
            className="flex items-center gap-2 text-sm text-[#555] hover:text-[#1A1A1A] mb-3 transition-colors"
          >
            ← Back to My Rentals
          </button>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Write a Review</h1>
          <p className="text-sm text-[#555] mt-0.5">Share your experience to help other renters</p>
        </div>
      </div>

      <main className="flex-1 max-w-3xl mx-auto w-full px-6 py-10">
        <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">

          {/* ── Review form ─────────────────────────────── */}
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-[#E0E0E0] p-8 flex flex-col gap-8">

            {/* Star rating */}
            <div>
              <p className="font-bold text-[#1A1A1A] mb-4">Overall rating <span className="text-[#C62828]">*</span></p>
              <div className="flex gap-3 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHovered(star)}
                    onMouseLeave={() => setHovered(0)}
                    className="text-4xl transition-transform hover:scale-110 focus:outline-none"
                    aria-label={`${star} star`}
                  >
                    <span style={{ color: star <= (hovered || rating) ? '#F4A261' : '#E0E0E0' }}>
                      ★
                    </span>
                  </button>
                ))}
              </div>
              {(hovered || rating) > 0 && (
                <p className="text-sm font-semibold" style={{ color: '#F4A261' }}>
                  {STAR_LABELS[hovered || rating]}
                </p>
              )}
            </div>

            {/* Written review */}
            <div>
              <label className="font-bold text-[#1A1A1A] block mb-2">
                Your experience <span className="text-xs font-normal text-[#999]">(optional)</span>
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                maxLength={500}
                rows={5}
                placeholder="How was the condition of the item? Was delivery smooth? Would you recommend renting this?"
                className="w-full border border-[#E0E0E0] rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[#2D6A4F] transition-colors"
              />
              <p className="text-xs text-[#999] text-right mt-1">{reviewText.length}/500</p>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: '#FFEBEE', color: '#C62828' }}>
                {error}
              </div>
            )}

            {/* Moderation notice */}
            <div className="rounded-xl px-4 py-3 text-xs text-[#555]" style={{ background: '#F9F9F9', border: '1px solid #E0E0E0' }}>
              ℹ️ Reviews are moderated before they appear publicly. This usually takes 1–2 business days.
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="w-full py-3.5 rounded-xl font-bold text-white text-sm disabled:opacity-50 transition-opacity"
              style={{ background: '#2D6A4F' }}
            >
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>

          {/* ── Item card sidebar ─────────────────────── */}
          <div className="bg-white rounded-2xl border border-[#E0E0E0] overflow-hidden">
            {loadingListing ? (
              <div>
                <div className="bg-gray-200 animate-pulse" style={{ aspectRatio: '4/3' }} />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ) : listing ? (
              <div>
                <div style={{ aspectRatio: '4/3' }} className="overflow-hidden">
                  <img
                    src={listing.imageUrl}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="p-5">
                  <p className="font-bold text-[#1A1A1A] text-sm leading-snug mb-2">{listing.title}</p>
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[#F0FAF5] text-[#2D6A4F]">
                    {listing.condition}
                  </span>
                  <div className="mt-4 pt-4 border-t border-[#F0F0F0]">
                    <p className="text-xs text-[#999] mb-1">Your review is for this item</p>
                    <p className="text-xs text-[#555]">Reviews help owners improve and help others rent with confidence.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 text-sm text-[#999]">Item not found</div>
            )}
          </div>

        </div>
      </main>

      <div className="md:hidden"><BottomNav /></div>
    </div>
  );
}
