import React, { useMemo, useState } from 'react';
import { Calculator, RefreshCw, FileDown, Eye, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { useThresholdStore } from '../stores/thresholdStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, AbnormalLevelBadge } from '../components/ui/Badge';
import { DataTable } from '../components/DataTable';
import { FilterPanel } from '../components/FilterPanel';
import type { ColumnDef } from '@tanstack/react-table';
import type { FilterOptions, InspectionRecord, BrakeCalculation, AbnormalDetection, ThresholdCheck } from '../types';
import {
  formatDistance,
  formatSpeed,
  formatTime,
  formatLoad,
  formatPercent,
} from '../utils/helpers';

interface CalculationRow {
  record: InspectionRecord;
  calculation: BrakeCalculation | undefined;
  detection: AbnormalDetection | undefined;
  threshold: ThresholdCheck | undefined;
}

export const CalculationPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    inspectionRecords,
    brakeCalculations,
    abnormalDetections,
    thresholdChecks,
    getFilteredRecords,
    processAllRecords,
    isProcessing,
  } = useDataStore();
  const { config: thresholdConfig } = useThresholdStore();

  const [filters, setFilters] = useState<FilterOptions>({});
  const [showFilters, setShowFilters] = useState(true);

  const filteredRecords = useMemo(() => {
    return getFilteredRecords(filters);
  }, [getFilteredRecords, filters]);

  const tableData: CalculationRow[] = useMemo(() => {
    return filteredRecords.map(record => ({
      record,
      calculation: brakeCalculations.find(c => c.recordId === record.id),
      detection: abnormalDetections.find(d => d.recordId === record.id),
      threshold: thresholdChecks.find(t => t.recordId === record.id),
    }));
  }, [filteredRecords, brakeCalculations, abnormalDetections, thresholdChecks]);

  const columns: ColumnDef<CalculationRow, any>[] = [
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
      accessorKey: 'record.ratedSpeed',
      header: '额定速度',
      cell: ({ row }) => formatSpeed(row.original.record.ratedSpeed),
    },
    {
      accessorKey: 'record.actualLoad',
      header: '实际载荷',
      cell: ({ row }) => formatLoad(row.original.record.actualLoad),
    },
    {
      accessorKey: 'loadRatio',
      header: '载荷比',
      cell: ({ row }) => {
        const ratio = (row.original.record.actualLoad / row.original.record.ratedLoad) * 100;
        const isOverload = ratio > (thresholdConfig.overloadThreshold * 100);
        return (
          <Badge variant={isOverload ? 'danger' : 'secondary'} size="sm">
            {formatPercent(ratio)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'calculation.theoreticalBrakeDistance',
      header: '理论制动距离',
      cell: ({ row }) => row.original.calculation
        ? <span className="font-mono">{formatDistance(row.original.calculation.theoreticalBrakeDistance)}</span>
        : '-',
    },
    {
      accessorKey: 'calculation.actualBrakeDistance',
      header: '实际制动距离',
      cell: ({ row }) => row.original.calculation
        ? <span className="font-mono font-medium text-slate-900">{formatDistance(row.original.calculation.actualBrakeDistance)}</span>
        : '-',
    },
    {
      accessorKey: 'calculation.deviation',
      header: '偏差',
      cell: ({ row }) => {
        if (!row.original.calculation) return '-';
        const deviation = row.original.calculation.deviationPercent;
        const level = row.original.threshold?.brakeDistanceLevel;
        return (
          <span className={`font-mono ${
            level === 'normal' ? 'text-emerald-600' :
            level === 'warning' ? 'text-amber-600' :
            level === 'serious' ? 'text-red-600' : 'text-red-700'
          }`}>
            {deviation >= 0 ? '+' : ''}{formatPercent(deviation)}
          </span>
        );
      },
    },
    {
      accessorKey: 'calculation.frictionCoefficient',
      header: '摩擦系数',
      cell: ({ row }) => row.original.calculation
        ? <span className="font-mono">{row.original.calculation.frictionCoefficient.toFixed(3)}</span>
        : '-',
    },
    {
      accessorKey: 'detection.overallLevel',
      header: '异常等级',
      cell: ({ row }) => row.original.detection
        ? <AbnormalLevelBadge level={row.original.detection.overallLevel} />
        : '-',
    },
    {
      accessorKey: 'detection.overallResult',
      header: '综合结果',
      cell: ({ row }) => row.original.detection ? (
        <Badge variant={row.original.detection.overallResult === 'pass' ? 'success' : 'danger'}>
          {row.original.detection.overallResult === 'pass' ? '合格' : '不合格'}
        </Badge>
      ) : '-',
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
            追溯
          </Button>
        </div>
      ),
    },
  ];

  const stats = useMemo(() => {
    const passCount = abnormalDetections.filter(d => d.overallResult === 'pass').length;
    const failCount = abnormalDetections.filter(d => d.overallResult === 'fail').length;
    const avgDeviation = brakeCalculations.length > 0
      ? brakeCalculations.reduce((sum, c) => sum + Math.abs(c.deviationPercent), 0) / brakeCalculations.length
      : 0;
    const avgBrakeDistance = brakeCalculations.length > 0
      ? brakeCalculations.reduce((sum, c) => sum + c.actualBrakeDistance, 0) / brakeCalculations.length
      : 0;

    return {
      total: inspectionRecords.length,
      processed: brakeCalculations.length,
      pass: passCount,
      fail: failCount,
      passRate: inspectionRecords.length > 0 ? (passCount / inspectionRecords.length) * 100 : 0,
      avgDeviation,
      avgBrakeDistance,
    };
  }, [inspectionRecords, brakeCalculations, abnormalDetections]);

  const handleFilterChange = (newFilters: Partial<FilterOptions>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-7 h-7 text-blue-900" />
            验算结果
          </h1>
          <p className="text-slate-500 mt-1">查看制动距离验算结果和异常检测</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => processAllRecords()}
            isLoading={isProcessing}
          >
            重新验算
          </Button>
          <Button
            variant="outline"
            leftIcon={<Filter className="w-4 h-4" />}
            onClick={() => setShowFilters(!showFilters)}
          >
            筛选
          </Button>
          <Button
            variant="primary"
            leftIcon={<FileDown className="w-4 h-4" />}
            onClick={() => navigate('/export')}
          >
            导出报告
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-3xl font-bold text-slate-900">{stats.processed}</div>
          <div className="text-sm text-slate-500 mt-1">已验算 / {stats.total} 条</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-emerald-600">{stats.pass}</div>
          <div className="text-sm text-slate-500 mt-1">合格 ({stats.passRate.toFixed(1)}%)</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-red-600">{stats.fail}</div>
          <div className="text-sm text-slate-500 mt-1">不合格</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-blue-900">{formatDistance(stats.avgBrakeDistance)}</div>
          <div className="text-sm text-slate-500 mt-1">平均制动距离</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {showFilters && (
          <div className="lg:col-span-1">
            <FilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={clearFilters}
            />
          </div>
        )}

        <Card className={showFilters ? 'lg:col-span-3' : 'lg:col-span-4'}>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                共 {tableData.length} 条记录
                {Object.keys(filters).length > 0 && ' (已筛选)'}
              </div>
            </div>
          </div>

          <DataTable
            columns={columns}
            data={tableData}
            searchColumn="record.elevatorNo"
            searchPlaceholder="搜索电梯编号..."
            pageSize={15}
            rowClassName={(row) => {
              const level = row.detection?.overallLevel;
              if (level === 'overload') return 'bg-red-50';
              if (level === 'serious') return 'bg-orange-50';
              if (level === 'warning') return 'bg-yellow-50';
              return '';
            }}
          />
        </Card>
      </div>
    </div>
  );
};
