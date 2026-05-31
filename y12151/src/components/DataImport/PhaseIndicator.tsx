import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { Phase } from '../../types';
import { STAGE_LABELS } from '../../constants/config';

interface PhaseIndicatorProps {
  currentPhase: Phase;
  hasPhase1Data: boolean;
  hasPhase2Data: boolean;
}

export const PhaseIndicator = ({ currentPhase, hasPhase1Data, hasPhase2Data }: PhaseIndicatorProps) => {
  const phases = [
    { key: 'phase1' as Phase, label: '第一阶段', sublabel: '导入测距和温度数据' },
    { key: 'phase2' as Phase, label: '第二阶段', sublabel: '补录反射面材质' },
  ];

  return (
    <div className="flex items-center justify-center gap-4 p-4 bg-white rounded-xl border border-gray-200">
      {phases.map((phase, index) => {
        const isActive = currentPhase === phase.key;
        const isCompleted = (phase.key === 'phase1' && hasPhase1Data) || 
                           (phase.key === 'phase2' && hasPhase2Data);
        
        return (
          <div key={phase.key} className="flex items-center">
            <div className={`flex flex-col items-center ${isActive ? 'opacity-100' : isCompleted ? 'opacity-80' : 'opacity-50'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                isCompleted 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : isActive 
                    ? 'border-[#3E92CC] bg-[#3E92CC]/10' 
                    : 'border-gray-300'
              }`}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <span className={`font-bold ${isActive ? 'text-[#3E92CC]' : 'text-gray-400'}`}>
                    {index + 1}
                  </span>
                )}
              </div>
              <div className="mt-2 text-center">
                <p className={`text-sm font-medium ${isActive ? 'text-[#0A2463]' : 'text-gray-500'}`}>
                  {phase.label}
                </p>
                <p className="text-xs text-gray-400">{phase.sublabel}</p>
              </div>
            </div>
            {index < phases.length - 1 && (
              <div className={`mx-4 ${isCompleted ? 'text-green-500' : 'text-gray-300'}`}>
                <ArrowRight className="w-5 h-5" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
