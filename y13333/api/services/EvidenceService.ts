import { mockPlaybackResults, mockSamples } from '../data/mockData.js';
import type { EvidenceItem, Sample, ApiResponse } from '@shared/types';

export interface EvidenceChainDetail {
  playbackId: string;
  sample?: Sample;
  evidenceChain: EvidenceItem[];
  hasLeak: boolean;
  leakDetails?: {
    missingSampleIds: string[];
    missingSamples: Sample[];
    originalStatement: string;
  };
}

export class EvidenceService {
  static getEvidenceChain(playbackId: string): ApiResponse<EvidenceChainDetail | null> {
    const playback = mockPlaybackResults.find(r => r.id === playbackId);
    if (!playback) {
      return {
        data: null,
        success: false,
        message: `回放结果 ${playbackId} 不存在`,
      };
    }

    const sample = mockSamples.find(s => s.id === playback.sampleId);
    const hasLeak = playback.missingReference;
    
    let leakDetails;
    if (hasLeak && playback.missingSampleIds.length > 0) {
      const missingSamples = playback.missingSampleIds
        .map(id => mockSamples.find(s => s.id === id))
        .filter((s): s is Sample => !!s);
      
      const leakEvidence = playback.evidenceChain.find(e => e.type === 'leak');
      leakDetails = {
        missingSampleIds: playback.missingSampleIds,
        missingSamples,
        originalStatement: leakEvidence?.originalStatement || '未找到原始引用说明',
      };
    }

    const evidenceChain = playback.evidenceChain.map(item => {
      if (item.sampleId && !item.originalStatement) {
        const linkedSample = mockSamples.find(s => s.id === item.sampleId);
        if (linkedSample) {
          return { ...item, originalStatement: linkedSample.originalStatement };
        }
      }
      return item;
    });

    return {
      data: {
        playbackId,
        sample,
        evidenceChain,
        hasLeak,
        leakDetails,
      },
      success: true,
    };
  }

  static getOriginalStatement(sampleId: string): ApiResponse<string | null> {
    const sample = mockSamples.find(s => s.id === sampleId);
    return {
      data: sample?.originalStatement || null,
      success: !!sample,
      message: sample ? undefined : `样本 ${sampleId} 不存在`,
    };
  }
}
