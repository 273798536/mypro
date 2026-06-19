import React from 'react';

export const StatusDot: React.FC<{ color: string; className?: string; pulse?: boolean }> = ({
  color,
  className = '',
  pulse = false,
}) => (
  <span className={`inline-flex items-center justify-center ${className}`}>
    <span
      className={[
        'relative inline-flex rounded-full',
        pulse ? 'animate-pulse-slow' : '',
      ].join(' ')}
    >
      <span className={`w-2 h-2 rounded-full ${color}`} />
      {pulse && (
        <span className={`absolute inline-flex w-2 h-2 rounded-full ${color} opacity-75 animate-ping`} />
      )}
    </span>
  </span>
);
