import type { Issue } from '../../types';

export const mockIssues: Issue[] = [
  {
    id: 'issue-misaligned-3',
    type: 'misalignment',
    severity: 'high',
    description: '片段4中指法标注时间与音频特征峰值偏差超过200ms，可能为指法错位',
    assignee: '张研究员（指法标注组）',
    status: 'pending',
    createdAt: '2026-05-28T10:30:00Z',
    relatedSegmentIds: ['seg-4']
  },
  {
    id: 'issue-overlap-2',
    type: 'overlap',
    severity: 'medium',
    description: '片段3与片段4存在约2秒的时间重叠，需核对原始录音',
    assignee: '李助理（录音整理）',
    status: 'pending',
    createdAt: '2026-05-28T11:15:00Z',
    relatedSegmentIds: ['seg-3', 'seg-4']
  },
  {
    id: 'issue-missing_band-5',
    type: 'missing_band',
    severity: 'high',
    description: '片段6在1kHz-2.5kHz频段能量明显低于阈值，疑似录音设备故障',
    assignee: '王工程师（音频技术）',
    status: 'pending',
    createdAt: '2026-05-28T14:20:00Z',
    relatedSegmentIds: ['seg-6']
  }
];
