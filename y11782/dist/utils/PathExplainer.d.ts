import { Course, Prerequisite, Anomaly, AlternativeCourse } from '../models/types';
export declare class PathExplainer {
    private courses;
    private prerequisites;
    private alternatives;
    private topologicalSort;
    constructor(courses: Course[], prerequisites: Prerequisite[], alternatives?: AlternativeCourse[]);
    explainPath(fromCourse: string, toCourse: string): string;
    explainCourse(courseId: string): string;
    private getAllPrerequisites;
    explainAllPaths(fromCourse: string, toCourse: string): string;
    explainAnomaly(anomaly: Anomaly): string;
    private explainCycleAnomaly;
    private explainAlternativeAnomaly;
    private explainSemesterAnomaly;
    private explainGenericAnomaly;
    private findAlternativeInPath;
    private getCourseName;
    private getSeverityText;
}
