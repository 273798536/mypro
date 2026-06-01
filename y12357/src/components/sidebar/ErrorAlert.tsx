import { AlertTriangle, XCircle, AlertCircle, ChevronRight } from 'lucide-react';
import { useAppStore, useFlywheelErrors } from '../../store/useAppStore';
import { 
  formatFrictionOmissionMessage, 
  formatUnitErrorMessage, 
  formatSamplingGapMessage 
} from '../../engine/errorDetector';
import type { Flywheel } from '../../types';

interface ErrorAlertProps {
  flywheel: Flywheel | null;
}

export function ErrorAlert({ flywheel }: ErrorAlertProps) {
  const { setShowDetailPanel, setCurrentTime } = useAppStore();
  const { unitErrors, frictionOmissions, samplingGaps } = useFlywheelErrors(flywheel?.id);
  
  const totalErrors = unitErrors.length + frictionOmissions.length + samplingGaps.length;
  
  if (totalErrors === 0) {
    return (
      <div className="industrial-card p-4">
        <div className="section-title flex items-center gap-2">
          <AlertTriangle size={14} />
          错误预警
        </div>
        <div className="success-alert text-sm">
          ✓ 未检测到异常
        </div>
      </div>
    );
  }
  
  return (
    <div className="industrial-card p-4 border-alert-red/30">
      <div className="section-title flex items-center justify-between">
        <div className="flex items-center gap-2 text-alert-red">
          <XCircle size={14} />
          错误预警
          <span className="bg-alert-red text-white text-xs px-1.5 py-0.5 rounded-sm">
            {totalErrors}
          </span>
        </div>
        <button
          onClick={() => setShowDetailPanel(true)}
          className="text-xs text-tech-400 hover:text-tech-300 flex items-center gap-0.5"
        >
          查看详情
          <ChevronRight size={12} />
        </button>
      </div>
      
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {frictionOmissions.map(omission => (
          <div 
            key={omission.id} 
            className="error-alert text-xs cursor-pointer hover:bg-red-950/80 transition-colors"
            onClick={() => setShowDetailPanel(true)}
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-alert-red" />
              <div>{formatFrictionOmissionMessage(omission)}</div>
            </div>
          </div>
        ))}
        
        {unitErrors.map(error => (
          <div 
            key={error.id} 
            className="error-alert text-xs cursor-pointer hover:bg-red-950/80 transition-colors"
            onClick={() => setShowDetailPanel(true)}
          >
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-alert-red" />
              <div>{formatUnitErrorMessage(error)}</div>
            </div>
          </div>
        ))}
        
        {samplingGaps.map(gap => (
          <div 
            key={gap.id} 
            className="warning-alert text-xs cursor-pointer hover:bg-orange-950/80 transition-colors"
            onClick={() => {
              setCurrentTime(gap.startTime);
              setShowDetailPanel(true);
            }}
          >
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className="shrink-0 mt-0.5 text-alert-orange" />
              <div>{formatSamplingGapMessage(gap)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
