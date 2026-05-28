import { Course, Prerequisite, Anomaly } from '../models/types';
import { TopologicalSort } from '../algorithms/TopologicalSort';
export declare class CycleDetector {
    private courses;
    private prerequisites;
    private topologicalSort;
    constructor(courses: Course[], prerequisites: Prerequisite[]);
    detect(): Anomaly[];
    private createCycleAnomaly;
    private getInvolvedPrerequisites;
    private getCourseName;
    explainCycle(anomaly: Anomaly): string;
    getTopology(): TopologicalSort;
}
