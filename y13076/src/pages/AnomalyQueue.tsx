import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { ANOMALY_STATUS_LABELS } from '@/types';
import AnomalyTable from '@/components/AnomalyTable';
import AnomalyDetail from '@/components/AnomalyDetail';
import QuickGuide from '@/components/QuickGuide';

export default function AnomalyQueue() {
  const [showGuide, setShowGuide] = useState(true);

  const anomalies = useStore((s) => s.anomalies);
  const activeAnomalyId = useStore((s) => s.activeAnomalyId);

  const pending = anomalies.filter((a) => a.status === 'pending').length;
  const processing = anomalies.filter((a) => a.status === 'processing').length;
  const resolved = anomalies.filter((a) => a.status === 'resolved').length;

  return (
    <div className="h-screen bg-[#0a0e17] overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <h1 className="text-lg font-semibold text-white">异常队列</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="text-gray-400 hover:text-white p-1.5 transition-colors"
          >
            {showGuide ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <span className="px-2 py-0.5 bg-[#F59E0B]/20 text-[#F59E0B] text-xs rounded">
            {ANOMALY_STATUS_LABELS.pending} {pending}
          </span>
          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
            {ANOMALY_STATUS_LABELS.processing} {processing}
          </span>
          <span className="px-2 py-0.5 bg-[#00E5A0]/20 text-[#00E5A0] text-xs rounded">
            {ANOMALY_STATUS_LABELS.resolved} {resolved}
          </span>
        </div>
      </div>

      {showGuide && (
        <div className="px-4 shrink-0">
          <QuickGuide />
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <AnomalyTable />
        </div>
        {activeAnomalyId && (
          <div className="w-96 border-l border-gray-800 shrink-0">
            <AnomalyDetail />
          </div>
        )}
      </div>
    </div>
  );
}
