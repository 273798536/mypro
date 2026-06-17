import { useState } from 'react';
import type { GisPoint, VersionRecord } from '@/types';
import { Eye, EyeOff } from 'lucide-react';

interface RawDataViewerProps {
  point: GisPoint;
  versionHistory: VersionRecord[];
}

export function RawDataViewer({ point, versionHistory }: RawDataViewerProps) {
  const [showDiff, setShowDiff] = useState(true);
  const pointHistory = versionHistory.filter((v) => v.point_id === point.id);
  const changesByField = new Map<string, { old: string; new: string }>();
  pointHistory.forEach((v) => {
    changesByField.set(v.field_name, { old: v.old_value, new: v.new_value });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          以下为导入时的原始数据快照，<span className="text-red-600">红色删除线</span>
          为原始值，<span className="text-green-700">绿色</span>为已修正值
        </p>
        <button
          onClick={() => setShowDiff(!showDiff)}
          className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition-colors"
        >
          {showDiff ? <EyeOff size={14} /> : <Eye size={14} />}
          {showDiff ? '隐藏修正对比' : '显示修正对比'}
        </button>
      </div>
      <div className="p-4 bg-slate-900 rounded-sm font-mono text-xs overflow-x-auto">
        <div className="text-slate-400 mb-2">// 原始 JSON 数据 (raw_data)</div>
        <pre className="text-slate-100 whitespace-pre-wrap">
          {Object.entries(point.raw_data).map(([key, value]) => {
            const changed = changesByField.get(key);
            const displayValue = String(value ?? '');
            return (
              <div key={key} className="py-0.5">
                <span className="text-cyan-400">"{key}"</span>
                <span className="text-slate-500">: </span>
                {changed && showDiff ? (
                  <>
                    <span className="text-red-400 line-through">"{changed.old}"</span>
                    <span className="text-slate-500"> → </span>
                    <span className="text-green-400">"{changed.new}"</span>
                  </>
                ) : (
                  <span className="text-amber-300">"{displayValue}"</span>
                )}
                <span className="text-slate-500">,</span>
              </div>
            );
          })}
        </pre>
      </div>
      {pointHistory.length > 0 && (
        <div className="border-t border-slate-200 pt-3">
          <p className="text-xs font-semibold text-slate-600 mb-2">修正记录 ({pointHistory.length} 条)</p>
          <div className="space-y-1">
            {pointHistory.map((v) => (
              <div
                key={v.id}
                className="flex items-center gap-2 text-xs text-slate-600 py-1 px-2 bg-slate-50 rounded-sm"
              >
                <span className="text-slate-400">{v.changed_at.slice(5, 16)}</span>
                <span className="font-medium text-slate-700">{v.field_name}</span>
                <span className="text-red-500 line-through">{v.old_value}</span>
                <span className="text-slate-400">→</span>
                <span className="text-green-600">{v.new_value}</span>
                <span className="text-slate-400 ml-auto">{v.changed_by}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
