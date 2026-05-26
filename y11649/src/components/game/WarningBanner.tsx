import { useGameStore } from '@/store/useGameStore';
import { AlertTriangle, X, Check } from 'lucide-react';

export const WarningBanner = () => {
  const { warnings, resolveWarning } = useGameStore();

  const activeWarnings = warnings.filter(w => !w.isResolved);

  if (activeWarnings.length === 0) return null;

  const getTypeIcon = (type: string) => {
    return <AlertTriangle size={20} />;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'equipment-mismatch':
        return 'bg-orange-50 border-orange-300 text-orange-800';
      case 'route-closed':
        return 'bg-red-50 border-red-300 text-red-800';
      case 'injury-worsening':
        return 'bg-red-50 border-red-300 text-red-800 animate-pulse';
      default:
        return 'bg-yellow-50 border-yellow-300 text-yellow-800';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'equipment-mismatch':
        return '装备不匹配';
      case 'route-closed':
        return '路线关闭';
      case 'injury-worsening':
        return '伤情恶化';
      default:
        return '警告';
    }
  };

  return (
    <div className="space-y-2">
      {activeWarnings.map(warning => (
        <div
          key={warning.id}
          className={`flex items-start gap-3 p-3 rounded-lg border ${getTypeColor(warning.type)}`}
        >
          <div className="flex-shrink-0 mt-0.5">
            {getTypeIcon(warning.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">{getTypeLabel(warning.type)}</span>
              {warning.source && (
                <span className="text-xs opacity-70">来源: {warning.source}</span>
              )}
            </div>
            <p className="text-sm mt-1">{warning.message}</p>
          </div>
          <button
            onClick={() => resolveWarning(warning.id, '已确认并处理')}
            className="flex-shrink-0 p-1 rounded hover:bg-white/50 transition-colors"
            title="标记已处理"
          >
            <Check size={18} />
          </button>
        </div>
      ))}
    </div>
  );
};
