import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Filter,
  Search,
  Check,
  Clock,
  Download,
  RefreshCw,
  Package,
  Gauge,
  Layers,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AnomalyCard } from '@/components/AnomalyCard';
import {
  getAnomalyTypeLabel,
  getAnomalyTypeColor,
  getSeverityLabel,
  getSeverityColor,
} from '@/utils/anomalyDetector';
import { formatTime } from '@/utils/reportGenerator';
import { cn } from '@/lib/utils';
import type { AnomalyType, Severity } from '@/types';

export default function AnomalyAnalysis() {
  const {
    anomalies,
    luggageData,
    badRows,
    toggleAnomalyType,
    setAnomalyFilters,
    markAnomalyReviewed,
    anomalyFilters,
  } = useAppStore();

  const [selectedAnomalyId, setSelectedAnomalyId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((anomaly) => {
      if (!anomalyFilters.types.includes(anomaly.type)) return false;

      if (anomalyFilters.reviewed !== undefined) {
        if (anomaly.reviewed !== anomalyFilters.reviewed) return false;
      }

      if (anomalyFilters.severity && anomalyFilters.severity.length > 0) {
        if (!anomalyFilters.severity.includes(anomaly.severity)) return false;
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          anomaly.description.toLowerCase().includes(query) ||
          anomaly.position.toString().includes(query) ||
          anomaly.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [anomalies, anomalyFilters, searchQuery]);

  const typeStats = useMemo(() => {
    return {
      height_mismatch: anomalies.filter((a) => a.type === 'height_mismatch').length,
      speed_over: anomalies.filter((a) => a.type === 'speed_over').length,
      stacked: anomalies.filter((a) => a.type === 'stacked').length,
    };
  }, [anomalies]);

  const severityStats = useMemo(() => {
    return {
      high: anomalies.filter((a) => a.severity === 'high').length,
      medium: anomalies.filter((a) => a.severity === 'medium').length,
      low: anomalies.filter((a) => a.severity === 'low').length,
    };
  }, [anomalies]);

  const reviewedStats = useMemo(() => {
    return {
      reviewed: anomalies.filter((a) => a.reviewed).length,
      pending: anomalies.filter((a) => !a.reviewed).length,
    };
  }, [anomalies]);

  const handleExportFiltered = () => {
    const content = filteredAnomalies
      .map(
        (a) =>
          `${a.id},${getAnomalyTypeLabel(a.type)},${a.position.toFixed(2)},${formatTime(a.timestamp)},${getSeverityLabel(a.severity)},${a.expectedValue},${a.actualValue},${a.luggageIds.length},${a.description}`
      )
      .join('\n');
    const header = 'ID,类型,位置(m),时间,严重程度,标准值,实际值,影响行李数,描述';
    const csv = header + '\n' + content;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `异常事件_${Date.now()}.csv`;
    link.click();
  };

  const handleMarkAllReviewed = () => {
    filteredAnomalies.forEach((a) => {
      if (!a.reviewed) {
        markAnomalyReviewed(a.id, true);
      }
    });
  };

  const typeOptions: { type: AnomalyType; label: string; icon: React.ReactNode }[] = [
    { type: 'height_mismatch', label: '高度错配', icon: <Package size={16} /> },
    { type: 'speed_over', label: '速度过快', icon: <Gauge size={16} /> },
    { type: 'stacked', label: '行李堆积', icon: <Layers size={16} /> },
  ];

  const severityOptions: Severity[] = ['high', 'medium', 'low'];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">异常分析</h1>
          <p className="text-gray-400 mt-1">筛选和复核异常事件，支持多条件组合筛选</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleMarkAllReviewed}
            disabled={filteredAnomalies.filter((a) => !a.reviewed).length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={18} />
            全部标记已复核
          </button>
          <button
            onClick={handleExportFiltered}
            disabled={filteredAnomalies.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            导出筛选结果
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">异常总数</p>
              <p className="text-3xl font-bold text-white mt-1">{anomalies.length}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <AlertTriangle size={24} className="text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">待复核</p>
              <p className="text-3xl font-bold text-yellow-400 mt-1">{reviewedStats.pending}</p>
            </div>
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <Clock size={24} className="text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">高度错配</p>
              <p className="text-3xl font-bold text-red-400 mt-1">{typeStats.height_mismatch}</p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-lg">
              <Package size={24} className="text-red-500" />
            </div>
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">已复核</p>
              <p className="text-3xl font-bold text-green-400 mt-1">{reviewedStats.reviewed}</p>
            </div>
            <div className="p-3 bg-green-500/20 rounded-lg">
              <Check size={24} className="text-green-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <div className="col-span-1 space-y-4">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3 flex items-center gap-2">
              <Filter size={18} className="text-blue-400" />
              筛选条件
            </h3>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                placeholder="搜索描述、位置..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-gray-400 text-sm mb-2 block">异常类型</label>
                <div className="space-y-2">
                  {typeOptions.map((option) => {
                    const isSelected = anomalyFilters.types.includes(option.type);
                    const color = getAnomalyTypeColor(option.type);
                    return (
                      <button
                        key={option.type}
                        onClick={() => toggleAnomalyType(option.type)}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          isSelected
                            ? 'bg-opacity-20 border'
                            : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300'
                        )}
                        style={
                          isSelected
                            ? { backgroundColor: `${color}15`, borderColor: `${color}50`, color }
                            : {}
                        }
                      >
                        {option.icon}
                        <span className="flex-1 text-left">{option.label}</span>
                        <span className="text-gray-500 text-xs">{typeStats[option.type]}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">严重程度</label>
                <div className="space-y-2">
                  {severityOptions.map((severity) => {
                    const isSelected = anomalyFilters.severity?.includes(severity) ?? true;
                    const color = getSeverityColor(severity);
                    return (
                      <button
                        key={severity}
                        onClick={() => {
                          const current = anomalyFilters.severity || [...severityOptions];
                          const next = isSelected
                            ? current.filter((s) => s !== severity)
                            : [...current, severity];
                          setAnomalyFilters({ severity: next });
                        }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                          isSelected
                            ? 'bg-opacity-20 border'
                            : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300'
                        )}
                        style={
                          isSelected
                            ? { backgroundColor: `${color}15`, borderColor: `${color}50`, color }
                            : {}
                        }
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="flex-1 text-left">{getSeverityLabel(severity)}</span>
                        <span className="text-gray-500 text-xs">{severityStats[severity]}</span>
                        {isSelected && <Check size={14} />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm mb-2 block">复核状态</label>
                <div className="space-y-2">
                  <button
                    onClick={() =>
                      setAnomalyFilters({
                        reviewed: anomalyFilters.reviewed === undefined ? false : undefined,
                      })
                    }
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      anomalyFilters.reviewed === false
                        ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400'
                        : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300'
                    )}
                  >
                    <Clock size={14} />
                    <span className="flex-1 text-left">待复核</span>
                    <span className="text-gray-500 text-xs">{reviewedStats.pending}</span>
                    {anomalyFilters.reviewed === false && <Check size={14} />}
                  </button>
                  <button
                    onClick={() =>
                      setAnomalyFilters({
                        reviewed: anomalyFilters.reviewed === true ? undefined : true,
                      })
                    }
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                      anomalyFilters.reviewed === true
                        ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                        : 'bg-gray-800/50 hover:bg-gray-800 text-gray-300'
                    )}
                  >
                    <Check size={14} />
                    <span className="flex-1 text-left">已复核</span>
                    <span className="text-gray-500 text-xs">{reviewedStats.reviewed}</span>
                    {anomalyFilters.reviewed === true && <Check size={14} />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">筛选结果</h3>
            <div className="text-center py-4">
              <p className="text-4xl font-bold text-blue-400">{filteredAnomalies.length}</p>
              <p className="text-gray-500 text-sm mt-1">条符合条件</p>
            </div>
            <button
              onClick={() => {
                setAnomalyFilters({
                  types: ['height_mismatch', 'speed_over', 'stacked'],
                  reviewed: undefined,
                  severity: undefined,
                });
                setSearchQuery('');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm transition-colors mt-3"
            >
              <RefreshCw size={14} />
              重置筛选
            </button>
          </div>
        </div>

        <div className="col-span-3">
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">异常事件列表</h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <span>显示 {filteredAnomalies.length} / {anomalies.length} 条</span>
              </div>
            </div>

            {filteredAnomalies.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 max-h-[calc(100vh-320px)] overflow-y-auto pr-2">
                {filteredAnomalies.map((anomaly) => (
                  <AnomalyCard
                    key={anomaly.id}
                    anomaly={anomaly}
                    isSelected={selectedAnomalyId === anomaly.id}
                    onSelect={() =>
                      setSelectedAnomalyId(
                        selectedAnomalyId === anomaly.id ? null : anomaly.id
                      )
                    }
                    onReview={(reviewed) => markAnomalyReviewed(anomaly.id, reviewed)}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <AlertTriangle size={48} className="text-gray-600 mx-auto mb-4" />
                <p className="text-gray-500">没有符合筛选条件的异常事件</p>
                <p className="text-gray-600 text-sm mt-1">请调整筛选条件</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
