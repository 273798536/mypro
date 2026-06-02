import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { BatchStatus, BATCH_STATUS_LABELS, AnalysisResult } from '../../types';
import { GitBranch, Clock, ChevronRight, BarChart2, Sliders, Activity, FileAudio, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface TraceEvent {
  id: string;
  timestamp: number;
  type: 'upload' | 'analyze' | 'filter' | 'detect' | 'export';
  description: string;
  batchId: string;
  batchName: string;
  status: BatchStatus;
  resultLink?: string;
}

export const TracePanel: React.FC = () => {
  const { batches, audioFiles, analysisResults, problems, setActiveBatch, setActiveView } = useAppStore();
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const generateTraceEvents = (): TraceEvent[] => {
    const events: TraceEvent[] = [];

    batches.forEach((batch) => {
      const batchAudioFiles = Object.values(audioFiles).filter(f => f.batchId === batch.batchId);
      const batchAnalysis = Object.values(analysisResults).find(r => r.batchId === batch.batchId);
      const batchProblems = problems[batch.batchId] || [];

      if (batchAudioFiles.length > 0) {
        const originalFile = batchAudioFiles.find(f => f.sourceType === 'original');
        events.push({
          id: `${batch.batchId}-upload`,
          timestamp: batch.createdAt,
          type: 'upload',
          description: `上传音频: ${originalFile?.name || batchAudioFiles[0].name}`,
          batchId: batch.batchId,
          batchName: batch.name,
          status: batch.status,
        });
      }

      if (batchAnalysis) {
        events.push({
          id: `${batch.batchId}-analyze`,
          timestamp: batchAnalysis.analyzedAt,
          type: 'analyze',
          description: `FFT 分析完成 (${batchAnalysis.fftSize} 点)`,
          batchId: batch.batchId,
          batchName: batch.name,
          status: batch.status,
          resultLink: 'spectrum',
        });
      }

      if (batchAnalysis?.filteredAt) {
        events.push({
          id: `${batch.batchId}-filter`,
          timestamp: batchAnalysis.filteredAt,
          type: 'filter',
          description: `滤波处理完成 (SNR提升: ${batchAnalysis.snrImprovement?.toFixed(1) || 0} dB)`,
          batchId: batch.batchId,
          batchName: batch.name,
          status: batch.status,
          resultLink: 'waveform',
        });
      }

      if (batchProblems.length > 0) {
        events.push({
          id: `${batch.batchId}-detect`,
          timestamp: batch.createdAt + 1000,
          type: 'detect',
          description: `检测到 ${batchProblems.length} 个问题`,
          batchId: batch.batchId,
          batchName: batch.name,
          status: batch.status,
          resultLink: 'problems',
        });
      }
    });

    return events.sort((a, b) => b.timestamp - a.timestamp);
  };

  const events = generateTraceEvents();

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getEventIcon = (type: TraceEvent['type']) => {
    switch (type) {
      case 'upload':
        return <FileAudio className="w-3.5 h-3.5 text-spectrum-cyan" />;
      case 'analyze':
        return <BarChart2 className="w-3.5 h-3.5 text-spectrum-purple" />;
      case 'filter':
        return <Sliders className="w-3.5 h-3.5 text-spectrum-pink" />;
      case 'detect':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
      case 'export':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
    }
  };

  const getEventColor = (type: TraceEvent['type']) => {
    switch (type) {
      case 'upload':
        return 'border-spectrum-cyan/30 bg-spectrum-cyan/5';
      case 'analyze':
        return 'border-spectrum-purple/30 bg-spectrum-purple/5';
      case 'filter':
        return 'border-spectrum-pink/30 bg-spectrum-pink/5';
      case 'detect':
        return 'border-amber-500/30 bg-amber-500/5';
      case 'export':
        return 'border-emerald-500/30 bg-emerald-500/5';
    }
  };

  const handleEventClick = (event: TraceEvent) => {
    setActiveBatch(event.batchId);
    setSelectedEvent(event.id);
    
    if (event.resultLink) {
      setActiveView(event.resultLink as any);
    }
  };

  const getBatchAnalysis = (batchId: string): AnalysisResult | undefined => {
    return Object.values(analysisResults).find(r => r.batchId === batchId);
  };

  return (
    <div className="card-surface spectrum-border p-4 h-full flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <GitBranch className="w-4 h-4 text-spectrum-purple" />
        <span className="font-display font-semibold text-sm text-slate-200">结果追溯</span>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
          <Activity className="w-10 h-10 text-slate-600 mb-2" />
          <div className="text-xs text-slate-500">暂无操作记录</div>
          <div className="text-[10px] text-slate-600 mt-1">上传音频并开始分析后将显示操作时间线</div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto scrollbar-thin pr-1">
          <div className="relative">
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-700/50" />
            
            <div className="space-y-1">
              {events.map((event, index) => {
                const showDate = index === 0 || formatDate(event.timestamp) !== formatDate(events[index - 1].timestamp);
                const isSelected = selectedEvent === event.id;
                const analysis = getBatchAnalysis(event.batchId);
                
                return (
                  <React.Fragment key={event.id}>
                    {showDate && (
                      <div className="relative pl-8 py-2">
                        <span className="text-[10px] font-mono text-slate-500 bg-surface px-2 py-0.5 rounded">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => handleEventClick(event)}
                      className={`relative w-full pl-8 py-2 pr-3 text-left rounded-lg transition-all ${
                        isSelected
                          ? 'bg-spectrum-gradient-soft border border-spectrum-cyan/30'
                          : 'hover:bg-surface-lighter/30'
                      }`}
                    >
                      <div className={`absolute left-2 top-2.5 w-3 h-3 rounded-full border-2 ${getEventColor(event.type)} flex items-center justify-center`}>
                        {getEventIcon(event.type)}
                      </div>
                      
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium text-slate-300">
                              {event.description}
                            </span>
                            {event.resultLink && (
                              <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] font-mono text-slate-500">
                              {formatTime(event.timestamp)}
                            </span>
                            <span className="text-[10px] text-slate-600">·</span>
                            <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                              {event.batchName}
                            </span>
                            <span className={`spectrum-badge ${
                              event.status === 'has_issues' ? 'bg-amber-500/20 text-amber-400' :
                              event.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                              'bg-slate-500/20 text-slate-400'
                            }`}>
                              {BATCH_STATUS_LABELS[event.status]}
                            </span>
                          </div>
                        </div>
                      </div>

                      {isSelected && analysis && event.type === 'analyze' && (
                        <div className="mt-2 pt-2 border-t border-slate-700/30">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <div className="text-[9px] text-slate-500">峰值频率</div>
                              <div className="text-[10px] font-mono text-spectrum-cyan">
                                {analysis.peakFrequency?.toFixed(0) || '-'} Hz
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500">噪声底</div>
                              <div className="text-[10px] font-mono text-spectrum-pink">
                                {analysis.noiseFloor?.toFixed(1) || '-'} dB
                              </div>
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-500">SNR</div>
                              <div className="text-[10px] font-mono text-emerald-400">
                                {analysis.snr?.toFixed(1) || '-'} dB
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-slate-700/30">
        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>共 {events.length} 条记录</span>
          </div>
          <span>点击可快速跳转</span>
        </div>
      </div>
    </div>
  );
};
