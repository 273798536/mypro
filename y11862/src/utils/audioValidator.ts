import { SpectrumFrame, QualityIssue, VoiceLabel, VOICE_RANGES } from '../types';
import guidanceData from '../data/guidance.json';

const STANDARD_SAMPLE_RATES = [44100, 48000];
const SILENCE_THRESHOLD_DB = -50;
const SILENCE_MIN_FRAMES = 3;
const CLIPPING_THRESHOLD_DB = -0.5;

interface ValidationContext {
  frames: SpectrumFrame[];
  sampleRate: number;
  duration: number;
  voiceLabels?: VoiceLabel[];
  fileName: string;
}

export function validateAudioData(context: ValidationContext): QualityIssue[] {
  const issues: QualityIssue[] = [];

  issues.push(...checkMissingFields(context));
  issues.push(...checkSampleRate(context));
  issues.push(...checkSilentSegments(context));
  issues.push(...checkPeakClipping(context));

  return issues;
}

function checkMissingFields(context: ValidationContext): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { frames, voiceLabels, fileName } = context;

  if (!frames || frames.length === 0) {
    const guidance = guidanceData.missing_field.spectrum_frames;
    issues.push({
      type: 'missing_field',
      severity: 'error',
      message: `音频文件"${fileName}"未生成有效的频谱帧数据`,
      guidance: {
        action: guidance.action,
        responsible: guidance.responsible,
        fileReference: guidance.fileReference,
      },
    });
  }

  if (!voiceLabels || voiceLabels.length === 0) {
    const guidance = guidanceData.missing_field.voice_labels;
    issues.push({
      type: 'missing_field',
      severity: 'warning',
      message: '声部标签字段缺失，已使用默认配置',
      guidance: {
        action: guidance.action,
        responsible: guidance.responsible,
        fileReference: guidance.fileReference,
      },
    });
  }

  return issues;
}

function checkSampleRate(context: ValidationContext): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { sampleRate, fileName } = context;

  if (!STANDARD_SAMPLE_RATES.includes(sampleRate)) {
    const guidance = guidanceData.sample_rate_error;
    issues.push({
      type: 'sample_rate_error',
      severity: 'error',
      message: `采样率 ${sampleRate}Hz 不符合专业标准（推荐44.1kHz或48kHz）`,
      guidance: {
        action: guidance.action,
        responsible: guidance.responsible,
        fileReference: guidance.fileReference,
      },
    });
  }

  return issues;
}

function checkSilentSegments(context: ValidationContext): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { frames, duration, fileName } = context;

  if (!frames || frames.length === 0) return issues;

  let silentStart = -1;
  let silentFrameCount = 0;
  const totalEnergy = frames.reduce((sum, f) => sum + f.peakEnergy, 0);
  const avgEnergy = totalEnergy / frames.length;

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    const isSilent = frame.peakEnergy < SILENCE_THRESHOLD_DB;

    if (isSilent) {
      if (silentStart === -1) {
        silentStart = i;
      }
      silentFrameCount++;
    } else {
      if (silentFrameCount >= SILENCE_MIN_FRAMES) {
        const timeRange: [number, number] = [
          frames[silentStart].time,
          frames[i - 1].time,
        ];
        const segmentDuration = timeRange[1] - timeRange[0];
        const silenceRatio = segmentDuration / duration;

        if (avgEnergy > SILENCE_THRESHOLD_DB - 10 && silenceRatio < 0.3) {
          const guidance = guidanceData.silent_segment;
          issues.push({
            type: 'silent_segment',
            severity: 'warning',
            message: `检测到疑似静音段 [${formatTime(timeRange[0])} - ${formatTime(timeRange[1])}]，可能存在误判`,
            timeRange,
            guidance: {
              action: guidance.action,
              responsible: guidance.responsible,
              fileReference: guidance.fileReference,
            },
          });
        }
      }
      silentStart = -1;
      silentFrameCount = 0;
    }
  }

  return issues;
}

function checkPeakClipping(context: ValidationContext): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const { frames, fileName } = context;

  if (!frames || frames.length === 0) return issues;

  const clippingFrames: number[] = [];

  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    for (let j = 0; j < frame.frequencies.length; j++) {
      if (frame.frequencies[j] > CLIPPING_THRESHOLD_DB) {
        clippingFrames.push(i);
        break;
      }
    }
  }

  if (clippingFrames.length > 0) {
    const firstClipping = frames[clippingFrames[0]].time;
    const clippingRatio = clippingFrames.length / frames.length;

    const guidance = guidanceData.peak_clipping;
    issues.push({
      type: 'peak_clipping',
      severity: 'error',
      message: `检测到 ${clippingFrames.length} 帧峰值遮挡（削波风险），首次出现于 ${formatTime(firstClipping)}，占比 ${(clippingRatio * 100).toFixed(1)}%`,
      timeRange: [firstClipping, frames[clippingFrames[clippingFrames.length - 1]].time],
      guidance: {
        action: guidance.action,
        responsible: guidance.responsible,
        fileReference: guidance.fileReference,
      },
    });
  }

  return issues;
}

export function generateDefaultVoiceLabels(): VoiceLabel[] {
  return VOICE_RANGES.map(v => ({
    ...v,
    energy: -60,
  }));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function getIssueIcon(type: string): string {
  switch (type) {
    case 'missing_field':
      return 'file-x';
    case 'silent_segment':
      return 'volume-x';
    case 'sample_rate_error':
      return 'alert-triangle';
    case 'peak_clipping':
      return 'zap';
    default:
      return 'info';
  }
}

export function getIssueColor(severity: string): string {
  switch (severity) {
    case 'error':
      return 'text-red-400';
    case 'warning':
      return 'text-orange-400';
    case 'info':
      return 'text-blue-400';
    default:
      return 'text-gray-400';
  }
}
