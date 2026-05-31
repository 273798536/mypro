import { useState } from 'react';
import { motion } from 'framer-motion';
import { Upload, Music, FileText, Play, CheckCircle2, ArrowRight } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/utils/helpers';

export function DataImport() {
  const { loadSampleData, importPhase, tracks, reset } = useStore();
  const [activeStep, setActiveStep] = useState<'phase1' | 'phase2'>(importPhase === 'INIT' ? 'phase1' : importPhase === 'PHASE1' ? 'phase2' : 'phase1');

  const steps = [
    {
      id: 'phase1',
      title: '第一阶段',
      subtitle: '导入曲目清单和版本时长',
      description: '导入基础曲目数据，包括曲目名称和各版本时长',
      icon: Music,
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/20'
    },
    {
      id: 'phase2',
      title: '第二阶段',
      subtitle: '补充返场规则',
      description: '设置返场曲目数量限制、时长限制等规则',
      icon: FileText,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/20'
    }
  ];

  return (
    <div className="bg-indigo-900/30 rounded-xl p-5 border border-indigo-800">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Upload className="w-5 h-5 text-amber-450" />
          <h3 className="font-semibold text-lg">数据导入向导</h3>
        </div>
        {tracks.length > 0 && (
          <button
            onClick={reset}
            className="text-xs px-2 py-1 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded transition-colors"
          >
            重置数据
          </button>
        )}
      </div>

      <div className="flex gap-4 mb-5">
        {steps.map((step, idx) => (
          <div key={step.id} className="flex-1">
            <button
              onClick={() => setActiveStep(step.id as any)}
              className={cn(
                'w-full p-4 rounded-lg border text-left transition-all',
                activeStep === step.id
                  ? 'bg-amber-450/10 border-amber-450'
                  : 'bg-indigo-800/30 border-indigo-700 hover:border-indigo-600'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-lg', step.bgColor)}>
                  <step.icon className={cn('w-5 h-5', step.color)} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{step.title}</span>
                    {importPhase === step.id.toUpperCase() && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-gray-400">{step.subtitle}</p>
                </div>
              </div>
            </button>
            {idx < steps.length - 1 && (
              <div className="flex justify-center -my-2 relative z-10">
                <div className="bg-indigo-900 p-1 rounded-full">
                  <ArrowRight className="w-4 h-4 text-gray-500" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <motion.div
        key={activeStep}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-indigo-800/30 rounded-lg"
      >
        <p className="text-sm text-gray-400 mb-4">
          {steps.find(s => s.id === activeStep)?.description}
        </p>

        <div className="space-y-3">
          <button
            onClick={() => {
              if (activeStep === 'phase1') {
                loadSampleData('phase1');
              } else {
                loadSampleData('phase2');
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-450 text-indigo-950 font-medium rounded-lg hover:bg-amber-400 transition-colors"
          >
            <Play className="w-4 h-4" />
            {activeStep === 'phase1' ? '加载示例曲目数据' : '补充返场规则示例'}
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-xs text-gray-500">或</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          <button
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-800 border border-dashed border-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors text-gray-300"
          >
            <Upload className="w-4 h-4" />
            上传CSV文件
          </button>
        </div>

        {activeStep === 'phase2' && importPhase === 'PHASE2' && (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <p className="text-sm text-emerald-400">
              ✓ 返场规则已生效！系统检测到以下变化：
            </p>
            <ul className="mt-2 text-xs text-gray-400 space-y-1">
              <li>• 返场曲目数量限制：2首</li>
              <li>• 返场时长限制：8分钟</li>
              <li>• 版本差异阈值：10%</li>
            </ul>
          </div>
        )}
      </motion.div>
    </div>
  );
}
