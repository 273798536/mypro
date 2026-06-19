import React from 'react';

type Tone =
  | 'default'
  | 'primary'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'violet'
  | 'sky'
  | 'gray'
  | 'red'
  | 'orange';

interface TagProps {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

const toneClass: Record<Tone, string> = {
  default: 'bg-gray-100 text-gray-700 border-gray-200',
  primary: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
};

export const Tag: React.FC<TagProps> = ({ tone = 'default', children, className = '', icon }) => (
  <span
    className={[
      'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium border rounded-none',
      toneClass[tone],
      className,
    ].join(' ')}
  >
    {icon}
    {children}
  </span>
);
