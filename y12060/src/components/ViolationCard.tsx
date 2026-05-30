import { AlertTriangle, Ruler, EyeOff, Gauge, Clock, MapPin } from 'lucide-react';
import { CollisionRecord } from '../types/game';
import { formatTimeWithMs } from '../utils/collision';

interface ViolationCardProps {
  violation: CollisionRecord;
  index?: number;
  isSelected?: boolean;
  onClick?: () => void;
  onJumpTo?: (timestamp: number) => void;
}

export function ViolationCard({ violation, index = 0, isSelected = false, onClick, onJumpTo }: ViolationCardProps) {
  const getTypeConfig = () => {
    switch (violation.type) {
      case 'shelf':
        return {
          icon: AlertTriangle,
          color: 'red',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: '货架碰撞'
        };
      case 'overheight':
        return {
          icon: Ruler,
          color: 'yellow',
          bgColor: 'bg-yellow-500/10',
          borderColor: 'border-yellow-500/30',
          label: '超高装载'
        };
      case 'blindzone':
        return {
          icon: EyeOff,
          color: 'orange',
          bgColor: 'bg-orange-500/10',
          borderColor: 'border-orange-500/30',
          label: '盲区穿行'
        };
      default:
        return {
          icon: AlertTriangle,
          color: 'gray',
          bgColor: 'bg-gray-500/10',
          borderColor: 'border-gray-500/30',
          label: '违规'
        };
    }
  };
  
  const getSeverityConfig = () => {
    switch (violation.severity) {
      case 'severe':
        return { label: '严重', color: 'text-red-500', bgColor: 'bg-red-500/20' };
      case 'moderate':
        return { label: '中等', color: 'text-yellow-500', bgColor: 'bg-yellow-500/20' };
      case 'minor':
        return { label: '轻微', color: 'text-green-500', bgColor: 'bg-green-500/20' };
      default:
        return { label: '未知', color: 'text-gray-500', bgColor: 'bg-gray-500/20' };
    }
  };
  
  const config = getTypeConfig();
  const severity = getSeverityConfig();
  const Icon = config.icon;
  
  return (
    <div 
      className={`p-4 rounded-xl ${config.bgColor} border ${isSelected ? 'border-orange-500 ring-2 ring-orange-500/50' : config.borderColor} cursor-pointer hover:scale-[1.02] transition-all`}
      onClick={() => {
        onClick?.();
        onJumpTo?.(violation.timestamp);
      }}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg ${severity.bgColor}`}>
          <Icon className={`w-6 h-6 ${severity.color}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white">#{index + 1}</span>
              <span className={`text-sm font-medium ${severity.color}`}>{config.label}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${severity.bgColor} ${severity.color}`}>
                {severity.label}
              </span>
            </div>
            <span className="text-sm text-gray-400">-{violation.pointsDeducted}分</span>
          </div>
          
          <p className="text-sm text-gray-300 mb-3">{violation.objectName}</p>
          
          <div className="flex flex-wrap gap-4 text-xs text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatTimeWithMs(violation.timestamp)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>({violation.position.x.toFixed(1)}, {violation.position.z.toFixed(1)})</span>
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span>{violation.speed.toFixed(1)} km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
