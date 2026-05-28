import { Course, SemesterPlan, Prerequisite, StudentGrade, Anomaly } from '../models/types';
export type OverloadType = 'credit_overload' | 'prerequisite_order' | 'grade_level_mismatch' | 'semester_conflict' | 'course_count_overload';
export declare class SemesterOverloadDetector {
    private courses;
    private semesterPlans;
    private prerequisites;
    private studentGrades;
    private topologicalSort;
    constructor(courses: Course[], semesterPlans: SemesterPlan[], prerequisites: Prerequisite[], studentGrades: StudentGrade[]);
    detect(): Anomaly[];
    private findAllOverloads;
    private detectCreditOverloads;
    private detectCourseCountOverloads;
    private detectPrerequisiteOrderIssues;
    private detectGradeLevelMismatches;
    private detectSemesterConflicts;
    private getCourseName;
    private createAnomaly;
    explainOverload(anomaly: Anomaly): string;
}
