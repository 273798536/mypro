export interface Course {
    id: string;
    name: string;
    credits: number;
    department: string;
    semester?: number;
    gradeLevel?: number;
    source: string;
}
export interface Prerequisite {
    courseId: string;
    prerequisiteId: string;
    type: 'required' | 'corequisite';
    source: string;
}
export interface SemesterPlan {
    studentGrade: number;
    semester: number;
    maxCredits: number;
    courses: string[];
    source: string;
}
export interface AlternativeCourse {
    originalId: string;
    alternativeId: string;
    reason: string;
    effectiveFrom: string;
    source: string;
}
export interface StudentGrade {
    id: string;
    name: string;
    gradeLevel: number;
    completedCourses: string[];
    source: string;
}
export type AnomalyType = 'cycle' | 'alternative_conflict' | 'semester_overload' | 'missing_prerequisite';
export interface Anomaly {
    id: string;
    type: AnomalyType;
    severity: 'error' | 'warning' | 'info';
    title: string;
    description: string;
    involvedCourses: string[];
    path?: string[];
    source: string;
    details: Record<string, unknown>;
}
export interface TopologyResult {
    order: string[];
    hasCycle: boolean;
    cycles: string[][];
    inDegree: Record<string, number>;
}
export interface CheckReport {
    id: string;
    createdAt: string;
    dataSource: string;
    summary: {
        totalCourses: number;
        totalPrerequisites: number;
        anomaliesCount: number;
        cyclesCount: number;
        conflictsCount: number;
        overloadsCount: number;
    };
    topology: TopologyResult;
    anomalies: Anomaly[];
    recommendations: string[];
    dataSnapshot: {
        courses: Course[];
        prerequisites: Prerequisite[];
        semesterPlans: SemesterPlan[];
        alternativeCourses: AlternativeCourse[];
        studentGrades: StudentGrade[];
    };
}
export interface HistoryRecord {
    id: string;
    timestamp: string;
    action: 'import' | 'modify' | 'check' | 'export';
    description: string;
    dataSource: string;
    userName?: string;
    changes?: {
        field: string;
        oldValue: unknown;
        newValue: unknown;
    }[];
}
export interface DataBundle {
    courses: Course[];
    prerequisites: Prerequisite[];
    semesterPlans: SemesterPlan[];
    alternativeCourses: AlternativeCourse[];
    studentGrades: StudentGrade[];
}
