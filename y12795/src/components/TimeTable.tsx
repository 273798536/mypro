import { Plus, Trash2 } from 'lucide-react';
import type { ReactionTime } from '@/types';
import { SourceBadge } from './SourceBadge';

interface TimeTableProps {
  times: ReactionTime[];
  onUpdate: (id: string, updates: Partial<ReactionTime>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function TimeTable({ times, onUpdate, onAdd, onRemove }: TimeTableProps) {
  return (
    <div className="lab-card overflow-hidden">
      <div className="p-4 border-b border-lab-line flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-lab-navy">反应时间记录</h3>
        <button
          onClick={onAdd}
          className="lab-btn bg-lab-navy text-white hover:bg-lab-navyLight flex items-center gap-1.5 text-sm"
        >
          <Plus size={16} /> 添加记录
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="lab-table">
          <thead>
            <tr>
              <th className="w-16 sticky left-0 z-10">原始行号</th>
              <th>点火时间 (s)</th>
              <th>总燃烧时间 (s)</th>
              <th>是否漏记</th>
              <th>备注</th>
              <th>来源</th>
              <th className="w-16">操作</th>
            </tr>
          </thead>
          <tbody>
            {times.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-8 text-gray-400">
                  暂无反应时间记录
                </td>
              </tr>
            ) : (
              times.map((rt) => (
                <tr key={rt.id} className={rt.isMissing ? 'animate-pulse-soft' : ''}>
                  <td className="sticky left-0 bg-white z-10">
                    <input
                      type="number"
                      value={rt.originalRowNumber}
                      onChange={(e) => onUpdate(rt.id, { originalRowNumber: Number(e.target.value) })}
                      className="lab-input w-14"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={rt.ignitionTime ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        onUpdate(rt.id, { ignitionTime: v, isMissing: v === null && rt.totalDuration === null });
                      }}
                      className={`lab-input w-24 ${rt.isMissing ? 'border-lab-red bg-red-50' : ''}`}
                      placeholder="如：8"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      value={rt.totalDuration ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        onUpdate(rt.id, { totalDuration: v, isMissing: v === null && rt.ignitionTime === null });
                      }}
                      className={`lab-input w-24 ${rt.isMissing ? 'border-lab-red bg-red-50' : ''}`}
                      placeholder="如：24"
                    />
                  </td>
                  <td>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rt.isMissing}
                        onChange={(e) => onUpdate(rt.id, { isMissing: e.target.checked })}
                        className="w-4 h-4 accent-lab-red"
                      />
                      <span className={`text-sm ${rt.isMissing ? 'text-lab-red font-medium' : ''}`}>
                        {rt.isMissing ? '已标记漏记' : '正常'}
                      </span>
                    </label>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={rt.remark}
                      onChange={(e) => onUpdate(rt.id, { remark: e.target.value })}
                      className="lab-input w-full"
                    />
                  </td>
                  <td>
                    <SourceBadge rowNumber={rt.originalRowNumber} remark={rt.remark} />
                  </td>
                  <td>
                    <button
                      onClick={() => onRemove(rt.id)}
                      className="p-1.5 text-lab-red hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
