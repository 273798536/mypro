import { AlertCircle } from 'lucide-react';
import { AngleViolation } from './AngleViolation';
import { Oversampling } from './Oversampling';
import { ReverseFlow } from './ReverseFlow';

interface RiskAnalysisProps {
  className?: string;
}

export function RiskAnalysis({ className }: RiskAnalysisProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center gap-2">
        <AlertCircle className="w-5 h-5 text-slate-400" />
        <h3 className="text-white font-semibold">风险分析</h3>
      </div>

      <AngleViolation />
      <Oversampling />
      <ReverseFlow />
    </div>
  );
}
