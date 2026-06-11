import { create } from 'zustand';
import type { ReviewRound, ReviewComment, ReviewSection, CheckItem } from '@/types';
import { MOCK_REVIEW_ROUNDS, getCultureRecordBySample, getTimePointsBySample } from '@/data/mockReagents';

interface ReviewStore {
  reviewRounds: ReviewRound[];

  getRoundsBySample: (barcode: string) => ReviewRound[];
  getLatestRound: (barcode: string) => ReviewRound | undefined;

  createNewRound: (
    sampleBarcode: string,
    reviewer: string
  ) => ReviewRound;

  updateCultureCheck: (
    roundId: string,
    isComplete: boolean,
    issues: string[],
    remark: string
  ) => void;

  updateTimePointCheck: (
    roundId: string,
    isComplete: boolean,
    issues: string[],
    remark: string
  ) => void;

  addComment: (
    roundId: string,
    section: ReviewSection,
    content: string,
    suggestion: string
  ) => ReviewComment;

  completeRound: (roundId: string) => boolean;

  autoCheckCultureRecord: (sampleBarcode: string) => CheckItem;
  autoCheckTimePoints: (sampleBarcode: string) => CheckItem;
}

export const useReviewStore = create<ReviewStore>((set, get) => ({
  reviewRounds: [...MOCK_REVIEW_ROUNDS],

  getRoundsBySample: (barcode: string) => {
    return get().reviewRounds
      .filter(r => r.sampleBarcode === barcode)
      .sort((a, b) => b.roundNumber - a.roundNumber);
  },

  getLatestRound: (barcode: string) => {
    const rounds = get().getRoundsBySample(barcode);
    return rounds[0];
  },

  createNewRound: (sampleBarcode, reviewer) => {
    const state = get();
    const existingRounds = state.getRoundsBySample(sampleBarcode);
    const roundNumber = existingRounds.length + 1;

    const cultureCheck = state.autoCheckCultureRecord(sampleBarcode);
    const timePointCheck = state.autoCheckTimePoints(sampleBarcode);

    const newRound: ReviewRound = {
      roundId: `REV-${Date.now()}`,
      sampleBarcode,
      roundNumber,
      status: 'in_progress',
      reviewer,
      cultureRecordCheck: cultureCheck,
      timePointCheck: timePointCheck,
      comments: []
    };

    set(state => ({ reviewRounds: [...state.reviewRounds, newRound] }));
    return newRound;
  },

  updateCultureCheck: (roundId, isComplete, issues, remark) => {
    set(state => ({
      reviewRounds: state.reviewRounds.map(round =>
        round.roundId === roundId
          ? {
            ...round,
            cultureRecordCheck: { isComplete, issues, remark }
          }
          : round
      )
    }));
  },

  updateTimePointCheck: (roundId, isComplete, issues, remark) => {
    set(state => ({
      reviewRounds: state.reviewRounds.map(round =>
        round.roundId === roundId
          ? {
            ...round,
            timePointCheck: { isComplete, issues, remark }
          }
          : round
      )
    }));
  },

  addComment: (roundId, section, content, suggestion) => {
    const newComment: ReviewComment = {
      commentId: `COMM-${Date.now()}`,
      section,
      content,
      suggestion
    };

    set(state => ({
      reviewRounds: state.reviewRounds.map(round =>
        round.roundId === roundId
          ? { ...round, comments: [...round.comments, newComment] }
          : round
      )
    }));

    return newComment;
  },

  completeRound: (roundId) => {
    const state = get();
    const round = state.reviewRounds.find(r => r.roundId === roundId);

    if (!round) return false;
    if (round.comments.length === 0) return false;

    set(state => ({
      reviewRounds: state.reviewRounds.map(r =>
        r.roundId === roundId
          ? { ...r, status: 'completed', reviewedAt: new Date() }
          : r
      )
    }));

    return true;
  },

  autoCheckCultureRecord: (sampleBarcode) => {
    const cultureRecord = getCultureRecordBySample(sampleBarcode);
    const issues: string[] = [];

    if (!cultureRecord) {
      return {
        isComplete: false,
        issues: ['未找到培养记录'],
        remark: '请补录培养记录后再进行分析'
      };
    }

    if (!cultureRecord.operatorSign) {
      issues.push('缺少操作人签字');
    }

    if (cultureRecord.temperature < 36.5 || cultureRecord.temperature > 37.5) {
      issues.push(`培养温度异常: ${cultureRecord.temperature}°C (标准: 37±0.5°C)`);
    }

    if (cultureRecord.co2Concentration < 4.5 || cultureRecord.co2Concentration > 5.5) {
      issues.push(`CO₂浓度异常: ${cultureRecord.co2Concentration}% (标准: 5±0.5%)`);
    }

    if (cultureRecord.remark.includes('污染') || cultureRecord.remark.includes('异常')) {
      issues.push('培养记录备注中提到异常情况');
    }

    return {
      isComplete: issues.length === 0,
      issues,
      remark: issues.length === 0 ? '培养记录完整，操作规范' : `发现 ${issues.length} 个问题，请复核`
    };
  },

  autoCheckTimePoints: (sampleBarcode) => {
    const timePoints = getTimePointsBySample(sampleBarcode);
    const issues: string[] = [];

    const expectedPoints = [0, 6, 12, 24];
    const missingPoints = expectedPoints.filter(t =>
      !timePoints.find(p => p.hour === t && p.isPresent)
    );

    if (missingPoints.length > 0) {
      issues.push(`缺少时间点: ${missingPoints.map(t => `${t}h`).join(', ')}`);
    }

    const zeroHourPoint = timePoints.find(p => p.hour === 0);
    if (!zeroHourPoint || !zeroHourPoint.isPresent) {
      issues.push('缺少0h初始时间点，无法计算迁移率');
    }

    const remarksWithIssues = timePoints.filter(p =>
      p.isPresent && (p.remark.includes('模糊') || p.remark.includes('质量') || p.remark.includes('异常'))
    );

    remarksWithIssues.forEach(p => {
      issues.push(`${p.hour}h时间点: ${p.remark}`);
    });

    return {
      isComplete: issues.length === 0,
      issues,
      remark: issues.length === 0
        ? '所有时间点数据完整'
        : `发现 ${issues.length} 个问题，建议补充数据或人工复核`
    };
  }
}));
