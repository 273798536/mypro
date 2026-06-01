import React, { useState, useMemo } from 'react';
import { Card, Statistic, Row, Col, Tabs, Checkbox, DatePicker, Select, Radio, Button, Modal, Input, Tag, Collapse } from 'antd';
import { AlertTriangle, Activity, Minus, AlertCircle, ShieldAlert, Clock, Cpu, Package, Thermometer, Eye, MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';
import { useAppStore } from '../store';
import { AnomalyType, AnomalyLevel, AnomalyRecord, RadiationReading, EstimationResult, MaterialBatch } from '../types';
import { COLORS, ANOMALY_TYPE_LABELS, ANOMALY_LEVEL_LABELS, ANOMALY_LEVEL_COLORS, ANOMALY_TYPE_PRIORITY } from '../constants';
import StatusBadge from '../components/StatusBadge';

const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Panel } = Collapse;

interface AnomalyDetail extends AnomalyRecord {
  reading?: RadiationReading;
  result?: EstimationResult;
  batch?: MaterialBatch;
}

const typeIcons: Record<AnomalyType, React.ReactNode> = {
  [AnomalyType.SENSOR_DRIFT]: <Activity size={14} />,
  [AnomalyType.EMISSIVITY_MISSING]: <Minus size={14} />,
  [AnomalyType.BATCH_MISMATCH]: <Package size={14} />,
  [AnomalyType.FIELD_MISSING]: <AlertCircle size={14} />,
};

const AnomalyDetection: React.FC = () => {
  const { anomalies, readings, results, batches, getSensorIds, reviewAnomaly } = useAppStore();
  const [selectedTypes, setSelectedTypes] = useState<AnomalyType[]>([]);
  const [selectedLevels, setSelectedLevels] = useState<AnomalyLevel[]>([]);
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [selectedSensors, setSelectedSensors] = useState<string[]>([]);
  const [reviewStatus, setReviewStatus] = useState<'all' | 'pending' | 'reviewed'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewRemark, setReviewRemark] = useState('');
  const [currentReviewId, setCurrentReviewId] = useState<string | null>(null);

  const sensorIds = useMemo(() => getSensorIds(), [getSensorIds]);

  const stats = useMemo(() => {
    const typeCounts = {} as Record<AnomalyType, number>;
    const levelCounts = {} as Record<AnomalyLevel, number>;
    let pendingReview = 0;
    Object.values(AnomalyType).forEach(t => typeCounts[t as AnomalyType] = 0);
    Object.values(AnomalyLevel).forEach(l => levelCounts[l as AnomalyLevel] = 0);
    anomalies.forEach(a => {
      typeCounts[a.type]++;
      levelCounts[a.level]++;
      if (!a.isReviewed) pendingReview++;
    });
    return { typeCounts, levelCounts, total: anomalies.length, pendingReview };
  }, [anomalies]);

  const anomalyDetails = useMemo((): AnomalyDetail[] => {
    return anomalies
      .map(anomaly => ({
        ...anomaly,
        reading: readings.find(r => r.id === anomaly.readingId),
        result: results.find(r => r.id === anomaly.resultId),
        batch: batches.find(b => b.id === readings.find(r => r.id === anomaly.readingId)?.materialBatchId),
      }))
      .sort((a, b) => {
        if (a.type === AnomalyType.SENSOR_DRIFT && b.type !== AnomalyType.SENSOR_DRIFT) return -1;
        if (b.type === AnomalyType.SENSOR_DRIFT && a.type !== AnomalyType.SENSOR_DRIFT) return 1;
        return ANOMALY_TYPE_PRIORITY[b.type] - ANOMALY_TYPE_PRIORITY[a.type];
      });
  }, [anomalies, readings, results, batches]);

  const filteredAnomalies = useMemo(() => {
    return anomalyDetails.filter(item => {
      if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) return false;
      if (selectedLevels.length > 0 && !selectedLevels.includes(item.level)) return false;
      if (selectedSensors.length > 0 && item.reading && !selectedSensors.includes(item.reading.sensorId)) return false;
      if (dateRange?.[0] && dateRange?.[1] && item.reading) {
        const t = dayjs(item.reading.readingTime);
        if (t.isBefore(dateRange[0]) || t.isAfter(dateRange[1])) return false;
      }
      if (reviewStatus === 'pending' && item.isReviewed) return false;
      if (reviewStatus === 'reviewed' && !item.isReviewed) return false;
      return true;
    });
  }, [anomalyDetails, selectedTypes, selectedLevels, selectedSensors, dateRange, reviewStatus]);

  const openReviewModal = (id: string | null) => {
    setCurrentReviewId(id);
    setReviewRemark('');
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
    if (currentReviewId) {
      await reviewAnomaly(currentReviewId, '当前用户', reviewRemark);
    } else {
      for (const id of selectedIds) await reviewAnomaly(id, '当前用户', reviewRemark || '批量复核');
      setSelectedIds(new Set());
    }
    setReviewModalOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getCardClass = (item: AnomalyDetail) => [
    'rounded-lg mb-0 border-2 overflow-hidden',
    item.result?.isIsolated ? 'border-dashed border-slate-600 bg-slate-800/30' : '',
    item.type === AnomalyType.SENSOR_DRIFT ? 'border-red-500' : '',
    !item.isReviewed ? 'bg-slate-700/30' : 'bg-slate-800 border-slate-700',
  ].join(' ');

  const AnomalyList: React.FC<{ data: AnomalyDetail[] }> = ({ data }) => {
    if (data.length === 0) return <div className="text-center py-12 text-slate-400"><AlertCircle size={48} className="mx-auto mb-3 opacity-50" /><p>暂无异常数据</p></div>;

    const allSelected = data.length > 0 && data.every(item => selectedIds.has(item.id));
    const indeterminate = data.some(item => selectedIds.has(item.id)) && !allSelected;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-3">
          <Checkbox checked={allSelected} indeterminate={indeterminate} onChange={e => e.target.checked ? setSelectedIds(new Set(data.map(item => item.id))) : setSelectedIds(new Set())} />
          <span className="text-slate-300 text-sm">已选择 {selectedIds.size} 项</span>
          {selectedIds.size > 0 && <Button type="primary" size="small" onClick={() => openReviewModal(null)}>批量复核</Button>}
        </div>
        <Collapse activeKey={expandedId || undefined} onChange={keys => setExpandedId(Array.isArray(keys) ? keys[0] || null : null)} ghost className="space-y-3">
          {data.map(item => (
            <Panel key={item.id} className={getCardClass(item)} header={
              <div className="flex items-center gap-3 py-1" onClick={e => e.stopPropagation()}>
                <Checkbox checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />
                <div className="flex-1 flex items-center gap-3 min-w-0">
                  <StatusBadge type={item.type} level={item.level} />
                  <span className="text-slate-200 truncate">{item.description}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-400 flex-shrink-0">
                  <span className="flex items-center gap-1"><Clock size={14} />{dayjs(item.detectedAt).format('MM-DD HH:mm')}</span>
                  <Tag color={item.isReviewed ? 'success' : 'warning'} className={!item.isReviewed ? 'animate-pulse' : ''}>
                    {item.isReviewed ? '已复核' : '待复核'}
                  </Tag>
                  <Eye size={14} />
                </div>
              </div>
            }>
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2"><Cpu size={14} className="text-slate-400" /><span className="text-slate-400">传感器:</span><span className="text-slate-200">{item.reading?.sensorId}</span></div>
                  <div className="flex items-center gap-2"><Package size={14} className="text-slate-400" /><span className="text-slate-400">批次:</span><span className="text-slate-200">{item.batch?.batchNo}</span></div>
                  <div className="flex items-center gap-2"><Thermometer size={14} className="text-slate-400" /><span className="text-slate-400">温度:</span><span className="text-slate-200">{item.result?.estimatedTemp.toFixed(2)}°C</span></div>
                  <div className="flex items-center gap-2"><Clock size={14} className="text-slate-400" /><span className="text-slate-400">读数时间:</span><span className="text-slate-200">{dayjs(item.reading?.readingTime).format('YYYY-MM-DD HH:mm:ss')}</span></div>
                </div>
                {item.reviewRemark && (
                  <div className="p-3 bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1"><MessageSquare size={14} className="text-blue-400" /><span className="text-blue-400">复核意见</span></div>
                    <p className="text-slate-300">{item.reviewRemark}</p>
                    <p className="text-slate-500 text-xs mt-1">{item.reviewedBy} @ {dayjs(item.reviewedAt).format('YYYY-MM-DD HH:mm')}</p>
                  </div>
                )}
                {!item.isReviewed && <Button type="primary" size="small" onClick={() => openReviewModal(item.id)}>标记为已复核</Button>}
              </div>
            </Panel>
          ))}
        </Collapse>
      </div>
    );
  };

  const tabItems = [
    { key: 'all', label: <span className="flex items-center gap-2"><AlertTriangle size={16} />全部异常<Tag color="blue">{filteredAnomalies.length}</Tag></span>, children: <AnomalyList data={filteredAnomalies} /> },
    { key: 'drift', label: <span className="flex items-center gap-2"><Activity size={16} />传感器漂移<Tag color="red">{filteredAnomalies.filter(a => a.type === AnomalyType.SENSOR_DRIFT).length}</Tag></span>, children: <AnomalyList data={filteredAnomalies.filter(a => a.type === AnomalyType.SENSOR_DRIFT)} /> },
    { key: 'pending', label: <span className="flex items-center gap-2"><Clock size={16} />待复核<Tag color="orange">{stats.pendingReview}</Tag></span>, children: <AnomalyList data={filteredAnomalies.filter(a => !a.isReviewed)} /> },
    { key: 'isolated', label: <span className="flex items-center gap-2"><ShieldAlert size={16} />异常隔离区<Tag color="default">{filteredAnomalies.filter(a => a.result?.isIsolated).length}</Tag></span>, children: <AnomalyList data={filteredAnomalies.filter(a => a.result?.isIsolated)} /> },
  ];

  const tabStyle = { '--ant-tabs-color': COLORS.text, '--ant-tabs-item-color': COLORS.textSecondary, '--ant-tabs-item-hover-color': COLORS.text, '--ant-tabs-item-active-color': COLORS.primary, '--ant-tabs-ink-bar-color': COLORS.primary } as React.CSSProperties;

  return (
    <div className="space-y-4">
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}><Card className="bg-slate-800 border-slate-700 h-full"><Statistic title={<span className="flex items-center gap-2 text-slate-400"><AlertTriangle size={16} />异常总数</span>} value={stats.total} valueStyle={{ color: COLORS.danger }} suffix="条" /></Card></Col>
        {Object.values(AnomalyType).map(type => (
          <Col xs={12} sm={6} key={type}><Card className="bg-slate-800 border-slate-700 h-full"><Statistic title={<span className="flex items-center gap-2 text-slate-400">{typeIcons[type as AnomalyType]}{ANOMALY_TYPE_LABELS[type as AnomalyType]}</span>} value={stats.typeCounts[type as AnomalyType]} valueStyle={{ color: COLORS.warning }} /></Card></Col>
        ))}
        {Object.values(AnomalyLevel).map(level => (
          <Col xs={8} sm={4} key={level}><Card className="bg-slate-800 border-slate-700 h-full"><Statistic title={<span className="flex items-center gap-2 text-slate-400">{ANOMALY_LEVEL_LABELS[level as AnomalyLevel]}</span>} value={stats.levelCounts[level as AnomalyLevel]} valueStyle={{ color: ANOMALY_LEVEL_COLORS[level as AnomalyLevel] }} /></Card></Col>
        ))}
        <Col xs={8} sm={4}><Card className="bg-slate-800 border-slate-700 h-full"><Statistic title={<span className="flex items-center gap-2 text-slate-400"><Clock size={16} />待复核</span>} value={stats.pendingReview} valueStyle={{ color: COLORS.primary }} suffix="条" /></Card></Col>
      </Row>

      <Card className="bg-slate-800 border-slate-700">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="text-slate-400 text-sm mb-1 block">异常类型</label>
            <Checkbox.Group value={selectedTypes} onChange={v => setSelectedTypes(v as AnomalyType[])} className="flex flex-wrap gap-2">
              {Object.values(AnomalyType).map(type => <Checkbox key={type} value={type}>{ANOMALY_TYPE_LABELS[type as AnomalyType]}</Checkbox>)}
            </Checkbox.Group>
          </div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">异常等级</label>
            <Checkbox.Group value={selectedLevels} onChange={v => setSelectedLevels(v as AnomalyLevel[])} className="flex flex-wrap gap-2">
              {Object.values(AnomalyLevel).map(level => <Checkbox key={level} value={level}>{ANOMALY_LEVEL_LABELS[level as AnomalyLevel]}</Checkbox>)}
            </Checkbox.Group>
          </div>
          <div><label className="text-slate-400 text-sm mb-1 block">时间范围</label><RangePicker value={dateRange} onChange={v => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)} className="w-full bg-slate-700" /></div>
          <div><label className="text-slate-400 text-sm mb-1 block">传感器</label><Select mode="multiple" value={selectedSensors} onChange={setSelectedSensors} placeholder="选择传感器" className="w-full" options={sensorIds.map(id => ({ label: id, value: id }))} /></div>
          <div>
            <label className="text-slate-400 text-sm mb-1 block">复核状态</label>
            <Radio.Group value={reviewStatus} onChange={e => setReviewStatus(e.target.value)}>
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="pending">待复核</Radio.Button>
              <Radio.Button value="reviewed">已复核</Radio.Button>
            </Radio.Group>
          </div>
        </div>
      </Card>

      <Card className="bg-slate-800 border-slate-700" styles={{ body: { padding: 0 } }}>
        <Tabs defaultActiveKey="all" items={tabItems} className="p-4" style={tabStyle} />
      </Card>

      <Modal title="复核异常" open={reviewModalOpen} onOk={handleReviewSubmit} onCancel={() => setReviewModalOpen(false)} okText="确认复核" cancelText="取消">
        <div className="mb-3">
          <label className="text-slate-400 text-sm mb-1 block">复核意见</label>
          <TextArea value={reviewRemark} onChange={e => setReviewRemark(e.target.value)} rows={4} placeholder="请输入复核意见..." className="bg-slate-700" />
        </div>
        <p className="text-slate-500 text-xs">复核人: 当前用户</p>
      </Modal>
    </div>
  );
};

export default AnomalyDetection;
