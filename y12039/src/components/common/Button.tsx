import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = ''
}) => {
  const baseStyles = 'btn-cyber font-medium rounded-lg border transition-all duration-300';
  
  const variants = {
    primary: 'bg-cyber-cyan/20 border-cyber-cyan/50 text-cyber-cyan hover:bg-cyber-cyan/30 hover:border-cyber-cyan',
    secondary: 'bg-space-blue/50 border-gray-600 text-gray-300 hover:border-gray-400 hover:text-white',
    danger: 'bg-alert-red/20 border-alert-red/50 text-alert-red hover:bg-alert-red/30 hover:border-alert-red',
    success: 'bg-success-green/20 border-success-green/50 text-success-green hover:bg-success-green/30 hover:border-success-green',
    warning: 'bg-warning-orange/20 border-warning-orange/50 text-warning-orange hover:bg-warning-orange/30 hover:border-warning-orange'
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </motion.button>
  );
};
