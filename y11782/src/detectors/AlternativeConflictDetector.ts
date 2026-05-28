import { v4 as uuidv4 } from 'uuid';
import { Course, AlternativeCourse, Prerequisite, Anomaly } from '../models/types';
import { TopologicalSort } from '../algorithms/TopologicalSort';

export type ConflictType =
  | 'circular_alternative'
  | 'prerequisite_mismatch'
  | 'alternative_chain'
  | 'semester_mismatch'
  | 'duplicate_alternative';

interface ConflictDetail {
  type: ConflictType;
  originalId: string;
  alternativeId: string;
  description: string;
  involvedCourses: string[];
  path?: string[];
  details: Record<string, unknown>;
}

export class AlternativeConflictDetector {
  private courses: Course[];
  private alternatives: AlternativeCourse[];
  private prerequisites: Prerequisite[];
  private topologicalSort: TopologicalSort;

  constructor(
    courses: Course[],
    alternatives: AlternativeCourse[],
    prerequisites: Prerequisite[]
  ) {
    this.courses = courses;
    this.alternatives = alternatives;
    this.prerequisites = prerequisites;
    this.topologicalSort = new TopologicalSort(courses, prerequisites);
  }

  detect(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const conflicts = this.findAllConflicts();

    conflicts.forEach(conflict => {
      anomalies.push(this.createAnomaly(conflict));
    });

    return anomalies;
  }

  private findAllConflicts(): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    conflicts.push(...this.detectCircularAlternatives());
    conflicts.push(...this.detectDuplicateAlternatives());
    conflicts.push(...this.detectAlternativeChains());
    conflicts.push(...this.detectPrerequisiteMismatch());
    conflicts.push(...this.detectSemesterMismatch());

    return conflicts;
  }

  private detectCircularAlternatives(): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const visited = new Set<string>();

    for (const alt of this.alternatives) {
      if (visited.has(`${alt.originalId}-${alt.alternativeId}`)) continue;

      const reverseAlt = this.alternatives.find(
        a => a.originalId === alt.alternativeId && a.alternativeId === alt.originalId
      );

      if (reverseAlt) {
        const original = this.getCourseName(alt.originalId);
        const alternative = this.getCourseName(alt.alternativeId);
        conflicts.push({
          type: 'circular_alternative',
          originalId: alt.originalId,
          alternativeId: alt.alternativeId,
          description: `检测到循环替代关系：${original} 与 ${alternative} 互为替代课程`,
          involvedCourses: [alt.originalId, alt.alternativeId],
          path: [alt.originalId, alt.alternativeId, alt.originalId],
          details: {
            alternative1: alt,
            alternative2: reverseAlt,
          },
        });
        visited.add(`${alt.originalId}-${alt.alternativeId}`);
        visited.add(`${alt.alternativeId}-${alt.originalId}`);
      }

      const cyclePath = this.findAlternativeCycle(alt.originalId, alt.alternativeId);
      if (cyclePath && !reverseAlt) {
        const original = this.getCourseName(alt.originalId);
        conflicts.push({
          type: 'circular_alternative',
          originalId: alt.originalId,
          alternativeId: alt.alternativeId,
          description: `检测到替代课程形成间接循环：${original} 的替代链最终指向自身`,
          involvedCourses: cyclePath,
          path: cyclePath,
          details: {
            cyclePath,
            triggeringAlternative: alt,
          },
        });
      }
    }

    return conflicts;
  }

  private findAlternativeCycle(startId: string, currentId: string, path: string[] = []): string[] | null {
    const newPath = [...path, currentId];

    if (currentId === startId && path.length > 0) {
      return [...newPath, startId];
    }

    if (path.includes(currentId)) {
      return null;
    }

    const nextAlternatives = this.alternatives.filter(a => a.originalId === currentId);
    for (const nextAlt of nextAlternatives) {
      const result = this.findAlternativeCycle(startId, nextAlt.alternativeId, newPath);
      if (result) return result;
    }

    return null;
  }

  private detectDuplicateAlternatives(): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const seen = new Map<string, AlternativeCourse[]>();

    for (const alt of this.alternatives) {
      const key = `${alt.originalId}-${alt.alternativeId}`;
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(alt);
    }

    seen.forEach((alts, key) => {
      if (alts.length > 1) {
        const [originalId, alternativeId] = key.split('-');
        const original = this.getCourseName(originalId);
        const alternative = this.getCourseName(alternativeId);
        conflicts.push({
          type: 'duplicate_alternative',
          originalId,
          alternativeId,
          description: `检测到重复的替代关系：${original} → ${alternative} 存在 ${alts.length} 条记录`,
          involvedCourses: [originalId, alternativeId],
          details: {
            count: alts.length,
            records: alts,
          },
        });
      }
    });

    return conflicts;
  }

  private detectAlternativeChains(): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];
    const maxChainLength = 3;

    for (const alt of this.alternatives) {
      const chain = this.buildAlternativeChain(alt.originalId);
      if (chain.length > maxChainLength) {
        const courseNames = chain.map(id => this.getCourseName(id));
        conflicts.push({
          type: 'alternative_chain',
          originalId: alt.originalId,
          alternativeId: alt.alternativeId,
          description: `替代课程链过长（${chain.length} 步）：${courseNames.join(' → ')}`,
          involvedCourses: chain,
          path: chain,
          details: {
            chainLength: chain.length,
            maxRecommended: maxChainLength,
            chain,
          },
        });
      }
    }

    return conflicts;
  }

  private buildAlternativeChain(startId: string, visited: Set<string> = new Set()): string[] {
    if (visited.has(startId)) return [];
    visited.add(startId);

    const chain: string[] = [startId];
    const nextAlts = this.alternatives.filter(a => a.originalId === startId);

    if (nextAlts.length > 0) {
      const subChains = nextAlts.map(alt =>
        this.buildAlternativeChain(alt.alternativeId, new Set(visited))
      );
      const longestSubChain = subChains.reduce((a, b) => (a.length > b.length ? a : b), []);
      chain.push(...longestSubChain);
    }

    return chain;
  }

  private detectPrerequisiteMismatch(): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    for (const alt of this.alternatives) {
      const originalPrereqs = this.getPrerequisitesFor(alt.originalId);
      const alternativePrereqs = this.getPrerequisitesFor(alt.alternativeId);

      const originalOnly = originalPrereqs.filter(p => !alternativePrereqs.includes(p));
      const alternativeOnly = alternativePrereqs.filter(p => !originalPrereqs.includes(p));

      if (originalOnly.length > 0 || alternativeOnly.length > 0) {
        const original = this.getCourseName(alt.originalId);
        const alternative = this.getCourseName(alt.alternativeId);
        const originalNames = originalOnly.map(id => this.getCourseName(id));
        const alternativeNames = alternativeOnly.map(id => this.getCourseName(id));

        let description = `替代课程先修要求不匹配：${original} 与 ${alternative} 的先修课不同。`;
        if (originalNames.length > 0) {
          description += ` ${original} 需要: ${originalNames.join(', ')}。`;
        }
        if (alternativeNames.length > 0) {
          description += ` ${alternative} 需要: ${alternativeNames.join(', ')}。`;
        }

        conflicts.push({
          type: 'prerequisite_mismatch',
          originalId: alt.originalId,
          alternativeId: alt.alternativeId,
          description,
          involvedCourses: [alt.originalId, alt.alternativeId, ...originalOnly, ...alternativeOnly],
          details: {
            originalPrerequisites: originalPrereqs,
            alternativePrerequisites: alternativePrereqs,
            originalOnly,
            alternativeOnly,
          },
        });
      }
    }

    return conflicts;
  }

  private detectSemesterMismatch(): ConflictDetail[] {
    const conflicts: ConflictDetail[] = [];

    for (const alt of this.alternatives) {
      const originalCourse = this.courses.find(c => c.id === alt.originalId);
      const alternativeCourse = this.courses.find(c => c.id === alt.alternativeId);

      if (originalCourse && alternativeCourse &&
          originalCourse.semester !== undefined &&
          alternativeCourse.semester !== undefined &&
          originalCourse.semester !== alternativeCourse.semester) {
        const original = this.getCourseName(alt.originalId);
        const alternative = this.getCourseName(alt.alternativeId);
        conflicts.push({
          type: 'semester_mismatch',
          originalId: alt.originalId,
          alternativeId: alt.alternativeId,
          description: `替代课程学期不匹配：${original} (第${originalCourse.semester}学期) 与 ${alternative} (第${alternativeCourse.semester}学期)`,
          involvedCourses: [alt.originalId, alt.alternativeId],
          details: {
            originalSemester: originalCourse.semester,
            alternativeSemester: alternativeCourse.semester,
          },
        });
      }
    }

    return conflicts;
  }

  private getPrerequisitesFor(courseId: string): string[] {
    return this.prerequisites
      .filter(p => p.courseId === courseId)
      .map(p => p.prerequisiteId);
  }

  private getCourseName(id: string): string {
    const course = this.courses.find(c => c.id === id);
    return course ? `${course.name} (${id})` : id;
  }

  private createAnomaly(conflict: ConflictDetail): Anomaly {
    const severityMap: Record<ConflictType, Anomaly['severity']> = {
      circular_alternative: 'error',
      prerequisite_mismatch: 'warning',
      alternative_chain: 'warning',
      semester_mismatch: 'warning',
      duplicate_alternative: 'info',
    };

    const titleMap: Record<ConflictType, string> = {
      circular_alternative: '循环替代关系',
      prerequisite_mismatch: '先修要求不匹配',
      alternative_chain: '替代链过长',
      semester_mismatch: '学期不匹配',
      duplicate_alternative: '重复替代记录',
    };

    const source = this.alternatives.find(
      a => a.originalId === conflict.originalId && a.alternativeId === conflict.alternativeId
    )?.source || 'unknown';

    return {
      id: uuidv4(),
      type: 'alternative_conflict',
      severity: severityMap[conflict.type],
      title: titleMap[conflict.type],
      description: conflict.description,
      involvedCourses: conflict.involvedCourses,
      path: conflict.path,
      source,
      details: {
        conflictType: conflict.type,
        ...conflict.details,
      },
    };
  }

  explainConflict(anomaly: Anomaly): string {
    const involvedNames = anomaly.involvedCourses.map(id => this.getCourseName(id));

    let explanation = `【${anomaly.title}】\n`;
    explanation += `严重程度: ${anomaly.severity}\n`;
    explanation += `说明: ${anomaly.description}\n`;
    explanation += `涉及课程: ${involvedNames.join(', ')}\n`;

    if (anomaly.path) {
      const pathNames = anomaly.path.map(id => this.getCourseName(id));
      explanation += `问题路径: ${pathNames.join(' → ')}\n`;
    }

    if (anomaly.details.originalOnly) {
      const originalNames = (anomaly.details.originalOnly as string[]).map(id => this.getCourseName(id));
      explanation += `原课程独有的先修: ${originalNames.join(', ')}\n`;
    }

    if (anomaly.details.alternativeOnly) {
      const altNames = (anomaly.details.alternativeOnly as string[]).map(id => this.getCourseName(id));
      explanation += `替代课程独有的先修: ${altNames.join(', ')}\n`;
    }

    explanation += `数据来源: ${anomaly.source}`;

    return explanation;
  }
}
