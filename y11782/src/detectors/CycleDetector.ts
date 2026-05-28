import { v4 as uuidv4 } from 'uuid';
import { Course, Prerequisite, Anomaly } from '../models/types';
import { TopologicalSort } from '../algorithms/TopologicalSort';

export class CycleDetector {
  private courses: Course[];
  private prerequisites: Prerequisite[];
  private topologicalSort: TopologicalSort;

  constructor(courses: Course[], prerequisites: Prerequisite[]) {
    this.courses = courses;
    this.prerequisites = prerequisites;
    this.topologicalSort = new TopologicalSort(courses, prerequisites);
  }

  detect(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const topologyResult = this.topologicalSort.sort();

    if (topologyResult.hasCycle) {
      topologyResult.cycles.forEach((cycle, index) => {
        anomalies.push(this.createCycleAnomaly(cycle, index));
      });
    }

    return anomalies;
  }

  private createCycleAnomaly(cycle: string[], cycleIndex: number): Anomaly {
    const explanation = this.topologicalSort.explainCycle(cycle);
    const involvedPrereqs = this.getInvolvedPrerequisites(cycle);
    const sources = new Set(involvedPrereqs.map(p => p.source));

    return {
      id: uuidv4(),
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

  private getInvolvedPrerequisites(cycle: string[]): Prerequisite[] {
    const cycleSet = new Set(cycle);
    return this.prerequisites.filter(
      p => cycleSet.has(p.courseId) && cycleSet.has(p.prerequisiteId)
    );
  }

  private getCourseName(id: string): string {
    const course = this.courses.find(c => c.id === id);
    return course ? `${course.name} (${id})` : id;
  }

  explainCycle(anomaly: Anomaly): string {
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
      const prereqs = anomaly.details.involvedPrerequisites as Prerequisite[];
      explanation += `问题先修关系:\n`;
      prereqs.forEach(p => {
        explanation += `  - ${this.getCourseName(p.prerequisiteId)} → ${this.getCourseName(p.courseId)} (${p.type})\n`;
      });
    }

    explanation += `数据来源: ${anomaly.source}`;

    return explanation;
  }

  getTopology(): TopologicalSort {
    return this.topologicalSort;
  }
}
