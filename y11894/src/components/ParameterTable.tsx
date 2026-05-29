import { AlertTriangle } from 'lucide-react';
import { useFitStore } from '../hooks/useFitStore';
import { getModelById } from '../utils/models';

export default function ParameterTable() {
  const { fitResult, selectedModelId, boundaryTouch, paramBounds } =
    useFitStore();
  const model = getModelById(selectedModelId);

  if (!fitResult || !model) {
    return (
      <div className="flex items-center justify-center h-20 text-zinc-600 text-sm">
        拟合成功后显示参数表
      </div>
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-zinc-800">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-zinc-800/80">
            <th className="px-2 py-1.5 text-left text-zinc-400 font-medium">参数</th>
            <th className="px-2 py-1.5 text-right text-zinc-400 font-medium">估计值</th>
            <th className="px-2 py-1.5 text-right text-zinc-400 font-medium">标准误</th>
            <th className="px-2 py-1.5 text-right text-zinc-400 font-medium">95% CI</th>
            <th className="px-2 py-1.5 text-center text-zinc-400 font-medium">边界</th>
          </tr>
        </thead>
        <tbody>
          {model.paramNames.map((name, i) => {
            const touchesBound = boundaryTouch[i];
            const ci = fitResult.confidenceIntervals[i];
            return (
              <tr
                key={name}
                className={`border-t border-zinc-800/50 ${
                  touchesBound ? 'bg-amber-500/5' : ''
                }`}
              >
                <td className="px-2 py-1.5 text-zinc-200 font-mono">{name}</td>
                <td className="px-2 py-1.5 text-right text-zinc-200 font-mono">
                  {fitResult.parameters[i].toPrecision(6)}
                </td>
                <td className="px-2 py-1.5 text-right text-zinc-400 font-mono">
                  {fitResult.standardErrors[i].toPrecision(3)}
                </td>
                <td className="px-2 py-1.5 text-right text-zinc-400 font-mono">
                  [{ci[0].toPrecision(3)}, {ci[1].toPrecision(3)}]
                </td>
                <td className="px-2 py-1.5 text-center">
                  {touchesBound ? (
                    <span className="inline-flex items-center gap-1 text-amber-400">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="text-[10px]">触达</span>
                    </span>
                  ) : (
                    <span className="text-zinc-600 text-[10px]">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {boundaryTouch.some((t) => t) && (
        <div className="p-2 border-t border-zinc-800/50 bg-amber-500/5 text-[10px] text-amber-300">
          参数触及边界意味着估计可能受约束限制，建议放宽边界或检查初值
        </div>
      )}
    </div>
  );
}
