import { AudioFile, Segment, Issue, Version, Report, ManualChangeLog } from '../types';

const generateWaveformData = (duration: number): number[] => {
  const data: number[] = [];
  const samples = duration * 10;
  for (let i = 0; i < samples; i++) {
    const t = i / samples;
    let amplitude = 0.3 + Math.random() * 0.4;
    
    if (t > 0.2 && t < 0.35) amplitude = 0.8 + Math.random() * 0.2;
    if (t > 0.5 && t < 0.52) amplitude = 0.02 + Math.random() * 0.03;
    if (t > 0.7 && t < 0.85) amplitude = 0.75 + Math.random() * 0.25;
    
    data.push(amplitude * (Math.random() * 0.5 + 0.5));
  }
  return data;
};

const generateLoudnessData = (duration: number) => {
  const data: { time: number; value: number }[] = [];
  for (let i = 0; i <= duration; i++) {
    const t = i / duration;
    let loudness = -23 + Math.random() * 4;
    
    if (t > 0.2 && t < 0.35) loudness = -12 + Math.random() * 3;
    if (t > 0.5 && t < 0.52) loudness = -60 + Math.random() * 5;
    if (t > 0.7 && t < 0.85) loudness = -14 + Math.random() * 3;
    
    data.push({ time: i, value: loudness });
  }
  return data;
};

export const mockAudioFiles: AudioFile[] = [
  {
    id: 'audio-001',
    name: '科技前沿播客_第42期.mp3',
    duration: 1800,
    sampleRate: 44100,
    waveformData: generateWaveformData(1800),
    createdAt: new Date('2024-01-15T10:30:00'),
    loudnessData: generateLoudnessData(1800),
  },
  {
    id: 'audio-002',
    name: '商业观察_2024年1月特辑.wav',
    duration: 2400,
    sampleRate: 48000,
    waveformData: generateWaveformData(2400),
    createdAt: new Date('2024-01-14T14:20:00'),
    loudnessData: generateLoudnessData(2400),
  },
];

export const mockSegments: Segment[] = [
  {
    id: 'seg-001',
    audioFileId: 'audio-001',
    startTime: 0,
    endTime: 360,
    type: 'speech',
    loudness: -22.5,
    status: 'confirmed',
    modifiedBy: 'auto',
  },
  {
    id: 'seg-002',
    audioFileId: 'audio-001',
    startTime: 360,
    endTime: 630,
    type: 'ad',
    loudness: -12.3,
    status: 'detected',
    modifiedBy: 'auto',
  },
  {
    id: 'seg-003',
    audioFileId: 'audio-001',
    startTime: 630,
    endTime: 900,
    type: 'speech',
    loudness: -21.8,
    status: 'confirmed',
    modifiedBy: 'auto',
  },
  {
    id: 'seg-004',
    audioFileId: 'audio-001',
    startTime: 900,
    endTime: 936,
    type: 'silence',
    loudness: -58.2,
    status: 'detected',
    modifiedBy: 'auto',
  },
  {
    id: 'seg-005',
    audioFileId: 'audio-001',
    startTime: 936,
    endTime: 1260,
    type: 'speech',
    loudness: -23.1,
    status: 'confirmed',
    modifiedBy: 'auto',
  },
  {
    id: 'seg-006',
    audioFileId: 'audio-001',
    startTime: 1260,
    endTime: 1530,
    type: 'ad',
    loudness: -13.8,
    status: 'modified',
    modifiedBy: 'manual',
    modifiedAt: new Date('2024-01-15T11:45:00'),
    originalType: 'music',
  },
  {
    id: 'seg-007',
    audioFileId: 'audio-001',
    startTime: 1530,
    endTime: 1800,
    type: 'speech',
    loudness: -22.9,
    status: 'confirmed',
    modifiedBy: 'auto',
  },
];

export const mockIssues: Issue[] = [
  {
    id: 'issue-001',
    segmentId: 'seg-002',
    type: 'loudness',
    severity: 'high',
    description: '广告片段响度过高，超过行业标准-16LUFS阈值约3.7LUFS',
    isFixed: false,
    sourceRef: {
      audioFileId: 'audio-001',
      segmentId: 'seg-002',
      startTime: 360,
      endTime: 630,
    },
  },
  {
    id: 'issue-002',
    segmentId: 'seg-004',
    type: 'silence',
    severity: 'medium',
    description: '检测到异常静音段，持续36秒，可能为误判或剪辑错误',
    isFixed: false,
    sourceRef: {
      audioFileId: 'audio-001',
      segmentId: 'seg-004',
      startTime: 900,
      endTime: 936,
    },
  },
  {
    id: 'issue-003',
    segmentId: 'seg-006',
    type: 'loudness',
    severity: 'high',
    description: '补录广告片段响度过高，响度值-13.8LUFS超出合规范围',
    isFixed: false,
    affectedByManualChange: true,
    affectedByAdAddition: true,
    sourceRef: {
      audioFileId: 'audio-001',
      segmentId: 'seg-006',
      startTime: 1260,
      endTime: 1530,
    },
  },
  {
    id: 'issue-004',
    segmentId: 'seg-001',
    type: 'sampleRate',
    severity: 'low',
    description: '音频采样率44.1kHz与目标平台推荐的48kHz存在差异',
    isFixed: false,
    sourceRef: {
      audioFileId: 'audio-001',
      segmentId: 'seg-001',
      startTime: 0,
      endTime: 360,
    },
  },
];

export const mockVersions: Version[] = [
  {
    id: 'ver-001',
    audioFileId: 'audio-001',
    versionNumber: 1,
    segments: mockSegments.slice(0, 5),
    issues: mockIssues.slice(0, 2),
    createdAt: new Date('2024-01-15T11:00:00'),
    note: '初始自动检测版本',
  },
  {
    id: 'ver-002',
    audioFileId: 'audio-001',
    versionNumber: 2,
    segments: mockSegments,
    issues: mockIssues,
    createdAt: new Date('2024-01-15T11:45:00'),
    note: '人工修正版本，补录广告标记',
  },
];

export const mockChangeLogs: ManualChangeLog[] = [
  {
    id: 'log-001',
    segmentId: 'seg-006',
    changeType: 'type_change',
    oldValue: 'music',
    newValue: 'ad',
    timestamp: new Date('2024-01-15T11:45:00'),
    affectedIssues: ['issue-003'],
  },
];

export const mockReports: Report[] = [
  {
    id: 'report-001',
    audioFileId: 'audio-001',
    versionId: 'ver-002',
    issues: mockIssues,
    exportedAt: new Date('2024-01-15T12:00:00'),
    exportFormat: 'html',
    summary: {
      totalIssues: 4,
      highSeverity: 2,
      mediumSeverity: 1,
      lowSeverity: 1,
      fixedIssues: 0,
    },
  },
];
