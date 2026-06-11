import { Crosshair, Tag, Layers, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useReviewStore } from '@/store/reviewStore';
import { clsx } from 'clsx';

export function RecordsTable() {
  const { filteredResult, selectedRecordId, selectRecord } = useReviewStore();
  const { records } = filteredResult;

  return (
    <div className="bg-steel-800/60 backdrop-blur border border-steel-700 rounded-lg overflow-hidden flex flex-col h-full">
      <div className="px-4 py-3 border-b border-steel-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-steel-200 tracking-wide">传感器记录明细表</h3>
        <span className="text-xs text-steel-500 font-mono">
          共 {records.length} 条 · 同一结果集
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-steel-900/80 sticky top-0 z-10">
            <tr className="text-steel-400 text-xs uppercase tracking-wider">
              <th className="text-left px-4 py-3 font-medium">状态</th>
              <th className="text-left px-4 py-3 font-medium">时间</th>
              <th className="text-left px-4 py-3 font-medium">区域</th>
              <th className="text-left px-4 py-3 font-medium">材料名称</th>
              <th className="text-left px-4 py-3 font-medium">楼层</th>
              <th className="text-left px-4 py-3 font-medium">异常标记</th>
              <th className="text-right px-4 py-3 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-steel-500">
                  暂无数据，请点击「放样例」加载教学用例
                </td>
              </tr>
            )}
            {records.map((r, idx) => {
              const hasAnomaly = r.nameMismatch || r.floorUnitMixed;
              const isSelected = selectedRecordId === r.id;
              return (
                <tr
                  key={r.id}
                  className={clsx(
                    'border-b border-steel-700/50 transition-colors group',
                    idx % 2 === 0 ? 'bg-steel-800/20' : 'bg-steel-800/40',
                    isSelected && 'bg-industrial-600/15',
                    'hover:bg-steel-700/40',
                  )}
                >
                  <td className="px-4 py-3 relative">
                    {hasAnomaly && (
                      <div className={clsx(
                        'absolute left-0 top-0 bottom-0 w-1',
                        r.floorUnitMixed ? 'bg-danger-500' : 'bg-warning-500',
                      )} />
                    )}
                    <div className="pl-1">
                      {hasAnomaly ? (
                        <AlertTriangle className={clsx(
                          'w-4 h-4',
                          r.floorUnitMixed ? 'text-danger-400' : 'text-warning-400',
                        )} />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-steel-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-steel-300">{r.timestamp}</td>
                  <td className="px-4 py-3 text-steel-200">{r.area}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className={clsx(
                        r.nameMismatch ? 'text-warning-400' : 'text-steel-200',
                      )}>
                        {r.materialName}
                      </span>
                      {r.nameMismatch && (
                        <span className="text-xs text-steel-500 font-mono">
                          → 应为 {r.standardMaterialName}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={clsx(
                      'font-mono',
                      r.floorUnitMixed ? 'text-danger-400' : 'text-steel-200',
                    )}>
                      {r.floor}
                    </span>
                    {r.floorUnitMixed && (
                      <div className="text-xs text-steel-500">归一化: {r.normalizedFloor}层</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {r.nameMismatch && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-warning-500/20 text-warning-400 border border-warning-500/30">
                          <Tag className="w-2.5 h-2.5" /> 名称
                        </span>
                      )}
                      {r.floorUnitMixed && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded bg-danger-500/20 text-danger-400 border border-danger-500/30">
                          <Layers className="w-2.5 h-2.5" /> 楼层
                        </span>
                      )}
                      {!hasAnomaly && (
                        <span className="text-xs text-steel-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => selectRecord(isSelected ? null : r.id)}
                      className={clsx(
                        'inline-flex items-center gap-1 px-2 py-1 text-xs rounded transition-all opacity-0 group-hover:opacity-100',
                        isSelected
                          ? 'bg-industrial-600 text-white opacity-100'
                          : 'bg-steel-700 text-steel-300 hover:bg-industrial-600 hover:text-white',
                      )}
                    >
                      <Crosshair className="w-3 h-3" />
                      {isSelected ? '已定位' : '定位'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
