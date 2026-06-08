import { screenshotRepository } from '../db/index.js';
import type { Screenshot } from '../../shared/types.js';

export class ScreenshotService {
  findById(id: string): Screenshot | null {
    return screenshotRepository.findById(id);
  }

  markReview(
    id: string,
    reviewStatus: 'approved' | 'pending' | 'rejected',
    reviewNote?: string | null,
  ): boolean {
    return screenshotRepository.updateReviewStatus(id, reviewStatus, reviewNote);
  }
}

export const screenshotService = new ScreenshotService();
