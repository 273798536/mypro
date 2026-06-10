import { Plus, Trash2 } from 'lucide-react';
import type { WeighingRow } from '@/types';
import { SourceBadge } from './SourceBadge';

interface WeighingTableProps {
  rows: WeighingRow[];
  onUpdate: (id: string, updates: Partial<WeighingRow>) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}

export function WeighingTable({ rows, onUpdate, onAdd, onRemove }: WeighingTableProps) {
  return (
    <div className="lab-card overflow-hidden">
      <div className="p-4 border-b border-lab-line flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-lab-navy">称量单数据</h3>
        <button
          onClick={onAdd}
          className="lab-btn bg-lab-navy text-white hover:bg-lab-navyLight flex items-center gap-1.5 text-sm"
        >
          <Plus size={16} /> 添加行
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="lab-table">
          <thead>
            <tr>
              <th className="w-16 sticky left-0 z-10">原始行号</th>
              <th>样品名称</th>
              <th>样品质量 (g)</th>
              <th>苯甲酸质量 (g)</th>
              <th>关联图片名</th>
              <th>备注</th>
              <th>来源</th>
              <th className="w-16">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-8 text-gray-400">
                  暂无称量数据，点击"添加行"开始录入
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className={row.sampleMass !== null && (row.sampleMass < 0.5 || row.sampleMass > 1.5) ? 'animate-pulse-soft' : ''}>
                  <td className="sticky left-0 bg-white z-10">
                    <input
                      type="number"
                      value={row.originalRowNumber}
                      onChange={(e) => onUpdate(row.id, { originalRowNumber: Number(e.target.value) })}
                      className="lab-input w-14"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.sampleName}
                      onChange={(e) => onUpdate(row.id, { sampleName: e.target.value })}
                      className="lab-input w-full"
                      placeholder="如：苯甲酸标准样"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.0001"
                      value={row.sampleMass ?? ''}
                      onChange={(e) => onUpdate(row.id, { sampleMass: e.target.value ? Number(e.target.value) : null })}
                      className={`lab-input w-28 ${row.sampleMass !== null && (row.sampleMass < 0.5 || row.sampleMass > 1.5) ? 'border-lab-red bg-red-50' : ''}`}
                      placeholder="0.5~1.5"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.0001"
                      value={row.benzoicAcidMass ?? ''}
                      onChange={(e) => onUpdate(row.id, { benzoicAcidMass: e.target.value ? Number(e.target.value) : null })}
                      className="lab-input w-28"
                      placeholder="标准样必填"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.imageName}
                      onChange={(e) => onUpdate(row.id, { imageName: e.target.value })}
                      className="lab-input w-full"
                      placeholder="如：weighing-01.jpg"
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={row.remark}
                      onChange={(e) => onUpdate(row.id, { remark: e.target.value })}
                      className="lab-input w-full"
                      placeholder="备注"
                    />
                  </td>
                  <td>
                    <SourceBadge rowNumber={row.originalRowNumber} imageName={row.imageName} remark={row.remark} />
                  </td>
                  <td>
                    <button
                      onClick={() => onRemove(row.id)}
                      className="p-1.5 text-lab-red hover:bg-red-50 rounded transition-colors"
                      title="删除行"
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
