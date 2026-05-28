import { useCallback, useState } from 'react';
import { Play, RotateCcw, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AudioUploader } from '../components/AudioUploader';
import { SpectrumAnalyzer } from '../components/SpectrumAnalyzer';
import { ParameterPanel } from '../components/ParameterPanel';
import { ResultPanel } from '../components/ResultPanel';
import { AnomalyAlert } from '../components/AnomalyAlert';
import { HistoryList } from '../components/HistoryList';
import { useAudioAnalysis } from '../hooks/useAudioAnalysis';
import { useAnalysisStore } from '../store/analysisStore';
import type { AudioData } from '../types';

export function Workbench() {
  const navigate = useNavigate();
  const { audioData, currentRecord, isAnalyzing, resetAnalysis } = useAnalysisStore();
  const { analyzeAudio } = useAudioAnalysis();
  const [showHistory, setShowHistory] = useState(true);

  const handleAudioLoaded = useCallback(async (audioData: AudioData) => {
  }, []);

  const handleAnalyze = useCallback(() => {
    if (audioData) {
      analyzeAudio(audioData);
    }
  }, [audioData, analyzeAudio]);

  const handleReset = useCallback(() => {
    resetAnalysis();
  }, [resetAnalysis]);

  const handleExportReport = useCallback(() => {
    if (currentRecord) {
      navigate(`/report/${currentRecord.id}`);
    }
  }, [currentRecord, navigate]);

  const canAnalyze = audioData && !isAnalyzing;
  const hasResults = currentRecord && currentRecord.status === 'completed';

  return (
    <div className="min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">分析工作台</h2>
            <p className="text-sm text-dark-400 mt-1">
              导入音频样本，配置参数，进行多普勒效应测速分析
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-dark-800 text-dark-300 rounded-lg hover:bg-dark-700 transition-colors border border-dark-700"
            >
              <RotateCcw className="w-4 h-4" />
              重置
            </button>
            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all ${
                canAnalyze
                  ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/25'
                  : 'bg-dark-700 text-dark-500 cursor-not-allowed'
              }`}
            >
              <Play className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''}`} />
              {isAnalyzing ? '分析中...' : '开始分析'}
            </button>
            {hasResults && (
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-4 py-2 bg-success-500/20 text-success-300 rounded-lg hover:bg-success-500/30 transition-colors border border-success-500/30"
              >
                <FileText className="w-4 h-4" />
                导出报告
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-3 space-y-6">
            <ParameterPanel />
          </div>

          <div className="col-span-6 space-y-6">
            <AudioUploader onAudioLoaded={handleAudioLoaded} />
            
            {audioData && (
              <SpectrumAnalyzer height={280} showWaveform={true} />
            )}

            <AnomalyAlert />

            {currentRecord && currentRecord.corrections.length > 0 && (
              <div className="bg-dark-800/50 rounded-xl border border-dark-700 p-4">
                <h3 className="text-sm font-medium text-white mb-3">修正痕迹</h3>
                <div className="space-y-2">
                  {currentRecord.corrections.map((corr, index) => (
                    <div key={index} className="text-xs text-dark-400 flex items-center gap-2">
                      <span className="text-dark-500">
                        {new Date(corr.timestamp).toLocaleTimeString('zh-CN')}
                      </span>
                      <span className="font-mono">
                        {corr.field}: {String(corr.oldValue)} → {String(corr.newValue)}
                      </span>
                      {corr.reason && (
                        <span className="text-dark-500">({corr.reason})</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="col-span-3 space-y-6">
            <ResultPanel />
            
            {showHistory && <HistoryList />}
          </div>
        </div>
      </div>
    </div>
  );
}
