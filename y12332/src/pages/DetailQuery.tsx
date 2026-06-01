import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  Database,
  RefreshCw,
  Clock,
  MapPin,
  AlertCircle,
  Thermometer,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Eye,
  Download,
  Layers,
  Zap,
} from 'lucide-react';
import { useAppStore } from '@/store';
import SensorSelector from '@/components/SensorSelector';
import {
  formatDateTime,
  getAnomalyTypeLabel,
  getSeverityColor,
  getSeverityLabel,
  getAnomalyTypeColor,
  getDiagnosisTypeLabel,
} from '@/utils/helpers';
import { TemperatureReading, AnomalyEvent } from '@/types';

const PAGE_SIZE = 50;

const DetailQuery = () => {
  const {
    temperatureData,
    processedData,
    anomalies,
    selectedSensors,
    selectedTimeRange,
    sensors,
    cargoBatches,
    maintenanceNotes,
  } = useAppStore();

  const [selectedRow, setSelectedRow] = useState<TemperatureReading | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyEvent | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filterQuality, setFilterQuality] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showOnlyAnomalies, setShowOnlyAnomalies] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);

  const rawTableRef = useRef<HTMLDivElement>(null);
  const processedTableRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  const filteredRawData = useMemo(() => {
    let data = temperatureData.filter((d) => selectedSensors.includes(d.sensorId));

    if (selectedTimeRange) {
      data = data.filter(
        (d) =>
          new Date(d.timestamp) >= new Date(selectedTimeRange.start) &&
          new Date(d.timestamp) <= new Date(selectedTimeRange.end)
      );
    }

    if (filterQuality !== 'all') {
      if (filterQuality === 'anomaly') {
        data = data.filter((d) => d.qualityFlag !== null);
      } else {
        data = data.filter((d) => d.qualityFlag === filterQuality);
      }
    }

    if (showOnlyAnomalies) {
      data = data.filter((d) => d.qualityFlag !== null);
    }

    if (searchText) {
      const search = searchText.toLowerCase();
      data = data.filter(
        (d) =>
          d.sensorId.toLowerCase().includes(search) ||
          d.temperature.toString().includes(search) ||
          formatDateTime(d.timestamp).toLowerCase().includes(search)
      );
    }

    return data.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [temperatureData, selectedSensors, selectedTimeRange, filterQuality, showOnlyAnomalies, searchText]);

  const filteredProcessedData = useMemo(() => {
    const rawIds = new Set(filteredRawData.map((d) => d.id));
    return processedData
      .filter((d) => rawIds.has(d.id))
      .sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [processedData, filteredRawData]);

  const paginatedRawData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredRawData.slice(start, start + PAGE_SIZE);
  }, [filteredRawData, currentPage]);

  const paginatedProcessedData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredProcessedData.slice(start, start + PAGE_SIZE);
  }, [filteredProcessedData, currentPage]);

  const totalPages = Math.ceil(filteredRawData.length / PAGE_SIZE);

  const handleScroll = (source: 'raw' | 'processed') => {
    if (!syncScroll || isScrolling.current) return;
    isScrolling.current = true;

    const sourceRef = source === 'raw' ? rawTableRef.current : processedTableRef.current;
    const targetRef = source === 'raw' ? processedTableRef.current : rawTableRef.current;

    if (sourceRef && targetRef) {
      targetRef.scrollTop = sourceRef.scrollTop;
      targetRef.scrollLeft = sourceRef.scrollLeft;
    }

    requestAnimationFrame(() => {
      isScrolling.current = false;
    });
  };

  const getRowAnomaly = (reading: TemperatureReading) => {
    return anomalies.find(
      (a) =>
        a.readingId === reading.id ||
        (a.sensorId === reading.sensorId &&
          Math.abs(new Date(a.eventTime).getTime() - new Date(reading.timestamp).getTime()) <
            30000)
    );
  };

  const getCargoBatchForTime = (timestamp: Date) => {
    const time = new Date(timestamp).getTime();
    return cargoBatches.find(
      (c) =>
        time >= new Date(c.startTime).getTime() && time <= new Date(c.endTime).getTime()
    );
  };

  const getMaintenanceForTime = (sensorId: string, timestamp: Date) => {
    const time = new Date(timestamp).getTime();
    return maintenanceNotes.find(
      (m) =>
        m.sensorId === sensorId &&
        Math.abs(time - new Date(m.eventTime).getTime()) < 1000 * 60 * 60 * 2
    );
  };

  const stats = useMemo(() => {
    const total = filteredRawData.length;
    const anomaliesCount = filteredRawData.filter((d) => d.qualityFlag !== null).length;
    const correctedCount = filteredProcessedData.filter((d) => !d.isOriginal).length;
    const missingCount = filteredRawData.filter((d) => d.qualityFlag === 'missing_sample').length;

    return { total, anomaliesCount, correctedCount, missingCount };
  }, [filteredRawData, filteredProcessedData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuality, showOnlyAnomalies, searchText, selectedSensors]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Database className="w-7 h-7 text-cold-400" />
            明细查询
          </h2>
          <p className="text-sm text-dark-400 mt-1">
            原始数据与处理结果对比，支持按时间、传感器、异常类型筛选
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSyncScroll(!syncScroll)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all ${
              syncScroll
                ? 'bg-cold-500/20 text-cold-400 border border-cold-500/50'
                : 'bg-dark-700/50 text-dark-300 border border-dark-600 hover:text-white'
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${syncScroll ? 'animate-spin' : ''}`} />
            同步滚动
          </button>
          <button className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" />
            导出数据
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cold-500/10 text-cold-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">总记录数</p>
              <p className="text-xl font-mono font-bold text-white">{stats.total.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-alert-red/10 text-alert-red">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">异常数据</p>
              <p className="text-xl font-mono font-bold text-alert-red">{stats.anomaliesCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-green-500/10 text-green-400">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">已修正</p>
              <p className="text-xl font-mono font-bold text-green-400">{stats.correctedCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-alert-purple/10 text-alert-purple">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-dark-400">缺采数据</p>
              <p className="text-xl font-mono font-bold text-alert-purple">{stats.missingCount.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <SensorSelector />

      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="搜索传感器ID、温度值、时间..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-dark-400" />
            <select
              value={filterQuality}
              onChange={(e) => setFilterQuality(e.target.value)}
              className="input-field w-40"
            >
              <option value="all">全部数据</option>
              <option value="anomaly">仅异常</option>
              <option value="outlier">异常跳点</option>
              <option value="missing_sample">缺采样</option>
              <option value="clock_drift">时钟漂移</option>
              <option value="sensor_offline">传感器离线</option>
              <option value="value_out_of_range">超出量程</option>
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyAnomalies}
              onChange={(e) => setShowOnlyAnomalies(e.target.checked)}
              className="w-4 h-4 rounded border-dark-600 bg-dark-800 text-cold-500 focus:ring-cold-500"
            />
            <span className="text-sm text-dark-300">仅显示异常</span>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-dark-400" />
                  <h3 className="text-sm font-semibold text-white">原始数据</h3>
                </div>
                <span className="text-xs text-dark-500 font-mono">
                  {paginatedRawData.length} 条
                </span>
              </div>
              <div
                ref={rawTableRef}
                onScroll={() => handleScroll('raw')}
                className="h-[500px] overflow-auto"
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-dark-900/95 backdrop-blur z-10">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        时间
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        传感器
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        温度
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        状态
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedRawData.map((row) => {
                      const anomaly = getRowAnomaly(row);
                      const isSelected = selectedRow?.id === row.id;
                      const hasDiff =
                        row.isOriginal !==
                        paginatedProcessedData.find((p) => p.id === row.id)?.isOriginal;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setSelectedRow(row);
                            if (anomaly) setSelectedAnomaly(anomaly);
                          }}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cold-500/20'
                              : hasDiff
                              ? 'bg-alert-yellow/5 hover:bg-alert-yellow/10'
                              : 'hover:bg-dark-700/30'
                          } ${row.qualityFlag ? 'border-l-2 border-alert-red' : ''}`}
                        >
                          <td className="py-2 px-3 font-mono text-xs text-dark-300">
                            {formatDateTime(row.timestamp)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-xs text-white">
                              {sensors.find((s) => s.sensorId === row.sensorId)?.name ||
                                row.sensorId}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`font-mono text-sm font-semibold ${
                                row.qualityFlag ? 'text-alert-red' : 'text-white'
                              }`}
                            >
                              {row.temperature.toFixed(2)}°C
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {row.qualityFlag ? (
                              <span
                                className="text-xs px-2 py-0.5 rounded"
                                style={{
                                  backgroundColor: `${getAnomalyTypeColor(row.qualityFlag)}20`,
                                  color: getAnomalyTypeColor(row.qualityFlag),
                                }}
                              >
                                {getAnomalyTypeLabel(row.qualityFlag)}
                              </span>
                            ) : (
                              <span className="text-xs text-green-400">正常</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cold-400" />
                  <h3 className="text-sm font-semibold text-white">处理结果</h3>
                </div>
                <span className="text-xs text-dark-500 font-mono">
                  {paginatedProcessedData.length} 条
                </span>
              </div>
              <div
                ref={processedTableRef}
                onScroll={() => handleScroll('processed')}
                className="h-[500px] overflow-auto"
              >
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-dark-900/95 backdrop-blur z-10">
                    <tr>
                      <th className="text-left py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        时间
                      </th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        传感器
                      </th>
                      <th className="text-right py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        温度
                      </th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-dark-400 border-b border-dark-700">
                        处理
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedProcessedData.map((row) => {
                      const originalRow = paginatedRawData.find((r) => r.id === row.id);
                      const isSelected = selectedRow?.id === row.id;
                      const hasDiff = row.isOriginal !== originalRow?.isOriginal;
                      const valueChanged =
                        originalRow &&
                        Math.abs(row.temperature - originalRow.temperature) > 0.001;

                      return (
                        <tr
                          key={row.id}
                          onClick={() => {
                            setSelectedRow(row);
                            const anomaly = getRowAnomaly(row);
                            if (anomaly) setSelectedAnomaly(anomaly);
                          }}
                          className={`cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-cold-500/20'
                              : hasDiff
                              ? 'bg-green-500/5 hover:bg-green-500/10'
                              : 'hover:bg-dark-700/30'
                          } ${!row.isOriginal ? 'border-l-2 border-green-400' : ''}`}
                        >
                          <td className="py-2 px-3 font-mono text-xs text-dark-300">
                            {formatDateTime(row.timestamp)}
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-mono text-xs text-white">
                              {sensors.find((s) => s.sensorId === row.sensorId)?.name ||
                                row.sensorId}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right">
                            <span
                              className={`font-mono text-sm font-semibold ${
                                valueChanged ? 'text-green-400' : 'text-white'
                              }`}
                            >
                              {row.temperature.toFixed(2)}°C
                              {valueChanged && originalRow && (
                                <span className="text-xs text-dark-500 ml-1">
                                  ({(row.temperature - originalRow.temperature).toFixed(2)})
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            {!row.isOriginal ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
                                已修正
                              </span>
                            ) : row.qualityFlag ? (
                              <span className="text-xs px-2 py-0.5 rounded bg-alert-yellow/20 text-alert-yellow">
                                保留
                              </span>
                            ) : (
                              <span className="text-xs text-dark-500">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-dark-400">
                <span>
                  第 <span className="text-white font-medium">{currentPage}</span> /{' '}
                  <span className="text-white font-medium">{totalPages}</span> 页
                </span>
                <span className="text-dark-600">|</span>
                <span>
                  共 <span className="text-white font-medium">{filteredRawData.length.toLocaleString()}</span> 条记录
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg bg-dark-700/50 text-dark-300 hover:text-white hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                          currentPage === pageNum
                            ? 'bg-cold-500 text-white'
                            : 'text-dark-400 hover:text-white hover:bg-dark-700/50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg bg-dark-700/50 text-dark-300 hover:text-white hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-cold-400" />
              数据详情
            </h3>

            {selectedRow ? (
              <div className="space-y-4">
                <div className="p-4 bg-dark-900/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-400">采集时间</span>
                    <span className="font-mono text-sm text-white">
                      {formatDateTime(selectedRow.timestamp)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-400">传感器</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-white">
                        {sensors.find((s) => s.sensorId === selectedRow.sensorId)?.name ||
                          selectedRow.sensorId}
                      </span>
                      <span
                        className={`status-dot ${
                          sensors.find((s) => s.sensorId === selectedRow.sensorId)?.status ===
                          'online'
                            ? 'status-online'
                            : 'status-warning'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-dark-400">位置</span>
                    <span className="text-sm text-dark-300 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {sensors.find((s) => s.sensorId === selectedRow.sensorId)?.location ||
                        '未知'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-dark-900/50 rounded-lg">
                    <p className="text-xs text-dark-400 mb-1">原始值</p>
                    <p className="text-lg font-mono font-bold text-white">
                      {selectedRow.temperature.toFixed(2)}°C
                    </p>
                  </div>
                  <div className="p-3 bg-dark-900/50 rounded-lg">
                    <p className="text-xs text-dark-400 mb-1">处理后</p>
                    <p className="text-lg font-mono font-bold text-green-400">
                      {(paginatedProcessedData.find((p) => p.id === selectedRow.id)
                        ?.temperature || selectedRow.temperature
                      ).toFixed(2)}
                      °C
                    </p>
                  </div>
                </div>

                {selectedRow.qualityFlag && (
                  <div className="p-4 border rounded-lg" style={{
                    borderColor: `${getAnomalyTypeColor(selectedRow.qualityFlag)}50`,
                    backgroundColor: `${getAnomalyTypeColor(selectedRow.qualityFlag)}10`
                  }}>
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4" style={{ color: getAnomalyTypeColor(selectedRow.qualityFlag) }} />
                      <span className="text-sm font-medium" style={{ color: getAnomalyTypeColor(selectedRow.qualityFlag) }}>
                        {getAnomalyTypeLabel(selectedRow.qualityFlag)}
                      </span>
                    </div>
                    <p className="text-xs text-dark-400">
                      该数据点存在{getAnomalyTypeLabel(selectedRow.qualityFlag)}问题，
                      {!paginatedProcessedData.find((p) => p.id === selectedRow.id)?.isOriginal
                        ? '已通过插值算法修正'
                        : '已保留原始值'}
                    </p>
                  </div>
                )}

                {getCargoBatchForTime(selectedRow.timestamp) && (
                  <div className="p-3 bg-cold-500/10 border border-cold-500/30 rounded-lg">
                    <h4 className="text-sm font-medium text-cold-400 mb-2 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      关联货品
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">批次号</span>
                        <span className="text-white font-mono">
                          {getCargoBatchForTime(selectedRow.timestamp)?.cargoId}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">产品名称</span>
                        <span className="text-white">
                          {getCargoBatchForTime(selectedRow.timestamp)?.productName}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">温度要求</span>
                        <span className="text-white font-mono">
                          {getCargoBatchForTime(selectedRow.timestamp)?.minTemp}°C ~{' '}
                          {getCargoBatchForTime(selectedRow.timestamp)?.maxTemp}°C
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {getMaintenanceForTime(selectedRow.sensorId, selectedRow.timestamp) && (
                  <div className="p-3 bg-alert-yellow/10 border border-alert-yellow/30 rounded-lg">
                    <h4 className="text-sm font-medium text-alert-yellow mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      关联维修记录
                    </h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">事件类型</span>
                        <span className="text-alert-yellow">
                          {getMaintenanceForTime(selectedRow.sensorId, selectedRow.timestamp)?.eventType}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-dark-400">操作人员</span>
                        <span className="text-white">
                          {getMaintenanceForTime(selectedRow.sensorId, selectedRow.timestamp)?.operator}
                        </span>
                      </div>
                      <p className="text-xs text-dark-400 mt-1">
                        {getMaintenanceForTime(selectedRow.sensorId, selectedRow.timestamp)?.description}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-dark-500">
                <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">点击表格行查看详情</p>
              </div>
            )}
          </div>

          {selectedAnomaly && (
            <div className="card p-5 border-alert-red/50">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-alert-red" />
                异常详情
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">异常时间</span>
                  <span className="font-mono text-sm text-white">
                    {formatDateTime(selectedAnomaly.eventTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">温度值</span>
                  <span
                    className="font-mono text-xl font-bold"
                    style={{ color: getAnomalyTypeColor(selectedAnomaly.anomalyType) }}
                  >
                    {selectedAnomaly.temperature.toFixed(2)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">正常阈值</span>
                  <span className="font-mono text-sm text-dark-300">
                    {selectedAnomaly.threshold.toFixed(2)}°C
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">偏离度</span>
                  <span className="font-mono text-sm text-alert-orange">
                    {selectedAnomaly.deviation.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">严重程度</span>
                  <span className={`badge ${getSeverityColor(selectedAnomaly.severity)}`}>
                    {getSeverityLabel(selectedAnomaly.severity)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">置信度</span>
                  <span className="font-mono text-sm text-green-400">
                    {(selectedAnomaly.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="divider my-2" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-dark-400">异常类型</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: getAnomalyTypeColor(selectedAnomaly.anomalyType) }}
                  >
                    {getAnomalyTypeLabel(selectedAnomaly.anomalyType)}
                  </span>
                </div>
                {selectedAnomaly.diagnosis && (
                  <div className="p-3 bg-dark-900/50 rounded-lg mt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-dark-400">初步诊断</span>
                      <span className="text-sm font-medium text-cold-400">
                        {getDiagnosisTypeLabel(selectedAnomaly.diagnosis)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card p-5">
            <h3 className="text-sm font-semibold text-white mb-3">图例说明</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-alert-red" />
                <span className="text-dark-300">异常跳点</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-alert-orange" />
                <span className="text-dark-300">传感器离线</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-alert-indigo" />
                <span className="text-dark-300">缺采样</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-alert-purple" />
                <span className="text-dark-300">时钟漂移</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-2 rounded-full bg-alert-yellow" />
                <span className="text-dark-300">超出量程</span>
              </div>
              <div className="divider my-2" />
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-8 bg-alert-red" />
                <span className="text-dark-300">原始数据异常标记</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <div className="w-2 h-8 bg-green-400" />
                <span className="text-dark-300">已修正数据</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailQuery;
