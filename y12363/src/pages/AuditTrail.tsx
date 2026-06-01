import React, { useState, useMemo } from 'react';
import { Card, Table, Tag, Select, DatePicker, Input, Row, Col, Statistic, Tabs } from 'antd';
import {
  Clock, Database, Settings, FileSpreadsheet, GitCompare, User, Search, Filter,
  AlertTriangle, ArrowUpRight, ArrowDownRight, Minus
} from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import { AuditTrail as AuditTrailType, ComparisonResult } from '../types';
import { COLORS } from '../constants';
import type { TableProps } from 'antd';

const { RangePicker } = DatePicker;
const { Option } = Select;

const entityMeta: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  reading: { label: '读数', color: '#165DFF', icon: <Database size={14} /> },
  batch: { label: '批次', color: '#00B42A', icon: <FileSpreadsheet size={14} /> },
  config: { label: '配置', color: '#FF7D00', icon: <Settings size={14} /> },
  result: { label: '结果', color: '#722ED1', icon: <FileSpreadsheet size={14} /> },
};

const AuditTrailPage: React.FC = () => {
  const { auditTrails, runs, baseRunId, currentRunId, setBaseRun, setCurrentRun,
    comparisonSummary, batches, readings } = useAppStore();

  const [filters, setFilters] = useState({ entityType: [] as string[], dateRange: null as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null, modifiedBy: '', keyword: '' });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [compPagination, setCompPagination] = useState({ current: 1, pageSize: 10 });

  const modifiers = useMemo(() => [...new Set(auditTrails.map(t => t.modifiedBy))], [auditTrails]);

  const filteredTrails = useMemo(() => {
    return auditTrails
      .filter(t => {
        if (filters.entityType.length > 0 && !filters.entityType.includes(t.entityType)) return false;
        if (filters.modifiedBy && t.modifiedBy !== filters.modifiedBy) return false;
        if (filters.dateRange?.[0] && filters.dateRange?.[1]) {
          const time = dayjs(t.modifiedAt);
          if (time.isBefore(filters.dateRange[0]) || time.isAfter(filters.dateRange[1])) return false;
        }
        if (filters.keyword) {
          const kw = filters.keyword.toLowerCase();
          return [t.fieldName, String(t.oldValue), String(t.newValue), t.reason]
            .some(v => v.toLowerCase().includes(kw));
        }
        return true;
      })
      .sort((a, b) => new Date(b.modifiedAt).getTime() - new Date(a.modifiedAt).getTime());
  }, [auditTrails, filters]);

  const getEntityLabel = (trail: AuditTrailType) => {
    if (trail.entityType === 'batch') return batches.find(b => b.id === trail.entityId)?.batchNo || trail.entityId.slice(0, 8);
    if (trail.entityType === 'reading') return readings.find(r => r.id === trail.entityId)?.sensorId || trail.entityId.slice(0, 8);
    return trail.entityId.slice(0, 8);
  };

  const getRunLabel = (runId: string | null) => runId
    ? runs.find(r => r.id === runId)?.runName || runId.slice(0, 8)
    : '-';

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return '-';
    if (typeof val === 'number') return val.toFixed(2);
    if (val instanceof Date) return dayjs(val).format('YYYY-MM-DD HH:mm:ss');
    return String(val);
  };

  const trailColumns: TableProps<AuditTrailType>['columns'] = [
    { title: '时间', dataIndex: 'modifiedAt', key: 'modifiedAt', width: 160,
      defaultSortOrder: 'descend', sorter: (a, b) => new Date(a.modifiedAt).getTime() - new Date(b.modifiedAt).getTime(),
      render: (text: Date) => <span className="text-slate-300 text-xs">{dayjs(text).format('YYYY-MM-DD HH:mm:ss')}</span> },
    { title: '实体类型', dataIndex: 'entityType', key: 'entityType', width: 100,
      filters: Object.entries(entityMeta).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.entityType === value,
      render: (type: string) => (
        <Tag icon={entityMeta[type].icon} style={{
          backgroundColor: `${entityMeta[type].color}15`, borderColor: `${entityMeta[type].color}40`, color: entityMeta[type].color }}>
          {entityMeta[type].label}
        </Tag>
      )},
    { title: '实体标识', key: 'entityLabel', width: 120,
      render: (_, r) => <span className="text-slate-200 font-mono text-xs">{getEntityLabel(r)}</span> },
    { title: '字段', dataIndex: 'fieldName', key: 'fieldName', width: 120,
      render: (text: string) => <span className="text-slate-300">{text}</span> },
    { title: '旧值', dataIndex: 'oldValue', key: 'oldValue', width: 100,
      render: (text: any) => <span className="text-slate-400 font-mono text-xs">{formatValue(text)}</span> },
    { title: '新值', dataIndex: 'newValue', key: 'newValue', width: 100,
      render: (text: any) => <span className="text-blue-400 font-mono text-xs font-semibold">{formatValue(text)}</span> },
    { title: '修改人', dataIndex: 'modifiedBy', key: 'modifiedBy', width: 100,
      render: (text: string) => (
        <span className="flex items-center gap-1 text-slate-300"><User size={12} className="text-slate-500" />{text}</span>
      )},
    { title: '原因', dataIndex: 'reason', key: 'reason', width: 150, ellipsis: true,
      render: (text: string) => <span className="text-slate-400">{text}</span> },
    { title: '关联运行', dataIndex: 'relatedRunId', key: 'relatedRunId', width: 120,
      render: (text: string | null) => <span className="text-slate-500 text-xs">{getRunLabel(text)}</span> },
  ];

  const compColumns: TableProps<ComparisonResult>['columns'] = [
    { title: '批次', dataIndex: 'batchNo', key: 'batchNo', width: 120, sorter: (a, b) => a.batchNo.localeCompare(b.batchNo),
      render: (text: string) => <span className="text-slate-200">{text}</span> },
    { title: '基准温度', dataIndex: 'oldTemp', key: 'oldTemp', width: 120, sorter: (a, b) => a.oldTemp - b.oldTemp,
      render: (text: number) => <span className="text-slate-200">{text.toFixed(2)}°C</span> },
    { title: '当前温度', dataIndex: 'newTemp', key: 'newTemp', width: 120, sorter: (a, b) => a.newTemp - b.newTemp,
      render: (text: number) => <span className="text-blue-400 font-semibold">{text.toFixed(2)}°C</span> },
    { title: '差异值', dataIndex: 'diff', key: 'diff', width: 120, sorter: (a, b) => Math.abs(a.diff) - Math.abs(b.diff),
      render: (text: number) => {
        const isPos = text > 0, isZero = text === 0;
        const colorClass = isZero ? 'text-slate-400' : isPos ? 'text-red-400' : 'text-green-400';
        const Icon = isZero ? Minus : isPos ? ArrowUpRight : ArrowDownRight;
        return (
          <div className={`flex items-center gap-1 ${colorClass} font-semibold`}>
            <Icon size={14} />
            <span>{isPos ? '+' : ''}{text.toFixed(2)}°C</span>
          </div>
        );
      }},
    { title: '显著性', dataIndex: 'isSignificant', key: 'isSignificant', width: 100,
      render: (s: boolean) => s
        ? <Tag color="red" icon={<AlertTriangle size={12} />}>显著</Tag>
        : <Tag color="green">正常</Tag> },
  ];

  const rowClassName = (r: ComparisonResult) => r.isSignificant ? 'bg-red-900/20 hover:bg-red-900/30' : 'hover:bg-slate-700/30';

  const stats = useMemo(() => {
    const counts: Record<string, number> = { reading: 0, batch: 0, config: 0, result: 0 };
    filteredTrails.forEach(t => counts[t.entityType]++);
    return { total: filteredTrails.length, ...counts };
  }, [filteredTrails]);

  const tabStyle = {
    '--ant-tabs-color': COLORS.text, '--ant-tabs-item-color': COLORS.textSecondary,
    '--ant-tabs-item-hover-color': COLORS.text, '--ant-tabs-item-active-color': COLORS.primary,
    '--ant-tabs-ink-bar-color': COLORS.primary } as React.CSSProperties;

  const tableStyle = {
    '--ant-table-bg': 'transparent', '--ant-table-row-hover-bg': 'rgba(51, 65, 85, 0.3)',
    '--ant-table-thead-bg': 'rgba(30, 41, 59, 0.5)', '--ant-table-header-bg': 'rgba(30, 41, 59, 0.5)',
    '--ant-table-border-color': COLORS.border, '--ant-table-cell-color': COLORS.text } as React.CSSProperties;

  const tabItems = [
    { key: 'history', label: <span className="flex items-center gap-2"><Clock size={16} />变更历史</span>,
      children: (
        <div className="bg-slate-800 border border-slate-700 rounded-xl">
          <Table<AuditTrailType>
            columns={trailColumns} dataSource={filteredTrails} rowKey="id"
            pagination={{ ...pagination, showSizeChanger: true, showQuickJumper: true,
              showTotal: (total) => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'],
              onChange: (c, p) => setPagination({ current: c, pageSize: p })}}
            scroll={{ y: 400, x: 1000 }} size="middle" style={tableStyle} />
        </div>
      )},
    { key: 'comparison', label: (
        <span className="flex items-center gap-2"><GitCompare size={16} />重跑对比
          {baseRunId && <Tag color="blue" className="ml-1">已启用</Tag>}
        </span>
      ),
      children: (
        <div className="space-y-4">
          <Card className="bg-slate-800 border-slate-700">
            <h3 className="text-slate-100 font-semibold mb-4 flex items-center gap-2">
              <GitCompare size={16} className="text-blue-500" />运行对比选择
            </h3>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <label className="text-slate-400 text-sm mb-1 block">基准运行</label>
                <Select value={baseRunId} onChange={setBaseRun} placeholder="选择基准运行" allowClear
                  style={{ width: '100%' }} className="bg-slate-700">
                  {runs.map(r => <Option key={r.id} value={r.id}>{r.runName} ({dayjs(r.startTime).format('MM-DD HH:mm')})</Option>)}
                </Select>
              </Col>
              <Col xs={24} sm={12}>
                <label className="text-slate-400 text-sm mb-1 block">当前运行</label>
                <Select value={currentRunId} onChange={setCurrentRun} placeholder="选择当前运行"
                  style={{ width: '100%' }} className="bg-slate-700">
                  {runs.map(r => <Option key={r.id} value={r.id}>{r.runName} ({dayjs(r.startTime).format('MM-DD HH:mm')})</Option>)}
                </Select>
              </Col>
            </Row>
          </Card>

          {comparisonSummary ? (
            <>
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
                <h3 className="text-slate-100 font-semibold text-lg mb-4">对比分析汇总</h3>
                <Row gutter={[16, 16]}>
                  <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">总记录数</span>} value={comparisonSummary.totalRecords} valueStyle={{ color: COLORS.text }} suffix="条" /></Card></Col>
                  <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">差异记录数</span>} value={comparisonSummary.diffRecords} valueStyle={{ color: '#FF7D00' }} suffix="条" /></Card></Col>
                  <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">最大差异</span>} value={comparisonSummary.maxDiff} precision={2} valueStyle={{ color: '#F53F3F' }} suffix="°C" /></Card></Col>
                  <Col xs={12} sm={6}><Card className="bg-slate-700/50 border-slate-600"><Statistic title={<span className="text-slate-400">平均差异</span>} value={comparisonSummary.avgDiff} precision={2} valueStyle={{ color: '#165DFF' }} suffix="°C" /></Card></Col>
                </Row>
                {comparisonSummary.affectedBatches.length > 0 && (
                  <div className="mt-4">
                    <span className="text-slate-400 mr-2">受影响批次：</span>
                    {comparisonSummary.affectedBatches.map(b => <Tag key={b} color="blue">{b}</Tag>)}
                  </div>
                )}
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-xl">
                <div className="p-4 border-b border-slate-700">
                  <h3 className="text-slate-100 font-semibold text-lg">差异明细</h3>
                  <p className="text-slate-400 text-sm mt-1">差异超过 5°C 的记录已高亮显示</p>
                </div>
                <Table<ComparisonResult>
                  columns={compColumns} dataSource={comparisonSummary.details} rowKey="readingId"
                  pagination={{ ...compPagination, showSizeChanger: true, showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条`, pageSizeOptions: ['10', '20', '50'],
                    onChange: (c, p) => setCompPagination({ current: c, pageSize: p }) }}
                  rowClassName={rowClassName} scroll={{ y: 400 }} size="middle" style={tableStyle} />
              </div>
            </>
          ) : (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
              <p className="text-slate-400">请选择基准运行和当前运行以查看对比分析</p>
            </div>
          )}
        </div>
      )},
  ];

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="bg-slate-800 border-slate-700 h-full">
            <Statistic title={<span className="flex items-center gap-2 text-slate-400"><Filter size={16} />总变更数</span>}
              value={stats.total} valueStyle={{ color: COLORS.primary }} suffix="条" />
          </Card>
        </Col>
        {Object.entries(entityMeta).map(([type, meta]) => (
          <Col xs={12} sm={6} key={type}>
            <Card className="bg-slate-800 border-slate-700 h-full">
              <Statistic title={<span className="flex items-center gap-2 text-slate-400">{meta.icon}{meta.label}变更</span>}
                value={stats[type as keyof typeof stats]} valueStyle={{ color: meta.color }} suffix="条" />
            </Card>
          </Col>
        ))}
      </Row>

      <Card className="bg-slate-800 border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">实体类型</label>
            <Select mode="multiple" value={filters.entityType}
              onChange={v => setFilters(f => ({ ...f, entityType: v }))} placeholder="选择类型" style={{ width: '100%' }}>
              {Object.entries(entityMeta).map(([value, { label }]) => <Option key={value} value={value}>{label}</Option>)}
            </Select>
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">时间范围</label>
            <RangePicker value={filters.dateRange}
              onChange={v => setFilters(f => ({ ...f, dateRange: v as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null }))}
              showTime style={{ width: '100%' }} className="bg-slate-700" />
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">修改人</label>
            <Select value={filters.modifiedBy} onChange={(v) => setFilters((f) => ({ ...f, modifiedBy: v }))}
              placeholder="选择修改人" allowClear style={{ width: '100%' }}>
              {modifiers.map((m) => <Option key={m} value={m}>{m}</Option>)}
            </Select>
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">关键词搜索</label>
            <Input prefix={<Search size={14} className="text-slate-500" />} value={filters.keyword}
              onChange={(e) => setFilters((f) => ({ ...f, keyword: e.target.value }))}
              placeholder="搜索字段、值、原因..." allowClear />
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700" styles={{ body: { padding: 0 } }}>
        <Tabs defaultActiveKey="history" items={tabItems} className="p-4" style={tabStyle} />
      </Card>
    </div>
  );
};

export default AuditTrailPage;
