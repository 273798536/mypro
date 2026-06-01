import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { exportToPDF, exportToJSON, exportToWAV, exportToWAVDiff } from '../../utils/exporter';
import { FileText, FileJson, FileAudio, Download, Settings, Check, Info } from 'lucide-react';

export const ExportPanel: React.FC = () => {
  const {
    activeBatch,
    originalFile,
    processedFile,
    spectrumBefore,
    spectrumAfter,
    filterParams,
    analysisResult,
    problems,
  } = useAppStore();

  const [exportConfig, setExportConfig] = useState({
    bitDepth: 16 as 16 | 24 | 32,
    includeSpectrogram: true,
    includeWaveform: true,
    includeProblems: true,
    includeParameters: true,
  });

  const [exporting, setExporting] = useState<'pdf' | 'json' | 'wav-original' | 'wav-processed' | 'wav-diff' | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const showSuccess = (msg: string) => {
    setExportSuccess(msg);
    setTimeout(() => setExportSuccess(null), 2000);
  };

  const handleExportPDF = async () => {
    if (!activeBatch) return;
    setExporting('pdf');
    try {
      const canvasSpectrum = document.querySelector('.spectrum-canvas-ref') as HTMLCanvasElement;
      const canvasWaveform = document.querySelector('.waveform-canvas-ref') as HTMLCanvasElement;
      const blob = await exportToPDF(
        activeBatch,
        originalFile ? [originalFile] : [],
        analysisResult,
        filterParams,
        activeBatch.batchId ? problems[activeBatch.batchId] || [] : [],
        exportConfig.includeSpectrogram ? canvasSpectrum : undefined,
        exportConfig.includeWaveform ? canvasWaveform : undefined,
        { includeProblems: exportConfig.includeProblems, includeParameters: exportConfig.includeParameters }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fourier-noise-report-${activeBatch.name.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('PDF 报告已导出');
    } catch (err) {
      console.error('Export PDF error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportJSON = async () => {
    if (!activeBatch) return;
    setExporting('json');
    try {
      const blob = await exportToJSON(
        activeBatch,
        originalFile ? [originalFile] : [],
        analysisResult,
        filterParams,
        activeBatch.batchId ? problems[activeBatch.batchId] || [] : [],
        spectrumBefore,
        spectrumAfter
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fourier-noise-data-${activeBatch.name.replace(/\s+/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess('JSON 数据已导出');
    } catch (err) {
      console.error('Export JSON error:', err);
    } finally {
      setExporting(null);
    }
  };

  const handleExportWAV = async (type: 'original' | 'processed' | 'diff') => {
    if (!activeBatch) return;
    setExporting(`wav-${type}` as any);
    try {
      let blob: Blob;
      let filename: string;

      if (type === 'original' && originalFile) {
        blob = await exportToWAV(originalFile.channelData, originalFile.sampleRate, exportConfig.bitDepth);
        filename = `original-${originalFile.name.replace(/\s+/g, '-')}`;
      } else if (type === 'processed' && processedFile) {
        blob = await exportToWAV(processedFile.channelData, processedFile.sampleRate, exportConfig.bitDepth);
        filename = `processed-${processedFile.name.replace(/\s+/g, '-')}`;
      } else if (type === 'diff' && originalFile && processedFile) {
        blob = await exportToWAVDiff(originalFile, processedFile, exportConfig.bitDepth);
        filename = `diff-${activeBatch.name.replace(/\s+/g, '-')}`;
      } else {
        return;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      showSuccess(`WAV ${type === 'original' ? '原始音频' : type === 'processed' ? '处理后音频' : '差异音频'}已导出`);
    } catch (err) {
      console.error(`Export WAV ${type} error:`, err);
    } finally {
      setExporting(null);
    }
  };

  const canExport = activeBatch && originalFile;
  const canExportProcessed = activeBatch && processedFile;

  return (
    <div className="card-surface spectrum-border p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-spectrum-purple" />
          <span className="font-display font-semibold text-sm text-slate-200">报告导出</span>
        </div>
        {exportSuccess && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <Check className="w-3 h-3" />
            <span>{exportSuccess}</span>
          </div>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Settings className="w-3 h-3 text-slate-500" />
          <span className="data-grid-header">导出配置</span>
        </div>
        
        <div className="space-y-2">
          <div>
            <label className="data-grid-header block mb-1">WAV 位深度</label>
            <div className="grid grid-cols-3 gap-1">
              {[16, 24, 32].map((depth) => (
                <button
                  key={depth}
                  onClick={() => setExportConfig({ ...exportConfig, bitDepth: depth as 16 | 24 | 32 })}
                  className={`px-2 py-1 text-[10px] font-mono rounded border transition-all ${
                    exportConfig.bitDepth === depth
                      ? 'bg-spectrum-purple/20 border-spectrum-purple/50 text-spectrum-purple'
                      : 'border-slate-600/30 text-slate-400 hover:border-slate-500/50'
                  }`}
                >
                  {depth} bit
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'includeSpectrogram', label: '频谱图' },
              { key: 'includeWaveform', label: '波形图' },
              { key: 'includeProblems', label: '问题记录' },
              { key: 'includeParameters', label: '参数明细' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(exportConfig as any)[key]}
                  onChange={(e) => setExportConfig({ ...exportConfig, [key]: e.target.checked })}
                  className="w-3 h-3 rounded border-slate-600 bg-surface/50 text-spectrum-cyan focus:ring-spectrum-cyan/50"
                />
                <span className="text-[10px] text-slate-400">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="data-grid-header text-[10px] mb-1">文档格式</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleExportPDF}
            disabled={exporting !== null || !canExport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono rounded-lg border border-spectrum-cyan/30 bg-spectrum-cyan/10 text-spectrum-cyan hover:bg-spectrum-cyan/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'pdf' ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>PDF 报告</span>
          </button>
          <button
            onClick={handleExportJSON}
            disabled={exporting !== null || !canExport}
            className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono rounded-lg border border-spectrum-purple/30 bg-spectrum-purple/10 text-spectrum-purple hover:bg-spectrum-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'json' ? (
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileJson className="w-3.5 h-3.5" />
            )}
            <span>JSON 数据</span>
          </button>
        </div>

        <div className="data-grid-header text-[10px] mt-3 mb-1">音频格式</div>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleExportWAV('original')}
            disabled={exporting !== null || !canExport}
            className="flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-mono rounded-lg border border-slate-600/30 hover:border-spectrum-cyan/50 hover:bg-spectrum-cyan/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'wav-original' ? (
              <div className="w-3 h-3 border-2 border-spectrum-cyan border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileAudio className="w-3.5 h-3.5 text-spectrum-cyan" />
            )}
            <span className="text-slate-400">原始</span>
          </button>
          <button
            onClick={() => handleExportWAV('processed')}
            disabled={exporting !== null || !canExportProcessed}
            className="flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-mono rounded-lg border border-slate-600/30 hover:border-spectrum-pink/50 hover:bg-spectrum-pink/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'wav-processed' ? (
              <div className="w-3 h-3 border-2 border-spectrum-pink border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileAudio className="w-3.5 h-3.5 text-spectrum-pink" />
            )}
            <span className="text-slate-400">处理后</span>
          </button>
          <button
            onClick={() => handleExportWAV('diff')}
            disabled={exporting !== null || !canExportProcessed}
            className="flex flex-col items-center gap-1 px-2 py-2 text-[10px] font-mono rounded-lg border border-slate-600/30 hover:border-spectrum-purple/50 hover:bg-spectrum-purple/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting === 'wav-diff' ? (
              <div className="w-3 h-3 border-2 border-spectrum-purple border-t-transparent rounded-full animate-spin" />
            ) : (
              <FileAudio className="w-3.5 h-3.5 text-spectrum-purple" />
            )}
            <span className="text-slate-400">差异</span>
          </button>
        </div>
      </div>

      {!canExport && (
        <div className="mt-3 pt-3 border-t border-slate-700/30">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400">
            <Info className="w-3 h-3" />
            <span>请先上传音频并完成分析后再导出</span>
          </div>
        </div>
      )}
    </div>
  );
};
