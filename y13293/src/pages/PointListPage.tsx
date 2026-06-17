import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store';
import { Table, Thead, Th, Tr, Td } from '@/components/ui/Table';
import { StatusTag } from '@/components/ui/StatusTag';
import { FilterSidebar } from '@/components/point/FilterSidebar';
import { Card } from '@/components/ui/Card';
import { AmapWrapper } from '@/components/map/AmapWrapper';
import type { GisPoint, PointStatus } from '@/types';
import { Eye, Filter, MapPin, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useState } from 'react';

export default function PointListPage() {
  const { points, notes, screenshots, schemes, filters } = useAppStore();
  const { setFilters, resetFilters, updatePoint } = useAppStore((s) => s.actions);
  const navigate = useNavigate();
  const [showMap, setShowMap] = useState(true);
  const [showFilter, setShowFilter] = useState(true);

  const sources = useMemo(() => {
    const set = new Set(points.map((p) => p.source));
    return Array.from(set);
  }, [points]);

  const filteredPoints = useMemo(() => {
    return points.filter((p) => {
      if (filters.status.length > 0 && !filters.status.includes(p.status)) return false;
      if (filters.source.length > 0 && !filters.source.includes(p.source)) return false;
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase();
        if (
          !p.name.toLowerCase().includes(kw) &&
          !p.address.toLowerCase().includes(kw)
        ) {
          return false;
        }
      }
      const hasNotes = notes.some((n) => n.point_id === p.id);
      if (filters.has_notes !== null && hasNotes !== filters.has_notes) return false;
      const hasShots = screenshots.some((s) => s.point_id === p.id);
      if (filters.has_screenshots !== null && hasShots !== filters.has_screenshots) return false;
      const hasConflict = schemes.some((s) => s.point_id === p.id && s.is_conflict);
      if (filters.has_conflict !== null && hasConflict !== filters.has_conflict) return false;
      return true;
    });
  }, [points, filters, notes, screenshots, schemes]);

  const handleStatusChange = (pointId: string, status: PointStatus) => {
    updatePoint(pointId, { status });
  };

  const mapPoints = useMemo(
    () => filteredPoints.filter((p) => p.lng && p.lat),
    [filteredPoints],
  );

  const activeFilterCount = [
    filters.status.length,
    filters.source.length,
    filters.keyword,
    filters.has_notes !== null,
    filters.has_screenshots !== null,
    filters.has_conflict !== null,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl font-bold text-slate-800">点位管理</h2>
          <p className="text-sm text-slate-500 mt-1">
            共 {filteredPoints.length} / {points.length} 个点位
            {activeFilterCount > 0 && (
              <span className="ml-2 text-amber-600">（已筛选 {activeFilterCount} 项条件）</span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilter(!showFilter)}
            className="gap-1"
          >
            <Filter size={14} />
            筛选 {showFilter ? '开' : '关'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowMap(!showMap)}
            className="gap-1"
          >
            <MapPin size={14} />
            地图 {showMap ? '开' : '关'}
          </Button>
          <Link to="/import">
            <Button size="sm">导入点位</Button>
          </Link>
        </div>
      </div>

      <div className="flex gap-4 flex-1 min-h-0">
        {showFilter && (
          <div className="w-60 flex-shrink-0 bg-white border border-slate-200 rounded-sm p-4 overflow-y-auto">
            <FilterSidebar
              filters={filters}
              sources={sources}
              onChange={setFilters}
              onReset={resetFilters}
            />
          </div>
        )}

        <div className="flex-1 min-w-0 space-y-4 overflow-y-auto">
          {showMap && (
            <Card className="h-80 p-0 overflow-hidden">
              <AmapWrapper
                points={mapPoints}
                onPointClick={(p) => navigate(`/points/${p.id}`)}
                className="h-full w-full"
              />
            </Card>
          )}

          <Card className="p-0">
            <Table>
              <Thead>
                <Th>点位名称</Th>
                <Th>地址</Th>
                <Th>坐标</Th>
                <Th>来源</Th>
                <Th>状态</Th>
                <Th>方案</Th>
                <Th>备注</Th>
                <Th>最近更新</Th>
                <Th className="text-right">操作</Th>
              </Thead>
              <tbody>
                {filteredPoints.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-sm">
                      {activeFilterCount > 0 ? (
                        <>
                          无符合条件的点位
                          <button
                            onClick={resetFilters}
                            className="ml-2 text-slate-600 underline hover:text-slate-800"
                          >
                            清除筛选
                          </button>
                        </>
                      ) : (
                        '暂无点位，请先导入数据'
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredPoints.map((p: GisPoint) => {
                    const pointSchemes = schemes.filter((s) => s.point_id === p.id);
                    const pointNotes = notes.filter((n) => n.point_id === p.id);
                    const pointShots = screenshots.filter((s) => s.point_id === p.id);
                    const hasConflict = pointSchemes.some((s) => s.is_conflict);
                    return (
                      <Tr key={p.id} onClick={() => navigate(`/points/${p.id}`)}>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{p.name}</span>
                            {hasConflict && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-700 rounded-sm">
                                冲突
                              </span>
                            )}
                            {p.corrected_fields.length > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] bg-violet-100 text-violet-700 rounded-sm">
                                已修正
                              </span>
                            )}
                          </div>
                        </Td>
                        <Td className="text-slate-500 max-w-[200px] truncate">{p.address || '-'}</Td>
                        <Td className="text-xs text-slate-400 font-mono">
                          {p.lng?.toFixed(4)}, {p.lat?.toFixed(4)}
                        </Td>
                        <Td className="text-xs text-slate-500">{p.source}</Td>
                        <Td>
                          <select
                            value={p.status}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleStatusChange(p.id, e.target.value as PointStatus);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs border-none bg-transparent focus:outline-none cursor-pointer"
                          >
                            <StatusTag status={p.status} />
                            <option value="pending">待处理</option>
                            <option value="processing">处理中</option>
                            <option value="evidence_needed">待补证据</option>
                            <option value="completed">已处理</option>
                          </select>
                        </Td>
                        <Td>
                          <span className="text-sm text-slate-600">{pointSchemes.length}</span>
                        </Td>
                        <Td>
                          <div className="flex gap-1 text-xs text-slate-500">
                            {pointNotes.length > 0 && (
                              <span className="text-slate-700">{pointNotes.length}笔记</span>
                            )}
                            {pointShots.length > 0 && (
                              <span className="text-slate-700">{pointShots.length}图</span>
                            )}
                            {pointNotes.length === 0 && pointShots.length === 0 && (
                              <span className="text-slate-300">-</span>
                            )}
                          </div>
                        </Td>
                        <Td className="text-xs text-slate-400">
                          {new Date(p.updated_at).toLocaleDateString('zh-CN')}
                        </Td>
                        <Td className="text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/points/${p.id}`);
                            }}
                            className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 text-xs"
                          >
                            <Eye size={14} /> 详情
                          </button>
                        </Td>
                      </Tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
