"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckService = void 0;
const uuid_1 = require("uuid");
const TopologicalSort_1 = require("./TopologicalSort");
const CycleDetector_1 = require("../detectors/CycleDetector");
const AlternativeConflictDetector_1 = require("../detectors/AlternativeConflictDetector");
const SemesterOverloadDetector_1 = require("../detectors/SemesterOverloadDetector");
const PathExplainer_1 = require("../utils/PathExplainer");
class CheckService {
    constructor(courses, prerequisites, semesterPlans, alternativeCourses, studentGrades, dataSource = 'manual') {
        this.courses = courses;
        this.prerequisites = prerequisites;
        this.semesterPlans = semesterPlans;
        this.alternativeCourses = alternativeCourses;
        this.studentGrades = studentGrades;
        this.dataSource = dataSource;
    }
    runCheck() {
        const topologyResult = this.runTopologicalSort();
        const anomalies = this.detectAllAnomalies();
        const recommendations = this.generateRecommendations(anomalies, topologyResult);
        return {
            id: (0, uuid_1.v4)(),
            createdAt: new Date().toISOString(),
            dataSource: this.dataSource,
            summary: {
                totalCourses: this.courses.length,
                totalPrerequisites: this.prerequisites.length,
                anomaliesCount: anomalies.length,
                cyclesCount: anomalies.filter(a => a.type === 'cycle').length,
                conflictsCount: anomalies.filter(a => a.type === 'alternative_conflict').length,
                overloadsCount: anomalies.filter(a => a.type === 'semester_overload').length,
            },
            topology: topologyResult,
            anomalies,
            recommendations,
            dataSnapshot: {
                courses: this.courses,
                prerequisites: this.prerequisites,
                semesterPlans: this.semesterPlans,
                alternativeCourses: this.alternativeCourses,
                studentGrades: this.studentGrades,
            },
        };
    }
    runTopologicalSort() {
        const topologicalSort = new TopologicalSort_1.TopologicalSort(this.courses, this.prerequisites);
        return topologicalSort.sort();
    }
    detectAllAnomalies() {
        const anomalies = [];
        const cycleDetector = new CycleDetector_1.CycleDetector(this.courses, this.prerequisites);
        anomalies.push(...cycleDetector.detect());
        const alternativeDetector = new AlternativeConflictDetector_1.AlternativeConflictDetector(this.courses, this.alternativeCourses, this.prerequisites);
        anomalies.push(...alternativeDetector.detect());
        const semesterDetector = new SemesterOverloadDetector_1.SemesterOverloadDetector(this.courses, this.semesterPlans, this.prerequisites, this.studentGrades);
        anomalies.push(...semesterDetector.detect());
        return anomalies.sort((a, b) => {
            const severityOrder = { error: 0, warning: 1, info: 2 };
            return severityOrder[a.severity] - severityOrder[b.severity];
        });
    }
    generateRecommendations(anomalies, topology) {
        const recommendations = [];
        if (topology.hasCycle) {
            recommendations.push(`检测到 ${topology.cycles.length} 个循环依赖，必须修复才能确定正确的修课顺序。`);
            recommendations.push('建议：检查循环路径中的先修关系，移除造成循环的边。');
        }
        else {
            recommendations.push(`拓扑排序完成，共 ${topology.order.length} 门课程可以排序。`);
        }
        const cycleAnomalies = anomalies.filter(a => a.type === 'cycle');
        if (cycleAnomalies.length > 0) {
            const involvedCourses = new Set();
            cycleAnomalies.forEach(a => a.involvedCourses.forEach(c => involvedCourses.add(c)));
            recommendations.push(`循环依赖涉及 ${involvedCourses.size} 门课程，需要优先处理。`);
        }
        const alternativeConflicts = anomalies.filter(a => a.type === 'alternative_conflict');
        if (alternativeConflicts.length > 0) {
            recommendations.push(`检测到 ${alternativeConflicts.length} 个替代课程冲突问题。`);
            const circularCount = alternativeConflicts.filter(a => a.details.conflictType === 'circular_alternative').length;
            if (circularCount > 0) {
                recommendations.push(`其中 ${circularCount} 个为循环替代，必须修复。`);
            }
        }
        const semesterOverloads = anomalies.filter(a => a.type === 'semester_overload');
        if (semesterOverloads.length > 0) {
            const creditOverloads = semesterOverloads.filter(a => a.details.overloadType === 'credit_overload').length;
            const orderIssues = semesterOverloads.filter(a => a.details.overloadType === 'prerequisite_order').length;
            if (creditOverloads > 0) {
                recommendations.push(`有 ${creditOverloads} 个学期存在学分超载，建议调整课程安排。`);
            }
            if (orderIssues > 0) {
                recommendations.push(`有 ${orderIssues} 个先修顺序错误，需要调整学期安排。`);
            }
        }
        const errors = anomalies.filter(a => a.severity === 'error').length;
        const warnings = anomalies.filter(a => a.severity === 'warning').length;
        if (errors > 0) {
            recommendations.push(`共有 ${errors} 个严重错误，必须在排课前修复。`);
        }
        if (warnings > 0) {
            recommendations.push(`共有 ${warnings} 个警告，建议检查处理。`);
        }
        if (anomalies.length === 0) {
            recommendations.push('恭喜！未检测到任何异常，课程先修关系设置正确。');
        }
        return recommendations;
    }
    explainAnomaly(anomalyId) {
        const report = this.runCheck();
        const anomaly = report.anomalies.find(a => a.id === anomalyId);
        if (!anomaly)
            return null;
        const explainer = new PathExplainer_1.PathExplainer(this.courses, this.prerequisites, this.alternativeCourses);
        return explainer.explainAnomaly(anomaly);
    }
    explainPath(fromCourse, toCourse) {
        const explainer = new PathExplainer_1.PathExplainer(this.courses, this.prerequisites, this.alternativeCourses);
        return explainer.explainPath(fromCourse, toCourse);
    }
    getTopologicalOrder() {
        const result = this.runTopologicalSort();
        return result.order;
    }
    getCycles() {
        const result = this.runTopologicalSort();
        return result.cycles;
    }
}
exports.CheckService = CheckService;
//# sourceMappingURL=CheckService.js.map