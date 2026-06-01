import { ArrowLeft, Download, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { exportToYAML, downloadFile } from '../utils/exportUtils';

export function Export() {
  const navigate = useNavigate();
  const { exportRecords } = useAppStore();

  const handleDownloadYAML = (record: typeof exportRecords[0]) => {
    const yamlContent = exportToYAML(record);
    downloadFile(yamlContent, `aero-analysis-${record.id}.yaml`, 'application/yaml');
  };

  const handleDownloadScreenshot = (record: typeof exportRecords[0]) => {
    if (record.screenshotUrl) {
      const link = document.createElement('a');
      link.href = record.screenshotUrl;
      link.download = `aero-screenshot-${record.id}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="bg-slate-800/50 border-b border-slate-700 px-6 py-3">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            返回
          </button>
          <h1 className="text-white font-bold text-lg">导出记录</h1>
          <span className="text-slate-500 text-sm">共 {exportRecords.length} 条记录</span>
        </div>
      </header>

      <div className="flex-1 p-6 overflow-y-auto">
        {exportRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="text-slate-500 text-lg mb-4">暂无导出记录</div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
            >
              返回主页面导出
            </button>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {exportRecords.map((record) => (
              <div
                key={record.id}
                className="bg-slate-800/50 border border-slate-700 rounded-xl p-5"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-white font-semibold">{record.modelName}</h3>
                    <p className="text-slate-400 text-sm">
                      {new Date(record.timestamp).toLocaleString('zh-CN')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownloadYAML(record)}
                      className="p-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
                      title="下载 YAML"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownloadScreenshot(record)}
                      className="p-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-500 transition-colors"
                      title="下载截图"
                      disabled={!record.screenshotUrl}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1">风速</div>
                    <div className="text-cyan-400 font-mono font-bold">{record.windParams.speed} m/s</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1">偏航角</div>
                    <div className="text-cyan-400 font-mono font-bold">{record.windParams.yawAngle}°</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1">俯仰角</div>
                    <div className="text-cyan-400 font-mono font-bold">{record.windParams.pitchAngle}°</div>
                  </div>
                  <div className="bg-slate-700/30 rounded-lg p-3">
                    <div className="text-slate-400 text-xs mb-1">空气密度</div>
                    <div className="text-cyan-400 font-mono font-bold">{record.windParams.density} kg/m³</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className={`rounded-lg p-3 ${record.riskSummary.angleViolations > 0 ? 'bg-red-900/30' : 'bg-green-900/30'}`}>
                    <div className="text-slate-400 text-xs mb-1">角度越界</div>
                    <div className={`font-mono font-bold ${record.riskSummary.angleViolations > 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {record.riskSummary.angleViolations} 处
                    </div>
                  </div>
                  <div className={`rounded-lg p-3 ${record.riskSummary.oversampling > 0 ? 'bg-yellow-900/30' : 'bg-green-900/30'}`}>
                    <div className="text-slate-400 text-xs mb-1">采样过密</div>
                    <div className={`font-mono font-bold ${record.riskSummary.oversampling > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                      {record.riskSummary.oversampling} 处
                    </div>
                  </div>
                  <div className={`rounded-lg p-3 ${record.riskSummary.reverseFlows > 0 ? 'bg-blue-900/30' : 'bg-green-900/30'}`}>
                    <div className="text-slate-400 text-xs mb-1">尾流反向</div>
                    <div className={`font-mono font-bold ${record.riskSummary.reverseFlows > 0 ? 'text-blue-400' : 'text-green-400'}`}>
                      {record.riskSummary.reverseFlows} 处
                    </div>
                  </div>
                </div>

                {record.hasDataGap && (
                  <div className="mt-4 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
                    <div className="text-amber-400 text-xs font-semibold mb-1">数据说明</div>
                    <div className="text-amber-200/70 text-xs">{record.dataGapNote}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
