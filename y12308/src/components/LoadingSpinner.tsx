import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

const sizeConfig = {
  sm: {
    container: 'gap-2',
    spinner: 'w-5 h-5',
    border: 'border-2',
    text: 'text-sm',
  },
  md: {
    container: 'gap-3',
    spinner: 'w-8 h-8',
    border: 'border-3',
    text: 'text-base',
  },
  lg: {
    container: 'gap-4',
    spinner: 'w-12 h-12',
    border: 'border-4',
    text: 'text-lg',
  },
};

const spinnerVariants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', text }) => {
  const styles = sizeConfig[size];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        text && styles.container
      )}
    >
      <motion.div
        variants={spinnerVariants}
        animate="animate"
        className={cn(
          styles.spinner,
          styles.border,
          'rounded-full border-amber-500 border-t-transparent'
        )}
      />
      {text && (
        <span className={cn(styles.text, 'font-medium text-amber-700')}>
          {text}
        </span>
      )}
    </div>
  );
};

export default LoadingSpinner;
