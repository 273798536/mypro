import { useStore } from '@/store/useStore';
import type { IntegrationMethod } from '@/types';

export default function MethodSelector() {
  const selectedMethod = useStore((s) => s.selectedMethod);
  const setSelectedMethod = useStore((s) => s.setSelectedMethod);

  const methods: Array<{ key: IntegrationMethod; label: string; desc: string }> = [
    { key: 'trapezoidal', label: '梯形法', desc: 'O(h²)' },
    { key: 'simpson', label: '辛普森法', desc: 'O(h⁴)' },
  ];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">积分方法</h3>
      <div className="grid grid-cols-2 gap-2">
        {methods.map((m) => (
          <button
            key={m.key}
            onClick={() => setSelectedMethod(m.key)}
            className={`px-3 py-2.5 rounded-lg border text-left transition-all ${
              selectedMethod === m.key
                ? 'border-amber-500/60 bg-amber-500/10 text-amber-300'
                : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:border-slate-500'
            }`}
          >
            <div className="text-sm font-medium">{m.label}</div>
            <div className="text-[10px] mt-0.5 opacity-60">{m.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
