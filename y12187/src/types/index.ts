export type QualityIssueType = 'seat_missing' | 'segment_missing' | 'seat_invalid' | 'duplicate';

export type QualityStatus = 'complete' | 'incomplete' | 'invalid';

export type ChangeSource = 'user_edit' | 'auto_correct' | 'batch_import';

export type SeatPosition = 'front' | 'middle' | 'back' | 'left' | 'right';

export type SegmentStatus = 'pending' | 'confirmed';

export interface QualityIssue {
  type: QualityIssueType;
  severity: 'warning' | 'error';
  message: string;
  suggestion: string;
}

export interface ChangeLog {
  id: string;
  feedbackId: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  source: ChangeSource;
  operator: string;
  timestamp: string;
}

export interface SeatArea {
  id: string;
  name: string;
  code: string;
  rowCount: number;
  seatPerRow: number;
  position: SeatPosition;
}

export interface TrackSegment {
  id: string;
  concertId: string;
  name: string;
  startTime: number;
  endTime: number;
  status: SegmentStatus;
}

export interface Feedback {
  id: string;
  concertId: string;
  seatAreaId?: string;
  segmentId?: string;
  content: string;
  note?: string;
  qualityStatus: QualityStatus;
  qualityIssues: QualityIssue[];
  createdAt: string;
  updatedAt: string;
}

export interface AreaFeedbackStats {
  areaId: string;
  areaName: string;
  feedbackCount: number;
  position: SeatPosition;
}

export interface SegmentFeedbackStats {
  segmentId: string;
  segmentName: string;
  feedbackCount: number;
}
