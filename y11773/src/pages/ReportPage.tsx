import { useState } from 'react';
import {
  ArrowLeft,
  History,
  Image,
  Download,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  User,
  Settings,
  Wrench,
  Clock,
  Database,
  FileText,
  ZoomIn,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDateTime, formatNumber } from '../utils/physics';
import { UNIT_LABELS } from '../types';

export function ReportPage() {
  const {
    history,
    snapshots,
    setCurrentPage,
    deleteSnapshot,
    heatSource,
    sensor,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'history' | 'snapshots'>('history');
  const [selectedSnapshot, setSelectedSnapshot] = useState<number | null>(null);

  const getOperatorIcon = (operator: string) => {
    switch (operator) {
      case 'user':
        return <User className="w-3 h-3" />;
      case 'system':
        return <Settings className="w-3 h-3" />;
      case 'correction':
        return <Wrench className="w-3 h-3" />;
      default:
        return <Info className="w-3 h-3" />;
    }
  };

  const getOperatorText = (operator: string) => {
    switch (operator) {
      case 'user':
        return '用户操作';
      case 'system':
        return '系统自动';
      case 'correction':
        return '自动修正';
      default:
        return '未知';
    }
  };

  const getOperatorColor = (operator: string) => {
    switch (operator) {
      case 'user':
        return 'bg-blue-500 text-blue-100';
      case 'system':
        return 'bg-slate-500 text-slate-100';
      case 'correction':
        return 'bg-yellow-500 text-yellow-100';
      default:
        return 'bg-slate-500 text-slate-100';
    }
  };

  const getStatusIcon = (isValid: boolean) => {
    return isValid ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getParameterLabel = (param: string) => {
    const labels: Record<string, string> = {
      temperature: '热源温度',
      temperatureUnit: '温度单位',
      area: '辐射面积',
      material: '材料选择',
      heatSourcePosition: '热源位置',
      sensorPosition: '传感器位置',
      distance: '测量距离',
      emissivity: '发射率',
      snapshot: '截图操作',
      reset: '重置操作',
      colorScale: '色阶映射',
    };
    return labels[param] || param;
  };

  const handleDownloadSnapshot = (snapshot: any) => {
    const link = document.createElement('a');
    link.download = `热辐射演示_${formatDateTime(snapshot.timestamp).replace(/[/:]/g, '-')}.png`;
    link.href = snapshot.imageData;
    link.click();
  };

  const handleExportReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      currentState: {
        heatSource: {
          temperature: heatSource.temperature,
          temperatureUnit: UNIT_LABELS[heatSource.temperatureUnit],
          area: heatSource.area,
          material: heatSource.material.name,
          emissivity: heatSource.material.emissivity,
          position: heatSource.position,
          dataSource: heatSource.dataSource,
        },
        sensor: {
          position: sensor.position,
          measuredIntensity: sensor.measuredIntensity,
          distance: sensor.distance,
          status: sensor.status,
          calibrationSource: sensor.calibrationSource,
        },
      },
      operationHistory: history.slice(0, 50).map((h) => ({
        time: formatDateTime(h.timestamp),
        parameter: getParameterLabel(h.parameterName),
        oldValue: h.oldValue,
        newValue: h.newValue,
        operator: getOperatorText(h.operator),
        isValid: h.isValid,
        validationMessage: h.validationMessage,
        correctionNote: h.correctionNote,
        dataSource: h.dataSource,
      })),
      snapshots: snapshots.map((s) => ({
        time: formatDateTime(s.timestamp),
        intensity: s.intensity,
        temperature: s.heatSource.temperature,
        temperatureUnit: UNIT_LABELS[s.heatSource.temperatureUnit],
        area: s.heatSource.area,
        distance: s.sensor.distance,
      })),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.download = `热辐射演示报告_${formatDateTime(Date.now()).replace(/[/:]/g, '-')}.json`;
    link.href = URL.createObjectURL(blob);
    link.click();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentPage('main')}
              className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-all border border-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              返回演示
            </button>
            <div>
              <h1 className="text-xl font-bold font-['Orbitron'] tracking-wider">
                演示报告
              </h1>
              <p className="text-xs text-slate-400">操作历史与数据追溯</p>
            </div>
          </div>

          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg transition-all font-medium"
          >
            <Download className="w-4 h-4" />
            导出完整报告
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Database className="w-4 h-4" />
              操作记录总数
            </div>
            <div className="text-3xl font-bold font-mono">{history.length}</div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Image className="w-4 h-4" />
              保存截图数
            </div>
            <div className="text-3xl font-bold font-mono">{snapshots.length}</div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              有效操作
            </div>
            <div className="text-3xl font-bold font-mono text-green-500">
              {history.filter((h) => h.isValid).length}
            </div>
          </div>
          <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <Wrench className="w-4 h-4 text-yellow-500" />
              自动修正
            </div>
            <div className="text-3xl font-bold font-mono text-yellow-500">
              {history.filter((h) => h.operator === 'correction').length}
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            操作历史
          </button>
          <button
            onClick={() => setActiveTab('snapshots')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              activeTab === 'snapshots'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Image className="w-4 h-4" />
            截图墙
            {snapshots.length > 0 && (
              <span className="px-1.5 py-0.5 bg-blue-400/30 text-blue-300 rounded text-xs">
                {snapshots.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'history' && (
          <div className="bg-slate-900/30 rounded-xl border border-slate-800 overflow-hidden">
            {history.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <History className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>暂无操作记录</p>
                <p className="text-sm mt-1">返回演示页面进行操作后，记录将显示在这里</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800 max-h-[600px] overflow-y-auto">
                {history.map((record, index) => (
                  <div
                    key={record.id}
                    className={`p-4 hover:bg-slate-800/30 transition-all ${
                      !record.isValid ? 'bg-red-500/5' :
                      record.operator === 'correction' ? 'bg-yellow-500/5' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        <span className={`p-1.5 rounded-full ${getOperatorColor(record.operator)}`}>
                          {getOperatorIcon(record.operator)}
                        </span>
                        {index < history.length - 1 && (
                          <div className="w-px h-full bg-slate-700 mt-2" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-200">
                              {getParameterLabel(record.parameterName)}
                            </span>
                            {getStatusIcon(record.isValid)}
                            <span className={`px-2 py-0.5 rounded text-xs ${getOperatorColor(record.operator)}`}>
                              {getOperatorText(record.operator)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Clock className="w-3 h-3" />
                            {formatDateTime(record.timestamp)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 text-sm mb-2">
                          <span className="text-slate-400">
                            {record.oldValue !== null ? String(record.oldValue) : '-'}
                          </span>
                          <span className="text-slate-600">→</span>
                          <span className="text-white font-mono">
                            {String(record.newValue)}
                          </span>
                          {record.unit && (
                            <span className="text-slate-500 text-xs">{record.unit}</span>
                          )}
                        </div>

                        {record.validationMessage && (
                          <div className={`text-xs p-2 rounded mb-2 ${
                            record.isValid
                              ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'
                              : 'bg-red-500/10 text-red-400 border border-red-500/30'
                          }`}>
                            <div className="flex items-start gap-1">
                              <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>{record.validationMessage}</span>
                            </div>
                          </div>
                        )}

                        {record.correctionNote && (
                          <div className="text-xs p-2 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <div className="flex items-start gap-1">
                              <Wrench className="w-3 h-3 mt-0.5 flex-shrink-0" />
                              <span>🔧 {record.correctionNote}</span>
                            </div>
                          </div>
                        )}

                        {record.dataSource && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
                            <Database className="w-3 h-3" />
                            数据来源: {record.dataSource}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'snapshots' && (
          <div>
            {snapshots.length === 0 ? (
              <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800">
                <Image className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>暂无截图</p>
                <p className="text-sm mt-1">在演示页面点击"截图保存"按钮捕获场景</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {snapshots.map((snapshot, index) => (
                  <div
                    key={snapshot.id}
                    className="group bg-slate-900/50 rounded-xl border border-slate-800 overflow-hidden hover:border-slate-700 transition-all"
                  >
                    <div
                      className="relative aspect-video bg-slate-800 cursor-pointer overflow-hidden"
                      onClick={() => setSelectedSnapshot(selectedSnapshot === index ? null : index)}
                    >
                      <img
                        src={snapshot.imageData}
                        alt={`截图 ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <ZoomIn className="w-8 h-8 text-white" />
                      </div>
                    </div>

                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDateTime(snapshot.timestamp)}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDownloadSnapshot(snapshot)}
                            className="p-1.5 hover:bg-slate-700 rounded transition-all"
                            title="下载图片"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                          </button>
                          <button
                            onClick={() => deleteSnapshot(snapshot.id)}
                            className="p-1.5 hover:bg-red-500/20 rounded transition-all"
                            title="删除截图"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-400" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-slate-500">辐射强度</div>
                          <div className="text-white font-mono">{formatNumber(snapshot.intensity, 4)}</div>
                          <div className="text-slate-500 text-xs">W/m²</div>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-slate-500">温度</div>
                          <div className="text-white font-mono">
                            {snapshot.heatSource.temperature}
                            {UNIT_LABELS[snapshot.heatSource.temperatureUnit]}
                          </div>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-slate-500">面积</div>
                          <div className="text-white font-mono">{snapshot.heatSource.area} m²</div>
                        </div>
                        <div className="p-2 bg-slate-800/50 rounded">
                          <div className="text-slate-500">距离</div>
                          <div className="text-white font-mono">{formatNumber(snapshot.sensor.distance, 3)} m</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Database className="w-3 h-3" />
                        材料: {snapshot.heatSource.material.name}
                        (ε={snapshot.heatSource.material.emissivity.toFixed(3)})
                      </div>

                      {snapshot.validationResults.some((v) => v.level !== 'info') && (
                        <div className="flex flex-wrap gap-1">
                          {snapshot.validationResults
                            .filter((v) => v.level !== 'info')
                            .map((v, i) => (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-xs ${
                                  v.level === 'error'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                ⚠️ {getParameterLabel(v.parameterName)}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedSnapshot !== null && snapshots[selectedSnapshot] && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSnapshot(null)}
          >
            <div
              className="max-w-5xl w-full bg-slate-900 rounded-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="font-medium">截图预览</h3>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(snapshots[selectedSnapshot].timestamp)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownloadSnapshot(snapshots[selectedSnapshot])}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                  <button
                    onClick={() => setSelectedSnapshot(null)}
                    className="p-1.5 hover:bg-slate-700 rounded"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-4">
                <img
                  src={snapshots[selectedSnapshot].imageData}
                  alt="截图预览"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 p-6 bg-slate-900/30 rounded-xl border border-slate-800">
          <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            数据来源说明
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="font-medium text-slate-300 mb-1">热源参数</div>
                <div className="text-slate-400 text-xs">{heatSource.dataSource}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="font-medium text-slate-300 mb-1">材料参数</div>
                <div className="text-slate-400 text-xs">{heatSource.material.dataSource}</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="font-medium text-slate-300 mb-1">传感器校准</div>
                <div className="text-slate-400 text-xs">{sensor.calibrationSource}</div>
              </div>
              <div className="p-3 bg-slate-800/50 rounded-lg">
                <div className="font-medium text-slate-300 mb-1">物理常数</div>
                <div className="text-slate-400 text-xs">
                  斯蒂芬-玻尔兹曼常数 σ = 5.670374419 × 10⁻⁸ W/(m²·K⁴)
                  <br />
                  来源: CODATA 2018 推荐值
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
