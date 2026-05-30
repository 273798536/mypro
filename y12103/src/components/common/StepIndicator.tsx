import { Check, Upload, ShoppingCart, Calendar, ArrowRight } from 'lucide-react';
import type { ImportStep } from '@/types';

interface StepIndicatorProps {
  currentStep: ImportStep;
  salesImported: boolean;
  inventoryImported: boolean;
  promotionImported: boolean;
}

const steps = [
  {
    key: 'sales' as ImportStep,
    label: '销售历史',
    icon: ShoppingCart,
    description: '导入SKU销售记录',
  },
  {
    key: 'inventory' as ImportStep,
    label: '库存快照',
    icon: Upload,
    description: '导入当前库存数据',
  },
  {
    key: 'promotion' as ImportStep,
    label: '促销日历',
    icon: Calendar,
    description: '（可选）导入促销活动',
  },
];

export default function StepIndicator({
  currentStep,
  salesImported,
  inventoryImported,
  promotionImported,
}: StepIndicatorProps) {
  const isCompleted = (key: ImportStep) => {
    if (key === 'sales') return salesImported;
    if (key === 'inventory') return inventoryImported;
    if (key === 'promotion') return promotionImported;
    return false;
  };
  
  const isActive = (key: ImportStep) => {
    if (key === 'sales') return currentStep === 'sales';
    if (key === 'inventory') return currentStep === 'inventory';
    if (key === 'promotion') return currentStep === 'promotion';
    return false;
  };
  
  return (
    <div className="bg-white rounded-xl shadow-card p-6">
      <h3 className="text-lg font-display font-semibold text-neutral-800 mb-6">数据导入进度</h3>
      
      <div className="flex items-start justify-between">
        {steps.map((step, index) => {
          const completed = isCompleted(step.key);
          const active = isActive(step.key);
          const Icon = step.icon;
          
          return (
            <div key={step.key} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    completed
                      ? 'bg-success-500 text-white'
                      : active
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                      : 'bg-neutral-100 text-neutral-400'
                  }`}
                >
                  {completed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                </div>
                <p
                  className={`mt-3 text-sm font-medium ${
                    completed || active ? 'text-neutral-800' : 'text-neutral-400'
                  }`}
                >
                  {step.label}
                </p>
                <p className="mt-1 text-xs text-neutral-500 text-center max-w-[120px]">
                  {step.description}
                </p>
              </div>
              
              {index < steps.length - 1 && (
                <div className="absolute top-6 left-[60%] right-0">
                  <ArrowRight
                    className={`w-5 h-5 mx-auto ${
                      completed ? 'text-success-400' : 'text-neutral-200'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
