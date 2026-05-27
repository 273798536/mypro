import { useState } from 'react';
import { Camera, Download, AlertTriangle, X, Info, Target } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getAnomalyIcon, getAnomalyColor } from '@/utils/anomalyDetector';
import html2canvas from 'html2canvas';

export function TopBar() {
  const { anomalies, activeAnomaly, setActiveAnomaly, clearAnomalies, waveParams, time } = useAppStore();
  const [showScreenshotToast, setShowScreenshotToast] = useState(false);

  const handleScreenshot = async () => {
    const appElement = document.getElementById('app-container');
    if (!appElement) return;

    try {
      const canvas = await html2canvas(appElement, {
        backgroundColor: '#0A2463',
        scale: 2,
        logging: false,
      });

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'rgba(10, 36, 99, 0.8)';
        ctx.fillRect(10, canvas.height - 50, canvas.width - 20, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        ctx.fillText(
          `海浪干涉演示台 | 时间: ${time.toFixed(2)}s | 频率: ${waveParams.source1.frequency.toFixed(1)}Hz | 波长: ${waveParams.wavelength.toFixed(2)}m | ${new Date().toLocaleString()}`,
          20,
          canvas.height - 25
        );
      }

      const link = document.createElement('a');
      link.download = `wave-interference-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      setShowScreenshotToast(true);
      setTimeout(() => setShowScreenshotToast(false), 3000);
    } catch (error) {
      console.error('截图失败:', error);
    }
  };

  const criticalAnomalies = anomalies.filter((a) => a.severity === 'error');
  const warningAnomalies = anomalies.filter((a) => a.severity === 'warning');

  return (
    <>
      <div className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700 flex items-center justify-between px-4 z-50 relative">
        <div className="flex items-center gap-4">
          <h1
            className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-emerald-400"
            style={{ fontFamily: "'Orbitron', sans-serif" }}
          >
            🌊 海浪干涉演示台
          </h1>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-400">
            <Info className="w-3.5 h-3.5" />
            <span>点击水面添加采样点 · 拖拽波源/障碍物移动位置 · 双击删除</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {anomalies.length > 0 && (
            <div className="flex items-center gap-2">
              {criticalAnomalies.length > 0 && (
                <span className="flex items-center gap-1 text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {criticalAnomalies.length} 错误
                </span>
              )}
              {warningAnomalies.length > 0 && (
                <span className="flex items-center gap-1 text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
                  <AlertTriangle className="w-3 h-3" />
                  {warningAnomalies.length} 警告
                </span>
              )}
            </div>
          )}
          <button
            onClick={() => {
              const addSamplePoint = useAppStore.getState().addSamplePoint;
              addSamplePoint({ x: 0, y: 0 });
            }}
            className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-all text-sm font-medium"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">添加采样点</span>
          </button>
          <button
            onClick={handleScreenshot}
            className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 rounded-lg border border-cyan-500/30 transition-all text-sm font-medium"
          >
            <Camera className="w-4 h-4" />
            <span className="hidden sm:inline">截图导出</span>
          </button>
        </div>
      </div>

      {activeAnomaly && (
        <div
          className="absolute top-14 left-0 right-0 z-40 p-2"
          style={{
            background: `linear-gradient(to right, ${getAnomalyColor(activeAnomaly.severity)}15, transparent)`,
            borderBottom: `1px solid ${getAnomalyColor(activeAnomaly.severity)}40`,
          }}
        >
          <div className="max-w-4xl mx-auto flex items-start gap-3 p-3 rounded-lg bg-slate-900/90 backdrop-blur-sm border border-slate-700">
            <span className="text-2xl">{getAnomalyIcon(activeAnomaly.type)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className="text-xs px-2 py-0.5 rounded font-medium"
                  style={{
                    backgroundColor: getAnomalyColor(activeAnomaly.severity) + '30',
                    color: getAnomalyColor(activeAnomaly.severity),
                  }}
                >
                  {activeAnomaly.severity === 'error' ? '错误' : '警告'}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(activeAnomaly.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-sm text-slate-200 break-words">
                {activeAnomaly.message}
              </p>
              {activeAnomaly.correction && (
                <div className="mt-2 p-2 bg-emerald-900/30 rounded text-xs text-emerald-300 border border-emerald-500/30">
                  ✅ 自动修正: {activeAnomaly.correction.action}
                  <div className="mt-1 font-mono text-emerald-400/80">
                    修正前: {JSON.stringify(activeAnomaly.correction.before).slice(0, 60)} →
                    修正后: {JSON.stringify(activeAnomaly.correction.after).slice(0, 60)}
                  </div>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setActiveAnomaly(null)}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={clearAnomalies}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                清除全部
              </button>
            </div>
          </div>
        </div>
      )}

      {showScreenshotToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-500/90 text-white rounded-lg shadow-lg backdrop-blur-sm">
          <Download className="w-5 h-5" />
          <span className="font-medium">截图已保存到下载文件夹</span>
        </div>
      )}
    </>
  );
}
