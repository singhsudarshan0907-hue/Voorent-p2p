interface Props {
  rating: number;
  size?: number;
}

export default function StarRating({ rating, size = 16 }: Props) {
  return (
    <span role="img" aria-label={`${rating} out of 5 stars`} className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg key={star} width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={star <= Math.round(rating) ? '#F4A261' : '#E0E0E0'}
          />
        </svg>
      ))}
    </span>
  );
}
