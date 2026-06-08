import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, Square, CheckSquare, Minus } from 'lucide-react';
import clsx from 'clsx';
import { useAppStore } from '@/store/useAppStore';
import { StatusBadge } from '@/components/StatusBadge';
import { AnomalyBadge } from '@/components/AnomalyBadge';
import type { PocketRecord } from '@/types';

export function DataTable() {
  const navigate = useNavigate();
  const {
    records,
    selectedRecordId,
    selectedIds,
    viewState,
    setSelectedRecord,
    toggleSelected,
    selectAll,
  } = useAppStore();

  const filteredRecords = useMemo(() => {
    let result = [...records];
    const { filters } = viewState;

    if (filters.status) {
      result = result.filter((r) => r.reviewStatus === filters.status);
    }
    if (filters.anomalyType) {
      if (filters.anomalyType === 'none') {
        result = result.filter((r) => !r.anomalyType);
      } else {
        result = result.filter((r) => r.anomalyType === filters.anomalyType);
      }
    }
    if (filters.proteinName) {
      const term = filters.proteinName.toLowerCase();
      result = result.filter((r) =>
        r.proteinName.toLowerCase().includes(term),
      );
    }

    const { sortBy, sortOrder } = viewState;
    if (sortBy) {
      result.sort((a, b) => {
        let va: any = a[sortBy as keyof PocketRecord];
        let vb: any = b[sortBy as keyof PocketRecord];

        if (typeof va === 'string' && typeof vb === 'string') {
          va = va.toLowerCase();
          vb = vb.toLowerCase();
        }
        if (va === undefined) va = '';
        if (vb === undefined) vb = '';

        if (va < vb) return sortOrder === 'asc' ? -1 : 1;
        if (va > vb) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [records, viewState]);

  const allSelected =
    filteredRecords.length > 0 &&
    filteredRecords.every((r) => selectedIds.includes(r.id));
  const someSelected = filteredRecords.some((r) => selectedIds.includes(r.id));

  const handleRowClick = (record: PocketRecord) => {
    setSelectedRecord(record.id === selectedRecordId ? null : record.id);
  };

  if (records.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-20 text-center">
        <div className="rounded-full bg-pocket-card p-6">
          <Square size={40} className="text-pocket-muted" />
        </div>
        <h3 className="mt-4 text-sm font-medium text-pocket-text">暂无数据</h3>
        <p className="mt-1 text-xs text-pocket-muted">
          点击顶部"导入数据"或"加载演示数据"开始
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-auto">
        <table className="w-full min-w-[1100px] border-collapse">
          <thead className="sticky top-0 z-10 bg-pocket-card/95 backdrop-blur">
            <tr className="border-b border-pocket-border">
              <th className="w-10 px-3 py-2.5 text-left">
                <button
                  onClick={selectAll}
                  className="text-pocket-muted hover:text-pocket-text"
                >
                  {allSelected ? (
                    <CheckSquare size={15} />
                  ) : someSelected ? (
                    <div className="relative">
                      <Square size={15} />
                      <Minus size={9} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                  ) : (
                    <Square size={15} />
                  )}
                </button>
              </th>
              <th className="w-10 px-2 py-2.5 text-left text-[11px] font-medium text-pocket-muted" />
              <th className="w-20 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                状态
              </th>
              <th className="w-20 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                原始行号
              </th>
              <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                蛋白名称
              </th>
              <th className="w-36 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                口袋坐标 (x, y, z)
              </th>
              <th className="w-20 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                亲和力
              </th>
              <th className="w-48 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                相机视角
              </th>
              <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                异常
              </th>
              <th className="w-40 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                来源文件
              </th>
              <th className="w-24 px-3 py-2.5 text-left text-[11px] font-medium text-pocket-muted">
                图片
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.map((record) => {
              const isSelected = selectedRecordId === record.id;
              const isChecked = selectedIds.includes(record.id);
              const hasAnomaly = !!record.anomalyType;

              return (
                <tr
                  key={record.id}
                  onClick={() => handleRowClick(record)}
                  className={clsx(
                    'table-row-hover cursor-pointer border-b border-pocket-border/60',
                    isSelected && 'bg-pocket-accent/5',
                    hasAnomaly &&
                      record.anomalyType !== 'camera_lost' &&
                      'bg-pocket-red/5',
                  )}
                >
                  <td
                    className="px-3 py-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => toggleSelected(record.id)}
                      className="text-pocket-muted hover:text-pocket-text"
                    >
                      {isChecked ? (
                        <CheckSquare size={14} className="text-pocket-accent" />
                      ) : (
                        <Square size={14} />
                      )}
                    </button>
                  </td>
                  <td className="px-2 py-2">
                    <ChevronRight
                      size={13}
                      className={clsx(
                        'text-pocket-muted transition-transform',
                        isSelected && 'rotate-90 text-pocket-accent',
                      )}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <StatusBadge status={record.reviewStatus} />
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-pocket-muted">
                    #{record.originalRowNumber.toString().padStart(3, '0')}
                  </td>
                  <td className="px-3 py-2 text-xs font-medium text-pocket-text">
                    {record.proteinName || (
                      <span className="text-pocket-red">未命名</span>
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-pocket-muted">
                    ({record.pocketCoordinates.x.toFixed(1)},{' '}
                    {record.pocketCoordinates.y.toFixed(1)},{' '}
                    {record.pocketCoordinates.z.toFixed(1)})
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-pocket-text">
                    {record.affinity.toFixed(1)}
                  </td>
                  <td className="px-3 py-2">
                    {record.cameraAngle ? (
                      <div className="font-mono text-[11px] text-pocket-muted">
                        az: {record.cameraAngle.azimuth.toFixed(0)}° / el:{' '}
                        {record.cameraAngle.elevation.toFixed(0)}° / d:{' '}
                        {record.cameraAngle.distance.toFixed(0)}
                      </div>
                    ) : (
                      <span className="text-[11px] text-pocket-red">— 缺失 —</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <AnomalyBadge type={record.anomalyType} />
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="font-mono text-[11px] text-pocket-muted"
                      title={record.sourceFile}
                    >
                      {record.sourceFile.length > 18
                        ? record.sourceFile.slice(0, 16) + '...'
                        : record.sourceFile}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {record.imageName ? (
                      <span
                        className="inline-block max-w-[90px] truncate font-mono text-[11px] text-pocket-accent"
                        title={record.imageName}
                      >
                        {record.imageName}
                      </span>
                    ) : (
                      <span className="text-[11px] text-pocket-muted">—</span>
                    )}
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
