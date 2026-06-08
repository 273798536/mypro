import { exerciseService } from './ExerciseService.js';
import type { Exercise, ImportResult } from '../../shared/types.js';

function makeTestData(): Array<Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>> {
  return [
    {
      name: 'Test Exercise A',
      sourceRowNumber: 101,
      sourceImageName: 'img_001.png',
      sourceRemark: 'Duplicate test',
      status: 'draft',
      timelineStartMs: 0,
      timelineEndMs: 5000,
      conclusion: 'Test conclusion',
      keyframes: [],
      coordinates: [],
      screenshots: [],
    },
    {
      name: 'Test Exercise B',
      sourceRowNumber: 102,
      sourceImageName: 'img_002.png',
      sourceRemark: 'Duplicate test',
      status: 'draft',
      timelineStartMs: 0,
      timelineEndMs: 10000,
      conclusion: 'Another test',
      keyframes: [],
      coordinates: [],
      screenshots: [],
    },
  ];
}

export interface DuplicateTestReport {
  firstImport: ImportResult;
  secondImport: ImportResult;
  duplicateDetectionWorks: boolean;
  message: string;
}

export class TestService {
  runDuplicateImportTest(): DuplicateTestReport {
    const testData = makeTestData();

    const firstImport = exerciseService.bulkImport(testData);
    const secondImport = exerciseService.bulkImport(testData);

    const expectedDuplicates = testData.length;
    const duplicateDetectionWorks =
      secondImport.skipped === expectedDuplicates &&
      secondImport.inserted === 0 &&
      secondImport.duplicates.length === expectedDuplicates;

    let message: string;
    if (duplicateDetectionWorks) {
      message = `Success: Duplicate detection working correctly. First import inserted ${firstImport.inserted}, second import skipped ${secondImport.skipped} duplicates.`;
    } else {
      message = `Fail: Expected ${expectedDuplicates} duplicates to be skipped on second import. Got inserted=${secondImport.inserted}, skipped=${secondImport.skipped}, duplicates=${secondImport.duplicates.length}`;
    }

    return {
      firstImport,
      secondImport,
      duplicateDetectionWorks,
      message,
    };
  }
}

export const testService = new TestService();
