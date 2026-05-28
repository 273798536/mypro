import { Course, AlternativeCourse, Prerequisite, Anomaly } from '../models/types';
export type ConflictType = 'circular_alternative' | 'prerequisite_mismatch' | 'alternative_chain' | 'semester_mismatch' | 'duplicate_alternative';
export declare class AlternativeConflictDetector {
    private courses;
    private alternatives;
    private prerequisites;
    private topologicalSort;
    constructor(courses: Course[], alternatives: AlternativeCourse[], prerequisites: Prerequisite[]);
    detect(): Anomaly[];
    private findAllConflicts;
    private detectCircularAlternatives;
    private findAlternativeCycle;
    private detectDuplicateAlternatives;
    private detectAlternativeChains;
    private buildAlternativeChain;
    private detectPrerequisiteMismatch;
    private detectSemesterMismatch;
    private getPrerequisitesFor;
    private getCourseName;
    private createAnomaly;
    explainConflict(anomaly: Anomaly): string;
}
