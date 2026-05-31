import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Feedback, ChangeLog, SeatArea, TrackSegment, QualityIssue, QualityStatus, AreaFeedbackStats, SegmentFeedbackStats } from '../types';
import { mockFeedbacks, mockChangeLogs, mockSeatAreas, mockTrackSegments, mockConcertId } from '../data/mockData';

interface FeedbackState {
  feedbacks: Feedback[];
  changeLogs: ChangeLog[];
  seatAreas: SeatArea[];
  trackSegments: TrackSegment[];
  currentConcertId: string;
  
  addFeedback: (feedback: Omit<Feedback, 'id' | 'createdAt' | 'updatedAt' | 'qualityStatus' | 'qualityIssues'>) => void;
  updateFeedback: (id: string, updates: Partial<Feedback>, operator?: string) => void;
  deleteFeedback: (id: string) => void;
  getFeedbackById: (id: string) => Feedback | undefined;
  getChangeLogsByFeedbackId: (feedbackId: string) => ChangeLog[];
  
  getAreaFeedbackStats: () => AreaFeedbackStats[];
  getSegmentFeedbackStats: () => SegmentFeedbackStats[];
  
  validateFeedbackData: (feedback: Partial<Feedback>) => QualityIssue[];
  calculateQualityStatus: (issues: QualityIssue[]) => QualityStatus;
  
  addSegment: (segment: Omit<TrackSegment, 'id'>) => void;
  updateSegment: (id: string, updates: Partial<TrackSegment>) => void;
}

const generateId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      feedbacks: mockFeedbacks,
      changeLogs: mockChangeLogs,
      seatAreas: mockSeatAreas,
      trackSegments: mockTrackSegments,
      currentConcertId: mockConcertId,

      validateFeedbackData: (feedback) => {
        const issues: QualityIssue[] = [];
        const { seatAreas, feedbacks } = get();

        if (!feedback.seatAreaId) {
          issues.push({
            type: 'seat_missing',
            severity: 'warning',
            message: '未填写座位区域',
            suggestion: '请联系观众确认座位区域，以便精准定位问题',
          });
        } else if (!seatAreas.some(area => area.id === feedback.seatAreaId)) {
          const validAreas = seatAreas.map(a => a.name).join('、');
          issues.push({
            type: 'seat_invalid',
            severity: 'error',
            message: `座位区域"${feedback.seatAreaId}"不存在`,
            suggestion: `请选择正确的座位区域：${validAreas}`,
          });
        }

        if (!feedback.segmentId) {
          issues.push({
            type: 'segment_missing',
            severity: 'warning',
            message: '未关联曲目段落',
            suggestion: feedback.note 
              ? `请根据备注"${feedback.note}"关联到对应段落`
              : '请关联到对应的曲目段落',
          });
        }

        if (feedback.content) {
          const similarFeedbacks = feedbacks.filter(f => {
            if (!feedback.id && f.id) return false;
            if (feedback.id && f.id === feedback.id) return false;
            const similarity = calculateSimilarity(feedback.content || '', f.content);
            return similarity > 0.7;
          });

          if (similarFeedbacks.length > 0) {
            issues.push({
              type: 'duplicate',
              severity: 'warning',
              message: '疑似重复反馈',
              suggestion: `与${similarFeedbacks[0].id}内容相似，建议核实是否为同一观众反馈`,
            });
          }
        }

        return issues;
      },

      calculateQualityStatus: (issues) => {
        if (issues.some(i => i.severity === 'error')) return 'invalid';
        if (issues.some(i => i.severity === 'warning')) return 'incomplete';
        return 'complete';
      },

      addFeedback: (feedbackData) => {
        const newId = generateId();
        const now = new Date().toISOString();
        
        const qualityIssues = get().validateFeedbackData({ ...feedbackData, id: newId });
        const qualityStatus = get().calculateQualityStatus(qualityIssues);

        const newFeedback: Feedback = {
          ...feedbackData,
          id: newId,
          qualityStatus,
          qualityIssues,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          feedbacks: [...state.feedbacks, newFeedback],
        }));
      },

      updateFeedback: (id, updates, operator = '运营人员') => {
        const { feedbacks, validateFeedbackData, calculateQualityStatus } = get();
        const feedback = feedbacks.find(f => f.id === id);
        if (!feedback) return;

        const now = new Date().toISOString();
        const newChangeLogs: ChangeLog[] = [];

        Object.entries(updates).forEach(([field, value]) => {
          const oldValue = feedback[field as keyof Feedback];
          const oldStr = oldValue !== undefined ? String(oldValue) : null;
          const newStr = value !== undefined ? String(value) : null;
          
          if (oldStr !== newStr) {
            newChangeLogs.push({
              id: generateId(),
              feedbackId: id,
              fieldName: field,
              oldValue: oldStr,
              newValue: newStr,
              source: 'user_edit',
              operator,
              timestamp: now,
            });
          }
        });

        const updatedFeedback = { ...feedback, ...updates };
        const qualityIssues = validateFeedbackData(updatedFeedback);
        const qualityStatus = calculateQualityStatus(qualityIssues);

        set((state) => ({
          feedbacks: state.feedbacks.map((f) =>
            f.id === id
              ? { ...f, ...updates, qualityIssues, qualityStatus, updatedAt: now }
              : f
          ),
          changeLogs: [...state.changeLogs, ...newChangeLogs],
        }));
      },

      deleteFeedback: (id) => {
        set((state) => ({
          feedbacks: state.feedbacks.filter((f) => f.id !== id),
          changeLogs: state.changeLogs.filter((cl) => cl.feedbackId !== id),
        }));
      },

      getFeedbackById: (id) => {
        return get().feedbacks.find((f) => f.id === id);
      },

      getChangeLogsByFeedbackId: (feedbackId) => {
        return get().changeLogs
          .filter((cl) => cl.feedbackId === feedbackId)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      },

      getAreaFeedbackStats: () => {
        const { feedbacks, seatAreas } = get();
        return seatAreas.map((area) => ({
          areaId: area.id,
          areaName: area.name,
          feedbackCount: feedbacks.filter((f) => f.seatAreaId === area.id).length,
          position: area.position,
        }));
      },

      getSegmentFeedbackStats: () => {
        const { feedbacks, trackSegments } = get();
        return trackSegments.map((segment) => ({
          segmentId: segment.id,
          segmentName: segment.name,
          feedbackCount: feedbacks.filter((f) => f.segmentId === segment.id).length,
        }));
      },

      addSegment: (segmentData) => {
        const newSegment: TrackSegment = {
          ...segmentData,
          id: generateId(),
        };
        set((state) => ({
          trackSegments: [...state.trackSegments, newSegment],
        }));
      },

      updateSegment: (id, updates) => {
        set((state) => ({
          trackSegments: state.trackSegments.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },
    }),
    {
      name: 'feedback-storage',
    }
  )
);

function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s/g, '');
  const s2 = str2.toLowerCase().replace(/\s/g, '');
  
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  const longerLength = longer.length;
  
  if (longerLength === 0) return 1;
  
  const edits = levenshteinDistance(longer, shorter);
  return (longerLength - edits) / longerLength;
}

function levenshteinDistance(s1: string, s2: string): number {
  const costs: number[] = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}
