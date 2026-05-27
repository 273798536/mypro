import type { Scheme } from '@/types';
import { ChevronRight } from 'lucide-react';

interface Props {
  schemes: Scheme[];
  onSelect: (id: string) => void;
}

function highlightMin(row: string[], values: number[]) {
  if (values.length === 0) return row.map((v) => ({ text: v, highlight: false }));
  const minVal = Math.min(...values);
  return row.map((text, i) => ({
    text,
    highlight: values[i] === minVal && values.filter((v) => v === minVal).length === 1,
  }));
}

export default function SchemeCompareTable({ schemes, onSelect }: Props) {
  if (schemes.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <p className="text-slate-400 text-sm">请从方案管理页选择至少2个方案进行对比</p>
      </div>
    );
  }

  const wqValues = schemes.map((s) => s.result.Wq);
  const lqValues = schemes.map((s) => s.result.Lq);
  const utilValues = schemes.map((s) => 1 - s.result.utilization);

  const wqRow = highlightMin(schemes.map((s) => s.result.Wq.toFixed(2)), wqValues);
  const lqRow = highlightMin(schemes.map((s) => s.result.Lq.toFixed(2)), lqValues);
  const utilRow = highlightMin(
    schemes.map((s) => (s.result.utilization * 100).toFixed(1)),
    utilValues,
  );

  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="text-left text-slate-400 font-medium px-4 py-3 w-32">指标</th>
              {schemes.map((s) => (
                <th key={s.id} className="text-center text-slate-200 font-medium px-4 py-3">
                  <button
                    onClick={() => onSelect(s.id)}
                    className="hover:text-amber-400 transition-colors inline-flex items-center gap-1"
                  >
                    {s.name}
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            <tr>
              <td className="px-4 py-3 text-slate-400">到达率</td>
              {schemes.map((s) => (
                <td key={s.id} className="text-center px-4 py-3 text-slate-200">
                  {s.params.arrivalRate}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">柜台数</td>
              {schemes.map((s) => (
                <td key={s.id} className="text-center px-4 py-3 text-slate-200">
                  {s.params.numCounters}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">平均等待时间</td>
              {wqRow.map((r, i) => (
                <td key={i} className={`text-center px-4 py-3 ${r.highlight ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                  {r.text} 分钟
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">平均队列长度</td>
              {lqRow.map((r, i) => (
                <td key={i} className={`text-center px-4 py-3 ${r.highlight ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                  {r.text} 人
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">柜台利用率</td>
              {utilRow.map((r, i) => (
                <td key={i} className={`text-center px-4 py-3 ${r.highlight ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                  {r.text}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">服务强度 ρ</td>
              {schemes.map((s) => (
                <td key={s.id} className={`text-center px-4 py-3 ${s.result.rho >= 0.8 ? 'text-amber-400' : 'text-slate-200'}`}>
                  {s.result.rho.toFixed(4)}
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">等待概率</td>
              {schemes.map((s) => (
                <td key={s.id} className="text-center px-4 py-3 text-slate-200">
                  {(s.result.Pw * 100).toFixed(1)}%
                </td>
              ))}
            </tr>
            <tr>
              <td className="px-4 py-3 text-slate-400">异常项</td>
              {schemes.map((s) => (
                <td key={s.id} className="text-center px-4 py-3">
                  {s.anomalies.length > 0 ? (
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      s.anomalies.some((a) => a.severity === 'critical')
                        ? 'bg-red-900/40 text-red-400'
                        : 'bg-amber-900/40 text-amber-400'
                    }`}>
                      {s.anomalies.length} 项
                    </span>
                  ) : (
                    <span className="text-xs text-emerald-400">无</span>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 bg-slate-900/30 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">
          <span className="inline-block w-3 h-3 bg-emerald-500 rounded-sm mr-1 align-middle" /> 表示该指标最优
        </p>
      </div>
    </div>
  );
}
