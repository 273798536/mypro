import { CheckCircle2, AlertCircle, Pencil } from 'lucide-react';
import type { Declaration, WeatherGapItem } from '@/types';
import { useDeclarationStore } from '@/stores/useDeclarationStore';

interface Props {
  declaration: Declaration;
}

export default function WeatherGapSection({ declaration }: Props) {
  const fillWeatherGap = useDeclarationStore(s => s.fillWeatherGap);
  const filled = declaration.weatherGaps.filter(g => g.status === 'filled' || g.status === 'not-needed');
  const missing = declaration.weatherGaps.filter(g => g.status === 'missing');

  if (declaration.weatherGaps.length === 0) {
    return (
      <div className="card-ocean p-4">
        <h3 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
          <span className="w-1 h-4 bg-green-400 rounded-full" />
          气象数据
        </h3>
        <div className="text-center py-4 text-slate-400 text-sm">
          ✅ 气象数据完整，无需补录
        </div>
      </div>
    );
  }

  return (
    <div className="card-ocean p-4">
      <h3 className="text-sm font-semibold text-ocean-800 mb-3 flex items-center gap-2">
        <span className="w-1 h-4 bg-green-400 rounded-full" />
        气象数据处理
        {missing.length > 0 && (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] rounded-full font-mono">
            {missing.length} 项待补
          </span>
        )}
      </h3>

      {filled.length > 0 && (
        <div className="mb-3 bg-green-50 border border-green-100 rounded-lg p-3">
          <div className="text-[10px] text-green-600 font-medium mb-2 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            已完成计算项
          </div>
          <div className="space-y-1.5">
            {filled.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-xs">
                <span className="text-green-700">{item.displayName}</span>
                <span className="text-[10px] text-green-500">
                  已用于：{item.alreadyCompleted.join('、') || '基础判定'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {missing.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-lg p-3">
          <div className="text-[10px] text-red-600 font-medium mb-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            待补录数据（不影响已计算结果）
          </div>
          <div className="space-y-2">
            {missing.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-2 text-xs">
                <div className="flex-1">
                  <div className="text-red-700 font-medium">{item.displayName}</div>
                  <div className="text-[10px] text-red-400 mt-0.5">
                    缺此项影响：{item.requiredForCalculations.join('、')}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    仍可计算：{item.alreadyCompleted.join('、') || '基础盐度与交换率判定'}
                  </div>
                </div>
                <button
                  onClick={() => fillWeatherGap(declaration.id, item.id)}
                  className="flex items-center gap-1 px-2 py-1 bg-white border border-red-200 rounded text-[10px] text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                >
                  <Pencil className="w-3 h-3" />
                  补录
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-[10px] text-slate-400 border-t border-gray-50 pt-2">
        策略：先把能算的算完，再把缺口列给场长补 → 渐进式计算，不会因部分数据缺失而整批失败
      </div>
    </div>
  );
}
