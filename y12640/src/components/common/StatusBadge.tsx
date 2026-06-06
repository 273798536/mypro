import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'pass' | 'review' | 'fail';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge = ({ status, label, size = 'md' }: StatusBadgeProps) => {
  const getIcon = () => {
    switch (status) {
      case 'pass': return <CheckCircle size={size === 'sm' ? 14 : 16} />;
      case 'review': return <AlertTriangle size={size === 'sm' ? 14 : 16} />;
      case 'fail': return <XCircle size={size === 'sm' ? 14 : 16} />;
    }
  };
  
  const getStyles = () => {
    switch (status) {
      case 'pass': return 'bg-green-100 text-green-700';
      case 'review': return 'bg-yellow-100 text-yellow-700';
      case 'fail': return 'bg-red-100 text-red-700';
    }
  };
  
  const getDefaultLabel = () => {
    switch (status) {
      case 'pass': return '通过';
      case 'review': return '待复核';
      case 'fail': return '不合格';
    }
  };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStyles()}`}>
      {getIcon()}
      {label || getDefaultLabel()}
    </span>
  );
};
