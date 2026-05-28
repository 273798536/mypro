import { Course, Prerequisite, SemesterPlan, AlternativeCourse, StudentGrade, CheckReport } from '../models/types';
export declare class CheckService {
    private courses;
    private prerequisites;
    private semesterPlans;
    private alternativeCourses;
    private studentGrades;
    private dataSource;
    constructor(courses: Course[], prerequisites: Prerequisite[], semesterPlans: SemesterPlan[], alternativeCourses: AlternativeCourse[], studentGrades: StudentGrade[], dataSource?: string);
    runCheck(): CheckReport;
    private runTopologicalSort;
    private detectAllAnomalies;
    private generateRecommendations;
    explainAnomaly(anomalyId: string): string | null;
    explainPath(fromCourse: string, toCourse: string): string;
    getTopologicalOrder(): string[];
    getCycles(): string[][];
}
