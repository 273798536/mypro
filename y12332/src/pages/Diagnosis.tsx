import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  AlertTriangle,
  Thermometer,
  Wrench,
  Package,
  BarChart3,
  Search,
  Filter,
  ChevronDown,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MapPin,
  Zap,
  TrendingUp,
  Activity,
} from 'lucide-react';
import { useAppStore } from '@/store';
import {
  formatDateTime,
  formatDate,
  getAnomalyTypeLabel,
  getSeverityColor,
  getSeverityLabel,
  getAnomalyTypeColor,
  getDiagnosisTypeLabel,
  getDiagnosisTypeColor,
} from '@/utils/helpers';
import { AnomalyEvent, DiagnosisResult, DiagnosisType } from '@/types';

const Diagnosis = () => {
  const { anomalies, diagnoses, sensors, maintenanceNotes, cargoBatches, selectedSensors } =
    useAppStore();

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const [filterType, setFilterType] = useState<DiagnosisType | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredAnomalies = useMemo(() => {
    let result = anomalies.filter((a) => selectedSensors.includes(a.sensorId));

    if (filterType !== 'all') {
      result = result.filter((a) => a.diagnosis === filterType);
    }

    if (filterSeverity !== 'all') {
      result = result.filter((a) => a.severity === filterSeverity);
    }

    return result.sort(
      (a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
    );
  }, [anomalies, selectedSensors, filterType, filterSeverity]);

  const diagnosisStats = useMemo(() => {
    const stats = {
      sensor_fault: 0,
      cargo_anomaly: 0,
      data_quality_issue: 0,
      environment_change: 0,
      unknown: 0,
    };

    filteredAnomalies.forEach((a) => {
      if (a.diagnosis) {
        stats[a.diagnosis]++;
      } else {
        stats.unknown++;
      }
    });

    return stats;
  }, [filteredAnomalies]);

  const selectedDiagnosis = useMemo(() => {
    if (!selectedAnomaly) return null;
    return diagnoses.find((d) => d.anomalyId === selectedAnomaly.id);
  }, [selectedAnomaly, diagnoses]);

  const relatedMaintenance = useMemo(() => {
    if (!selectedAnomaly) return [];
    return maintenanceNotes.filter(
      (m) =>
        m.sensorId === selectedAnomaly.sensorId &&
        Math.abs(
          new Date(m.eventTime).getTime() - new Date(selectedAnomaly.eventTime).getTime()
        ) <
          1000 * 60 * 60 * 24
    );
  }, [selectedAnomaly, maintenanceNotes]);

  const relatedCargo = useMemo(() => {
    if (!selectedAnomaly) return [];
    return cargoBatches.filter(
      (c) =>
        new Date(selectedAnomaly.eventTime) >= new Date(c.startTime) &&
        new Date(selectedAnomaly.eventTime) <= new Date(c.endTime)
    );
  }, [selectedAnomaly, cargoBatches]);

  const diagnosisDistributionChart = useMemo(() => {
    const data = [
      {
        value: diagnosisStats.sensor_fault,
        name: '传感器故障',
        itemStyle: { color: getDiagnosisTypeColor('sensor_fault') },
      },
      {
        value: diagnosisStats.cargo_anomaly,
        name: '货物异常',
        itemStyle: { color: getDiagnosisTypeColor('cargo_anomaly') },
      },
      {
        value: diagnosisStats.data_quality_issue,
        name: '数据质量问题',
        itemStyle: { color: getDiagnosisTypeColor('data_quality_issue') },
      },
      {
        value: diagnosisStats.environment_change,
        name: '环境变化',
        itemStyle: { color: getDiagnosisTypeColor('environment_change') },
      },
      {
        value: diagnosisStats.unknown,
        name: '待确认',
        itemStyle: { color: getDiagnosisTypeColor('unknown') },
      },
    ].filter((d) => d.value > 0);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: { color: '#e2e8f0', fontSize: 12 },
        formatter: '{b}: {c} 个 ({d}%)',
      },
      legend: {
        orient: 'vertical',
        right: '5%',
        top: 'center',
        textStyle: { color: '#94a3b8', fontSize: 11 },
        icon: 'circle',
        itemWidth: 8,
        itemHeight: 8,
      },
      series: [
        {
          name: '诊断分布',
          type: 'pie',
          radius: ['45%', '70%'],
          center: ['35%', '50%'],
          avoidLabelOverlap: false,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#0F172A',
            borderWidth: 2,
          },
          label: {
            show: false,
          },
          emphasis: {
            label: {
              show: true,
              fontSize: 14,
              fontWeight: 'bold',
              color: '#fff',
            },
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)',
            },
          },
          data,
        },
      ],
    };
  }, [diagnosisStats]);

  const getDiagnosisIcon = (type: DiagnosisType) => {
    switch (type) {
      case 'sensor_fault':
        return <Zap className="w-4 h-4" />;
      case 'cargo_anomaly':
        return <Package className="w-4 h-4" />;
      case 'data_quality_issue':
        return <BarChart3 className="w-4 h-4" />;
      case 'environment_change':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <HelpCircle className="w-4 h-4" />;
    }
  };

  const getEvidenceIcon = (type: string) => {
    switch (type) {
      case 'maintenance':
        return <Wrench className="w-4 h-4 text-alert-orange" />;
      case 'sensor_reading':
        return <Activity className="w-4 h-4 text-cold-400" />;
      case 'cargo_batch':
        return <Package className="w-4 h-4 text-green-400" />;
      case 'statistical':
        return <BarChart3 className="w-4 h-4 text-purple-400" />;
      default:
        return <HelpCircle className="w-4 h-4 text-dark-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${getDiagnosisTypeColor('sensor_fault')}20`,
                color: getDiagnosisTypeColor('sensor_fault'),
              }}
            >
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">传感器故障</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: getDiagnosisTypeColor('sensor_fault') }}
              >
                {diagnosisStats.sensor_fault}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${getDiagnosisTypeColor('cargo_anomaly')}20`,
                color: getDiagnosisTypeColor('cargo_anomaly'),
              }}
            >
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">货物异常</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: getDiagnosisTypeColor('cargo_anomaly') }}
              >
                {diagnosisStats.cargo_anomaly}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${getDiagnosisTypeColor('data_quality_issue')}20`,
                color: getDiagnosisTypeColor('data_quality_issue'),
              }}
            >
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">数据质量问题</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: getDiagnosisTypeColor('data_quality_issue') }}
              >
                {diagnosisStats.data_quality_issue}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${getDiagnosisTypeColor('environment_change')}20`,
                color: getDiagnosisTypeColor('environment_change'),
              }}
            >
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">环境变化</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: getDiagnosisTypeColor('environment_change') }}
              >
                {diagnosisStats.environment_change}
              </p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{
                backgroundColor: `${getDiagnosisTypeColor('unknown')}20`,
                color: getDiagnosisTypeColor('unknown'),
              }}
            >
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">待确认</p>
              <p
                className="text-2xl font-bold font-mono"
                style={{ color: getDiagnosisTypeColor('unknown') }}
              >
                {diagnosisStats.unknown}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <PieChartIcon className="w-5 h-5 text-cold-400" />
            诊断类型分布
          </h3>
          <div className="chart-container h-[250px]">
            <ReactECharts
              option={diagnosisDistributionChart}
              style={{ height: '100%', width: '100%' }}
              notMerge={true}
            />
          </div>
          <div className="mt-4 pt-4 border-t border-dark-700/50">
            <div className="flex items-center justify-between text-sm">
              <span className="text-dark-400">总计异常数</span>
              <span className="font-mono font-bold text-white">
                {filteredAnomalies.length} 个
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-dark-400">已诊断</span>
              <span className="font-mono text-green-400">
                {filteredAnomalies.filter((a) => a.diagnosis && a.diagnosis !== 'unknown')
                  .length}{' '}
                个
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-dark-400">诊断率</span>
              <span className="font-mono text-cold-400">
                {filteredAnomalies.length > 0
                  ? (
                      ((filteredAnomalies.filter(
                        (a) => a.diagnosis && a.diagnosis !== 'unknown'
                      ).length /
                        filteredAnomalies.length) *
                        100).toFixed(1)
                    )
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-alert-orange" />
              异常诊断列表
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                <input
                  type="text"
                  placeholder="搜索异常..."
                  className="pl-9 pr-4 py-2 bg-dark-800/50 border border-dark-700/50 rounded-lg text-sm text-white placeholder-dark-500 focus:outline-none focus:border-cold-500/50 w-48"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-lg border transition-all ${
                  showFilters
                    ? 'bg-cold-500/20 border-cold-500/50 text-cold-400'
                    : 'bg-dark-800/50 border-dark-700/50 text-dark-400 hover:border-dark-600'
                }`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mb-4 p-4 bg-dark-900/50 rounded-lg border border-dark-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-dark-400 mb-2 block">诊断类型</label>
                  <div className="relative">
                    <select
                      value={filterType}
                      onChange={(e) =>
                        setFilterType(e.target.value as DiagnosisType | 'all')
                      }
                      className="w-full pl-4 pr-10 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white appearance-none focus:outline-none focus:border-cold-500/50"
                    >
                      <option value="all">全部类型</option>
                      <option value="sensor_fault">传感器故障</option>
                      <option value="cargo_anomaly">货物异常</option>
                      <option value="data_quality_issue">数据质量问题</option>
                      <option value="environment_change">环境变化</option>
                      <option value="unknown">待确认</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-dark-400 mb-2 block">严重程度</label>
                  <div className="relative">
                    <select
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      className="w-full pl-4 pr-10 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white appearance-none focus:outline-none focus:border-cold-500/50"
                    >
                      <option value="all">全部级别</option>
                      <option value="critical">严重</option>
                      <option value="high">高</option>
                      <option value="medium">中</option>
                      <option value="low">低</option>
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">暂无异常数据</p>
                <p className="text-sm mt-1">请调整筛选条件或检查数据导入</p>
              </div>
            ) : (
              filteredAnomalies.map((anomaly) => {
                const sensor = sensors.find((s) => s.sensorId === anomaly.sensorId);
                const diagnosis = diagnoses.find((d) => d.anomalyId === anomaly.id);
                return (
                  <button
                    key={anomaly.id}
                    onClick={() => setSelectedAnomaly(anomaly)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      selectedAnomaly?.id === anomaly.id
                        ? 'bg-cold-500/10 border border-cold-500/50'
                        : 'bg-dark-800/30 border border-dark-700/50 hover:border-dark-600'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              anomaly.severity === 'critical'
                                ? 'bg-alert-red animate-pulse'
                                : anomaly.severity === 'high'
                                ? 'bg-alert-orange'
                                : anomaly.severity === 'medium'
                                ? 'bg-alert-yellow'
                                : 'bg-dark-500'
                            }`}
                          />
                          <span className="font-mono text-sm text-white">
                            {sensor?.name || anomaly.sensorId}
                          </span>
                          <span className={`badge ${getSeverityColor(anomaly.severity)}`}>
                            {getSeverityLabel(anomaly.severity)}
                          </span>
                          {anomaly.diagnosis && (
                            <span
                              className="text-xs px-2 py-0.5 rounded flex items-center gap-1"
                              style={{
                                backgroundColor: `${getDiagnosisTypeColor(
                                  anomaly.diagnosis
                                )}20`,
                                color: getDiagnosisTypeColor(anomaly.diagnosis),
                              }}
                            >
                              {getDiagnosisIcon(anomaly.diagnosis)}
                              {getDiagnosisTypeLabel(anomaly.diagnosis)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-dark-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(anomaly.eventTime)}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {sensor?.location || '未知位置'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className="font-mono font-bold text-lg"
                          style={{
                            color: getAnomalyTypeColor(anomaly.anomalyType),
                          }}
                        >
                          {anomaly.temperature.toFixed(1)}°C
                        </div>
                        <div className="text-xs text-dark-500">
                          {getAnomalyTypeLabel(anomaly.anomalyType)}
                        </div>
                        {diagnosis && (
                          <div className="text-xs text-cold-400 mt-1">
                            置信度 {(diagnosis.confidence * 100).toFixed(0)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cold-400" />
            诊断结果
          </h3>
          {selectedAnomaly && selectedDiagnosis ? (
            <div className="space-y-4">
              <div
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor: `${getDiagnosisTypeColor(
                    selectedDiagnosis.diagnosisType
                  )}10`,
                  borderColor: `${getDiagnosisTypeColor(
                    selectedDiagnosis.diagnosisType
                  )}30`,
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${getDiagnosisTypeColor(
                        selectedDiagnosis.diagnosisType
                      )}20`,
                      color: getDiagnosisTypeColor(selectedDiagnosis.diagnosisType),
                    }}
                  >
                    {getDiagnosisIcon(selectedDiagnosis.diagnosisType)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4
                        className="font-semibold text-lg"
                        style={{
                          color: getDiagnosisTypeColor(
                            selectedDiagnosis.diagnosisType
                          ),
                        }}
                      >
                        {getDiagnosisTypeLabel(selectedDiagnosis.diagnosisType)}
                      </h4>
                      {selectedDiagnosis.confidence >= 0.9 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-400" />
                      ) : selectedDiagnosis.confidence >= 0.7 ? (
                        <HelpCircle className="w-5 h-5 text-alert-yellow" />
                      ) : (
                        <XCircle className="w-5 h-5 text-alert-red" />
                      )}
                    </div>
                    <p className="text-sm text-dark-300">
                      {selectedDiagnosis.description}
                    </p>
                    <div className="mt-3">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-dark-400">诊断置信度</span>
                        <span
                          className="font-mono"
                          style={{
                            color: getDiagnosisTypeColor(
                              selectedDiagnosis.diagnosisType
                            ),
                          }}
                        >
                          {(selectedDiagnosis.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${selectedDiagnosis.confidence * 100}%`,
                            backgroundColor: getDiagnosisTypeColor(
                              selectedDiagnosis.diagnosisType
                            ),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-dark-900/50 rounded-lg">
                  <p className="text-xs text-dark-400 mb-1">异常类型</p>
                  <p
                    className="font-mono text-sm font-medium"
                    style={{
                      color: getAnomalyTypeColor(selectedAnomaly.anomalyType),
                    }}
                  >
                    {getAnomalyTypeLabel(selectedAnomaly.anomalyType)}
                  </p>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-lg">
                  <p className="text-xs text-dark-400 mb-1">严重程度</p>
                  <span className={`badge ${getSeverityColor(selectedAnomaly.severity)}`}>
                    {getSeverityLabel(selectedAnomaly.severity)}
                  </span>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-lg">
                  <p className="text-xs text-dark-400 mb-1">温度值</p>
                  <p
                    className="font-mono text-sm font-medium"
                    style={{
                      color: getAnomalyTypeColor(selectedAnomaly.anomalyType),
                    }}
                  >
                    {selectedAnomaly.temperature.toFixed(2)}°C
                  </p>
                </div>
                <div className="p-3 bg-dark-900/50 rounded-lg">
                  <p className="text-xs text-dark-400 mb-1">偏离度</p>
                  <p className="font-mono text-sm font-medium text-alert-orange">
                    {selectedAnomaly.deviation.toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedAnomaly.notes && (
                <div className="p-3 bg-alert-yellow/10 border border-alert-yellow/30 rounded-lg">
                  <p className="text-sm text-alert-yellow">
                    💡 {selectedAnomaly.notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-dark-500">
              <AlertTriangle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">请选择异常</p>
              <p className="text-sm mt-1">点击左侧列表中的异常查看详细诊断结果</p>
            </div>
          )}
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-cold-400" />
            证据链
          </h3>
          {selectedDiagnosis && selectedDiagnosis.evidenceChain.length > 0 ? (
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-0.5 bg-dark-700/50" />
              <div className="space-y-4">
                {selectedDiagnosis.evidenceChain.map((evidence, index) => (
                  <div key={index} className="relative pl-10">
                    <div className="absolute left-0 w-10 h-10 rounded-full bg-dark-800 border-2 border-dark-700 flex items-center justify-center">
                      {getEvidenceIcon(evidence.type)}
                    </div>
                    <div className="p-3 bg-dark-800/50 rounded-lg border border-dark-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-dark-300 capitalize">
                          {evidence.type === 'maintenance'
                            ? '维修记录'
                            : evidence.type === 'sensor_reading'
                            ? '传感器读数'
                            : evidence.type === 'cargo_batch'
                            ? '货品批次'
                            : '统计分析'}
                        </span>
                        {evidence.timestamp && (
                          <span className="text-xs text-dark-500 font-mono">
                            {formatDateTime(evidence.timestamp)}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-dark-200">{evidence.description}</p>
                      {evidence.value !== undefined && (
                        <div className="mt-2 text-xs text-dark-400">
                          关联数值:{' '}
                          <span className="font-mono text-cold-400">
                            {evidence.value.toFixed(2)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedAnomaly ? (
            <div className="text-center py-12 text-dark-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">暂无证据链</p>
              <p className="text-sm mt-1">该异常暂无关联证据</p>
            </div>
          ) : (
            <div className="text-center py-12 text-dark-500">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">请选择异常</p>
              <p className="text-sm mt-1">点击左侧列表中的异常查看证据链</p>
            </div>
          )}

          {selectedAnomaly && (relatedMaintenance.length > 0 || relatedCargo.length > 0) && (
            <div className="mt-6 pt-4 border-t border-dark-700/50">
              <h4 className="text-sm font-medium text-white mb-3">关联信息</h4>
              {relatedMaintenance.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-dark-400 mb-2 flex items-center gap-1">
                    <Wrench className="w-3 h-3" />
                    相关维修记录 ({relatedMaintenance.length})
                  </p>
                  <div className="space-y-2">
                    {relatedMaintenance.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 bg-alert-orange/10 border border-alert-orange/30 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-alert-orange">
                            {m.eventType}
                          </span>
                          <span className="text-xs text-dark-400 font-mono">
                            {formatDateTime(m.eventTime)}
                          </span>
                        </div>
                        <p className="text-xs text-dark-300">{m.description}</p>
                        <p className="text-xs text-dark-500 mt-1">
                          操作人员: {m.operator}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {relatedCargo.length > 0 && (
                <div>
                  <p className="text-xs text-dark-400 mb-2 flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    关联货品批次 ({relatedCargo.length})
                  </p>
                  <div className="space-y-2">
                    {relatedCargo.map((c) => (
                      <div
                        key={c.id}
                        className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-green-400">
                            {c.productName}
                          </span>
                          <span className="text-xs text-dark-400 font-mono">
                            {c.cargoId}
                          </span>
                        </div>
                        <p className="text-xs text-dark-300">
                          位置: {c.location} · 温度要求: {c.minTemp}°C ~ {c.maxTemp}°C
                        </p>
                        <p className="text-xs text-dark-500 mt-1">
                          {formatDate(c.startTime)} - {formatDate(c.endTime)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PieChartIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
    <path d="M22 12A10 10 0 0 0 12 2v10z" />
  </svg>
);

export default Diagnosis;
