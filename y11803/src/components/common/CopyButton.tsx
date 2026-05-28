import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'p-1',
  md: 'p-1.5',
  lg: 'p-2',
};

export function CopyButton({ text, size = 'md' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center justify-center rounded-md text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-all ${sizeClasses[size]}`}
      title="复制到剪贴板"
    >
      {copied ? <Check size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} className="text-green-600" /> : <Copy size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} />}
    </button>
  );
}
