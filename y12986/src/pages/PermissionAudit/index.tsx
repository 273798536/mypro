import React, { useState, useMemo } from 'react';
import type { PermissionAuditVersion, PermissionSnapshot as PermissionSnapshotType } from '@/types';
import { Section } from '@/components/ui/Section';
import { Card } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { Button } from '@/components/ui/Button';
import { Tag } from '@/components/ui/Tag';
import { PermissionSnapshotView } from '@/pages/ExceptionDetail/components/PermissionSnapshot';
import { Shield, FileDown, FileSpreadsheet, Printer, GitCompare, CheckCircle2, AlertTriangle, Database, ListTree, History, Clock, User } from 'lucide-react';
import auditVersionsData from '@/mock/auditVersions.json';
import permissionsData from '@/mock/permissions.json';
import exceptionsData from '@/mock/exceptions.json';
import { formatDateTime, getChangeTypeBadgeClass, getChangeTypeLabel } from '@/utils/format';
import { exportToExcel, triggerPrint } from '@/utils/export';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from 'recharts';

const EXCEPTION_COLORS = {
  index_invalid: '#F97316',
  permission_missing: '#E11D48',
  schema_changed: '#8B5CF6',
  data_inconsistent: '#0EA5E9',
};

const EXCEPTION_LABELS: Record<string, string> = {
  index_invalid: '索引失效',
  permission_missing: '权限缺失',
  schema_changed: '表结构变更',
  data_inconsistent: '数据不一致',
};

export const PermissionAuditPage: React.FC = () => {
  const versions = auditVersionsData as PermissionAuditVersion[];
  const [selectedId, setSelectedId] = useState(versions[0]?.id || '');

  const selected = versions.find((v) => v.id === selectedId);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const affectedRecords = useMemo(() => {
    if (!selected) return [];
    return (exceptionsData as any[]).filter((e) =>
      selected.affectedTasks.includes(e.taskId)
    );
  }, [selected]);

  const exceptionDistribution = useMemo(() => {
    if (!selected) return [];
    const counts: Record<string, number> = {};
    affectedRecords.forEach((r: any) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: EXCEPTION_LABELS[type] || type,
      value: count,
      type,
    }));
  }, [affectedRecords, selected]);

  const tableDistribution = useMemo(() => {
    if (!selected) return [];
    const counts: Record<string, number> = {};
    affectedRecords.forEach((r: any) => {
      counts[r.tableName] = (counts[r.tableName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [affectedRecords, selected]);

  const oldSnapshot = (permissionsData as PermissionSnapshotType[]).find(
    (s) => s.id === selected?.oldSnapshotId
  );
  const newSnapshot = (permissionsData as PermissionSnapshotType[]).find(
    (s) => s.id === selected?.newSnapshotId
  );

  const handleExportExcel = () => {
    if (!selected) return;
    exportToExcel(selected, affectedRecords as any);
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 py-3 no-print flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            权限审计 · 变更对比工作台
          </h2>
          {selected && (
            <Tag tone="primary">
              <GitCompare className="w-3 h-3 mr-0.5" />
              {selected.version}
            </Tag>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={<Printer className="w-4 h-4" />} onClick={triggerPrint}>
            打印PDF
          </Button>
          <Button variant="secondary" icon={<FileSpreadsheet className="w-4 h-4" />} onClick={handleExportExcel}>
            导出Excel
          </Button>
          <Button variant="primary" icon={<FileDown className="w-4 h-4" />}>
            下载完整报告
          </Button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-80 flex-shrink-0 border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-3 border-b border-gray-100 bg-gray-50/60">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              变更时间线
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">点击版本卡片查看详细对比</p>
          </div>
          <div className="p-3 space-y-2">
            {versions.map((v, idx) => {
              const isActive = v.id === selectedId;
              const isExpanded = expandedId === v.id;
              return (
                <div
                  key={v.id}
                  className={[
                    'relative pl-7 border-2 transition-all',
                    isActive
                      ? 'border-primary-500 bg-primary-50/40 shadow-md'
                      : 'border-gray-200 bg-white hover:border-gray-300',
                  ].join(' ')}
                >
                  <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200" style={{ height: 'calc(100% + 8px)', top: idx === versions.length - 1 ? 0 : 0 }} />
                  <div
                    className={[
                      'absolute left-0.5 top-2.5 w-5 h-5 flex items-center justify-center border-2 text-[10px] font-bold z-10',
                      isActive
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-300',
                    ].join(' ')}
                  >
                    {versions.length - idx}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedId(v.id);
                      setExpandedId(isExpanded ? null : v.id);
                    }}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold text-gray-800 font-mono">
                        {v.version}
                      </span>
                      <span className={v.changeDetails.length > 2 ? 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-rose-500' : 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-amber-500'}>
                        {v.changeDetails.length}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-700 leading-tight mb-1.5">
                      {v.changeSummary}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-gray-500">
                      <div className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5" />
                        {v.operator}
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" />
                        {formatDateTime(v.publishTime).substring(5, 16)}
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-gray-100 pt-2 space-y-1">
                      {v.changeDetails.map((d, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-[10px]">
                          <span className={`px-1 py-0.5 border flex-shrink-0 ${getChangeTypeBadgeClass(d.type)}`}>
                            {getChangeTypeLabel(d.type)}
                          </span>
                          <span className="text-gray-700 leading-tight truncate flex-1">
                            {d.description}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 overflow-y-auto p-5 space-y-5 bg-gray-50">
          {selected && (
            <>
              <div className="grid grid-cols-4 gap-3">
                <StatCard
                  label="变更项数"
                  value={selected.changeDetails.length}
                  subValue={`新增 ${selected.changeDetails.filter(c => c.type === 'add').length} · 修改 ${selected.changeDetails.filter(c => c.type === 'modify').length} · 删除 ${selected.changeDetails.filter(c => c.type === 'remove').length}`}
                  icon={<ListTree className="w-5 h-5" />}
                  tone="primary"
                />
                <StatCard
                  label="受影响任务数"
                  value={selected.affectedTasks.length}
                  subValue={`异常记录数: ${selected.affectedRecordCount}`}
                  icon={<Database className="w-5 h-5" />}
                  tone="amber"
                />
                <StatCard
                  label="异常分布数"
                  value={exceptionDistribution.reduce((a, b) => a + b.value, 0)}
                  subValue={`跨 ${tableDistribution.length} 张表`}
                  icon={<AlertTriangle className="w-5 h-5" />}
                  tone="rose"
                />
                <StatCard
                  label="审批结论"
                  value={
                    <span className="text-lg !text-emerald-600">已通过</span>
                  }
                  subValue={`操作人: ${selected.operator}`}
                  icon={<CheckCircle2 className="w-5 h-5" />}
                  tone="emerald"
                />
              </div>

              {oldSnapshot && newSnapshot && (
                <Section
                  title={
                    <div className="flex items-center gap-2">
                      <GitCompare className="w-4 h-4 text-primary-600" />
                      <span>权限清单并排对比（旧 → 新）</span>
                    </div>
                  }
                  subtitle="旧结论与新结论并排展示，别让工程师猜影响范围"
                  tone="primary"
                >
                  <PermissionSnapshotView
                    snapshots={[oldSnapshot, newSnapshot]}
                    oldSnapshot={oldSnapshot}
                    newSnapshot={newSnapshot}
                    conclusionBefore={selected.conclusionBefore}
                    conclusionAfter={selected.conclusionAfter}
                  />
                </Section>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      异常类型分布
                    </div>
                  }
                  className="col-span-1"
                  bodyClassName="!p-2"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={exceptionDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={75}
                        innerRadius={35}
                        label={({ name, value, percent }) =>
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        labelLine={false}
                      >
                        {exceptionDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={EXCEPTION_COLORS[entry.type as keyof typeof EXCEPTION_COLORS] || `hsl(${index * 60}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <Card
                  title={
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-primary-600" />
                      关联表 Top
                    </div>
                  }
                  className="col-span-2"
                  bodyClassName="!p-2"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={tableDistribution} layout="vertical" margin={{ top: 5, right: 30, left: 110, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" allowDecimals={false} />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={100}
                        tick={{ fontSize: 11, fontFamily: 'JetBrains Mono, monospace' }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" name="异常数" fill="#1E3A5F" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              </div>

              <Card
                title={
                  <div className="flex items-center gap-2">
                    <ListTree className="w-4 h-4 text-primary-600" />
                    变更明细列表
                  </div>
                }
                subtitle={`共 ${selected.changeDetails.length} 项变更，点击表格行查看详情`}
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-xs table-zebra border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200 text-left">
                        <th className="px-3 py-2 w-16 text-gray-700 font-semibold">#</th>
                        <th className="px-3 py-2 w-24 text-gray-700 font-semibold">变更类型</th>
                        <th className="px-3 py-2 w-28 text-gray-700 font-semibold">分类</th>
                        <th className="px-3 py-2 text-gray-700 font-semibold">描述</th>
                        <th className="px-3 py-2 w-52 text-gray-700 font-semibold">原值 → 新值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.changeDetails.map((d, i) => (
                        <tr key={d.id} className="border-b border-gray-100 align-top">
                          <td className="px-3 py-2 font-mono text-gray-500">{String(i + 1).padStart(2, '0')}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-0.5 border text-[11px] inline-flex ${getChangeTypeBadgeClass(d.type)}`}>
                              {getChangeTypeLabel(d.type)}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Tag tone={d.category === 'permission' ? 'primary' : d.category === 'role' ? 'violet' : 'sky'}>
                              {d.category}
                            </Tag>
                          </td>
                          <td className="px-3 py-2 text-gray-800">{d.description}</td>
                          <td className="px-3 py-2 font-mono text-[11px]">
                            {d.oldValue !== undefined && d.newValue !== undefined ? (
                              <div className="space-y-0.5">
                                <div className="text-rose-600 bg-rose-50 px-1.5 py-0.5 border border-rose-200 inline-block max-w-full truncate">
                                  {d.oldValue}
                                </div>
                                <div className="text-gray-400 text-center">↓</div>
                                <div className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-200 inline-block max-w-full truncate">
                                  {d.newValue}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </main>
      </div>
    </div>
  );
};
