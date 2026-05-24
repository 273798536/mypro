import { AttendanceDatabase } from './database';
import { CheckResult } from './types';
export declare class CheckService {
    private db;
    constructor(db: AttendanceDatabase);
    runChecks(operator: string): Promise<CheckResult>;
}
