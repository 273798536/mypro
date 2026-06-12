import { useNavigate } from 'react-router-dom';
import { ChevronRight, Clock, AlertTriangle } from 'lucide-react';
import type { Declaration } from '@/types';
import RiskLevelBadge from '@/components/common/RiskLevelBadge';

interface Props {
  declarations: Declaration[];
}

const statusLabels: Record<string, { text: string; color: string }> = {
  pending: { text: '待复核', color: 'bg-slate-100 text-slate-600' },
  reviewing: { text: '复核中', color: 'bg-blue-100 text-blue-700' },
  completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
};

export default function DeclarationList({ declarations }: Props) {
  const navigate = useNavigate();

  return (
    <div className="card-ocean overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ocean-800">待复核申报</h3>
        <span className="text-xs text-slate-400">{declarations.length} 条记录</span>
      </div>
      <div className="divide-y divide-gray-50">
        {declarations.map((decl) => {
          const anomalyCount = decl.boundaryIssues.length + decl.weatherGaps.filter(g => g.status === 'missing').length;
          const statusInfo = statusLabels[decl.status] || statusLabels.pending;
          return (
            <div
              key={decl.id}
              onClick={() => navigate(`/declaration/${decl.id}`)}
              className="px-4 py-3 flex items-center hover:bg-ocean-50 transition-colors duration-150 cursor-pointer group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-slate-800 truncate">{decl.vesselName}</span>
                  <RiskLevelBadge level={decl.currentRiskLevel} size="sm" />
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${statusInfo.color}`}>
                    {statusInfo.text}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {decl.arrivalTime.substring(5, 16)}
                  </span>
                  <span>{decl.applicant}</span>
                  {anomalyCount > 0 && (
                    <span className="flex items-center gap-1 text-orange-500">
                      <AlertTriangle className="w-3 h-3" />
                      {anomalyCount} 项异常
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-ocean-600 transition-colors" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
