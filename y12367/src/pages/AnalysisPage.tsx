import * as React from 'react';
import { motion } from 'framer-motion';
import * as XLSX from 'xlsx';
import {
  AlertTriangle,
  BarChart3,
  Clock,
  Download,
  FileSpreadsheet,
  RefreshCw,
  Settings,
  Thermometer,
  Zap,
  Gauge,
  X,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { FilterPanel } from '@/components/ui/FilterPanel';
import { SegmentIndicator, SegmentLegend } from '@/components/ui/SegmentIndicator';
import { Button } from '@/components/ui/Button';
import { Badge, AnomalyBadge, SeverityBadge } from '@/components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Alert } from '@/components/ui/Alert';
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from '@/components/ui/Modal';
import { Checkbox } from '@/components/ui/Checkbox';
import { LineChart } from '@/components/charts/LineChart';
import { ScatterChart } from '@/components/charts/ScatterChart';
import { EfficiencyMapChart } from '@/components/charts/EfficiencyMapChart';
import { useAnalysisStore } from '@/stores/useAnalysisStore';
import { format } from 'date-fns';
import type { AnomalyRecord, WorkingConditionSegment, FilterCriteria } from '@/types';

export const AnalysisPage: React.FC = () => {
  const {
    initialize,
    filters,
    materials,
    testBenches,
    segments,
    filteredVoltageData,
    filteredTemperatureData,
    filteredSpeedData,
    filteredReports,
    filteredAnomalies,
    isLoading,
    error,
    setFilters,
    adjustSegmentBoundary,
    recalculateAll,
  } = useAnalysisStore();

  const [activeTab, setActiveTab] = React.useState('efficiency');
  const [selectedSegmentId, setSelectedSegmentId] = React.useState<string | undefined>();
  const [showSegmentEditor, setShowSegmentEditor] = React.useState(false);
  const [showExportModal, setShowExportModal] = React.useState(false);
  const [exportOptions, setExportOptions] = React.useState({
    efficiencyReports: true,
    anomalyRecords: true,
    voltageData: false,
    temperatureData: false,
    speedData: false,
    format: 'xlsx' as 'xlsx' | 'csv',
  });
  const [isExporting, setIsExporting] = React.useState(false);

  React.useEffect(() => {
    initialize();
  }, [initialize]);

  const handleFilterChange = React.useCallback(
    (partialFilters: Partial<FilterCriteria>) => {
      setFilters(partialFilters);
    },
    [setFilters]
  );

  const handleResetFilters = React.useCallback(() => {
    setFilters({
      testBenchIds: [],
      materialIds: [],
      segmentIds: [],
      timeRange: null,
      anomalyTypes: [],
      dataCaliber: 'all',
    });
  }, [setFilters]);

  const formatDate = (date: Date | string): string => {
    const d = new Date(date);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const wb = XLSX.utils.book_new();
      const testBenchMap = new Map(testBenches.map((t) => [t.id, t.code]));
      const materialMap = new Map(materials.map((m) => [m.id, m.code]));
      const segmentMap = new Map(segments.map((s) => [s.id, s.name]));

      if (exportOptions.efficiencyReports && filteredReports.length > 0) {
        const rows = filteredReports.map((r) => ({
          报告ID: r.id,
          测试台: testBenchMap.get(r.testBenchId) ?? r.testBenchId,
          材料: materialMap.get(r.materialId) ?? r.materialId,
          工况段: segmentMap.get(r.segmentId) ?? r.segmentId,
          开始时间: formatDate(r.startTime),
          结束时间: formatDate(r.endTime),
          输入功率_kW: Number(r.inputPower.toFixed(2)),
          输出功率_kW: Number(r.outputPower.toFixed(2)),
          效率_: Number(r.efficiency.toFixed(2)),
          是否修正: r.isCorrected ? '是' : '否',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, '效率报告');
      }

      if (exportOptions.anomalyRecords && filteredAnomalies.length > 0) {
        const rows = filteredAnomalies.map((a) => ({
          异常ID: a.id,
          类型: a.type === 'speed_missing' ? '转速缺采' : a.type === 'temp_overlimit' ? '温升超限' : '功率反号',
          严重程度: a.severity,
          测试台: testBenchMap.get(a.testBenchId) ?? a.testBenchId,
          材料: materialMap.get(a.materialId) ?? a.materialId,
          工况段: segmentMap.get(a.segmentId) ?? a.segmentId,
          时间: formatDate(a.timestamp),
          实际值: a.actualValue,
          阈值: a.threshold,
          持续时间_ms: a.duration,
          是否已处理: a.resolved ? '是' : '否',
          详情: a.message,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 50 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, '异常记录');
      }

      if (exportOptions.voltageData && filteredVoltageData.length > 0) {
        const rows = filteredVoltageData.map((v) => ({
          记录ID: v.id,
          测试台: testBenchMap.get(v.testBenchId) ?? v.testBenchId,
          材料: materialMap.get(v.materialId) ?? v.materialId,
          工况段: segmentMap.get(v.segmentId) ?? v.segmentId,
          时间: formatDate(v.timestamp),
          电压_V: Number(v.voltage.toFixed(2)),
          电流_A: Number(v.current.toFixed(2)),
          功率_W: Number(v.power.toFixed(2)),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 20 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, '电压电流');
      }

      if (exportOptions.temperatureData && filteredTemperatureData.length > 0) {
        const objectTypeMap: Record<string, string> = {
          winding: '绕组',
          bearing: '轴承',
          housing: '机壳',
        };
        const rows = filteredTemperatureData.map((t) => ({
          记录ID: t.id,
          测试台: testBenchMap.get(t.testBenchId) ?? t.testBenchId,
          材料: materialMap.get(t.materialId) ?? t.materialId,
          工况段: segmentMap.get(t.segmentId) ?? t.segmentId,
          时间: formatDate(t.timestamp),
          测温对象: objectTypeMap[t.objectType] ?? t.objectType,
          温度_: Number(t.temperature.toFixed(2)),
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 20 }, { wch: 10 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, '温度序列');
      }

      if (exportOptions.speedData && filteredSpeedData.length > 0) {
        const rows = filteredSpeedData.map((s) => ({
          记录ID: s.id,
          测试台: testBenchMap.get(s.testBenchId) ?? s.testBenchId,
          材料: materialMap.get(s.materialId) ?? s.materialId,
          工况段: segmentMap.get(s.segmentId) ?? s.segmentId,
          时间: formatDate(s.timestamp),
          转速_rpm: Number(s.speed.toFixed(2)),
          扭矩_Nm: Number(s.torque.toFixed(2)),
          是否缺采: s.isMissing ? '是' : '否',
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
          { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 },
          { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
        ];
        XLSX.utils.book_append_sheet(wb, ws, '转速扭矩');
      }

      const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
      const fileName = `电机效率测试数据_${timestamp}.${exportOptions.format}`;

      if (exportOptions.format === 'csv') {
        const firstSheet = wb.SheetNames[0];
        if (firstSheet) {
          XLSX.writeFile(wb, fileName, { bookType: 'csv' });
        }
      } else {
        XLSX.writeFile(wb, fileName);
      }

      setShowExportModal(false);
    } finally {
      setIsExporting(false);
    }
  };

  const temperatureChartData = React.useMemo(() => {
    const windingData = filteredTemperatureData
      .filter((d) => d.objectType === 'winding')
      .slice(-200)
      .map((d) => ({
        timestamp: new Date(d.timestamp).getTime(),
        value: d.temperature,
        segmentId: d.segmentId,
      }));

    const bearingData = filteredTemperatureData
      .filter((d) => d.objectType === 'bearing')
      .slice(-200)
      .map((d) => ({
        timestamp: new Date(d.timestamp).getTime(),
        value: d.temperature,
        segmentId: d.segmentId,
      }));

    const housingData = filteredTemperatureData
      .filter((d) => d.objectType === 'housing')
      .slice(-200)
      .map((d) => ({
        timestamp: new Date(d.timestamp).getTime(),
        value: d.temperature,
        segmentId: d.segmentId,
      }));

    return [
      { name: '绕组温度', data: windingData, color: '#EF4444' },
      { name: '轴承温度', data: bearingData, color: '#F59E0B' },
      { name: '壳体温度', data: housingData, color: '#3B82F6' },
    ];
  }, [filteredTemperatureData]);

  const powerChartData = React.useMemo(() => {
    const powerData = filteredVoltageData.slice(-200).map((d) => ({
      timestamp: new Date(d.timestamp).getTime(),
      value: Math.abs(d.power),
      segmentId: d.segmentId,
    }));

    return [{ name: '有功功率', data: powerData, color: '#10B981', type: 'smooth' as const }];
  }, [filteredVoltageData]);

  const efficiencyScatterData = React.useMemo(() => {
    return filteredReports.map((r) => {
      const seg = segments.find((s) => s.id === r.segmentId);
      const speedPoints = filteredSpeedData.filter(
        (d) => d.segmentId === r.segmentId && !d.isMissing
      );
      const avgSpeed =
        speedPoints.length > 0
          ? speedPoints.reduce((s, d) => s + d.speed, 0) / speedPoints.length
          : (seg ? (seg.speedRange[0] + seg.speedRange[1]) / 2 : 0);
      const avgTorque =
        speedPoints.length > 0
          ? speedPoints.reduce((s, d) => s + d.torque, 0) / speedPoints.length
          : (seg ? (seg.torqueRange[0] + seg.torqueRange[1]) / 2 : 0);
      return {
        x: avgSpeed,
        y: avgTorque,
        value: r.efficiency,
        segmentId: r.segmentId,
      };
    });
  }, [filteredReports, segments, filteredSpeedData]);

  const efficiencyMapData = React.useMemo(() => {
    return filteredReports.map((r) => {
      const seg = segments.find((s) => s.id === r.segmentId);
      const speedPoints = filteredSpeedData.filter(
        (d) => d.segmentId === r.segmentId && !d.isMissing
      );
      const avgSpeed =
        speedPoints.length > 0
          ? speedPoints.reduce((s, d) => s + d.speed, 0) / speedPoints.length
          : (seg ? (seg.speedRange[0] + seg.speedRange[1]) / 2 : 0);
      const avgTorque =
        speedPoints.length > 0
          ? speedPoints.reduce((s, d) => s + d.torque, 0) / speedPoints.length
          : (seg ? (seg.torqueRange[0] + seg.torqueRange[1]) / 2 : 0);
      return {
        speed: avgSpeed,
        torque: avgTorque,
        efficiency: r.efficiency,
        segmentId: r.segmentId,
      };
    });
  }, [filteredReports, segments, filteredSpeedData]);

  const criticalAnomalies = React.useMemo(() => {
    return filteredAnomalies.filter((a) => a.severity === 'critical' && !a.resolved);
  }, [filteredAnomalies]);

  const activeMaterial = React.useMemo(() => {
    if (filters.materialIds.length > 0) {
      return materials.find((m) => m.id === filters.materialIds[0]);
    }
    return null;
  }, [filters.materialIds, materials]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-industrial-text-muted">加载中...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-industrial-text">数据分析</h1>
          <p className="text-industrial-text-muted mt-1">筛选条件变化时，图表和明细将同步更新</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            icon={<RefreshCw className="w-4 h-4" />}
            onClick={recalculateAll}
          >
            重新计算
          </Button>
          <Button
            variant="ghost"
            size="sm"
            icon={<Settings className="w-4 h-4" />}
            onClick={() => setShowSegmentEditor(!showSegmentEditor)}
          >
            分段设置
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => setShowExportModal(true)}
          >
            导出报告
          </Button>
        </div>
      </div>

      <Modal open={showExportModal} onClose={() => !isExporting && setShowExportModal(false)}>
        <ModalContent maxWidth="md">
          <ModalHeader>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-industrial-text">导出数据</h3>
              {!isExporting && (
                <button
                  onClick={() => setShowExportModal(false)}
                  className="text-industrial-text-muted hover:text-industrial-text"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-industrial-text mb-3">选择导出内容</label>
                <div className="space-y-3">
                  <Checkbox
                    label={`效率报告 (${filteredReports.length} 条)`}
                    checked={exportOptions.efficiencyReports}
                    onChange={(e) => setExportOptions({ ...exportOptions, efficiencyReports: e.target.checked })}
                  />
                  <Checkbox
                    label={`异常记录 (${filteredAnomalies.length} 条)`}
                    checked={exportOptions.anomalyRecords}
                    onChange={(e) => setExportOptions({ ...exportOptions, anomalyRecords: e.target.checked })}
                  />
                  <Checkbox
                    label={`电压电流数据 (${filteredVoltageData.length} 条)`}
                    checked={exportOptions.voltageData}
                    onChange={(e) => setExportOptions({ ...exportOptions, voltageData: e.target.checked })}
                  />
                  <Checkbox
                    label={`温度序列数据 (${filteredTemperatureData.length} 条)`}
                    checked={exportOptions.temperatureData}
                    onChange={(e) => setExportOptions({ ...exportOptions, temperatureData: e.target.checked })}
                  />
                  <Checkbox
                    label={`转速扭矩数据 (${filteredSpeedData.length} 条)`}
                    checked={exportOptions.speedData}
                    onChange={(e) => setExportOptions({ ...exportOptions, speedData: e.target.checked })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-industrial-text mb-3">导出格式</label>
                <div className="flex gap-4">
                  <Button
                    variant={exportOptions.format === 'xlsx' ? 'primary' : 'default'}
                    size="sm"
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    onClick={() => setExportOptions({ ...exportOptions, format: 'xlsx' })}
                  >
                    Excel (.xlsx)
                  </Button>
                  <Button
                    variant={exportOptions.format === 'csv' ? 'primary' : 'default'}
                    size="sm"
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    onClick={() => setExportOptions({ ...exportOptions, format: 'csv' })}
                  >
                    CSV (.csv)
                  </Button>
                </div>
              </div>
              {exportOptions.format === 'csv' && (
                <Alert variant="info" title="CSV 格式说明">
                  多工作表数据将只导出第一个选中的工作表。如需导出全部数据，请选择 Excel 格式。
                </Alert>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="default"
              onClick={() => setShowExportModal(false)}
              disabled={isExporting}
            >
              取消
            </Button>
            <Button
              variant="primary"
              icon={isExporting ? undefined : <Check className="w-4 h-4" />}
              onClick={handleExport}
              disabled={isExporting || !(
                exportOptions.efficiencyReports ||
                exportOptions.anomalyRecords ||
                exportOptions.voltageData ||
                exportOptions.temperatureData ||
                exportOptions.speedData
              )}
            >
              {isExporting ? '导出中...' : '开始导出'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {error && (
        <Alert variant="danger" title="错误">
          {error}
        </Alert>
      )}

      {criticalAnomalies.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <Alert variant="danger" title={`存在 ${criticalAnomalies.length} 条严重异常`}>
            请优先处理以下严重异常：
            <ul className="mt-2 space-y-1">
              {criticalAnomalies.slice(0, 3).map((a) => (
                <li key={a.id} className="text-sm">
                  <span className="font-mono">• {a.message}</span>
                </li>
              ))}
            </ul>
          </Alert>
        </motion.div>
      )}

      {activeMaterial && (
        <Alert variant="info" title={`当前材料口径: ${activeMaterial.code} - ${activeMaterial.name}`}>
          温度限值: {activeMaterial.temperatureLimit}°C | 功率范围: {activeMaterial.powerRange[0]}-{activeMaterial.powerRange[1]} kW | 采样间隔: {activeMaterial.speedSampleInterval}ms
        </Alert>
      )}

      <FilterPanel
        filters={filters}
        materials={materials}
        testBenches={testBenches}
        segments={segments}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            工况分段
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SegmentIndicator
            segments={segments}
            activeSegmentId={selectedSegmentId}
            onSegmentClick={(id) => {
              setSelectedSegmentId(id);
              handleFilterChange({ segmentIds: id ? [id] : [] });
            }}
          />
          <div className="mt-4">
            <SegmentLegend segments={segments} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-green-400" />
                <span className="text-sm text-industrial-text-muted">电压</span>
              </div>
              <span className="font-mono text-lg font-bold text-industrial-text">
                {filteredVoltageData.length > 0
                  ? (filteredVoltageData.reduce((s, d) => s + d.voltage, 0) / filteredVoltageData.length).toFixed(1)
                  : '-'}
                <span className="text-xs text-industrial-text-muted ml-1">V</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-industrial-text-muted">电流</span>
              </div>
              <span className="font-mono text-lg font-bold text-industrial-text">
                {filteredVoltageData.length > 0
                  ? (filteredVoltageData.reduce((s, d) => s + d.current, 0) / filteredVoltageData.length).toFixed(2)
                  : '-'}
                <span className="text-xs text-industrial-text-muted ml-1">A</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-orange-400" />
                <span className="text-sm text-industrial-text-muted">最高温度</span>
              </div>
              <span className="font-mono text-lg font-bold text-industrial-text">
                {filteredTemperatureData.length > 0
                  ? Math.max(...filteredTemperatureData.map((d) => d.temperature)).toFixed(1)
                  : '-'}
                <span className="text-xs text-industrial-text-muted ml-1">°C</span>
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-industrial-text-muted">平均效率</span>
              </div>
              <span className="font-mono text-lg font-bold text-green-400">
                {filteredReports.length > 0
                  ? (filteredReports.reduce((s, d) => s + d.efficiency, 0) / filteredReports.length).toFixed(2)
                  : '-'}
                <span className="text-xs text-industrial-text-muted ml-1">%</span>
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>数据视图</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="px-4 pt-4">
              <TabsTrigger value="efficiency">效率分析</TabsTrigger>
              <TabsTrigger value="temperature">温度序列</TabsTrigger>
              <TabsTrigger value="power">电压电流</TabsTrigger>
              <TabsTrigger value="anomalies">异常记录</TabsTrigger>
              <TabsTrigger value="reports">效率报告</TabsTrigger>
            </TabsList>

            <TabsContent value="efficiency" className="p-4">
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">效率散点图</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScatterChart
                        series={[
                          {
                            name: '效率点',
                            data: efficiencyScatterData,
                            color: '#10B981',
                            symbolSize: 10,
                          },
                        ]}
                        xAxisLabel="转速 (rpm)"
                        yAxisLabel="扭矩 (N·m)"
                        segments={segments}
                        height={350}
                        trendLine
                      />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">效率 MAP 图</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <EfficiencyMapChart
                        data={efficiencyMapData}
                        segments={segments}
                        minEfficiency={70}
                        maxEfficiency={95}
                        height={350}
                      />
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="temperature" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">温度趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    series={temperatureChartData}
                    xAxisLabel="时间"
                    yAxisLabel="温度 (°C)"
                    segments={segments}
                    height={400}
                    threshold={
                      activeMaterial
                        ? {
                            value: activeMaterial.temperatureLimit,
                            label: `温度限值 ${activeMaterial.temperatureLimit}°C`,
                            color: '#EF4444',
                          }
                        : undefined
                    }
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="power" className="p-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">功率趋势</CardTitle>
                </CardHeader>
                <CardContent>
                  <LineChart
                    series={powerChartData}
                    xAxisLabel="时间"
                    yAxisLabel="功率 (kW)"
                    segments={segments}
                    height={400}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="anomalies" className="p-0">
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>严重度</TableHead>
                    <TableHead>测试台</TableHead>
                    <TableHead>材料</TableHead>
                    <TableHead>对象</TableHead>
                    <TableHead>工况</TableHead>
                    <TableHead>实际值</TableHead>
                    <TableHead>阈值</TableHead>
                    <TableHead>时间</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>详情</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnomalies.map((anomaly: AnomalyRecord) => {
                    const tb = testBenches.find((t) => t.id === anomaly.testBenchId);
                    const material = materials.find((m) => m.id === anomaly.materialId);
                    const segment = segments.find((s) => s.id === anomaly.segmentId);
                    return (
                      <TableRow key={anomaly.id} anomalyType={anomaly.type}>
                        <TableCell>
                          <AnomalyBadge type={anomaly.type} />
                        </TableCell>
                        <TableCell>
                          <SeverityBadge severity={anomaly.severity} />
                        </TableCell>
                        <TableCell>{tb?.code || '-'}</TableCell>
                        <TableCell>{material?.code || '-'}</TableCell>
                        <TableCell>{anomaly.objectType || '-'}</TableCell>
                        <TableCell>{segment?.name || '-'}</TableCell>
                        <TableCell className="font-mono">
                          {anomaly.type === 'speed_missing'
                            ? `${(anomaly.actualValue / 1000).toFixed(1)}s`
                            : anomaly.type === 'temp_overlimit'
                            ? `${anomaly.actualValue.toFixed(1)}°C`
                            : `${anomaly.actualValue.toFixed(2)} kW`}
                        </TableCell>
                        <TableCell className="font-mono">
                          {anomaly.type === 'speed_missing'
                            ? `${anomaly.threshold}ms`
                            : anomaly.type === 'temp_overlimit'
                            ? `${anomaly.threshold}°C`
                            : `${anomaly.threshold} kW`}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-industrial-text-muted" />
                            {format(new Date(anomaly.timestamp), 'MM-dd HH:mm:ss')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={anomaly.resolved ? 'green' : 'yellow'}>
                            {anomaly.resolved ? '已解决' : '待处理'}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-xs text-industrial-text-muted">
                          {anomaly.message}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="reports" className="p-0">
              <Table compact>
                <TableHeader>
                  <TableRow>
                    <TableHead>测试台</TableHead>
                    <TableHead>材料</TableHead>
                    <TableHead>工况</TableHead>
                    <TableHead>开始时间</TableHead>
                    <TableHead>结束时间</TableHead>
                    <TableHead>输入功率</TableHead>
                    <TableHead>输出功率</TableHead>
                    <TableHead>效率</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReports.map((report) => {
                    const tb = testBenches.find((t) => t.id === report.testBenchId);
                    const material = materials.find((m) => m.id === report.materialId);
                    const segment = segments.find((s) => s.id === report.segmentId);
                    return (
                      <TableRow key={report.id}>
                        <TableCell>{tb?.code || '-'}</TableCell>
                        <TableCell>{material?.code || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: segment?.color }}
                            />
                            {segment?.name || '-'}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(report.startTime), 'MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {format(new Date(report.endTime), 'MM-dd HH:mm')}
                        </TableCell>
                        <TableCell className="font-mono">{report.inputPower.toFixed(2)} kW</TableCell>
                        <TableCell className="font-mono">{report.outputPower.toFixed(2)} kW</TableCell>
                        <TableCell className="font-mono">
                          <span
                            className={
                              report.efficiency >= 85 ? 'text-green-400' : report.efficiency >= 80 ? 'text-yellow-400' : 'text-red-400'
                            }
                          >
                            {report.efficiency.toFixed(2)}%
                          </span>
                        </TableCell>
                        <TableCell>
                          {report.isCorrected ? (
                            <Badge variant="purple">已修正</Badge>
                          ) : (
                            <Badge variant="default">原始</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm">
                            查看详情
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
