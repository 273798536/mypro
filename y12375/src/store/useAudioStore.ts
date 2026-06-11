import { create } from 'zustand';
import { AudioFile, Segment, Issue, Version, Report, ManualChangeLog } from '../types';
import { mockAudioFiles, mockSegments, mockIssues, mockVersions, mockReports, mockChangeLogs } from '../data/mockData';

interface AudioState {
  audioFiles: AudioFile[];
  segments: Segment[];
  issues: Issue[];
  versions: Version[];
  reports: Report[];
  changeLogs: ManualChangeLog[];
  selectedAudioFile: AudioFile | null;
  selectedSegment: Segment | null;
  selectedIssue: Issue | null;
  currentTime: number;
  isPlaying: boolean;
  zoomLevel: number;
  viewStart: number;
  viewEnd: number;

  setSelectedAudioFile: (file: AudioFile | null) => void;
  setSelectedSegment: (segment: Segment | null) => void;
  setSelectedIssue: (issue: Issue | null) => void;
  setCurrentTime: (time: number) => void;
  togglePlay: () => void;
  setZoomLevel: (level: number) => void;
  setViewRange: (start: number, end: number) => void;
  jumpToIssue: (issue: Issue) => void;
  fixIssue: (issueId: string) => void;
  updateSegmentType: (segmentId: string, newType: Segment['type']) => void;
  createVersion: (note: string) => void;
  exportReport: (format: 'pdf' | 'html') => Report;
  importAudioFile: (file: File) => Promise<AudioFile>;
  importSegmentsData: (audioFileId: string, data: { segments: Segment[]; issues: Issue[] }) => void;
  getSegmentsForAudio: (audioId: string) => Segment[];
  getIssuesForAudio: (audioId: string) => Issue[];
  getVersionsForAudio: (audioId: string) => Version[];
}

export const useAudioStore = create<AudioState>((set, get) => ({
  audioFiles: mockAudioFiles,
  segments: mockSegments,
  issues: mockIssues,
  versions: mockVersions,
  reports: mockReports,
  changeLogs: mockChangeLogs,
  selectedAudioFile: mockAudioFiles[0],
  selectedSegment: null,
  selectedIssue: null,
  currentTime: 0,
  isPlaying: false,
  zoomLevel: 1,
  viewStart: 0,
  viewEnd: mockAudioFiles[0]?.duration || 0,

  setSelectedAudioFile: (file) => set({ 
    selectedAudioFile: file,
    viewStart: 0,
    viewEnd: file?.duration || 0,
    currentTime: 0,
  }),

  setSelectedSegment: (segment) => set({ selectedSegment: segment }),

  setSelectedIssue: (issue) => set({ selectedIssue: issue }),

  setCurrentTime: (time) => set({ currentTime: time }),

  togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setZoomLevel: (level) => set({ zoomLevel: level }),

  setViewRange: (start, end) => set({ viewStart: start, viewEnd: end }),

  jumpToIssue: (issue) => {
    const segment = get().segments.find(s => s.id === issue.segmentId);
    if (segment) {
      set({
        currentTime: segment.startTime,
        selectedIssue: issue,
        selectedSegment: segment,
        viewStart: Math.max(0, segment.startTime - 30),
        viewEnd: Math.min(get().selectedAudioFile?.duration || 0, segment.endTime + 30),
      });
    }
  },

  fixIssue: (issueId) => set((state) => ({
    issues: state.issues.map(i => 
      i.id === issueId 
        ? { ...i, isFixed: true, fixedAt: new Date() }
        : i
    ),
  })),

  updateSegmentType: (segmentId, newType) => set((state) => {
    const segment = state.segments.find(s => s.id === segmentId);
    if (!segment) return state;

    const oldType = segment.type;
    const updatedSegment: Segment = {
      ...segment,
      type: newType,
      status: 'modified',
      modifiedBy: 'manual',
      modifiedAt: new Date(),
      originalType: segment.originalType || segment.type,
    };

    const newSegments = state.segments.map(s =>
      s.id === segmentId ? updatedSegment : s
    );

    const affectedIssues = state.issues
      .filter(i => i.segmentId === segmentId)
      .map(i => i.id);

    const newIssues = state.issues.map(i =>
      i.segmentId === segmentId
        ? { ...i, affectedByManualChange: true }
        : i
    );

    const newChangeLog: ManualChangeLog = {
      id: `log-${Date.now()}`,
      segmentId,
      changeType: 'type_change',
      oldValue: oldType,
      newValue: newType,
      timestamp: new Date(),
      affectedIssues,
    };

    const isSelectedSegment = state.selectedSegment?.id === segmentId;

    return {
      segments: newSegments,
      issues: newIssues,
      changeLogs: [...state.changeLogs, newChangeLog],
      selectedSegment: isSelectedSegment ? updatedSegment : state.selectedSegment,
    };
  }),

  createVersion: (note) => set((state) => {
    const audioFile = state.selectedAudioFile;
    if (!audioFile) return state;

    const newVersion: Version = {
      id: `ver-${Date.now()}`,
      audioFileId: audioFile.id,
      versionNumber: state.versions.length + 1,
      segments: state.getSegmentsForAudio(audioFile.id),
      issues: state.getIssuesForAudio(audioFile.id),
      createdAt: new Date(),
      note,
    };

    return {
      versions: [...state.versions, newVersion],
    };
  }),

  exportReport: (format) => {
    const state = get();
    const audioFile = state.selectedAudioFile;
    if (!audioFile) throw new Error('No audio file selected');

    const issues = state.getIssuesForAudio(audioFile.id);
    const segments = state.getSegmentsForAudio(audioFile.id);
    const versionsForAudio = state.getVersionsForAudio(audioFile.id);
    const latestVersion = versionsForAudio.slice(-1)[0];

    const report: Report = {
      id: `report-${Date.now()}`,
      audioFileId: audioFile.id,
      versionId: latestVersion?.id || '',
      issues,
      exportedAt: new Date(),
      exportFormat: format,
      summary: {
        totalIssues: issues.length,
        highSeverity: issues.filter(i => i.severity === 'high' && !i.isFixed).length,
        mediumSeverity: issues.filter(i => i.severity === 'medium' && !i.isFixed).length,
        lowSeverity: issues.filter(i => i.severity === 'low' && !i.isFixed).length,
        fixedIssues: issues.filter(i => i.isFixed).length,
      },
    };

    set((state) => ({
      reports: [...state.reports, report],
    }));

    const formatTime = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    const formatDuration = (seconds: number): string => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}分${secs}秒`;
    };
    const formatDate = (date: Date): string => {
      return new Date(date).toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit',
      });
    };
    const formatSafeDate = (date: Date): string => {
      const d = new Date(date);
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    };
    const getIssueTypeLabel = (type: string) => {
      switch (type) { case 'loudness': return '响度超标'; case 'silence': return '静音异常'; case 'sampleRate': return '采样率问题'; case 'clipping': return '削波失真'; default: return type; }
    };
    const getSeverityLabel = (severity: string) => {
      switch (severity) { case 'high': return '高'; case 'medium': return '中'; case 'low': return '低'; default: return severity; }
    };
    const getSegmentTypeLabel = (type: string) => {
      switch (type) { case 'speech': return '语音'; case 'ad': return '广告'; case 'music': return '音乐'; case 'silence': return '静音'; default: return type; }
    };
    const getSeverityColor = (severity: string) => {
      switch (severity) { case 'high': return '#ef4444'; case 'medium': return '#eab308'; case 'low': return '#3b82f6'; default: return '#6b7280'; }
    };

    const sortedIssues = [...issues].sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as Record<string, number>;
      if (a.isFixed !== b.isFixed) return a.isFixed ? 1 : -1;
      return (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
    });

    const issuesHtml = sortedIssues.map(issue => {
      const segment = segments.find(s => s.id === issue.segmentId);
      const severityColor = getSeverityColor(issue.severity);
      return `
        <div style="border-left: 4px solid ${severityColor}; padding: 12px 16px; margin-bottom: 12px; background: ${issue.isFixed ? '#f0fdf4' : '#fff'}; border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="color: ${issue.isFixed ? '#22c55e' : severityColor}">${getIssueTypeLabel(issue.type)}</strong>
              <span style="background: ${severityColor}20; color: ${severityColor}; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${getSeverityLabel(issue.severity)}</span>
              ${issue.isFixed ? '<span style="background: #22c55e20; color: #22c55e; padding: 2px 8px; border-radius: 4px; font-size: 12px;">已修复</span>' : ''}
              ${issue.affectedByManualChange ? '<span style="background: #22c55e20; color: #16a34a; padding: 2px 6px; border-radius: 4px; font-size: 12px;">受人工修改影响</span>' : ''}
              ${issue.affectedByAdAddition ? '<span style="background: #f9731620; color: #ea580c; padding: 2px 6px; border-radius: 4px; font-size: 12px;">受广告补录影响</span>' : ''}
            </div>
            <span style="color: #6b7280; font-size: 12px; font-family: monospace;">${formatTime(issue.sourceRef.startTime)}</span>
          </div>
          <p style="color: #4b5563; font-size: 14px; margin: 8px 0;">${issue.description}</p>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #6b7280; flex-wrap: wrap; gap: 8px;">
            <span>📎 来源追溯: ${getSegmentTypeLabel(segment?.type || '')}片段 &nbsp;|&nbsp; 片段ID: ${issue.sourceRef.segmentId} &nbsp;|&nbsp; 音频文件ID: ${issue.sourceRef.audioFileId} &nbsp;|&nbsp; 时间范围: ${formatTime(issue.sourceRef.startTime)} - ${formatTime(issue.sourceRef.endTime)}</span>
          </div>
        </div>`;
    }).join('');

    const segmentsHtml = segments.map((seg, idx) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 8px 12px; text-align: center; color: #6b7280;">${idx + 1}</td>
        <td style="padding: 8px 12px; font-family: monospace;">${formatTime(seg.startTime)} - ${formatTime(seg.endTime)}</td>
        <td style="padding: 8px 12px;"><span style="background: #e5e7eb; padding: 2px 10px; border-radius: 4px;">${getSegmentTypeLabel(seg.type)}</span></td>
        <td style="padding: 8px 12px; color: ${seg.loudness > -16 ? '#ef4444' : '#22c55e'}; font-weight: 500;">${seg.loudness.toFixed(1)} LUFS</td>
        <td style="padding: 8px 12px;">${seg.modifiedBy === 'manual' ? '<span style="color: #9333ea;">✓ 人工修改</span>' : '<span style="color: #6b7280;">自动检测</span>'}</td>
      </tr>`).join('');

    const htmlContent = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>播客响度合规报告 - ${audioFile.name}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'WenQuanYi Micro Hei', sans-serif; background: #f9fafb; color: #111827; margin: 0; padding: 40px 20px; line-height: 1.6; }
  .container { max-width: 960px; margin: 0 auto; background: #fff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 48px; }
  h1 { font-size: 28px; margin: 0 0 8px; color: #111827; }
  h2 { font-size: 20px; margin: 32px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #06b6d4; color: #0891b2; }
  .subtitle { color: #6b7280; margin: 0 0 32px; font-size: 14px; }
  .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px; margin: 24px 0; }
  .stat-card { background: #f3f4f6; border-radius: 8px; padding: 20px; text-align: center; }
  .stat-card.high { background: #fef2f2; border: 1px solid #fecaca; }
  .stat-card.medium { background: #fefce8; border: 1px solid #fef08a; }
  .stat-card.low { background: #eff6ff; border: 1px solid #bfdbfe; }
  .stat-card.fixed { background: #f0fdf4; border: 1px solid #bbf7d0; }
  .stat-value { font-size: 32px; font-weight: 700; }
  .stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 14px; }
  th { background: #f3f4f6; padding: 10px 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #d1d5db; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; padding: 16px; background: #f9fafb; border-radius: 8px; }
  .info-item { display: flex; justify-content: space-between; font-size: 14px; }
  .info-label { color: #6b7280; }
  .info-value { color: #111827; font-weight: 500; word-break: break-all; }
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; display: flex; gap: 16px; flex-wrap: wrap; }
  @media (max-width: 640px) {
    .stats { grid-template-columns: repeat(2, 1fr); }
    .info-grid { grid-template-columns: 1fr; }
    body { padding: 16px; }
    .container { padding: 20px; }
  }
  @media print {
    body { background: #fff; padding: 0; }
    .container { box-shadow: none; border-radius: 0; padding: 20px; }
  }
</style>
</head>
<body>
<div class="container">
  <h1>📋 播客响度合规检查报告</h1>
  <p class="subtitle">文件: ${audioFile.name} &nbsp;|&nbsp; 生成时间: ${formatDate(report.exportedAt)} &nbsp;|&nbsp; 报告ID: ${report.id}</p>
  
  <h2>📊 问题概览（未修复按严重度分类）</h2>
  <div class="stats">
    <div class="stat-card"><div class="stat-value">${report.summary.totalIssues}</div><div class="stat-label">问题总数</div></div>
    <div class="stat-card high"><div class="stat-value" style="color:#dc2626;">${report.summary.highSeverity}</div><div class="stat-label">高严重(未修)</div></div>
    <div class="stat-card medium"><div class="stat-value" style="color:#ca8a04;">${report.summary.mediumSeverity}</div><div class="stat-label">中严重(未修)</div></div>
    <div class="stat-card low"><div class="stat-value" style="color:#2563eb;">${report.summary.lowSeverity}</div><div class="stat-label">低严重(未修)</div></div>
    <div class="stat-card fixed"><div class="stat-value" style="color:#16a34a;">${report.summary.fixedIssues}</div><div class="stat-label">已修复</div></div>
  </div>

  <h2>🎵 音频文件信息</h2>
  <div class="info-grid">
    <div class="info-item"><span class="info-label">文件名:</span><span class="info-value">${audioFile.name}</span></div>
    <div class="info-item"><span class="info-label">文件ID:</span><span class="info-value">${audioFile.id}</span></div>
    <div class="info-item"><span class="info-label">总时长:</span><span class="info-value">${formatDuration(audioFile.duration)}</span></div>
    <div class="info-item"><span class="info-label">采样率:</span><span class="info-value">${audioFile.sampleRate} Hz</span></div>
    <div class="info-item"><span class="info-label">片段数:</span><span class="info-value">${segments.length}</span></div>
    <div class="info-item"><span class="info-label">报告版本:</span><span class="info-value">v${latestVersion?.versionNumber || 1}${latestVersion?.note ? ` (${latestVersion.note})` : ''}</span></div>
  </div>

  <h2>🔍 片段分层详情（${segments.length} 段）</h2>
  <table>
    <thead><tr><th style="text-align:center;">#</th><th>时间范围</th><th>类型</th><th>响度</th><th>修改方式</th></tr></thead>
    <tbody>${segmentsHtml || '<tr><td colspan="5" style="padding:16px;text-align:center;color:#6b7280;">暂无片段数据</td></tr>'}</tbody>
  </table>

  <h2>⚠️ 问题明细（${issues.length} 条，按严重度排序，未修复在前）</h2>
  ${issues.length === 0 ? '<p style="color: #16a34a; padding: 20px; background: #f0fdf4; border-radius: 8px; text-align: center; font-size: 15px;">✅ 未检测到任何问题，音频合规！</p>' : issuesHtml}

  <div class="footer">
    <span>报告ID: ${report.id}</span>
    <span>导出格式: ${format.toUpperCase()}</span>
    <span>音频文件ID: ${audioFile.id}</span>
    <span>生成时间: ${formatDate(report.exportedAt)}</span>
  </div>
</div>
</body>
</html>`;

    const safeBaseName = audioFile.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_');
    const fileExt = format === 'pdf' ? 'html' : 'html';
    const fileName = `合规报告_${safeBaseName}_${formatSafeDate(report.exportedAt)}.${fileExt}`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);

    return report;
  },

  importAudioFile: async (file) => {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

        reader.onload = async (e) => {
          try {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer.slice(0));

            const duration = audioBuffer.duration;
            const sampleRate = audioBuffer.sampleRate;

            const waveformData: number[] = [];
            const samples = Math.floor(duration * 10);
            const channelData = audioBuffer.getChannelData(0);
            const blockSize = Math.floor(channelData.length / samples);
            for (let i = 0; i < samples; i++) {
              let sum = 0;
              const start = i * blockSize;
              for (let j = 0; j < blockSize; j++) {
                sum += Math.abs(channelData[start + j] || 0);
              }
              waveformData.push(blockSize > 0 ? Math.min(1, sum / blockSize * 2) : 0);
            }

            const loudnessData: { time: number; value: number }[] = [];
            for (let i = 0; i <= Math.floor(duration); i++) {
              const secStart = i * sampleRate;
              const secEnd = Math.min(secStart + sampleRate, channelData.length);
              let sumSq = 0;
              for (let j = secStart; j < secEnd; j++) {
                sumSq += (channelData[j] || 0) ** 2;
              }
              const rms = Math.sqrt(sumSq / Math.max(1, secEnd - secStart));
              const loudness = rms > 0 ? 20 * Math.log10(rms) - 0.691 : -70;
              loudnessData.push({ time: i, value: Math.max(-70, Math.min(0, loudness)) });
            }

            const audioFile: AudioFile = {
              id: `audio-${Date.now()}`,
              name: file.name,
              duration,
              sampleRate,
              waveformData,
              createdAt: new Date(),
              loudnessData,
            };

            set((state) => ({
              audioFiles: [...state.audioFiles, audioFile],
              selectedAudioFile: audioFile,
              viewStart: 0,
              viewEnd: duration,
              currentTime: 0,
            }));

            resolve(audioFile);
          } catch (err) {
            reject(err);
          } finally {
            audioCtx.close();
          }
        };

        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsArrayBuffer(file);
      } catch (err) {
        reject(err);
      }
    });
  },

  importSegmentsData: (audioFileId, data) => {
    set((state) => {
      const newSegments = data.segments.map(s => ({
        ...s,
        audioFileId,
        id: s.id || `seg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      }));

      const newIssues = data.issues.map(i => {
        const segment = newSegments.find(s => s.id === i.segmentId);
        return {
          ...i,
          id: i.id || `issue-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          segmentId: i.segmentId,
          isFixed: i.isFixed || false,
          sourceRef: {
            ...i.sourceRef,
            audioFileId,
            segmentId: i.segmentId,
            startTime: segment?.startTime ?? i.sourceRef?.startTime ?? 0,
            endTime: segment?.endTime ?? i.sourceRef?.endTime ?? 0,
          },
        };
      });

      return {
        segments: [...state.segments, ...newSegments],
        issues: [...state.issues, ...newIssues],
      };
    });
  },

  getSegmentsForAudio: (audioId) => {
    return get().segments.filter(s => s.audioFileId === audioId);
  },

  getIssuesForAudio: (audioId) => {
    const segmentIds = get().segments
      .filter(s => s.audioFileId === audioId)
      .map(s => s.id);
    return get().issues.filter(i => segmentIds.includes(i.segmentId));
  },

  getVersionsForAudio: (audioId) => {
    return get().versions.filter(v => v.audioFileId === audioId);
  },
}));
