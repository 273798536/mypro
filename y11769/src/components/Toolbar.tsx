import { Camera, FileText, Play, Pause } from 'lucide-react';
import { useSandboxStore } from '@/store/useSandboxStore';
import { sampleDataList } from '@/utils/samples';
import { exportScreenshot, generateReportText, downloadTextFile } from '@/utils/export';

export default function Toolbar() {
  const activeSample = useSandboxStore(s => s.activeSample);
  const isAnimating = useSandboxStore(s => s.isAnimating);
  const loadSample = useSandboxStore(s => s.loadSample);
  const toggleAnimation = useSandboxStore(s => s.toggleAnimation);

  const epicenter = useSandboxStore(s => s.epicenter);
  const layers = useSandboxStore(s => s.layers);
  const stations = useSandboxStore(s => s.stations);
  const validationResults = useSandboxStore(s => s.validationResults);

  const handleExportScreenshot = () => {
    exportScreenshot('sandbox-root');
  };

  const handleExportReport = () => {
    const epicenterInfo = `震源深度: ${(-epicenter.position[1]).toFixed(1)}km, X位置: ${epicenter.position[0].toFixed(0)}km`;
    const layerInfo = layers.map(l =>
      `${l.name}: P波=${l.pVelocity}km/s, S波=${l.sVelocity}km/s, 深度${l.topDepth}-${l.bottomDepth}km`
    );
    const stationInfo = stations.map(s =>
      `${s.label}: X=${s.position[0].toFixed(0)}km`
    );
    const validationInfo = validationResults.length === 0
      ? ['所有数据校验通过']
      : validationResults.map(r => `[${r.level.toUpperCase()}] ${r.code}: ${r.message}`);
    const report = generateReportText(epicenterInfo, layerInfo, stationInfo, validationInfo);
    downloadTextFile(report, `seismic-report-${Date.now()}.txt`);
  };

  return (
    <div className="w-full h-10 flex items-center gap-4 px-4 bg-[#0a0e1a]/90 border-b border-zinc-700/50">
      <h1 className="text-sm font-bold text-orange-400 tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
        地震波传播沙盒
      </h1>

      <div className="flex-1 flex items-center justify-center gap-2">
        {sampleDataList.map(sample => (
          <button
            key={sample.id}
            onClick={() => loadSample(sample)}
            className={`px-3 py-1 text-xs rounded border transition-colors ${
              activeSample === sample.id
                ? 'border-orange-500 text-orange-400 bg-orange-500/15'
                : 'border-zinc-600 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300'
            }`}
          >
            {sample.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleExportScreenshot}
          className="p-1.5 text-zinc-400 hover:text-white border border-zinc-700 rounded transition-colors"
          title="导出截图"
        >
          <Camera size={14} />
        </button>
        <button
          onClick={handleExportReport}
          className="p-1.5 text-zinc-400 hover:text-white border border-zinc-700 rounded transition-colors"
          title="导出报告"
        >
          <FileText size={14} />
        </button>
        <button
          onClick={toggleAnimation}
          className="p-1.5 text-zinc-400 hover:text-white border border-zinc-700 rounded transition-colors"
          title={isAnimating ? '暂停动画' : '播放动画'}
        >
          {isAnimating ? <Pause size={14} /> : <Play size={14} />}
        </button>
      </div>
    </div>
  );
}
