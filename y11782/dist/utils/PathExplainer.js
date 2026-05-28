"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PathExplainer = void 0;
const TopologicalSort_1 = require("../algorithms/TopologicalSort");
class PathExplainer {
    constructor(courses, prerequisites, alternatives = []) {
        this.courses = courses;
        this.prerequisites = prerequisites;
        this.alternatives = alternatives;
        this.topologicalSort = new TopologicalSort_1.TopologicalSort(courses, prerequisites);
    }
    explainPath(fromCourse, toCourse) {
        const path = this.topologicalSort.getPrerequisitePath(fromCourse, toCourse);
        if (!path) {
            return `无法找到从 ${this.getCourseName(fromCourse)} 到 ${this.getCourseName(toCourse)} 的先修路径`;
        }
        const courseNames = path.map(id => this.getCourseName(id));
        let explanation = `先修路径: ${courseNames.join(' → ')}\n`;
        explanation += `路径长度: ${path.length - 1} 步\n\n`;
        explanation += `详细步骤:\n`;
        for (let i = 0; i < path.length - 1; i++) {
            const from = path[i];
            const to = path[i + 1];
            const prereq = this.prerequisites.find(p => p.courseId === to && p.prerequisiteId === from);
            const type = prereq?.type === 'corequisite' ? '（共修）' : '（先修）';
            explanation += `  ${i + 1}. ${this.getCourseName(from)} ${type}→ ${this.getCourseName(to)}\n`;
            explanation += `     来源: ${prereq?.source || '未知'}\n`;
        }
        const alternatives = this.findAlternativeInPath(path);
        if (alternatives.length > 0) {
            explanation += `\n可替代课程:\n`;
            alternatives.forEach(alt => {
                explanation += `  - ${this.getCourseName(alt.originalId)} 可替代为 ${this.getCourseName(alt.alternativeId)}\n`;
                explanation += `    原因: ${alt.reason}\n`;
            });
        }
        return explanation;
    }
    explainCourse(courseId) {
        const course = this.courses.find(c => c.id === courseId);
        if (!course) {
            return `未找到课程 ${courseId}`;
        }
        let explanation = `课程名称: ${course.name}\n`;
        explanation += `课程代码: ${course.id}\n`;
        explanation += `学分: ${course.credits}\n`;
        explanation += `开课学院: ${course.department}\n`;
        if (course.semester) {
            explanation += `建议学期: 第${course.semester}学期\n`;
        }
        explanation += `数据来源: ${course.source}\n\n`;
        const directPrereqs = this.prerequisites.filter(p => p.courseId === courseId);
        if (directPrereqs.length > 0) {
            explanation += `直接先修课程 (${directPrereqs.length} 门):\n`;
            directPrereqs.forEach(p => {
                const type = p.type === 'corequisite' ? '共修' : '先修';
                explanation += `  - ${this.getCourseName(p.prerequisiteId)} [${type}] [来源: ${p.source}]\n`;
            });
            explanation += '\n';
        }
        const directDependents = this.prerequisites.filter(p => p.prerequisiteId === courseId);
        if (directDependents.length > 0) {
            explanation += `直接后续课程 (${directDependents.length} 门):\n`;
            directDependents.forEach(p => {
                explanation += `  - ${this.getCourseName(p.courseId)} [来源: ${p.source}]\n`;
            });
            explanation += '\n';
        }
        const alternatives = this.alternatives.filter(a => a.originalId === courseId || a.alternativeId === courseId);
        if (alternatives.length > 0) {
            explanation += `可替代课程 (${alternatives.length} 项):\n`;
            alternatives.forEach(a => {
                if (a.originalId === courseId) {
                    explanation += `  - ${this.getCourseName(a.alternativeId)} 可替代本课程\n`;
                }
                else {
                    explanation += `  - 本课程可替代 ${this.getCourseName(a.originalId)}\n`;
                }
                explanation += `    原因: ${a.reason}\n`;
                explanation += `    来源: ${a.source}\n`;
            });
            explanation += '\n';
        }
        const cycles = this.topologicalSort.findAllCycles();
        const involvedInCycle = cycles.filter(c => c.includes(courseId));
        if (involvedInCycle.length > 0) {
            explanation += `⚠️  涉及循环依赖 (${involvedInCycle.length} 个):\n`;
            involvedInCycle.forEach((cycle, i) => {
                const names = cycle.map(id => this.getCourseName(id));
                explanation += `  #${i + 1}: ${names.join(' → ')}\n`;
            });
            explanation += '\n';
        }
        const allPrereqs = this.getAllPrerequisites(courseId);
        if (allPrereqs.length > 0) {
            explanation += `完整先修链 (${allPrereqs.length} 层):\n`;
            allPrereqs.forEach((level, depth) => {
                const names = level.map(id => this.getCourseName(id));
                explanation += `  第${depth + 1}层: ${names.join(', ')}\n`;
            });
        }
        return explanation;
    }
    getAllPrerequisites(courseId) {
        const levels = [];
        const visited = new Set([courseId]);
        let currentLevel = [courseId];
        for (let depth = 0; depth < 20 && currentLevel.length > 0; depth++) {
            const nextLevel = [];
            currentLevel.forEach(id => {
                const prereqs = this.prerequisites.filter(p => p.courseId === id);
                prereqs.forEach(p => {
                    if (!visited.has(p.prerequisiteId)) {
                        visited.add(p.prerequisiteId);
                        nextLevel.push(p.prerequisiteId);
                    }
                });
            });
            if (nextLevel.length > 0) {
                levels.push(nextLevel);
            }
            currentLevel = nextLevel;
        }
        return levels;
    }
    explainAllPaths(fromCourse, toCourse) {
        const allPaths = this.topologicalSort.getAllPaths(fromCourse, toCourse);
        if (allPaths.length === 0) {
            return `无法找到从 ${this.getCourseName(fromCourse)} 到 ${this.getCourseName(toCourse)} 的任何路径`;
        }
        let explanation = `共找到 ${allPaths.length} 条路径:\n\n`;
        allPaths.forEach((path, index) => {
            const courseNames = path.map(id => this.getCourseName(id));
            explanation += `路径 #${index + 1} (${path.length - 1} 步):\n`;
            explanation += `  ${courseNames.join(' → ')}\n\n`;
        });
        return explanation;
    }
    explainAnomaly(anomaly) {
        switch (anomaly.type) {
            case 'cycle':
                return this.explainCycleAnomaly(anomaly);
            case 'alternative_conflict':
                return this.explainAlternativeAnomaly(anomaly);
            case 'semester_overload':
                return this.explainSemesterAnomaly(anomaly);
            default:
                return this.explainGenericAnomaly(anomaly);
        }
    }
    explainCycleAnomaly(anomaly) {
        let explanation = `【${anomaly.title}】\n`;
        explanation += `严重程度: ${this.getSeverityText(anomaly.severity)}\n`;
        explanation += `问题类型: 循环依赖\n\n`;
        explanation += `问题描述:\n  ${anomaly.description}\n\n`;
        if (anomaly.path) {
            explanation += `循环路径:\n`;
            const pathNames = anomaly.path.map(id => `  ${this.getCourseName(id)}`);
            explanation += pathNames.join('\n    ↓\n') + '\n\n';
            explanation += `涉及的先修关系:\n`;
            for (let i = 0; i < anomaly.path.length - 1; i++) {
                const from = anomaly.path[i];
                const to = anomaly.path[i + 1];
                const prereq = this.prerequisites.find(p => p.courseId === to && p.prerequisiteId === from);
                explanation += `  ${this.getCourseName(from)} → ${this.getCourseName(to)}`;
                explanation += ` [来源: ${prereq?.source || '未知'}]\n`;
            }
        }
        explanation += `\n建议操作:\n`;
        explanation += `  1. 检查上述先修关系，移除造成循环的边\n`;
        explanation += `  2. 确认课程设置是否正确，是否存在逻辑错误\n`;
        explanation += `  3. 修正后重新运行检查\n`;
        explanation += `\n数据来源: ${anomaly.source}`;
        return explanation;
    }
    explainAlternativeAnomaly(anomaly) {
        let explanation = `【${anomaly.title}】\n`;
        explanation += `严重程度: ${this.getSeverityText(anomaly.severity)}\n`;
        explanation += `问题类型: 替代课程冲突\n\n`;
        explanation += `问题描述:\n  ${anomaly.description}\n\n`;
        explanation += `涉及课程:\n`;
        anomaly.involvedCourses.forEach(id => {
            explanation += `  - ${this.getCourseName(id)}\n`;
        });
        if (anomaly.path && anomaly.path.length > 0) {
            explanation += `\n问题路径:\n  `;
            const pathNames = anomaly.path.map(id => this.getCourseName(id));
            explanation += pathNames.join(' → ');
            explanation += '\n';
        }
        if (anomaly.details.conflictType) {
            explanation += `\n冲突类型: ${anomaly.details.conflictType}\n`;
        }
        explanation += `\n建议操作:\n`;
        switch (anomaly.details.conflictType) {
            case 'circular_alternative':
                explanation += `  1. 检查替代关系设置，移除循环替代\n`;
                explanation += `  2. 确认哪门课程是原课程，哪门是替代课程\n`;
                break;
            case 'prerequisite_mismatch':
                explanation += `  1. 比较两门课程的先修要求，考虑是否需要统一\n`;
                explanation += `  2. 确认替代后学生是否能满足先修条件\n`;
                break;
            case 'semester_mismatch':
                explanation += `  1. 检查课程的学期设置是否正确\n`;
                explanation += `  2. 考虑调整学期安排或选择其他替代课程\n`;
                break;
            default:
                explanation += `  1. 审查替代课程设置\n`;
                explanation += `  2. 根据具体情况进行调整\n`;
        }
        explanation += `\n数据来源: ${anomaly.source}`;
        return explanation;
    }
    explainSemesterAnomaly(anomaly) {
        let explanation = `【${anomaly.title}】\n`;
        explanation += `严重程度: ${this.getSeverityText(anomaly.severity)}\n`;
        explanation += `问题类型: 学期超载/冲突\n\n`;
        explanation += `问题描述:\n  ${anomaly.description}\n\n`;
        if (anomaly.details.semester !== undefined) {
            explanation += `学期: ${anomaly.details.semester}\n`;
        }
        if (anomaly.details.studentGrade !== undefined) {
            explanation += `年级: ${anomaly.details.studentGrade}\n`;
        }
        if (anomaly.details.totalCredits !== undefined) {
            explanation += `\n学分明细:\n`;
            explanation += `  计划学分: ${anomaly.details.totalCredits}\n`;
            explanation += `  学分上限: ${anomaly.details.maxCredits}\n`;
            explanation += `  超出学分: ${anomaly.details.exceededBy}\n`;
            if (anomaly.details.courseCredits) {
                explanation += `\n各课程学分:\n`;
                anomaly.details.courseCredits.forEach(cc => {
                    explanation += `  - ${this.getCourseName(cc.courseId)}: ${cc.credits} 学分\n`;
                });
            }
        }
        if (anomaly.path && anomaly.details.overloadType === 'prerequisite_order') {
            explanation += `\n先修路径问题:\n  `;
            const pathNames = anomaly.path.map(id => this.getCourseName(id));
            explanation += pathNames.join(' → ');
            explanation += '\n';
            explanation += '  说明: 先修课程需要在后续课程之前的学期修读\n';
        }
        explanation += `\n涉及课程:\n`;
        anomaly.involvedCourses.forEach(id => {
            explanation += `  - ${this.getCourseName(id)}\n`;
        });
        explanation += `\n建议操作:\n`;
        switch (anomaly.details.overloadType) {
            case 'credit_overload':
                explanation += `  1. 将部分课程调整到其他学期\n`;
                explanation += `  2. 考虑是否有替代课程学分更少\n`;
                explanation += `  3. 如确有必要，可申请特殊学分上限\n`;
                break;
            case 'prerequisite_order':
                explanation += `  1. 调整课程安排，确保先修课在后续课程之前修读\n`;
                explanation += `  2. 检查是否存在学期设置错误\n`;
                break;
            case 'course_count_overload':
                explanation += `  1. 将部分课程调整到其他学期\n`;
                explanation += `  2. 优先保证核心课程的修读\n`;
                break;
            default:
                explanation += `  1. 审查学期安排\n`;
                explanation += `  2. 根据具体情况进行调整\n`;
        }
        explanation += `\n数据来源: ${anomaly.source}`;
        return explanation;
    }
    explainGenericAnomaly(anomaly) {
        let explanation = `【${anomaly.title}】\n`;
        explanation += `严重程度: ${this.getSeverityText(anomaly.severity)}\n`;
        explanation += `问题类型: ${anomaly.type}\n\n`;
        explanation += `问题描述:\n  ${anomaly.description}\n\n`;
        explanation += `涉及课程:\n`;
        anomaly.involvedCourses.forEach(id => {
            explanation += `  - ${this.getCourseName(id)}\n`;
        });
        explanation += `\n数据来源: ${anomaly.source}`;
        return explanation;
    }
    findAlternativeInPath(path) {
        const alternatives = [];
        const pathSet = new Set(path);
        this.alternatives.forEach(alt => {
            if (pathSet.has(alt.originalId) || pathSet.has(alt.alternativeId)) {
                alternatives.push(alt);
            }
        });
        return alternatives;
    }
    getCourseName(id) {
        const course = this.courses.find(c => c.id === id);
        return course ? `${course.name} (${id})` : id;
    }
    getSeverityText(severity) {
        const map = {
            error: '错误（必须修复）',
            warning: '警告（建议处理）',
            info: '提示（仅供参考）',
        };
        return map[severity];
    }
}
exports.PathExplainer = PathExplainer;
//# sourceMappingURL=PathExplainer.js.map