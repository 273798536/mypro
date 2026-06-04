import { AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { CoordinateCheckResult } from '@/types';

interface FlipAlertCardProps {
  deviceName: string;
  result: CoordinateCheckResult;
  onConfirm: () => void;
  confirmed?: boolean;
}

export function FlipAlertCard({
  deviceName,
  result,
  onConfirm,
  confirmed,
}: FlipAlertCardProps) {
  const getIcon = () => {
    if (confirmed) return <CheckCircle className="text-green-500" size={20} />;
    if (result.flipType === 'out_of_range')
      return <AlertTriangle className="text-red-500" size={20} />;
    return <AlertTriangle className="text-amber-500" size={20} />;
  };

  const getBgColor = () => {
    if (confirmed) return 'bg-green-50 border-green-200';
    if (result.flipType === 'out_of_range') return 'bg-red-50 border-red-200';
    return 'bg-amber-50 border-amber-200';
  };

  return (
    <div className={`p-4 rounded-lg border ${getBgColor()} transition-all`}>
      <div className="flex items-start gap-3">
        {getIcon()}
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800 text-sm mb-1">
            {deviceName} - 坐标异常检测
          </h4>
          <p className="text-sm text-gray-600 leading-relaxed">{result.reason}</p>
          <div className="mt-2 flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-500">原始值: </span>
              <span className="font-mono text-red-600 line-through">
                {result.correctedY.toFixed(4)}, {result.correctedX.toFixed(4)}
              </span>
            </div>
            <div>
              <span className="text-gray-500">修正值: </span>
              <span className="font-mono text-green-600 font-medium">
                {result.correctedX.toFixed(4)}, {result.correctedY.toFixed(4)}
              </span>
            </div>
          </div>
          {!confirmed && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={onConfirm}
                className="px-3 py-1.5 bg-[#1e3a5f] text-white rounded text-xs hover:bg-[#2a4a7a] transition-colors"
              >
                确认修正
              </button>
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Info size={12} />
                修正后设备将显示在正确位置
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
