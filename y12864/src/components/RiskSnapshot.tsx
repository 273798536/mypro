import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RiskSnapshotProps {
  summary: {
    normal: number;
    pending: number;
    anomaly: number;
  };
}

export default function RiskSnapshot({ summary }: RiskSnapshotProps) {
  const navigate = useNavigate();
  const hasIssues = summary.pending > 0 || summary.anomaly > 0;

  if (!hasIssues) return null;

  return (
    <div
      className="mb-8 bg-gradient-to-r from-amber-50 to-rose-50 border border-amber-200 rounded-2xl p-6 cursor-pointer hover:shadow-lg transition-all duration-300"
      onClick={() => navigate('/anomalies')}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">风险快照</h3>
            <p className="text-sm text-slate-600">当前存在待确认和异常记录，点击查看详情</p>
          </div>
        </div>
        <div className="flex gap-3">
          {summary.pending > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-100 rounded-full">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-800">
                {summary.pending} 条待确认
              </span>
            </div>
          )}
          {summary.anomaly > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-100 rounded-full">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span className="text-sm font-semibold text-rose-800">
                {summary.anomaly} 条异常
              </span>
            </div>
          )}
          {summary.normal > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-100 rounded-full">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">
                {summary.normal} 条顺利
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
