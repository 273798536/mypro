"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CycleDetector = void 0;
const uuid_1 = require("uuid");
const TopologicalSort_1 = require("../algorithms/TopologicalSort");
class CycleDetector {
    constructor(courses, prerequisites) {
        this.courses = courses;
        this.prerequisites = prerequisites;
        this.topologicalSort = new TopologicalSort_1.TopologicalSort(courses, prerequisites);
    }
    detect() {
        const anomalies = [];
        const topologyResult = this.topologicalSort.sort();
        if (topologyResult.hasCycle) {
            topologyResult.cycles.forEach((cycle, index) => {
                anomalies.push(this.createCycleAnomaly(cycle, index));
            });
        }
        return anomalies;
    }
    createCycleAnomaly(cycle, cycleIndex) {
        const explanation = this.topologicalSort.explainCycle(cycle);
        const involvedPrereqs = this.getInvolvedPrerequisites(cycle);
        const sources = new Set(involvedPrereqs.map(p => p.source));
        return {
            id: (0, uuid_1.v4)(),
            type: 'cycle',
            severity: 'error',
            title: `循环依赖 #${cycleIndex + 1}`,
            description: `检测到课程先修关系循环，涉及 ${cycle.length - 1} 门课程：${explanation}`,
            involvedCourses: cycle,
            path: cycle,
            source: Array.from(sources).join(', '),
            details: {
                cycle,
                cycleLength: cycle.length - 1,
                involvedPrerequisites: involvedPrereqs,
                explanation,
                topologicalOrder: this.topologicalSort.sort().order,
            },
        };
    }
    getInvolvedPrerequisites(cycle) {
        const cycleSet = new Set(cycle);
        return this.prerequisites.filter(p => cycleSet.has(p.courseId) && cycleSet.has(p.prerequisiteId));
    }
    getCourseName(id) {
        const course = this.courses.find(c => c.id === id);
        return course ? `${course.name} (${id})` : id;
    }
    explainCycle(anomaly) {
        const involvedNames = anomaly.involvedCourses.map(id => this.getCourseName(id));
        let explanation = `【${anomaly.title}】\n`;
        explanation += `严重程度: ${anomaly.severity}\n`;
        explanation += `说明: ${anomaly.description}\n`;
        explanation += `涉及课程: ${involvedNames.slice(0, -1).join(', ')}\n`;
        if (anomaly.path) {
            const pathNames = anomaly.path.map(id => this.getCourseName(id));
            explanation += `循环路径: ${pathNames.join(' → ')}\n`;
        }
        if (anomaly.details.involvedPrerequisites) {
            const prereqs = anomaly.details.involvedPrerequisites;
            explanation += `问题先修关系:\n`;
            prereqs.forEach(p => {
                explanation += `  - ${this.getCourseName(p.prerequisiteId)} → ${this.getCourseName(p.courseId)} (${p.type})\n`;
            });
        }
        explanation += `数据来源: ${anomaly.source}`;
        return explanation;
    }
    getTopology() {
        return this.topologicalSort;
    }
}
exports.CycleDetector = CycleDetector;
//# sourceMappingURL=CycleDetector.js.map