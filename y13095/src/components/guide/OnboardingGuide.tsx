import { useState } from 'react';
import { MapPin, AlertTriangle, Download, ArrowRight, X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onGoToSample: () => void;
  onGoToAbnormal: () => void;
  onExport: () => void;
}

const steps = [
  {
    id: 'sample',
    title: '样例在哪？',
    description: '点击"异常"按钮快速定位所有异常点位，红色闪烁的就是需要重点关注的复核对象。',
    icon: MapPin,
    color: 'text-space-400',
    action: '查看样例',
  },
  {
    id: 'abnormal',
    title: '异常在哪？',
    description: '地图上红色脉冲的点位就是异常，左侧列表也会标记红点。点击点位查看详情和历史记录。',
    icon: AlertTriangle,
    color: 'text-aviation-red',
    action: '定位异常',
  },
  {
    id: 'export',
    title: '结果怎么导出？',
    description: '点击右上角"导出"按钮，可选择导出全部点位、仅异常点位，支持 CSV 和 JSON 格式，含完整修改历史。',
    icon: Download,
    color: 'text-aviation-green',
    action: '导出结果',
  },
];

export function OnboardingGuide({
  isOpen,
  onClose,
  onGoToSample,
  onGoToAbnormal,
  onExport,
}: OnboardingGuideProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
      setCurrentStep(0);
    }
  };

  const handleAction = () => {
    if (step.id === 'sample') {
      onGoToSample();
    } else if (step.id === 'abnormal') {
      onGoToAbnormal();
    } else if (step.id === 'export') {
      onExport();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex gap-2">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={cn(
                'w-3 h-3 rounded-full transition-all',
                i <= currentStep
                  ? 'bg-aviation-blue scale-110'
                  : 'bg-space-600'
              )}
            />
          ))}
        </div>

        <div className="bg-space-900 border border-space-600 rounded-xl shadow-2xl overflow-hidden">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded hover:bg-space-800 text-space-400 transition-colors"
          >
            <X size={18} />
          </button>

          <div className="p-6">
            <div
              className={cn(
                'w-14 h-14 rounded-2xl flex items-center justify-center mb-4 mx-auto',
                step.id === 'sample' && 'bg-space-800',
                step.id === 'abnormal' && 'bg-aviation-red/20',
                step.id === 'export' && 'bg-aviation-green/20'
              )}
            >
              <Icon size={28} className={step.color} />
            </div>

            <h2 className="text-xl font-semibold text-center text-space-100 mb-2">
              {step.title}
            </h2>
            <p className="text-sm text-space-400 text-center mb-6 leading-relaxed">
              {step.description}
            </p>

            <div className="flex gap-3">
              <button
                onClick={handleAction}
                className={cn(
                  'flex-1 py-2.5 rounded-lg text-sm font-medium transition-all btn-hover flex items-center justify-center gap-2',
                  step.id === 'abnormal'
                    ? 'bg-aviation-red text-white hover:bg-red-600'
                    : step.id === 'export'
                    ? 'bg-aviation-green text-white hover:bg-green-600'
                    : 'bg-space-700 text-space-100 hover:bg-space-600'
                )}
              >
                <Icon size={16} />
                {step.action}
              </button>
              <button
                onClick={handleNext}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-aviation-blue text-white hover:bg-blue-700 transition-all btn-hover flex items-center justify-center gap-2"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    下一步
                    <ArrowRight size={16} />
                  </>
                ) : (
                  <>
                    <Check size={16} />
                    完成
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-space-500 text-center mt-4">
              {currentStep + 1} / {steps.length} · 接班快速指引
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
