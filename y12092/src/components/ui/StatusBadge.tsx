import type { ConflictSeverity, ConflictStatus, ConflictType } from '@/types';
import { AlertTriangle, Eye, MapPin, XCircle, CheckCircle, Clock } from 'lucide-react';

interface StatusBadgeProps {
  type?: 'severity' | 'status' | 'conflictType';
  value: ConflictSeverity | ConflictStatus | ConflictType;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ type = 'severity', value, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';
  
  if (type === 'severity') {
    const config: Record<ConflictSeverity, { bg: string; text: string; label: string; icon: JSX.Element }> = {
      critical: {
        bg: 'bg-red-600/20 border-red-500/50',
        text: 'text-red-400',
        label: '严重',
        icon: <XCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
      warning: {
        bg: 'bg-orange-600/20 border-orange-500/50',
        text: 'text-orange-400',
        label: '中等',
        icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
      info: {
        bg: 'bg-yellow-600/20 border-yellow-500/50',
        text: 'text-yellow-400',
        label: '轻微',
        icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
    };
    
    const c = config[value as ConflictSeverity];
    return (
      <span className={`inline-flex items-center gap-1 rounded border ${sizeClasses} ${c.bg} ${c.text} font-medium`}>
        {c.icon}
        {c.label}
      </span>
    );
  }
  
  if (type === 'status') {
    const config: Record<ConflictStatus, { bg: string; text: string; label: string; icon: JSX.Element }> = {
      pending: {
        bg: 'bg-blue-600/20 border-blue-500/50',
        text: 'text-blue-400',
        label: '待处理',
        icon: <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
      resolved: {
        bg: 'bg-green-600/20 border-green-500/50',
        text: 'text-green-400',
        label: '已解决',
        icon: <CheckCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
      accepted: {
        bg: 'bg-gray-600/20 border-gray-500/50',
        text: 'text-gray-400',
        label: '已接受',
        icon: <CheckCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
    };
    
    const c = config[value as ConflictStatus];
    return (
      <span className={`inline-flex items-center gap-1 rounded border ${sizeClasses} ${c.bg} ${c.text} font-medium`}>
        {c.icon}
        {c.label}
      </span>
    );
  }
  
  if (type === 'conflictType') {
    const config: Record<ConflictType, { bg: string; text: string; label: string; icon: JSX.Element }> = {
      position: {
        bg: 'bg-red-600/20 border-red-500/50',
        text: 'text-red-400',
        label: '位置冲突',
        icon: <MapPin className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
      occlusion: {
        bg: 'bg-purple-600/20 border-purple-500/50',
        text: 'text-purple-400',
        label: '视线遮挡',
        icon: <Eye className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
      boundary: {
        bg: 'bg-orange-600/20 border-orange-500/50',
        text: 'text-orange-400',
        label: '镜头越界',
        icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />,
      },
    };
    
    const c = config[value as ConflictType];
    return (
      <span className={`inline-flex items-center gap-1 rounded border ${sizeClasses} ${c.bg} ${c.text} font-medium`}>
        {c.icon}
        {c.label}
      </span>
    );
  }
  
  return null;
}
