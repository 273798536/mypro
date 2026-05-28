import { Course, Prerequisite, TopologyResult } from '../models/types';
export declare class TopologicalSort {
    private graph;
    private inDegree;
    private courses;
    private prerequisites;
    constructor(courses: Course[], prerequisites: Prerequisite[]);
    private buildGraph;
    sort(): TopologyResult;
    findAllCycles(maxCycles?: number): string[][];
    private normalizeCycle;
    private cycleExists;
    explainCycle(cycle: string[]): string;
    getPrerequisitePath(fromCourse: string, toCourse: string): string[] | null;
    getAllPaths(fromCourse: string, toCourse: string, maxDepth?: number): string[][];
    getInvolvedInCycles(): Set<string>;
}
