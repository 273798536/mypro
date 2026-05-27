import { InputData, Schedule } from '../types';
export declare function ensureDir(dirPath: string): void;
export declare function readJsonFile<T>(filePath: string): T | null;
export declare function writeJsonFile(filePath: string, data: unknown, pretty?: boolean): void;
export declare function generateUniqueFilename(baseName: string, extension?: string): string;
export declare function readInputData(inputDir: string): InputData | null;
export declare function writeSchedule(outputDir: string, schedule: Schedule, name?: string): string;
export declare function listSchedules(outputDir: string): string[];
export declare function readSchedule(outputDir: string, filename: string): Schedule | null;
