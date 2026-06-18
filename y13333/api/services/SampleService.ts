import { mockSamples } from '../data/mockData.js';
import type { Sample, ApiResponse } from '@shared/types';

export class SampleService {
  static getAllSamples(includeWithdrawn = true): ApiResponse<Sample[]> {
    let samples = mockSamples;
    if (!includeWithdrawn) {
      samples = mockSamples.filter(s => !s.isWithdrawn);
    }
    return {
      data: samples,
      success: true,
    };
  }

  static getSampleById(id: string): ApiResponse<Sample | null> {
    const sample = mockSamples.find(s => s.id === id);
    return {
      data: sample || null,
      success: !!sample,
      message: sample ? undefined : `样本 ${id} 不存在`,
    };
  }

  static getWithdrawnSamples(): ApiResponse<Sample[]> {
    const samples = mockSamples.filter(s => s.isWithdrawn);
    return {
      data: samples,
      success: true,
    };
  }
}
