import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = '搜索...',
  className = '',
}) => (
  <div
    className={[
      'relative flex items-center border border-gray-300 bg-white focus-within:border-primary-500',
      'focus-within:ring-1 focus-within:ring-primary-500 transition-colors',
      className,
    ].join(' ')}
  >
    <Search className="w-4 h-4 ml-2.5 text-gray-400 flex-shrink-0" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="flex-1 min-w-0 bg-transparent px-2 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none font-mono"
    />
    {value && (
      <button
        onClick={() => onChange('')}
        className="flex-shrink-0 p-1 mr-1 text-gray-400 hover:text-gray-600"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);
