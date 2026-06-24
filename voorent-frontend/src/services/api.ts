import axios from 'axios';
import type { Listing, Review, Rental } from '../types';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const sendOtp = (phone: string, email?: string) =>
  api.post('/auth/send-otp', { phone, email });

export const verifyOtp = (phone: string, otp: string, email?: string) =>
  api.post<{ token: string; isNewUser: boolean }>('/auth/verify-otp', { phone, otp, email });

// Image URL helper — images are stored on the backend server, not the frontend
const BACKEND = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
export const resolveImageUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http')) return url;          // already absolute
  return `${BACKEND}${url}`;                        // prefix backend host
};

// Patch all listings to have absolute image URLs
const normaliseListings = (listings: Listing[]): Listing[] =>
  listings.map(l => ({
    ...l,
    imageUrl: resolveImageUrl(l.imageUrl),
    images:   (l.images || []).map(resolveImageUrl),
  }));

// Listings
export const getListings = (category?: string, search?: string, lat?: number, lng?: number) =>
  api.get<Listing[]>('/listings', { params: { category, search, lat, lng } })
     .then(r => ({ ...r, data: normaliseListings(r.data) }));

export const getListingById = (id: string) =>
  api.get<Listing>(`/listings/${id}`)
     .then(r => ({ ...r, data: { ...r.data, imageUrl: resolveImageUrl(r.data.imageUrl), images: (r.data.images || []).map(resolveImageUrl) } }));

// Reviews
export const getReviews = (listingId: string) =>
  api.get<Review[]>(`/reviews/${listingId}`);

export const submitReview = (listingId: string, rating: number, text: string) =>
  api.post('/reviews', { listingId, rating, reviewText: text });

// Rentals
export const getMyRentals = () =>
  api.get<Rental[]>('/rentals/customer')
     .then(r => ({ ...r, data: r.data.map(rental => ({ ...rental, listingImage: resolveImageUrl(rental.listingImage) })) }));

export const confirmRental = (listingId: string, planType: string) =>
  api.post('/rentals', { listingId, planType });

// Support
export const contactVoorent = (context: string) =>
  api.post('/support/contact', { context });

// Payments
export const createRazorpayOrder = (listingId: string, plan: string) =>
  api.post<{
    orderId: string;
    amount: number;
    currency: string;
    keyId: string;
    plan: string;
    planLabel: string;
    prefill: { name: string; contact: string };
  }>('/payments/create-order', { listingId, plan });

export const verifyRazorpayPayment = (
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string
) =>
  api.post<{ message: string; rentalId: string }>('/payments/verify', {
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

export default api;
