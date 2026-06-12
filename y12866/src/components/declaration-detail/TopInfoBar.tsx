import { Anchor, Ship, Calendar, User, ArrowRight, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Declaration } from '@/types';
import RiskLevelBadge from '@/components/common/RiskLevelBadge';

interface Props {
  declaration: Declaration;
}

export default function TopInfoBar({ declaration }: Props) {
  const navigate = useNavigate();

  return (
    <div className="bg-ocean-800 text-white rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Ship className="w-5 h-5 text-aqua-400" />
            <h1 className="text-xl font-serif font-bold">{declaration.vesselName}</h1>
            <span className="text-xs text-ocean-200 font-mono">{declaration.vesselNo}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <RiskLevelBadge level={declaration.currentRiskLevel} size="lg" />
          <button
            onClick={() => navigate(`/declaration/${declaration.id}/review-shot`)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-aqua-500 hover:bg-aqua-400 text-ocean-900 rounded-lg text-sm font-medium transition-colors"
          >
            <Camera className="w-4 h-4" />
            评审截图模式
          </button>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="flex items-center gap-1.5 text-ocean-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>到港：{declaration.arrivalTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-ocean-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>离港：{declaration.departureTime}</span>
        </div>
        <div className="flex items-center gap-1.5 text-ocean-200">
          <User className="w-3.5 h-3.5" />
          <span>申报人：{declaration.applicant}</span>
        </div>
        <div className="flex items-center gap-1.5 text-ocean-200">
          <Anchor className="w-3.5 h-3.5" />
          <span>申报时间：{declaration.applyTime}</span>
        </div>
      </div>
    </div>
  );
}
