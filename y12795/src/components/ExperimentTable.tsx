import { Plus, Trash2 } from 'lucide-react';
import type { ExperimentRecord, BlankControlStatus } from '@/types';
import { SourceBadge } from './SourceBadge';

interface ExperimentTableProps {
  records: ExperimentRecord[];
  onUpdate: (id: string, updates: Partial<ExperimentRecord>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function ExperimentTable({ records, onUpdate, onAdd, onRemove }: ExperimentTableProps) {
  return (
    <div className="lab-card overflow-hidden">
      <div className="p-4 border-b border-lab-line flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-lab-navy">实验记录数据</h3>
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
              <th>初始温度 (℃)</th>
              <th>最终温度 (℃)</th>
              <th>温度变化 (℃)</th>
              <th>空白对照</th>
              <th>关联图片名</th>
              <th>备注</th>
              <th>来源</th>
              <th className="w-16">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-8 text-gray-400">
                  暂无实验记录，点击"添加记录"开始录入
                </td>
              </tr>
            ) : (
              records.map((rec) => (
                <tr key={rec.id} className={rec.blankControl === '缺失' ? 'animate-pulse-soft' : ''}>
                  <td className="sticky left-0 bg-white z-10">
                    <input
                      type="number"
                      value={rec.originalRowNumber}
                      onChange={(e) => onUpdate(rec.id, { originalRowNumber: Number(e.target.value) })}
                      className="lab-input w-14"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.001"
                      value={rec.initialTemp ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        const newFinal = rec.finalTemp;
                        const delta = v !== null && newFinal !== null ? Number((newFinal - v).toFixed(3)) : null;
                        onUpdate(rec.id, { initialTemp: v, tempChange: delta });
                      }}
                      className="lab-input w-24"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.001"
                      value={rec.finalTemp ?? ''}
                      onChange={(e) => {
                        const v = e.target.value ? Number(e.target.value) : null;
                        const newInit = rec.initialTemp;
                        const delta = v !== null && newInit !== null ? Number((v - newInit).toFixed(3)) : null;
                        onUpdate(rec.id, { finalTemp: v, tempChange: delta });
                      }}
                      className="lab-input w-24"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.001"
                      value={rec.tempChange ?? ''}
                      onChange={(e) => onUpdate(rec.id, { tempChange: e.target.value ? Number(e.target.value) : null })}
                      className={`lab-input w-24 ${rec.tempChange !== null && Math.abs(rec.tempChange - 2.5) > 0.5 ? 'border-lab-amber bg-amber-50' : ''}`}
                    />
                  </td>
                  <td>
                    <select
                      value={rec.blankControl}
                      onChange={(e) => onUpdate(rec.id, { blankControl: e.target.value as BlankControlStatus })}
                      className={`lab-input w-24 ${rec.blankControl === '缺失' ? 'border-lab-red bg-red-50 text-lab-red font-medium' : ''}`}
                    >
                      <option value="有">有</option>
                      <option value="无">无</option>
                      <option value="缺失">缺失</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      value={rec.imageName}
                      onChange={(e) => onUpdate(rec.id, { imageName: e.target.value })}
                      className="lab-input w-full"
                      placeholder="如：temp-curve-01.png"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={rec.remark}
                      onChange={(e) => onUpdate(rec.id, { remark: e.target.value })}
                      className="lab-input w-full"
                    />
                  </td>
                  <td>
                    <SourceBadge rowNumber={rec.originalRowNumber} imageName={rec.imageName} remark={rec.remark} />
                  </td>
                  <td>
                    <button
                      onClick={() => onRemove(rec.id)}
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
