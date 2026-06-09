import { Plus, Minus, Image, StickyNote, Hash, Rows3, Columns3 } from 'lucide-react';
import { useStore } from '@/store';
import AvailabilityBadge from './AvailabilityBadge';

export default function MatrixInput() {
  const matrix = useStore(s => s.currentMatrix);
  const rowAvailability = useStore(s => s.rowAvailability);
  const anomalies = useStore(s => s.anomalies);
  const setCellValue = useStore(s => s.setCellValue);
  const setCellUnit = useStore(s => s.setCellUnit);
  const addRow = useStore(s => s.addRow);
  const removeRow = useStore(s => s.removeRow);
  const addCol = useStore(s => s.addCol);
  const removeCol = useStore(s => s.removeCol);
  const setTitle = useStore(s => s.setTitle);

  if (!matrix) return null;

  const cellClass = (r: number, c: number) => {
    const cell = matrix.cells[r][c];
    const anom = anomalies.find(a => a.cellRef?.row === r && a.cellRef?.col === c);
    if (!anom) return 'input-cell';
    if (anom.severity === 'error') return 'input-cell-err';
    return 'input-cell-warn';
  };

  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Hash className="w-4 h-4 text-ink-400" />
          <input
            value={matrix.title}
            onChange={e => setTitle(e.target.value)}
            className="font-serif text-lg font-semibold text-ink-800 bg-transparent outline-none border-b border-dashed border-ink-200 focus:border-ink-500 flex-1 px-1 py-0.5"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-ink-50 rounded-lg p-1 border border-ink-100">
            <button
              onClick={() => removeRow(matrix.rows - 1)}
              className="p-1.5 rounded-md hover:bg-white text-ink-500 hover:text-ink-800"
              title="删除一行"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="flex items-center gap-1 px-1.5 text-xs text-ink-600 font-medium">
              <Rows3 className="w-3.5 h-3.5" />
              {matrix.rows}
            </span>
            <button
              onClick={addRow}
              className="p-1.5 rounded-md hover:bg-white text-ink-500 hover:text-ink-800"
              title="新增一行"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-ink-50 rounded-lg p-1 border border-ink-100">
            <button
              onClick={() => removeCol(matrix.cols - 1)}
              className="p-1.5 rounded-md hover:bg-white text-ink-500 hover:text-ink-800"
              title="删除一列"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="flex items-center gap-1 px-1.5 text-xs text-ink-600 font-medium">
              <Columns3 className="w-3.5 h-3.5" />
              {matrix.cols}
            </span>
            <button
              onClick={addCol}
              className="p-1.5 rounded-md hover:bg-white text-ink-500 hover:text-ink-800"
              title="新增一列"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="label mb-2">矩阵数据 · 点击单元格编辑数值与单位</div>

      <div className="overflow-x-auto rounded-xl border border-ink-100">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-ink-50/70 text-ink-500 text-[11px]">
              <th className="w-24 px-2 py-2 text-left font-medium sticky left-0 bg-ink-50/70 z-10 border-r border-ink-100">
                原始行号 / 可用性
              </th>
              {Array.from({ length: matrix.cols }, (_, i) => (
                <th key={i} className="px-2 py-2 text-center font-medium min-w-[96px]">
                  列 {i + 1}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.cells.map((row, r) => {
              const ra = rowAvailability[r];
              return (
                <tr key={r} className="border-t border-ink-100">
                  <td className="px-2 py-2 align-top sticky left-0 bg-white z-10 border-r border-ink-100">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-ink-100 text-ink-600 text-xs font-mono">
                          {row[0]?.sourceRow ?? r + 1}
                        </span>
                        {row[0]?.sourceImage && (
                          <span
                            className="inline-flex items-center gap-1 text-[10.5px] text-ink-500 bg-ink-50 rounded px-1.5 py-0.5 border border-ink-100"
                            title={`来源图片: ${row[0].sourceImage}`}
                          >
                            <Image className="w-3 h-3" />
                            {row[0].sourceImage}
                          </span>
                        )}
                      </div>
                      {ra && <AvailabilityBadge availability={ra.availability} size="sm" />}
                      {row[0]?.sourceNote && (
                        <span
                          className="inline-flex items-start gap-1 text-[10.5px] text-ink-500 max-w-[140px]"
                          title={row[0].sourceNote}
                        >
                          <StickyNote className="w-3 h-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{row[0].sourceNote}</span>
                        </span>
                      )}
                    </div>
                  </td>
                  {row.map((cell, c) => (
                    <td key={c} className="px-1.5 py-1.5 align-top min-w-[120px]">
                      <div className="flex flex-col gap-1">
                        <input
                          value={cell.value === null ? '' : String(cell.value)}
                          onChange={e => setCellValue(r, c, e.target.value)}
                          placeholder="数值"
                          className={cellClass(r, c)}
                        />
                        <input
                          value={cell.unit}
                          onChange={e => setCellUnit(r, c, e.target.value)}
                          placeholder="单位（如 mm）"
                          className={
                            cell.unit.trim() === '' && cell.value !== null
                              ? 'input-cell-warn'
                              : 'input-cell'
                          }
                          style={{ fontSize: '11px' }}
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-[11.5px] text-ink-400 flex flex-wrap gap-x-4 gap-y-1">
        <span>· 空白数值以 0 参与计算，标红需重新采集</span>
        <span>· 空单位标黄，建议补材料或统一口径</span>
        <span>· 每行左侧保留原始行号以便回到草稿表</span>
      </div>
    </div>
  );
}
