import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import { TrackStatus, ReviewType, ReviewDecision, TimecodeCheckStatus } from '@/types';

dayjs.extend(duration);

export const formatTimecode = (seconds: number): string => {
  if (!seconds || seconds < 0) return '00:00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';
  if (seconds >= 3600) {
    return formatTimecode(seconds);
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const parseTimecode = (timecode: string): number => {
  if (!timecode) return 0;
  const parts = timecode.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

export const getStatusColor = (status: TrackStatus): string => {
  const colorMap: Record<TrackStatus, string> = {
    pending: 'default',
    matching: 'processing',
    matched: 'processing',
    mismatch: 'warning',
    reviewing: 'processing',
    suspended: 'warning',
    approved: 'success',
    rejected: 'error',
  };
  return colorMap[status] || 'default';
};

export const getStatusText = (status: TrackStatus): string => {
  const textMap: Record<TrackStatus, string> = {
    pending: '待处理',
    matching: '匹配中',
    matched: '已匹配',
    mismatch: '不匹配',
    reviewing: '复核中',
    suspended: '已挂起',
    approved: '已通过',
    rejected: '已拒绝',
  };
  return textMap[status] || status;
};

export const getReviewTypeText = (type: ReviewType): string => {
  const textMap: Record<ReviewType, string> = {
    timecode: '时间码复核',
    quality: '质量复核',
    note: '备注复核',
    final: '最终复核',
  };
  return textMap[type] || type;
};

export const getReviewDecisionText = (decision: ReviewDecision): string => {
  const textMap: Record<ReviewDecision, string> = {
    approve: '通过',
    reject: '拒绝',
    suspend: '挂起',
    pass: '跳过',
  };
  return textMap[decision] || decision;
};

export const getReviewDecisionColor = (decision: ReviewDecision): string => {
  const colorMap: Record<ReviewDecision, string> = {
    approve: 'success',
    reject: 'error',
    suspend: 'warning',
    pass: 'default',
  };
  return colorMap[decision] || 'default';
};

export const getTimecodeStatusColor = (status: TimecodeCheckStatus): string => {
  const colorMap: Record<TimecodeCheckStatus, string> = {
    pass: 'success',
    warning: 'warning',
    suspend: 'error',
  };
  return colorMap[status] || 'default';
};

export const getTimecodeStatusText = (status: TimecodeCheckStatus): string => {
  const textMap: Record<TimecodeCheckStatus, string> = {
    pass: '通过',
    warning: '警告',
    suspend: '挂起',
  };
  return textMap[status] || status;
};

export const formatDate = (date: string | Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

export const formatDateShort = (date: string | Date): string => {
  return formatDate(date, 'YYYY-MM-DD');
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const calculateTimecodeDeviation = (expected: number, actual: number): number => {
  return Math.abs(expected - actual);
};

export const checkTimecodeDeviation = (
  expected: number,
  actual: number,
  warningThreshold: number = 5,
  suspendThreshold: number = 10
): TimecodeCheckStatus => {
  const deviation = calculateTimecodeDeviation(expected, actual);
  if (deviation >= suspendThreshold) return 'suspend';
  if (deviation >= warningThreshold) return 'warning';
  return 'pass';
};

export const generateBatchId = (): string => {
  return `BATCH-${dayjs().format('YYYYMMDD-HHmmss')}`;
};

export const truncateText = (text: string, maxLength: number = 50): string => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getDurationFromFileName = (fileName: string): number | null => {
  const match = fileName.match(/(\d{1,2})[:_](\d{2})/);
  if (match) {
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    return minutes * 60 + seconds;
  }
  return null;
};

export const getTrackNoFromFileName = (fileName: string): number | null => {
  const match = fileName.match(/(?:^|[_ -])(\d{1,2})(?:[_ -]|\.)/);
  if (match) {
    return parseInt(match[1], 10);
  }
  return null;
};

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
};
