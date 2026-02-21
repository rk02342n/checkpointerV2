import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    setCurrentRating(rating);
  }, [rating]);
  
  const totalStars = 5;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };
  
  const sizeClass = sizeClasses[size];

  const handleClick = (star: number, isHalf: boolean) => {
    if (interactive) {
      const newRating = isHalf ? star - 0.5 : star;
      setCurrentRating(newRating);
      onValueChange?.(newRating);
    }
  };

  const handleMouseMove = (star: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (interactive) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const isLeftHalf = x < rect.width / 2;
      setHover(isLeftHalf ? star - 0.5 : star);
    }
  };

  const handleMouseLeave = () => {
    if (interactive) {
      setHover(0);
    }
  };

  const getStarFill = (starIndex: number, displayRating: number) => {
    if (displayRating >= starIndex) {
      return 'full'; // Full star
    } else if (displayRating >= starIndex - 0.5) {
      return 'half'; // Half star
    }
    return 'empty'; // Empty star
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      {Array.from({ length: totalStars }, (_, i) => i + 1).map((star) => {
        const displayRating = interactive ? (hover || currentRating) : rating;
        const fillType = getStarFill(star, displayRating);
        
        return (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            className={`relative bg-transparent border-0 p-0 ${
              interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'
            }`}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              const isLeftHalf = x < rect.width / 2;
              handleClick(star, isLeftHalf);
            }}
            onMouseMove={(e) => handleMouseMove(star, e)}
            onMouseLeave={handleMouseLeave}
            aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
          >
            {fillType === 'half' ? (
              <div className="relative">
                {/* Empty star background */}
                <Star className={`${sizeClass} fill-white text-black transition-colors`} />
                {/* Half star overlay */}
                <div className="absolute top-0 left-0 overflow-hidden" style={{ width: '50%' }}>
                  <Star className={`${sizeClass} fill-amber-400 text-black transition-colors`} />
                </div>
              </div>
            ) : (
              <Star
                className={`${sizeClass} transition-colors ${
                  fillType === 'full'
                    ? 'fill-amber-400 text-black' 
                    : 'fill-white text-black'
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
