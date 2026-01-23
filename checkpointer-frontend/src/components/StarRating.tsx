import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating?: number;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onValueChange?: (rating: number) => void;
  className?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  interactive = false,
  size = 'md',
  onValueChange,
  className = ''
}) => {
  const [hover, setHover] = useState<number>(0);
  const [currentRating, setCurrentRating] = useState<number>(rating);
  
  const stars = [1, 2, 3, 4, 5];
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const sizeClass = sizeClasses[size];

  const handleClick = (star: number) => {
    if (interactive) {
      setCurrentRating(star);
      onValueChange?.(star);
    }
  };

  const handleMouseEnter = (star: number) => {
    if (interactive) {
      setHover(star);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHover(0);
    }
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {stars.map((star) => {
        const displayRating = interactive ? (hover || currentRating) : rating;
        const isFilled = displayRating >= star;
        
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`bg-transparent border-0 p-0 ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            }`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            <Star
              className={`${sizeClass} transition-colors ${
                isFilled 
                  ? 'fill-amber-400 text-black' 
                  : 'fill-white text-black'
              }`}
            />
          </button>
        );
      })}
    </div>
  );
};
