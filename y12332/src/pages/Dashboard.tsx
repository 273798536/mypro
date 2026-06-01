import { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Thermometer,
  AlertTriangle,
  Activity,
  Database,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Gauge,
  AlertCircle,
  Clock,
  MapPin,
} from 'lucide-react';
import { useAppStore } from '@/store';
import StatsCard from '@/components/StatsCard';
import SensorSelector from '@/components/SensorSelector';
import {
  formatDateTime,
  getAnomalyTypeLabel,
  getSeverityColor,
  getSeverityLabel,
  getAnomalyTypeColor,
} from '@/utils/helpers';
import { AnomalyEvent } from '@/types';

const Dashboard = () => {
  const {
    sensors,
    temperatureData,
    processedData,
    anomalies,
    selectedSensors,
    selectedTimeRange,
    playbackState,
    setPlaybackState,
    batches,
    currentBatchId,
  } = useAppStore();

  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const playbackInterval = useRef<number | null>(null);

  const currentBatch = batches.find((b) => b.batchId === currentBatchId);

  const filteredData = useMemo(() => {
    let data = processedData.filter((d) => selectedSensors.includes(d.sensorId));
    if (selectedTimeRange) {
      data = data.filter(
        (d) =>
          new Date(d.timestamp) >= new Date(selectedTimeRange.start) &&
          new Date(d.timestamp) <= new Date(selectedTimeRange.end)
      );
    }
    return data.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [processedData, selectedSensors, selectedTimeRange]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((a) => selectedSensors.includes(a.sensorId));
  }, [anomalies, selectedSensors]);

  const stats = useMemo(() => {
    const onlineSensors = sensors.filter((s) => s.status === 'online').length;
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'critical').length;
    const highAnomalies = anomalies.filter((a) => a.severity === 'high').length;
    const completeness = currentBatch?.completeness || 0;

    return {
      onlineSensors,
      totalSensors: sensors.length,
      totalAnomalies: anomalies.length,
      criticalAnomalies,
      highAnomalies,
      completeness,
      totalReadings: temperatureData.length,
    };
  }, [sensors, anomalies, currentBatch, temperatureData]);

  const chartOption = useMemo(() => {
    const sensorColors = ['#38BDF8', '#34D399', '#F97316', '#A78BFA', '#F472B6'];
    const series: any[] = [];
    const markPoints: any[] = [];

    selectedSensors.forEach((sensorId, index) => {
      const sensorData = filteredData.filter((d) => d.sensorId === sensorId);
      const sensor = sensors.find((s) => s.sensorId === sensorId);
      const color = sensorColors[index % sensorColors.length];

      if (sensorData.length > 0) {
        series.push({
          name: sensor?.name || sensorId,
          type: 'line',
          smooth: true,
          symbol: 'none',
          sampling: 'lttb',
          lineStyle: {
            width: 2,
            color,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${color}33` },
                { offset: 1, color: `${color}05` },
              ],
            },
          },
          data: sensorData.map((d) => [
            new Date(d.timestamp).getTime(),
            d.temperature,
            d.qualityFlag,
            d.isOriginal,
          ]),
        });

        const sensorAnomalies = filteredAnomalies.filter((a) => a.sensorId === sensorId);
        sensorAnomalies.forEach((anomaly) => {
          const anomalyColor = getAnomalyTypeColor(anomaly.anomalyType);
          markPoints.push({
            name: getAnomalyTypeLabel(anomaly.anomalyType),
            coord: [new Date(anomaly.eventTime).getTime(), anomaly.temperature],
            value: anomaly.temperature,
            itemStyle: {
              color: anomalyColor,
            },
            symbolSize: anomaly.severity === 'critical' ? 18 : anomaly.severity === 'high' ? 14 : 10,
            emphasis: {
              scale: 1.5,
            },
          });
        });
      }
    });

    if (markPoints.length > 0) {
      series[0] = {
        ...series[0],
        markPoint: {
          symbol: 'circle',
          symbolSize: 12,
          label: {
            show: false,
          },
          data: markPoints,
        },
      };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        textStyle: {
          color: '#e2e8f0',
          fontSize: 12,
        },
        formatter: (params: any) => {
          if (!Array.isArray(params)) return '';
          const time = new Date(params[0].value[0]);
          let html = `<div style="font-family: 'JetBrains Mono', monospace; margin-bottom: 8px; color: #38bdf8;">${formatDateTime(time)}</div>`;
          
          params.forEach((param: any) => {
            if (param.value && param.value[1] !== undefined) {
              html += `<div style="display: flex; align-items: center; gap: 8px; margin: 4px 0;">
                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: ${param.color};"></span>
                <span style="color: #94a3b8;">${param.seriesName}:</span>
                <span style="color: #ffffff; font-weight: 600;">${param.value[1].toFixed(2)}°C</span>
              </div>`;

              if (param.value[2]) {
                const anomaly = filteredAnomalies.find(
                  (a) =>
                    Math.abs(new Date(a.eventTime).getTime() - new Date(param.value[0]).getTime()) < 300000
                );
                if (anomaly) {
                  html += `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.2);">
                    <div style="color: ${getAnomalyTypeColor(anomaly.anomalyType)}; font-weight: 600;">
                      ⚠ ${getAnomalyTypeLabel(anomaly.anomalyType)}
                    </div>
                    <div style="color: #64748b; font-size: 11px; margin-top: 4px;">
                      偏离度: ${anomaly.deviation.toFixed(2)} · 严重程度: ${getSeverityLabel(anomaly.severity)}
                    </div>
                  </div>`;
                }
              }
            }
          });
          return html;
        },
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '3%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'time',
        axisLine: {
          lineStyle: {
            color: '#334155',
          },
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'JetBrains Mono',
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(51, 65, 85, 0.3)',
            type: 'dashed',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: '温度 (°C)',
        nameTextStyle: {
          color: '#64748b',
          fontSize: 11,
        },
        axisLine: {
          lineStyle: {
            color: '#334155',
          },
        },
        axisLabel: {
          color: '#64748b',
          fontSize: 11,
          fontFamily: 'JetBrains Mono',
          formatter: '{value}°C',
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: 'rgba(51, 65, 85, 0.3)',
            type: 'dashed',
          },
        },
      },
      legend: {
        show: true,
        top: 0,
        textStyle: {
          color: '#94a3b8',
          fontSize: 12,
        },
        icon: 'roundRect',
        itemHeight: 4,
        itemWidth: 16,
      },
      dataZoom: [
        {
          type: 'inside',
          start: 0,
          end: 100,
        },
        {
          type: 'slider',
          start: 0,
          end: 100,
          height: 20,
          bottom: 5,
          borderColor: 'transparent',
          backgroundColor: 'rgba(30, 41, 59, 0.5)',
          fillerColor: 'rgba(56, 189, 248, 0.2)',
          handleStyle: {
            color: '#38bdf8',
          },
          textStyle: {
            color: '#64748b',
            fontSize: 10,
          },
        },
      ],
      series,
    };
  }, [filteredData, filteredAnomalies, selectedSensors, sensors]);

  useEffect(() => {
    if (playbackState.isPlaying) {
      playbackInterval.current = window.setInterval(() => {
        setPlaybackState({
          currentTime: new Date(
            new Date(playbackState.currentTime).getTime() + 30000 * playbackState.speed
          ),
        });
      }, 100);
    } else {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    }

    return () => {
      if (playbackInterval.current) {
        clearInterval(playbackInterval.current);
      }
    };
  }, [playbackState.isPlaying, playbackState.speed, playbackState.currentTime, setPlaybackState]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          label="在线传感器"
          value={`${stats.onlineSensors}/${stats.totalSensors}`}
          trend={0}
          status={stats.onlineSensors === stats.totalSensors ? 'normal' : 'warning'}
          icon={<Activity className="w-6 h-6" />}
        />
        <StatsCard
          label="异常总数"
          value={stats.totalAnomalies}
          unit="个"
          trend={12}
          status={stats.totalAnomalies > 20 ? 'danger' : stats.totalAnomalies > 10 ? 'warning' : 'normal'}
          icon={<AlertTriangle className="w-6 h-6" />}
        />
        <StatsCard
          label="严重/高危"
          value={`${stats.criticalAnomalies}/${stats.highAnomalies}`}
          trend={-5}
          status={stats.criticalAnomalies > 0 ? 'danger' : stats.highAnomalies > 0 ? 'warning' : 'normal'}
          icon={<AlertCircle className="w-6 h-6" />}
        />
        <StatsCard
          label="数据完整率"
          value={stats.completeness.toFixed(2)}
          unit="%"
          trend={2}
          status={stats.completeness >= 95 ? 'normal' : stats.completeness >= 80 ? 'warning' : 'danger'}
          icon={<Database className="w-6 h-6" />}
        />
      </div>

      <SensorSelector />

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Thermometer className="w-5 h-5 text-cold-400" />
              温度时序图
            </h3>
            <p className="text-sm text-dark-400 mt-1">
              共 {filteredData.length} 条记录 · {filteredAnomalies.length} 个异常点
            </p>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: '跳点', color: '#EF4444' },
              { label: '离线', color: '#F97316' },
              { label: '缺采', color: '#6366F1' },
              { label: '漂移', color: '#8B5CF6' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 text-xs text-dark-400">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="chart-container h-[400px]">
          <ReactECharts
            option={chartOption}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        </div>

        <div className="mt-4 p-4 bg-dark-900/50 rounded-lg border border-dark-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPlaybackState({ isPlaying: !playbackState.isPlaying })}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-cold-500 to-cold-600 flex items-center justify-center hover:shadow-lg hover:shadow-cold-500/30 transition-all"
              >
                {playbackState.isPlaying ? (
                  <Pause className="w-5 h-5 text-white" />
                ) : (
                  <Play className="w-5 h-5 text-white ml-0.5" />
                )}
              </button>
              <button
                onClick={() => {
                  if (selectedTimeRange) {
                    setPlaybackState({ currentTime: selectedTimeRange.start });
                  }
                }}
                className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-300 hover:text-white transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  if (selectedTimeRange) {
                    setPlaybackState({ currentTime: selectedTimeRange.end });
                  }
                }}
                className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-300 hover:text-white transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1 ml-4">
                {[0.5, 1, 2, 4].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackState({ speed })}
                    className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                      playbackState.speed === speed
                        ? 'bg-cold-500/20 text-cold-400 border border-cold-500/50'
                        : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-cold-400" />
              <span className="font-mono text-cold-400">
                {formatDateTime(playbackState.currentTime)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-alert-orange" />
            异常事件列表
          </h3>
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
            {filteredAnomalies.length === 0 ? (
              <div className="text-center py-12 text-dark-500">
                <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>暂无异常事件</p>
              </div>
            ) : (
              filteredAnomalies
                .sort(
                  (a, b) =>
                    new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime()
                )
                .slice(0, 20)
                .map((anomaly) => {
                  const sensor = sensors.find((s) => s.sensorId === anomaly.sensorId);
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
                          <div className="flex items-center gap-2 mb-1">
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
                            <span
                              className={`badge ${getSeverityColor(anomaly.severity)}`}
                            >
                              {getSeverityLabel(anomaly.severity)}
                            </span>
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
                            偏离 {anomaly.deviation.toFixed(1)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className="text-xs px-2 py-0.5 rounded"
                          style={{
                            backgroundColor: `${getAnomalyTypeColor(anomaly.anomalyType)}20`,
                            color: getAnomalyTypeColor(anomaly.anomalyType),
                          }}
                        >
                          {getAnomalyTypeLabel(anomaly.anomalyType)}
                        </span>
                        {anomaly.diagnosis && (
                          <span className="text-xs text-dark-400">
                            诊断: {anomaly.diagnosis === 'sensor_fault' ? '传感器故障' :
                                   anomaly.diagnosis === 'cargo_anomaly' ? '货物异常' :
                                   anomaly.diagnosis === 'data_quality_issue' ? '数据质量问题' :
                                   anomaly.diagnosis === 'environment_change' ? '环境变化' : '待确认'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
            )}
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-cold-400" />
            异常详情
          </h3>
          {selectedAnomaly ? (
            <div className="space-y-4">
              <div className="p-4 bg-dark-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-dark-400">异常时间</span>
                  <span className="font-mono text-sm text-white">
                    {formatDateTime(selectedAnomaly.eventTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-dark-400">温度值</span>
                  <span
                    className="font-mono text-xl font-bold"
                    style={{ color: getAnomalyTypeColor(selectedAnomaly.anomalyType) }}
                  >
                    {selectedAnomaly.temperature.toFixed(2)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-dark-400">正常阈值</span>
                  <span className="font-mono text-sm text-dark-300">
                    {selectedAnomaly.threshold.toFixed(2)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-dark-400">偏离度</span>
                  <span className="font-mono text-sm text-alert-orange">
                    {selectedAnomaly.deviation.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-dark-400">置信度</span>
                  <span className="font-mono text-sm text-green-400">
                    {(selectedAnomaly.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="divider my-3" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">异常类型</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: getAnomalyTypeColor(selectedAnomaly.anomalyType) }}
                  >
                    {getAnomalyTypeLabel(selectedAnomaly.anomalyType)}
                  </span>
                </div>
              </div>

              {selectedAnomaly.notes && (
                <div className="p-3 bg-alert-yellow/10 border border-alert-yellow/30 rounded-lg">
                  <p className="text-sm text-alert-yellow">{selectedAnomaly.notes}</p>
                </div>
              )}

              <div className="p-4 bg-cold-500/10 border border-cold-500/30 rounded-lg">
                <h4 className="text-sm font-medium text-cold-400 mb-2">关联传感器</h4>
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      sensors.find((s) => s.sensorId === selectedAnomaly.sensorId)?.status ===
                      'online'
                        ? 'bg-green-400'
                        : 'bg-alert-yellow animate-pulse'
                    }`}
                  />
                  <span className="text-sm text-white">
                    {sensors.find((s) => s.sensorId === selectedAnomaly.sensorId)?.name}
                  </span>
                </div>
                <p className="text-xs text-dark-400 mt-1">
                  {sensors.find((s) => s.sensorId === selectedAnomaly.sensorId)?.location}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-dark-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>点击左侧异常查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
