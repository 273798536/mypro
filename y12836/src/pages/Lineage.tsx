import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  GitBranch,
  Clock,
  User,
  Activity,
  FileText,
  Download,
  CheckCircle2,
  Edit3,
  AlertTriangle,
  ArrowLeftRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import PositiveRateRing from '@/components/charts/PositiveRateRing';
import { formatDistanceToNow, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { LineageEventType } from '@/types';

export default function Lineage() {
  const { sampleId } = useParams<{ sampleId?: string }>();
  const navigate = useNavigate();
  const samples = useAppStore((state) => state.samples);
  const getSampleById = useAppStore((state) => state.getSampleById);
  const getSampleLineage = useAppStore((state) => state.getSampleLineage);
  const getSampleVersions = useAppStore((state) => state.getSampleVersions);
  const getSampleExports = useAppStore((state) => state.getSampleExports);
  const getSampleNotes = useAppStore((state) => state.getSampleNotes);

  const [selectedSample, setSelectedSample] = useState(sampleId || '');
  const [viewMode, setViewMode] = useState<'timeline' | 'compare'>('timeline');
  const [compareVersion1, setCompareVersion1] = useState('');
  const [compareVersion2, setCompareVersion2] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const currentSample = selectedSample ? getSampleById(selectedSample) : null;
  const lineageEvents = selectedSample ? getSampleLineage(selectedSample) : [];
  const versions = selectedSample ? getSampleVersions(selectedSample) : [];
  const exportRecords = selectedSample ? getSampleExports(selectedSample) : [];
  const notes = selectedSample ? getSampleNotes(selectedSample) : [];

  const filteredSamples = samples.filter(
    (s) =>
      s.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.patientInfo.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEventIcon = (eventType: LineageEventType) => {
    switch (eventType) {
      case 'created':
        return <Activity className="w-4 h-4" />;
      case 'estimated':
      case 're_estimated':
        return <Activity className="w-4 h-4" />;
      case 'corrected':
        return <Edit3 className="w-4 h-4" />;
      case 'note_updated':
        return <FileText className="w-4 h-4" />;
      case 'exported':
        return <Download className="w-4 h-4" />;
      case 'confirmed':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'anomaly_detected':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getEventColor = (eventType: LineageEventType) => {
    switch (eventType) {
      case 'created':
        return 'bg-slate-400';
      case 'estimated':
      case 're_estimated':
        return 'bg-brand-500';
      case 'corrected':
        return 'bg-warning-500';
      case 'note_updated':
        return 'bg-accent-500';
      case 'exported':
        return 'bg-slate-500';
      case 'confirmed':
        return 'bg-accent-600';
      case 'anomaly_detected':
      case 'anomaly_resolved':
        return 'bg-warning-600';
      default:
        return 'bg-slate-400';
    }
  };

  const getCompareVersions = () => {
    const v1 = versions.find((v) => v.id === compareVersion1);
    const v2 = versions.find((v) => v.id === compareVersion2);
    return { v1, v2 };
  };

  const { v1, v2 } = getCompareVersions();

  return (
    <div className="h-full flex flex-col animate-fade-in">
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif font-bold text-slate-900">
              谱系追踪
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              完整记录样本生命周期中的每一次变更
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('timeline')}
              className={cn(
                'btn-sm',
                viewMode === 'timeline' ? 'btn-primary' : 'btn-secondary'
              )}
            >
              <Clock className="w-3.5 h-3.5 mr-1.5" />
              时间线
            </button>
            <button
              onClick={() => setViewMode('compare')}
              className={cn(
                'btn-sm',
                viewMode === 'compare' ? 'btn-primary' : 'btn-secondary'
              )}
            >
              <ArrowLeftRight className="w-3.5 h-3.5 mr-1.5" />
              版本对比
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-72 border-r border-slate-200 bg-white flex flex-col">
          <div className="p-4 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜索样本..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-9 text-sm"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
            {filteredSamples.map((sample) => (
              <button
                key={sample.id}
                onClick={() => {
                  setSelectedSample(sample.id);
                  if (versions.length >= 2) {
                    setCompareVersion1(versions[0].id);
                    setCompareVersion2(versions[1].id);
                  }
                }}
                className={cn(
                  'w-full text-left p-3 rounded-lg mb-1 transition-colors',
                  selectedSample === sample.id
                    ? 'bg-brand-50 border border-brand-200'
                    : 'hover:bg-slate-50 border border-transparent'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-sm text-slate-800">
                    {sample.barcode}
                  </span>
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      sample.status === 'anomaly'
                        ? 'bg-warning-500'
                        : sample.status === 'confirmed' || sample.status === 'exported'
                        ? 'bg-accent-500'
                        : 'bg-brand-500'
                    )}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1 truncate">
                  {sample.patientInfo.diagnosis || '暂无诊断'}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-slate-400">
                    v{sample.currentVersion}
                  </span>
                  {sample.latestPositiveRate !== undefined && (
                    <span className="text-xs font-medium text-slate-600">
                      {sample.latestPositiveRate.toFixed(1)}%
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-6 bg-slate-50">
          {!currentSample ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <GitBranch className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500">请从左侧选择一个样本</p>
                <p className="text-sm text-slate-400 mt-1">
                  查看完整的谱系追踪记录
                </p>
              </div>
            </div>
          ) : viewMode === 'timeline' ? (
            <div className="max-w-3xl mx-auto">
              <div className="card p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                      {currentSample.barcode}
                    </h2>
                    <p className="text-sm text-slate-500">
                      {currentSample.patientInfo.diagnosis} · 共{' '}
                      {lineageEvents.length} 条记录
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-serif font-bold text-slate-800">
                      {currentSample.latestPositiveRate?.toFixed(1) || '-'}%
                    </p>
                    <p className="text-xs text-slate-500">当前阳性率</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                  <div className="text-center">
                    <p className="text-lg font-serif font-bold text-slate-800">
                      {versions.length}
                    </p>
                    <p className="text-xs text-slate-500">估算版本</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-serif font-bold text-warning-600">
                      {
                        lineageEvents.filter((e) => e.eventType === 'corrected')
                          .length
                      }
                    </p>
                    <p className="text-xs text-slate-500">人工修正</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-serif font-bold text-accent-600">
                      {notes.length}
                    </p>
                    <p className="text-xs text-slate-500">备注版本</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-serif font-bold text-slate-600">
                      {exportRecords.length}
                    </p>
                    <p className="text-xs text-slate-500">报告导出</p>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-6">
                  {lineageEvents.map((event, index) => (
                    <div
                      key={event.id}
                      className="relative pl-14 animate-fade-in"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <div
                        className={cn(
                          'absolute left-3 w-5 h-5 rounded-full border-2 border-white shadow flex items-center justify-center text-white',
                          getEventColor(event.eventType)
                        )}
                      >
                        {getEventIcon(event.eventType)}
                      </div>
                      <div className="card p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-medium text-slate-900">
                              {event.description}
                            </h4>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {event.operator}
                              </span>
                              <span className="text-xs text-slate-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDistanceToNow(new Date(event.timestamp), {
                                  addSuffix: true,
                                  locale: zhCN,
                                })}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            {format(
                              new Date(event.timestamp),
                              'HH:mm:ss'
                            )}
                          </span>
                        </div>

                        {(event.beforeState || event.afterState) && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              {event.beforeState && (
                                <div>
                                  <p className="text-slate-500 mb-1">变更前</p>
                                  <div className="bg-slate-50 rounded p-2 font-mono text-slate-600">
                                    {Object.entries(event.beforeState).map(
                                      ([key, val]) => (
                                        <div key={key} className="truncate">
                                          {key}: {String(val)}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                              {event.afterState && (
                                <div>
                                  <p className="text-slate-500 mb-1">变更后</p>
                                  <div className="bg-accent-50 rounded p-2 font-mono text-accent-700">
                                    {Object.entries(event.afterState).map(
                                      ([key, val]) => (
                                        <div key={key} className="truncate">
                                          {key}: {String(val)}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {event.eventType === 'exported' && (
                          <div className="mt-3 pt-3 border-t border-slate-100">
                            <div className="p-3 bg-slate-50 rounded-lg">
                              <p className="text-xs text-slate-500 mb-1">
                                导出前后结论对比
                              </p>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-slate-600 line-through text-xs">
                                  {exportRecords[0]?.conclusionBefore?.slice(
                                    0,
                                    20
                                  )}
                                  ...
                                </span>
                                <ArrowLeftRight className="w-3 h-3 text-slate-400" />
                                <span className="text-accent-700 font-medium text-xs">
                                  {exportRecords[0]?.conclusionAfter?.slice(
                                    0,
                                    20
                                  )}
                                  ...
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-5xl mx-auto">
              <div className="card p-5 mb-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">
                  选择对比版本
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="label">版本 1</label>
                    <select
                      value={compareVersion1}
                      onChange={(e) => setCompareVersion1(e.target.value)}
                      className="select"
                    >
                      <option value="">请选择</option>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version} - {v.positiveRate.toFixed(1)}% -{' '}
                          {v.estimatedBy === 'ai' ? 'AI' : '人工'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">版本 2</label>
                    <select
                      value={compareVersion2}
                      onChange={(e) => setCompareVersion2(e.target.value)}
                      className="select"
                    >
                      <option value="">请选择</option>
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          v{v.version} - {v.positiveRate.toFixed(1)}% -{' '}
                          {v.estimatedBy === 'ai' ? 'AI' : '人工'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {v1 && v2 ? (
                <div className="grid grid-cols-2 gap-6">
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <span className="text-sm font-medium text-slate-800">
                          v{v1.version}
                        </span>
                        <span className="badge badge-default ml-2">
                          {v1.estimatedBy === 'ai' ? 'AI估算' : '人工修正'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(v1.estimatedAt), 'MM-dd HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-center mb-6">
                      <PositiveRateRing
                        rate={v1.positiveRate}
                        size={140}
                        strokeWidth={12}
                        label={`v${v1.version}`}
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">阳性率</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v1.positiveRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">置信区间</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v1.confidenceInterval[0].toFixed(1)}% -{' '}
                          {v1.confidenceInterval[1].toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">细胞总数</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v1.cellCount?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">组织面积</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v1.tissueArea || '-'} mm²
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-slate-500">算法</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v1.algorithm}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">结论</p>
                      <p className="text-sm text-slate-700">{v1.conclusion}</p>
                    </div>
                  </div>

                  <div className="card p-6 border-2 border-accent-300">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800">
                          v{v2.version}
                        </span>
                        <span className="badge badge-success">对比版本</span>
                        <span className="badge badge-default ml-2">
                          {v2.estimatedBy === 'ai' ? 'AI估算' : '人工修正'}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        {format(new Date(v2.estimatedAt), 'MM-dd HH:mm')}
                      </span>
                    </div>
                    <div className="flex justify-center mb-6">
                      <PositiveRateRing
                        rate={v2.positiveRate}
                        size={140}
                        strokeWidth={12}
                        label={`v${v2.version}`}
                      />
                    </div>

                    {Math.abs(v1.positiveRate - v2.positiveRate) > 0 && (
                      <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg mb-4">
                        <p className="text-xs text-warning-600 mb-1">
                          阳性率变化
                        </p>
                        <p className="text-lg font-serif font-bold text-warning-700">
                          {v2.positiveRate > v1.positiveRate ? '+' : ''}
                          {(v2.positiveRate - v1.positiveRate).toFixed(1)}%
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">阳性率</span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            v2.positiveRate !== v1.positiveRate
                              ? 'text-warning-700 bg-warning-50 px-1.5 rounded'
                              : 'text-slate-800'
                          )}
                        >
                          {v2.positiveRate.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">置信区间</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v2.confidenceInterval[0].toFixed(1)}% -{' '}
                          {v2.confidenceInterval[1].toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">细胞总数</span>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            v2.cellCount !== v1.cellCount
                              ? 'text-warning-700 bg-warning-50 px-1.5 rounded'
                              : 'text-slate-800'
                          )}
                        >
                          {v2.cellCount?.toLocaleString() || '-'}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">组织面积</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v2.tissueArea || '-'} mm²
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-slate-500">算法</span>
                        <span className="text-sm font-medium text-slate-800">
                          {v2.algorithm}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-xs text-slate-500 mb-1">结论</p>
                      <p className="text-sm text-slate-700">{v2.conclusion}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="card p-12 text-center">
                  <ArrowLeftRight className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">请选择两个版本进行对比</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
