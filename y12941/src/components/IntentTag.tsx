import React from 'react';
import { INTENT_LABELS } from '../../shared/types';
import type { Intent } from '../../shared/types';

interface IntentTagProps {
  intent: Intent;
  variant?: 'default' | 'outline';
}

export const IntentTag: React.FC<IntentTagProps> = ({ intent, variant = 'default' }) => {
  const colors: Record<Intent, { bg: string; text: string; border: string }> = {
    refund: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
    exchange: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
    complaint: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200' },
    inquiry: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
    technical_support: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
    other: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' }
  };

  const c = colors[intent];
  const baseClass = variant === 'outline'
    ? `bg-transparent ${c.text} border ${c.border}`
    : `${c.bg} ${c.text}`;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${baseClass}`}>
      {INTENT_LABELS[intent]}
    </span>
  );
};
