import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  glow?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', glow = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-space-blue/60 backdrop-blur-sm border border-cyber-cyan/20 rounded-xl p-4 ${
        glow ? 'shadow-lg shadow-cyber-cyan/10' : ''
      } ${className}`}
    >
      {children}
    </motion.div>
  );
};
