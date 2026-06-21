export interface Listing {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  images: string[];
  condition: 'Like New' | 'Good' | 'Acceptable';
  category: 'Furniture' | 'Appliances';
  itemPrice: number;
  monthlyRent: number;
  isRentToOwn: boolean;
  isAvailable: boolean;
  ownerName?: string;
  averageRating?: number;
  reviewCount?: number;
  pincode?: string;
  distanceKm?: number;
}

export interface Review {
  id: string;
  listingId: string;
  reviewerName: string;
  rating: number;
  reviewText: string;
  createdAt: string;
}

export interface Rental {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage: string;
  condition: string;
  monthlyRent: number;
  status: 'ACTIVE' | 'UPCOMING' | 'COMPLETED' | 'OVERDUE';
  startDate: string;
  endDate?: string;
  currentMonth: number;
  totalMonths: number;
  planType: 'monthly' | 'upfront' | 'rent-to-own';
  nextPaymentDate?: string;
}

export type PlanType = 'monthly' | 'upfront' | 'rent-to-own';
