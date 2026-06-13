import type { Point, ViewPreset, OverlapPair, Cabinet } from '../../shared/types';
import { SummaryService } from './SummaryService';
import { OverlapDetectService } from './OverlapDetectService';

export class ExportService {
  static buildFullJson(points: Point[], views: ViewPreset[], cabinets: Cabinet[]) {
    return {
      exportedAt: new Date().toISOString(),
      dataVersion: '1.0',
      cabinets,
      points,
      views,
      overlaps: OverlapDetectService.detectPairs(points),
    };
  }

  static buildPdfData(
    points: Point[],
    views: ViewPreset[],
    cabinets: Cabinet[],
    overlaps: OverlapPair[],
  ) {
    const summary = SummaryService.buildUnified(points, overlaps, cabinets);
    return {
      summary,
      points,
      views,
      cabinets,
      overlaps,
      generatedAt: new Date().toISOString(),
    };
  }
}
