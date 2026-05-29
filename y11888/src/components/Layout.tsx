import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Database, Calculator, CheckCircle2, FileText } from 'lucide-react';

interface LayoutProps {
  children: ReactNode;
  currentStep: number;
  onStepChange: (step: number) => void;
}

const steps = [
  { id: 0, name: '数据导入', icon: Database, description: '加载样例或上传数据' },
  { id: 1, name: '样本量计算', icon: Calculator, description: '设置参数，计算结果' },
  { id: 2, name: '校验分析', icon: CheckCircle2, description: '流量与分组校验' },
  { id: 3, name: '报告导出', icon: FileText, description: '生成报告并导出' },
];

export default function Layout({ children, currentStep, onStepChange }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 bg-grid-pattern">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-mono font-semibold text-space-blue-800">
                A/B实验样本量试算
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                科学计算实验所需样本，确保统计功效
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-400 font-mono">
                v1.0.0
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-1 py-2">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <button
                  key={step.id}
                  onClick={() => onStepChange(index)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-200',
                    'hover:bg-gray-50',
                    isActive && 'bg-tech-cyan-50 text-tech-cyan-600',
                    isCompleted && 'text-success-green',
                    !isActive && !isCompleted && 'text-gray-500'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{step.name}</span>
                  {index < steps.length - 1 && (
                    <div className="ml-4 text-gray-300">→</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>数据安全：所有计算在本地完成，不上传服务器</span>
            <span className="font-mono">基于统计功效分析</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
