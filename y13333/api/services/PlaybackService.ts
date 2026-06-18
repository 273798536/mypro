import { mockPlaybackResults, mockSamples } from '../data/mockData.js';
import type { PlaybackResult, PlaybackStatus, ApiResponse } from '@shared/types';

export class PlaybackService {
  static getAllPlaybackResults(status?: PlaybackStatus): ApiResponse<PlaybackResult[]> {
    let results = mockPlaybackResults;
    if (status) {
      results = results.filter(r => r.status === status);
    }
    return {
      data: results,
      success: true,
    };
  }

  static getPlaybackById(id: string): ApiResponse<PlaybackResult | null> {
    const result = mockPlaybackResults.find(r => r.id === id);
    if (result && !result.sample) {
      result.sample = mockSamples.find(s => s.id === result.sampleId);
    }
    return {
      data: result || null,
      success: !!result,
      message: result ? undefined : `回放结果 ${id} 不存在`,
    };
  }

  static runPlayback(): ApiResponse<PlaybackResult[]> {
    return {
      data: mockPlaybackResults,
      success: true,
      message: '误判回放执行完成，共生成8条结果',
    };
  }

  static updateStatus(id: string, status: PlaybackStatus, operator: string, remark?: string): ApiResponse<PlaybackResult | null> {
    const result = mockPlaybackResults.find(r => r.id === id);
    if (!result) {
      return {
        data: null,
        success: false,
        message: `回放结果 ${id} 不存在`,
      };
    }
    
    const oldStatus = result.status;
    result.status = status;
    result.operator = operator;
    if (remark) {
      result.remark = remark;
    }
    
    return {
      data: result,
      success: true,
      message: `状态已从 ${oldStatus} 更新为 ${status}`,
    };
  }

  static getResultsByStatus(status: PlaybackStatus): ApiResponse<PlaybackResult[]> {
    const results = mockPlaybackResults.filter(r => r.status === status);
    return {
      data: results,
      success: true,
    };
  }
}
