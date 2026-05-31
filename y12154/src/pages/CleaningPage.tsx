import React, { useMemo, useState } from 'react';
import { Filter, CheckCircle, AlertTriangle, Eye, RefreshCw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDataStore } from '../stores/dataStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge, BadRowTypeBadge } from '../components/ui/Badge';
import { DataTable } from '../components/DataTable';
import type { ColumnDef } from '@tanstack/react-table';
import type { InspectionRecord, BadRow } from '../types';
import { BAD_ROW_ERROR_LABELS } from '../utils/constants';
import { formatDateTime } from '../utils/helpers';

export const CleaningPage: React.FC = () => {
  const navigate = useNavigate();
  const { inspectionRecords, badRows, updateBadRowReview, clearBadRows, processAllRecords } = useDataStore();
  const [activeTab, setActiveTab] = useState<'clean' | 'bad'>('clean');
  const [selectedBadRows, setSelectedBadRows] = useState<Set<string>>(new Set());

  const cleanColumns: ColumnDef<InspectionRecord, any>[] = [
    {
      accessorKey: 'elevatorNo',
      header: '电梯编号',
      cell: ({ row }) => <span className="font-medium text-slate-900">{row.getValue('elevatorNo')}</span>,
    },
    {
      accessorKey: 'inspectionDate',
      header: '检验日期',
    },
    {
      accessorKey: 'inspector',
      header: '检验员',
    },
    {
      accessorKey: 'ratedSpeed',
      header: '额定速度',
      cell: ({ row }) => `${row.getValue('ratedSpeed')} m/s`,
    },
    {
      accessorKey: 'ratedLoad',
      header: '额定载荷',
      cell: ({ row }) => `${row.getValue('ratedLoad')} kg`,
    },
    {
      accessorKey: 'actualLoad',
      header: '实际载荷',
      cell: ({ row }) => `${row.getValue('actualLoad')} kg`,
    },
    {
      accessorKey: 'brakeTime',
      header: '制动时间',
      cell: ({ row }) => `${row.getValue('brakeTime')} s`,
    },
    {
      accessorKey: 'hasSpeedCurve',
      header: '速度曲线',
      cell: ({ row }) => {
        const hasCurve = row.original.speedCurve && row.original.speedCurve.length > 0;
        return (
          <Badge variant={hasCurve ? 'success' : 'secondary'} size="sm">
            {hasCurve ? '有' : '无'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: '导入时间',
      cell: ({ row }) => formatDateTime(row.getValue('createdAt')),
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => navigate(`/trace/${row.original.id}`)}>
          追溯
        </Button>
      ),
    },
  ];

  const badColumns: ColumnDef<BadRow, any>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(e) => row.toggleSelected(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300"
        />
      ),
    },
    {
      accessorKey: 'rowNumber',
      header: '行号',
      cell: ({ row }) => <span className="font-mono text-slate-600">#{row.getValue('rowNumber')}</span>,
    },
    {
      accessorKey: 'errorTypes',
      header: '错误类型',
      cell: ({ row }) => <BadRowTypeBadge types={row.getValue('errorTypes')} />,
    },
    {
      accessorKey: 'errorDescription',
      header: '错误描述',
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.getValue('errorDescription')}</span>,
    },
    {
      accessorKey: 'errorTypes',
      header: '错误详情',
      cell: ({ row }) => {
        const types = row.getValue('errorTypes') as string[];
        if (!types || types.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1">
            {types.map((type, idx) => (
              <Badge key={idx} variant="warning" size="sm">{type}</Badge>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: 'reviewed',
      header: '状态',
      cell: ({ row }) => {
        const reviewed = row.getValue('reviewed');
        return (
          <Badge variant={reviewed ? 'success' : 'warning'} size="sm">
            {reviewed ? '已复核' : '待复核'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'createdAt',
      header: '导入时间',
      cell: ({ row }) => formatDateTime(row.getValue('createdAt')),
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
            onClick={() => {
              const rawData = row.original.rawData;
              alert(`原始数据:\n${JSON.stringify(rawData, null, 2)}`);
            }}
          >
            查看原始
          </Button>
          {!row.original.reviewed && (
            <Button
              variant="outline"
              size="sm"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={() => updateBadRowReview(row.original.id, '已复核')}
            >
              标记已阅
            </Button>
          )}
        </div>
      ),
    },
  ];

  const stats = useMemo(() => ({
    cleanCount: inspectionRecords.length,
    badCount: badRows.length,
    unreviewedCount: badRows.filter(r => !r.reviewed).length,
    totalCount: inspectionRecords.length + badRows.length,
  }), [inspectionRecords, badRows]);

  const qualityRate = stats.totalCount > 0 ? (stats.cleanCount / stats.totalCount) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Filter className="w-7 h-7 text-blue-900" />
            数据清洗
          </h1>
          <p className="text-slate-500 mt-1">查看清洗结果，复核坏行数据</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => processAllRecords()}
          >
            重新计算
          </Button>
          {stats.unreviewedCount > 0 && (
            <Button
              variant="primary"
              leftIcon={<CheckCircle className="w-4 h-4" />}
              onClick={() => {
                const unreviewed = badRows.filter(r => !r.reviewed);
                unreviewed.forEach(r => updateBadRowReview(r.id, '批量已复核'));
              }}
            >
              全部标记已阅
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-3xl font-bold text-slate-900">{stats.totalCount}</div>
          <div className="text-sm text-slate-500 mt-1">总数据行数</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-emerald-600">{stats.cleanCount}</div>
          <div className="text-sm text-slate-500 mt-1">正常数据</div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-amber-600">{stats.badCount}</div>
          <div className="text-sm text-slate-500 mt-1">
            坏行数据
            {stats.unreviewedCount > 0 && (
              <Badge variant="danger" size="sm" className="ml-2">{stats.unreviewedCount} 待复核</Badge>
            )}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-3xl font-bold text-blue-900">{qualityRate.toFixed(1)}%</div>
          <div className="text-sm text-slate-500 mt-1">数据质量</div>
        </Card>
      </div>

      {stats.badCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900">数据质量提醒</h3>
              <p className="text-sm text-amber-700 mt-1">
                检测到 {stats.badCount} 条坏行数据，其中 {stats.unreviewedCount} 条待复核。
                坏行数据已被隔离，不会参与制动距离验算。
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                {Object.entries(
                  badRows.reduce((acc, row) => {
                    row.errorTypes.forEach(type => {
                      acc[type] = (acc[type] || 0) + 1;
                    });
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1 text-xs">
                    <BadRowTypeBadge types={[type as any]} />
                    <span className="text-amber-700">× {count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="border-b border-slate-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('clean')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'clean'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            正常数据 ({stats.cleanCount})
          </button>
          <button
            onClick={() => setActiveTab('bad')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'bad'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            坏行数据 ({stats.badCount})
            {stats.unreviewedCount > 0 && (
              <span className="bg-red-100 text-red-700 text-xs px-1.5 py-0.5 rounded-full">
                {stats.unreviewedCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {activeTab === 'clean' ? (
        <Card>
          <DataTable
            columns={cleanColumns}
            data={inspectionRecords}
            searchColumn="elevatorNo"
            searchPlaceholder="搜索电梯编号..."
            pageSize={10}
          />
        </Card>
      ) : (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-500">
              选中 {selectedBadRows.size} 条记录
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<CheckCircle className="w-4 h-4" />}
                onClick={() => {
                  badRows.forEach(r => {
                    if (!r.reviewed) updateBadRowReview(r.id, '批量已复核');
                  });
                }}
              >
                全部标记已阅
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<Trash2 className="w-4 h-4" />}
                onClick={() => {
                  if (confirm('确定要清空所有坏行记录吗？此操作不可恢复。')) {
                    clearBadRows();
                  }
                }}
              >
                清空坏行
              </Button>
            </div>
          </div>
          <DataTable
            columns={badColumns}
            data={badRows}
            searchColumn="errorMessage"
            searchPlaceholder="搜索错误描述..."
            pageSize={10}
          />
        </Card>
      )}
    </div>
  );
};
