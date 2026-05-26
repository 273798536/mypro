import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating: number;
  maxStars?: number;
  size?: number;
}

export const StarRating: React.FC<StarRatingProps> = ({ 
  rating, 
  maxStars = 3,
  size = 32 
}) => {
  return (
    <div className="flex gap-1">
      {[...Array(maxStars)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ 
            scale: i < rating ? 1 : 0.8, 
            rotate: 0,
          }}
          transition={{ 
            delay: i * 0.2,
            type: 'spring',
            stiffness: 200,
          }}
        >
          <Star
            size={size}
            className={`transition-all ${
              i < rating
                ? 'text-yellow-400 fill-yellow-400 drop-shadow-lg'
                : 'text-gray-300'
            }`}
          />
        </motion.div>
      ))}
    </div>
  );
};
