import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Eye, Filter, Download, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, AbnormalLevelBadge } from '../components/ui/Badge';
import { DataTable } from '../components/DataTable';
import { FilterPanel } from '../components/FilterPanel';
import type { ColumnDef } from '@tanstack/react-table';
import type { FilterOptions, InspectionRecord, AbnormalDetection, BrakeCalculation, ThresholdCheck } from '../types';
import { ABNORMAL_TYPE_LABELS } from '../utils/constants';
import { formatDistance, formatSpeed, formatPercent } from '../utils/helpers';

interface ReviewRow {
  record: InspectionRecord;
  calculation: BrakeCalculation | undefined;
  detection: AbnormalDetection;
  threshold: ThresholdCheck | undefined;
}

export const ReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    inspectionRecords,
    abnormalDetections,
    brakeCalculations,
    thresholdChecks,
    badRows,
    getFilteredRecords,
  } = useDataStore();

  const [filters, setFilters] = useState<FilterOptions>({
    abnormalLevel: ['warning', 'serious', 'overload'],
  });
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set());

  const filteredRecords = useMemo(() => {
    return getFilteredRecords(filters);
  }, [getFilteredRecords, filters]);

  const tableData: ReviewRow[] = useMemo(() => {
    return filteredRecords
      .map(record => {
        const detection = abnormalDetections.find(d => d.recordId === record.id);
        return {
          record,
          calculation: brakeCalculations.find(c => c.recordId === record.id),
          detection: detection!,
          threshold: thresholdChecks.find(t => t.recordId === record.id),
        };
      })
      .filter(row => row.detection && row.detection.overallLevel !== 'normal');
  }, [filteredRecords, abnormalDetections, brakeCalculations, thresholdChecks]);

  const columns: ColumnDef<ReviewRow, any>[] = [
    {
      accessorKey: 'detection.overallLevel',
      header: '等级',
      cell: ({ row }) => <AbnormalLevelBadge level={row.original.detection.overallLevel} size="lg" />,
    },
    {
      accessorKey: 'record.elevatorNo',
      header: '电梯编号',
      cell: ({ row }) => (
        <span className="font-medium text-slate-900">{row.original.record.elevatorNo}</span>
      ),
    },
    {
      accessorKey: 'record.inspectionDate',
      header: '检验日期',
    },
    {
      accessorKey: 'record.inspector',
      header: '检验员',
    },
    {
      accessorKey: 'abnormalTypes',
      header: '异常类型',
      cell: ({ row }) => {
        const types = row.original.detection.detectedTypes;
        return (
          <div className="flex flex-wrap gap-1">
            {types.map(type => (
              <Badge
                key={type}
                variant={type === 'overload' ? 'danger' : type === 'speed_gap' ? 'warning' : 'info'}
                size="sm"
              >
                {ABNORMAL_TYPE_LABELS[type]}
              </Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'record.ratedSpeed',
      header: '额定速度',
      cell: ({ row }) => formatSpeed(row.original.record.ratedSpeed),
    },
    {
      accessorKey: 'record.actualLoad',
      header: '实际载荷',
      cell: ({ row }) => `${row.original.record.actualLoad} kg`,
    },
    {
      accessorKey: 'calculation.actualBrakeDistance',
      header: '制动距离',
      cell: ({ row }) => row.original.calculation
        ? <span className="font-mono">{formatDistance(row.original.calculation.actualBrakeDistance)}</span>
        : '-',
    },
    {
      accessorKey: 'calculation.deviationPercent',
      header: '偏差',
      cell: ({ row }) => {
        if (!row.original.calculation) return '-';
        const dev = row.original.calculation.deviationPercent;
        return (
          <span className={`font-mono ${dev >= 0 ? 'text-red-600' : 'text-blue-600'}`}>
            {dev >= 0 ? '+' : ''}{formatPercent(dev)}
          </span>
        );
      },
    },
    {
      accessorKey: 'detection.description',
      header: '异常说明',
      cell: ({ row }) => (
        <div className="max-w-xs">
          <p className="text-sm text-slate-600 truncate" title={row.original.detection.description}>
            {row.original.detection.description}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'detection.reviewed',
      header: '状态',
      cell: ({ row }) => (
        <Badge variant={row.original.detection.reviewed ? 'success' : 'warning'} size="sm">
          {row.original.detection.reviewed ? '已复核' : '待复核'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<Eye className="w-4 h-4" />}
            onClick={() => navigate(`/trace/${row.original.record.id}`)}
          >
            详情
          </Button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => {
    const abnormalRecords = abnormalDetections.filter(d => d.overallLevel !== 'normal');
    const unreviewed = abnormalRecords.filter(d => !d.reviewed);
    const speedGapCount = abnormalRecords.filter(d => d.detectedTypes.includes('speed_gap')).length;
    const brakeDelayCount = abnormalRecords.filter(d => d.detectedTypes.includes('brake_delay')).length;
    const overloadCount = abnormalRecords.filter(d => d.detectedTypes.includes('overload')).length;
    const brakeDistanceCount = abnormalRecords.filter(d => d.detectedTypes.includes('brake_distance')).length;
    const badUnreviewed = badRows.filter(r => !r.reviewed).length;

    return {
      total: abnormalRecords.length,
      unreviewed: unreviewed.length,
      speedGapCount,
      brakeDelayCount,
      overloadCount,
      brakeDistanceCount,
      badUnreviewed,
    };
  }, [abnormalDetections, badRows]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      abnormalLevel: ['warning', 'serious', 'overload'],
    });
  };

  const markSelectedAsReviewed = () => {
    alert('批量标记已复核功能开发中...');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-amber-600" />
            异常复核
          </h1>
          <p className="text-slate-500 mt-1">筛选并复核异常检验记录，供特种设备检验员使用</p>
        </div>
        <div className="flex gap-3">
          {selectedRecords.size > 0 && (
            <Button
              variant="primary"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={markSelectedAsReviewed}
            >
              标记已复核 ({selectedRecords.size})
            </Button>
          )}
          <Button
            variant="outline"
            leftIcon={<Download className="w-4 h-4" />}
            onClick={() => navigate('/export')}
          >
            导出异常清单
          </Button>
        </div>
      </div>

      {stats.unreviewed > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">待复核提醒</h3>
                <p className="text-sm text-amber-700 mt-1">
                  有 {stats.unreviewed} 条异常记录和 {stats.badUnreviewed} 条坏行数据等待复核。
                  请优先处理载荷超限和严重异常的记录。
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              setFilters(prev => ({
                ...prev,
                abnormalLevel: ['overload', 'serious'],
              }));
            }}>
              优先处理严重异常
            </Button>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{stats.overloadCount}</div>
          <div className="text-sm text-slate-500 mt-1">载荷超限</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{stats.speedGapCount}</div>
          <div className="text-sm text-slate-500 mt-1">速度缺口</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-yellow-600">{stats.brakeDelayCount}</div>
          <div className="text-sm text-slate-500 mt-1">制动延迟</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-purple-600">{stats.brakeDistanceCount}</div>
          <div className="text-sm text-slate-500 mt-1">制动距离</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.unreviewed}</div>
          <div className="text-sm text-slate-500 mt-1">待复核</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-emerald-600">{stats.total - stats.unreviewed}</div>
          <div className="text-sm text-slate-500 mt-1">已复核</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={clearFilters}
            showAbnormalLevel
            showAbnormalType
            showDateRange
            showResult
            showElevator
            showInspector
          />
        </div>

        <Card className="lg:col-span-3">
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                共 {tableData.length} 条异常记录
                {Object.keys(filters).length > 0 && ' (已筛选)'}
              </div>
              <div className="text-xs text-slate-400">
                点击"追溯"查看完整数据链路
              </div>
            </div>
          </div>

          {tableData.length === 0 ? (
            <div className="py-16 text-center">
              <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">暂无待复核异常</h3>
              <p className="text-slate-500">所有异常记录已完成复核</p>
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={tableData}
              searchColumn="record.elevatorNo"
              searchPlaceholder="搜索电梯编号..."
              pageSize={10}
              rowClassName={(row) => {
                const level = row.detection.overallLevel;
                if (level === 'overload') return 'bg-red-50 border-l-4 border-l-red-500';
                if (level === 'serious') return 'bg-orange-50 border-l-4 border-l-orange-500';
                if (level === 'warning') return 'bg-yellow-50 border-l-4 border-l-yellow-500';
                return '';
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
};
