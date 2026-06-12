import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Search,
  GitBranch,
  Clock,
  AlertOctagon,
  ArrowRight,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Waves,
  Globe2
} from 'lucide-react';
import { useVoyageStore } from '@/store/useVoyageStore';
import { cn } from '@/lib/utils';
import StatusBadge from '@/components/StatusBadge';
import type { CleanStep, FuelRecord } from '@/types';

type PipelineNodeKey = 'import' | 'remark' | 'nullfill' | 'dedupe' | 'manual' | 'final';

interface PipelineNode {
  key: PipelineNodeKey;
  label: string;
  icon: typeof GitBranch;
  color: string;
}

const PIPELINE_NODES: PipelineNode[] = [
  { key: 'import', label: '原始导入', icon: GitBranch, color: 'bg-ocean' },
  { key: 'remark', label: '备注解析', icon: Filter, color: 'bg-ocean' },
  { key: 'nullfill', label: '空值填充', icon: CheckCircle2, color: 'bg-ocean' },
  { key: 'dedupe', label: '重复去重', icon: AlertTriangle, color: 'bg-ocean' },
  { key: 'manual', label: '人工修正', icon: AlertOctagon, color: 'bg-data-gold' },
  { key: 'final', label: '最终结果', icon: CheckCircle2, color: 'bg-green-500' }
];

const getNodeDetails = (
  nodeKey: PipelineNodeKey,
  recordId: string | null,
  store: ReturnType<typeof useVoyageStore.getState>
): { steps: CleanStep[]; affectedRecords: FuelRecord[] } => {
  const steps: CleanStep[] = [];
  const affectedRecords: FuelRecord[] = [];

  if (!recordId) {
    const sampleRecords = store.fuelRecords.slice(0, 5);
    const now = new Date().toISOString();
    switch (nodeKey) {
      case 'import':
        steps.push({
          step: '原始数据导入',
          before: null,
          after: `${sampleRecords.length} 条记录`,
          reason: '从船载终端、气象API、潮位站批量导入原始数据',
          operator: 'system',
          timestamp: now
        });
        return { steps, affectedRecords: sampleRecords };
      case 'remark':
        steps.push({
          step: '备注信息解析',
          before: '备注文本字段',
          after: '风速、浪高、气温等结构化字段',
          reason: '使用正则从备注文本中提取气象参数，补充缺失字段',
          operator: 'system',
          timestamp: now
        });
        return { steps, affectedRecords: sampleRecords.slice(0, 3) };
      case 'nullfill':
        steps.push({
          step: '空值插值填充',
          before: '缺失值',
          after: '前后时段均值填充',
          reason: '基于时间序列邻近记录的平均值对空值进行线性插值',
          operator: 'system',
          timestamp: now
        });
        return { steps, affectedRecords: sampleRecords.slice(1, 4) };
      case 'dedupe':
        steps.push({
          step: '重复数据移除',
          before: '3 条重复记录',
          after: '保留 1 条有效记录',
          reason: '按时间戳+经纬度指纹检测重复，保留置信度最高的一条',
          operator: 'system',
          timestamp: now
        });
        return { steps, affectedRecords: sampleRecords.slice(2, 4) };
      case 'manual':
        steps.push({
          step: '人工审核修正',
          before: '待审核状态',
          after: '审核通过/驳回',
          reason: '人工核对异常数据，填写修正理由后提交审批',
          operator: 'user',
          timestamp: now
        });
        return { steps, affectedRecords: store.getPendingRecords() };
      case 'final':
        steps.push({
          step: '数据入库归档',
          before: '清洗完成数据',
          after: '最终可用数据集',
          reason: '所有清洗步骤完成后，数据标记为最终版本并归档',
          operator: 'system',
          timestamp: now
        });
        return { steps, affectedRecords: store.fuelRecords.filter(r => r.status === 'approved').slice(0, 5) };
    }
  }

  const record = store.fuelRecords.find(r => r.id === recordId);
  const corrections = store.getCorrectionsByRecord(recordId);
  const auditLogs = store.getAuditLogsByRecord(recordId);
  const weather = store.getWeatherByFuelRecord(recordId);

  if (record) {
    affectedRecords.push(record);
  }

  switch (nodeKey) {
    case 'import':
      if (record) {
        steps.push({
          step: '原始记录导入',
          before: null,
          after: `油耗:${record.fuelConsumption}L/h, 航速:${record.speed}节`,
          reason: `从${record.source}采集数据，记录ID: ${record.id.slice(0, 15)}...`,
          operator: 'system',
          timestamp: record.timestamp
        });
      }
      break;
    case 'remark':
      if (weather?.parsedFromRemark) {
        steps.push({
          step: '备注字段解析',
          before: weather.remark || '原始备注',
          after: '已从备注解析结构化数据',
          reason: '从备注文本中正则提取气象参数补充缺失值',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      } else {
        steps.push({
          step: '备注字段解析',
          before: '-',
          after: '无需解析',
          reason: '该记录无备注或备注无可解析信息',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      }
      break;
    case 'nullfill':
      if (weather?.isNullFilled) {
        steps.push({
          step: '空值填充处理',
          before: '存在空值字段',
          after: `填充来源: ${weather.nullFillSource || '邻近均值插值'}`,
          reason: '对缺失字段使用邻近时段数据进行线性插值填充',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      } else {
        steps.push({
          step: '空值填充处理',
          before: '-',
          after: '无空值',
          reason: '该记录所有字段完整，无需填充',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      }
      break;
    case 'dedupe':
      if (weather?.isDuplicateRemoved) {
        steps.push({
          step: '重复数据检测',
          before: '检测到重复记录',
          after: '已标记重复并移除',
          reason: '时间戳+坐标指纹匹配，判定为重复导入，已去重',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      } else {
        steps.push({
          step: '重复数据检测',
          before: '-',
          after: '唯一记录',
          reason: '经指纹比对，该记录无重复',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      }
      break;
    case 'manual':
      if (corrections.length > 0) {
        corrections.forEach(c => {
          steps.push({
            step: '人工数据修正',
            before: c.beforeValue,
            after: c.afterValue,
            reason: c.reason,
            operator: 'user',
            timestamp: c.operateTime
          });
        });
      } else {
        steps.push({
          step: '人工数据修正',
          before: '-',
          after: '未修正',
          reason: '该记录无需人工修正',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      }
      break;
    case 'final':
      if (auditLogs.length > 0) {
        auditLogs.slice(0, 2).forEach(log => {
          steps.push({
            step: `最终状态: ${log.action}`,
            before: '-',
            after: log.detail,
            reason: `操作人: ${log.operator}`,
            operator: log.operator.includes('系统') || log.operator === '系统自动' ? 'system' : 'user',
            timestamp: log.timestamp
          });
        });
      } else {
        steps.push({
          step: '最终入库',
          before: '待处理',
          after: record?.status || 'unknown',
          reason: '数据完成全流程处理，归档入库',
          operator: 'system',
          timestamp: record?.timestamp || new Date().toISOString()
        });
      }
      break;
  }

  return { steps, affectedRecords };
};

export default function TracePanel() {
  const navigate = useNavigate();
  const params = useParams();
  const storeState = useVoyageStore.getState();

  const [searchId, setSearchId] = useState(params.recordId || '');
  const [activeNode, setActiveNode] = useState<PipelineNodeKey>('import');
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(params.recordId || null);
  const [showTimezoneInvestigation, setShowTimezoneInvestigation] = useState(false);

  const timezoneErrorTide = useVoyageStore(s => s.getTimezoneErrorRecord());
  const fuelRecords = useVoyageStore(s => s.fuelRecords);
  const vessels = useVoyageStore(s => s.vessels);
  const voyages = useVoyageStore(s => s.voyages);

  const currentRecord = useMemo(() => {
    if (!currentRecordId) return null;
    return fuelRecords.find(r => r.id === currentRecordId) || null;
  }, [currentRecordId, fuelRecords]);

  const currentVessel = useMemo(() => {
    if (!currentRecord) return null;
    const voyage = voyages.find(v => v.id === currentRecord.voyageId);
    if (!voyage) return null;
    return vessels.find(v => v.id === voyage.vesselId) || null;
  }, [currentRecord, voyages, vessels]);

  const { steps, affectedRecords } = useMemo(
    () => getNodeDetails(activeNode, currentRecordId, storeState),
    [activeNode, currentRecordId, storeState]
  );

  const handleSearch = () => {
    if (!searchId.trim()) {
      setCurrentRecordId(null);
      return;
    }
    const found = fuelRecords.find(r => r.id.includes(searchId.trim()));
    if (found) {
      setCurrentRecordId(found.id);
      setActiveNode('import');
    }
  };

  const handleTimezoneInvestigation = () => {
    setShowTimezoneInvestigation(true);
    if (timezoneErrorTide?.fuelRecordId) {
      setCurrentRecordId(timezoneErrorTide.fuelRecordId);
      setSearchId(timezoneErrorTide.fuelRecordId);
      setActiveNode('manual');
    }
  };

  const timezoneAffectedRecords = useMemo(() => {
    if (!timezoneErrorTide?.fuelRecordId) return [];
    const rec = fuelRecords.find(r => r.id === timezoneErrorTide.fuelRecordId);
    if (!rec) return [];
    return fuelRecords.filter(r => r.voyageId === rec.voyageId).slice(0, 4);
  }, [timezoneErrorTide, fuelRecords]);

  return (
      <div className="min-h-[calc(100vh-8rem)]">
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-ocean/20 backdrop-blur-sm">
              <GitBranch className="h-6 w-6 text-ocean" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-deep-sea tracking-wide">数据溯源面板</h1>
              <p className="text-sm text-sea-gray-dark mt-0.5">追踪每条油耗记录的完整处理链路</p>
            </div>
          </div>
          <button
            onClick={handleTimezoneInvestigation}
            className={cn(
              'flex items-center gap-2 rounded-xl px-5 py-2.5 font-medium transition-all border',
              showTimezoneInvestigation
                ? 'bg-coral text-white border-coral shadow-lg shadow-coral/30'
                : 'bg-white/70 backdrop-blur border-white/60 text-coral hover:bg-coral hover:text-white hover:border-coral hover:shadow-lg hover:shadow-coral/20'
            )}
          >
            <AlertOctagon className="h-4 w-4" />
            时区错误倒查
          </button>
        </header>

        <div className="mb-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm p-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-sea-gray-dark" />
              <input
                type="text"
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="输入记录ID进行溯源追踪..."
                className="w-full pl-12 pr-4 py-3 rounded-xl bg-sea-gray/50 border border-sea-gray-dark/20 text-deep-sea placeholder:text-sea-gray-dark focus:outline-none focus:border-ocean/50 focus:ring-2 focus:ring-ocean/20 transition-all"
              />
            </div>
            <button
              onClick={handleSearch}
              className="rounded-xl bg-ocean text-white px-6 py-3 font-medium hover:bg-ocean-light transition-colors flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              搜索追踪
            </button>
            {currentRecordId && (
              <button
                onClick={() => { setCurrentRecordId(null); setSearchId(''); }}
                className="rounded-xl bg-sea-gray text-sea-gray-dark px-5 py-3 font-medium hover:bg-sea-gray-dark/20 transition-colors"
              >
                清除筛选
              </button>
            )}
          </div>

          {currentRecord && (
            <div className="mt-4 pt-4 border-t border-sea-gray-dark/10 flex flex-wrap items-center gap-4 text-sm">
              <span className="text-sea-gray-dark">当前追踪记录：</span>
              <span className="font-mono text-deep-sea bg-sea-gray/50 px-2 py-1 rounded">{currentRecord.id.slice(0, 20)}...</span>
              {currentVessel && (
                <span className="text-deep-sea">
                  <span className="text-sea-gray-dark">船名：</span>{currentVessel.name}
                </span>
              )}
              <span className="text-deep-sea">
                <span className="text-sea-gray-dark">时间：</span>
                {new Date(currentRecord.timestamp).toLocaleString('zh-CN')}
              </span>
              <StatusBadge status={currentRecord.status} />
            </div>
          )}
        </div>

        <div className="mb-6 rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm p-6">
          <h2 className="text-sm font-semibold text-sea-gray-dark mb-6 flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            数据处理流程链路
          </h2>
          <div className="flex items-center justify-between relative px-4">
            <div className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-ocean/60 via-data-gold/60 to-green-500/60" />
            <svg className="absolute left-12 right-12 top-1/2 -translate-y-1/2 h-0.5 w-[calc(100%-6rem)] overflow-visible pointer-events-none">
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#00B8D4" />
                </marker>
              </defs>
            </svg>
            {PIPELINE_NODES.map((node, idx) => {
              const Icon = node.icon;
              const isActive = activeNode === node.key;
              return (
                <div key={node.key} className="relative flex flex-col items-center z-10">
                  <button
                    onClick={() => setActiveNode(node.key)}
                    className={cn(
                      'relative flex h-16 w-16 items-center justify-center rounded-full border-4 transition-all duration-300',
                      isActive
                        ? `${node.color} border-white shadow-xl scale-110`
                        : 'bg-white border-sea-gray-dark/20 hover:border-ocean/50 hover:scale-105'
                    )}
                  >
                    {isActive && (
                      <>
                        <span className={cn('absolute inset-0 rounded-full animate-ping opacity-30', node.color)} />
                        <span className={cn('absolute -inset-2 rounded-full animate-pulse opacity-20', node.color)} />
                      </>
                    )}
                    <Icon className={cn('h-7 w-7 relative z-10', isActive ? 'text-white' : 'text-sea-gray-dark')} />
                  </button>
                  <div className="mt-3 text-center">
                    <p className={cn(
                      'text-sm font-semibold transition-colors',
                      isActive ? 'text-deep-sea' : 'text-sea-gray-dark'
                    )}>
                      {node.label}
                    </p>
                    <p className="text-xs text-sea-gray-dark mt-0.5">步骤 {idx + 1}</p>
                  </div>
                  {idx < PIPELINE_NODES.length - 1 && (
                    <ChevronRight className="absolute top-8 -right-3 h-5 w-5 text-ocean" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {showTimezoneInvestigation && timezoneErrorTide && (
          <div className="mb-6 rounded-2xl bg-gradient-to-br from-coral/10 via-white/70 to-data-gold/10 backdrop-blur-md border border-coral/30 shadow-sm overflow-hidden">
            <div className="bg-coral/10 px-6 py-4 border-b border-coral/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-coral/20">
                  <Waves className="h-5 w-5 text-coral" />
                </div>
                <div>
                  <h3 className="font-bold text-deep-sea flex items-center gap-2">
                    <AlertOctagon className="h-4 w-4 text-coral" />
                    潮位时区错误专项倒查
                  </h3>
                  <p className="text-xs text-sea-gray-dark mt-0.5">
                    检测到关联潮位数据时区配置错误，已自动定位关联记录
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowTimezoneInvestigation(false)}
                className="text-sea-gray-dark hover:text-deep-sea text-sm"
              >
                收起
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-deep-sea mb-3 flex items-center gap-2">
                  <ArrowRight className="h-4 w-4 text-coral" />
                  时区错误传导链
                </h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {[
                    { label: '原时区', value: timezoneErrorTide.timezone, icon: Globe2, color: 'bg-coral/20 text-coral border-coral/30' },
                    { label: '修正时区', value: 'UTC+8', icon: Globe2, color: 'bg-ocean/20 text-ocean border-ocean/30' },
                    { label: '原潮位', value: `${timezoneErrorTide.tideLevel}m`, icon: Waves, color: 'bg-sea-gray text-sea-gray-dark border-sea-gray-dark/30' },
                    { label: '修正潮位', value: `${timezoneErrorTide.correctedTideLevel || '-'}m`, icon: Waves, color: 'bg-green-500/20 text-green-600 border-green-500/30' },
                    { label: '影响油耗', value: '±8.5%', icon: AlertTriangle, color: 'bg-data-gold/20 text-data-gold border-data-gold/30' }
                  ].map((item, i) => {
                    const ItemIcon = item.icon;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className={cn('flex items-center gap-2 rounded-xl px-4 py-2.5 border backdrop-blur-sm', item.color)}>
                          <ItemIcon className="h-4 w-4" />
                          <div>
                            <p className="text-[10px] opacity-70 leading-none">{item.label}</p>
                            <p className="text-sm font-bold leading-tight mt-0.5">{item.value}</p>
                          </div>
                        </div>
                        {i < 4 && <ChevronRight className="h-5 w-5 text-sea-gray-dark" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-deep-sea mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-data-gold" />
                  修正前后数据对比
                </h4>
                <div className="overflow-hidden rounded-xl border border-sea-gray-dark/20">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-sea-gray/50">
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark">数据项</th>
                        <th className="px-4 py-3 text-left font-semibold text-coral">修正前（时区错误）</th>
                        <th className="px-4 py-3 text-left font-semibold text-ocean">修正后（正确时区）</th>
                        <th className="px-4 py-3 text-left font-semibold text-data-gold">差异</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sea-gray-dark/10">
                      {[
                        { field: '采集时间', before: '2026-06-10 04:00 (UTC+0)', after: '2026-06-10 12:00 (UTC+8)', diff: '+8小时' },
                        { field: '潮位值', before: `${timezoneErrorTide.tideLevel}m`, after: `${timezoneErrorTide.correctedTideLevel || '-'}m`, diff: `${((timezoneErrorTide.correctedTideLevel || 0) - timezoneErrorTide.tideLevel).toFixed(2)}m` },
                        { field: '关联油耗', before: '32.8 L/h', after: '30.0 L/h', diff: '-2.8 L/h (-8.5%)' },
                        { field: '数据来源', before: '海洋预报台', after: '海洋预报台', diff: '—' }
                      ].map((row, i) => (
                        <tr key={i} className="bg-white/50 hover:bg-white transition-colors">
                          <td className="px-4 py-3 font-medium text-deep-sea">{row.field}</td>
                          <td className="px-4 py-3 font-mono text-coral line-through">{row.before}</td>
                          <td className="px-4 py-3 font-mono text-ocean font-semibold">{row.after}</td>
                          <td className="px-4 py-3 font-mono text-data-gold">{row.diff}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-deep-sea mb-3 flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-ocean" />
                  影响的关联记录（{timezoneAffectedRecords.length}条）
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {timezoneAffectedRecords.map(rec => {
                    const voyage = voyages.find(v => v.id === rec.voyageId);
                    const vessel = voyage ? vessels.find(v => v.id === voyage.vesselId) : null;
                    return (
                      <button
                        key={rec.id}
                        onClick={() => { setCurrentRecordId(rec.id); setSearchId(rec.id); setActiveNode('import'); }}
                        className={cn(
                          'text-left rounded-xl p-4 border transition-all',
                          currentRecordId === rec.id
                            ? 'bg-ocean/10 border-ocean/40 shadow-md'
                            : 'bg-white/50 border-sea-gray-dark/20 hover:border-ocean/30 hover:bg-white'
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-deep-sea text-sm">{vessel?.name || '未知船舶'}</span>
                          <StatusBadge status={rec.status} />
                        </div>
                        <div className="text-xs text-sea-gray-dark space-y-1">
                          <p className="font-mono">{rec.id.slice(0, 18)}...</p>
                          <p><Clock className="h-3 w-3 inline mr-1" />{new Date(rec.timestamp).toLocaleString('zh-CN')}</p>
                          <p>油耗: <span className="font-semibold text-deep-sea">{rec.fuelConsumption} L/h</span> · 航速: {rec.speed}节</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm h-full">
              <div className="px-6 py-4 border-b border-sea-gray-dark/10 flex items-center gap-3">
                <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', PIPELINE_NODES.find(n => n.key === activeNode)?.color, 'text-white')}>
                  {(() => { const Icon = PIPELINE_NODES.find(n => n.key === activeNode)?.icon || GitBranch; return <Icon className="h-4 w-4" />; })()}
                </div>
                <div>
                  <h3 className="font-semibold text-deep-sea">
                    {PIPELINE_NODES.find(n => n.key === activeNode)?.label} - 操作详情
                  </h3>
                  <p className="text-xs text-sea-gray-dark mt-0.5">该步骤的具体处理信息</p>
                </div>
              </div>
              <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                {steps.map((step, idx) => (
                  <div key={idx} className="rounded-xl border border-sea-gray-dark/20 bg-white p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold',
                          step.operator === 'system'
                            ? 'bg-ocean/10 text-ocean'
                            : 'bg-data-gold/10 text-data-gold'
                        )}>
                          {step.step}
                        </span>
                        <span className={cn(
                          'rounded-md px-2 py-0.5 text-[10px] font-medium',
                          step.operator === 'system'
                            ? 'bg-ocean/10 text-ocean'
                            : 'bg-data-gold/10 text-data-gold'
                        )}>
                          {step.operator === 'system' ? '系统操作' : '用户操作'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-sea-gray-dark">
                        <Clock className="h-3 w-3" />
                        {new Date(step.timestamp).toLocaleString('zh-CN')}
                      </div>
                    </div>
                    <div className="mb-3 flex items-center gap-2 rounded-lg bg-sea-gray/50 p-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-sea-gray-dark mb-1">变更前</div>
                        <div className="font-mono text-sm text-deep-sea/70 truncate">
                          {step.before === null || step.before === undefined || step.before === '-' ? '-' : String(step.before)}
                        </div>
                      </div>
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-ocean shadow-sm">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-medium text-sea-gray-dark mb-1">变更后</div>
                        <div className="font-mono text-sm text-ocean font-semibold truncate">
                          {step.after === null || step.after === undefined ? '-' : String(step.after)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-deep-sea-light">
                      <span className="font-semibold text-deep-sea">处理理由：</span>
                      {step.reason}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 shadow-sm h-full flex flex-col">
              <div className="px-6 py-4 border-b border-sea-gray-dark/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-deep-sea text-white">
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-deep-sea">该步骤影响的数据</h3>
                    <p className="text-xs text-sea-gray-dark mt-0.5">
                      共 {affectedRecords.length} 条记录受此步骤影响
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => currentRecordId && navigate(`/correction?recordId=${currentRecordId}`)}
                  className="text-xs rounded-lg bg-data-gold/10 text-data-gold px-3 py-1.5 font-medium hover:bg-data-gold/20 transition-colors"
                >
                  前往修正
                </button>
              </div>
              <div className="flex-1 overflow-auto max-h-[500px]">
                {affectedRecords.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-sea-gray-dark">
                    <GitBranch className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">暂无影响数据</p>
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-sea-gray/50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">记录ID</th>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">时间</th>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">油耗(L/h)</th>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">航速(节)</th>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">来源</th>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">状态</th>
                        <th className="px-4 py-3 text-left font-semibold text-sea-gray-dark whitespace-nowrap">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sea-gray-dark/10">
                      {affectedRecords.map(rec => {
                        const isSelected = currentRecordId === rec.id;
                        return (
                          <tr
                            key={rec.id}
                            onClick={() => { setCurrentRecordId(rec.id); setSearchId(rec.id); }}
                            className={cn(
                              'bg-white/50 hover:bg-white transition-colors cursor-pointer',
                              isSelected && 'bg-ocean/5'
                            )}
                          >
                            <td className="px-4 py-3 font-mono text-xs text-deep-sea truncate max-w-[140px]">
                              {rec.id.slice(0, 16)}...
                            </td>
                            <td className="px-4 py-3 text-xs text-deep-sea whitespace-nowrap">
                              {new Date(rec.timestamp).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn(
                                'font-mono font-semibold',
                                rec.hasCorrection ? 'text-data-gold' : 'text-deep-sea'
                              )}>
                                {rec.fuelConsumption.toFixed(1)}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono text-deep-sea">{rec.speed.toFixed(1)}</td>
                            <td className="px-4 py-3 text-xs text-sea-gray-dark">{rec.source}</td>
                            <td className="px-4 py-3"><StatusBadge status={rec.status} /></td>
                            <td className="px-4 py-3">
                              <button
                                onClick={(e) => { e.stopPropagation(); navigate(`/correction?recordId=${rec.id}`); }}
                                className="text-xs text-ocean hover:text-ocean-light font-medium"
                              >
                                查看
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
