import { useExperimentStore } from '@/store/experimentStore';
import { generateDuplicateXExample, generateBoundaryOscillationExample, generateNoiseAmplificationExample } from '@/utils/interpolation';
import type { ExampleType } from '@/types';
import { AlertTriangle, Waves, Volume2 } from 'lucide-react';

const EXAMPLES: {
  type: ExampleType;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    type: 'duplicate_x',
    title: '重复 x 值',
    description: '同一 x 坐标出现两次，Lagrange 基函数分母为零',
    icon: <AlertTriangle size={20} />,
    color: 'rose',
  },
  {
    type: 'boundary_oscillation',
    title: '边界震荡',
    description: 'Runge 函数 15 点等距插值，边界处剧烈发散',
    icon: <Waves size={20} />,
    color: 'amber',
  },
  {
    type: 'noise_amplification',
    title: '噪声放大',
    description: '8 点 sin 函数加噪声，对比有无噪声的插值差异',
    icon: <Volume2 size={20} />,
    color: 'cyan',
  },
];

export default function ExampleCards() {
  const loadExample = useExperimentStore((s) => s.loadExample);

  const handleLoad = (type: ExampleType) => {
    switch (type) {
      case 'duplicate_x':
        loadExample(type, generateDuplicateXExample());
        break;
      case 'boundary_oscillation':
        loadExample(type, generateBoundaryOscillationExample());
        break;
      case 'noise_amplification':
        loadExample(type, generateNoiseAmplificationExample());
        break;
    }
  };

  const colorMap: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    rose: {
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30 hover:border-rose-500/60',
      text: 'text-rose-400',
      iconBg: 'bg-rose-500/20',
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30 hover:border-amber-500/60',
      text: 'text-amber-400',
      iconBg: 'bg-amber-500/20',
    },
    cyan: {
      bg: 'bg-cyan-500/10',
      border: 'border-cyan-500/30 hover:border-cyan-500/60',
      text: 'text-cyan-400',
      iconBg: 'bg-cyan-500/20',
    },
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4 space-y-3">
      <h3 className="text-sm font-medium text-white/80">边界样例</h3>
      <div className="grid grid-cols-3 gap-2">
        {EXAMPLES.map((ex) => {
          const c = colorMap[ex.color];
          return (
            <button
              key={ex.type}
              onClick={() => handleLoad(ex.type)}
              className={`${c.bg} ${c.border} border rounded-lg p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className={`${c.iconBg} w-8 h-8 rounded-md flex items-center justify-center ${c.text} mb-2`}>
                {ex.icon}
              </div>
              <div className={`text-xs font-medium ${c.text} mb-1`}>{ex.title}</div>
              <div className="text-[10px] text-white/40 leading-relaxed">{ex.description}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
