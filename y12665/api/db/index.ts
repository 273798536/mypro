import db from './database.js';
import { ExerciseRepository } from './repositories/ExerciseRepository.js';
import { VersionRepository } from './repositories/VersionRepository.js';
import { ScreenshotRepository } from './repositories/ScreenshotRepository.js';
import { ExportRepository } from './repositories/ExportRepository.js';

export const exerciseRepository = new ExerciseRepository(db);
export const versionRepository = new VersionRepository(db);
export const screenshotRepository = new ScreenshotRepository(db);
export const exportRepository = new ExportRepository(db);

export { db };
export { ExerciseRepository } from './repositories/ExerciseRepository.js';
export { VersionRepository } from './repositories/VersionRepository.js';
export { ScreenshotRepository } from './repositories/ScreenshotRepository.js';
export { ExportRepository } from './repositories/ExportRepository.js';
