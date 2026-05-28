import { v4 as uuidv4 } from 'uuid';
import { Course, SemesterPlan, Prerequisite, StudentGrade, Anomaly } from '../models/types';
import { TopologicalSort } from '../algorithms/TopologicalSort';

export type OverloadType =
  | 'credit_overload'
  | 'prerequisite_order'
  | 'grade_level_mismatch'
  | 'semester_conflict'
  | 'course_count_overload';

interface OverloadDetail {
  type: OverloadType;
  semester: number;
  studentGrade?: number;
  description: string;
  involvedCourses: string[];
  path?: string[];
  details: Record<string, unknown>;
  source: string;
}

export class SemesterOverloadDetector {
  private courses: Course[];
  private semesterPlans: SemesterPlan[];
  private prerequisites: Prerequisite[];
  private studentGrades: StudentGrade[];
  private topologicalSort: TopologicalSort;

  constructor(
    courses: Course[],
    semesterPlans: SemesterPlan[],
    prerequisites: Prerequisite[],
    studentGrades: StudentGrade[]
  ) {
    this.courses = courses;
    this.semesterPlans = semesterPlans;
    this.prerequisites = prerequisites;
    this.studentGrades = studentGrades;
    this.topologicalSort = new TopologicalSort(courses, prerequisites);
  }

  detect(): Anomaly[] {
    const anomalies: Anomaly[] = [];
    const overloads = this.findAllOverloads();

    overloads.forEach(overload => {
      anomalies.push(this.createAnomaly(overload));
    });

    return anomalies;
  }

  private findAllOverloads(): OverloadDetail[] {
    const overloads: OverloadDetail[] = [];

    overloads.push(...this.detectCreditOverloads());
    overloads.push(...this.detectCourseCountOverloads());
    overloads.push(...this.detectPrerequisiteOrderIssues());
    overloads.push(...this.detectGradeLevelMismatches());
    overloads.push(...this.detectSemesterConflicts());

    return overloads;
  }

  private detectCreditOverloads(): OverloadDetail[] {
    const overloads: OverloadDetail[] = [];

    for (const plan of this.semesterPlans) {
      const totalCredits = plan.courses.reduce((sum, courseId) => {
        const course = this.courses.find(c => c.id === courseId);
        return sum + (course?.credits || 0);
      }, 0);

      if (totalCredits > plan.maxCredits) {
        const courseNames = plan.courses.map(id => this.getCourseName(id));
        overloads.push({
          type: 'credit_overload',
          semester: plan.semester,
          studentGrade: plan.studentGrade,
          description: `${plan.studentGrade}年级第${plan.semester}学期学分超载：计划修读 ${totalCredits} 学分，上限为 ${plan.maxCredits} 学分，超出 ${totalCredits - plan.maxCredits} 学分`,
          involvedCourses: plan.courses,
          details: {
            totalCredits,
            maxCredits: plan.maxCredits,
            exceededBy: totalCredits - plan.maxCredits,
            courseCredits: plan.courses.map(id => {
              const course = this.courses.find(c => c.id === id);
              return { courseId: id, credits: course?.credits || 0 };
            }),
          },
          source: plan.source,
        });
      }
    }

    return overloads;
  }

  private detectCourseCountOverloads(): OverloadDetail[] {
    const overloads: OverloadDetail[] = [];
    const maxCoursesPerSemester = 6;

    for (const plan of this.semesterPlans) {
      if (plan.courses.length > maxCoursesPerSemester) {
        const courseNames = plan.courses.map(id => this.getCourseName(id));
        overloads.push({
          type: 'course_count_overload',
          semester: plan.semester,
          studentGrade: plan.studentGrade,
          description: `${plan.studentGrade}年级第${plan.semester}学期课程数量过多：计划修读 ${plan.courses.length} 门课程，建议不超过 ${maxCoursesPerSemester} 门`,
          involvedCourses: plan.courses,
          details: {
            courseCount: plan.courses.length,
            maxRecommended: maxCoursesPerSemester,
            exceededBy: plan.courses.length - maxCoursesPerSemester,
          },
          source: plan.source,
        });
      }
    }

    return overloads;
  }

  private detectPrerequisiteOrderIssues(): OverloadDetail[] {
    const overloads: OverloadDetail[] = [];

    for (const plan of this.semesterPlans) {
      const courseSemesterMap = new Map<string, { grade: number; semester: number }>();

      this.semesterPlans.forEach(p => {
        p.courses.forEach(courseId => {
          courseSemesterMap.set(courseId, { grade: p.studentGrade, semester: p.semester });
        });
      });

      for (const courseId of plan.courses) {
        const prereqs = this.prerequisites.filter(p => p.courseId === courseId);

        for (const prereq of prereqs) {
          const courseInfo = courseSemesterMap.get(courseId);
          const prereqInfo = courseSemesterMap.get(prereq.prerequisiteId);

          if (courseInfo && prereqInfo) {
            const courseOrder = (courseInfo.grade - 1) * 2 + courseInfo.semester;
            const prereqOrder = (prereqInfo.grade - 1) * 2 + prereqInfo.semester;

            if (prereqOrder >= courseOrder) {
              const course = this.getCourseName(courseId);
              const prereqCourse = this.getCourseName(prereq.prerequisiteId);
              const path = this.topologicalSort.getPrerequisitePath(prereq.prerequisiteId, courseId);

              overloads.push({
                type: 'prerequisite_order',
                semester: plan.semester,
                studentGrade: plan.studentGrade,
                description: `先修顺序错误：${course} (${courseInfo.grade}年级第${courseInfo.semester}学期) 的先修课 ${prereqCourse} (${prereqInfo.grade}年级第${prereqInfo.semester}学期) 未在之前学期修读`,
                involvedCourses: [prereq.prerequisiteId, courseId],
                path: path || undefined,
                details: {
                  courseId,
                  prerequisiteId: prereq.prerequisiteId,
                  courseSemester: courseInfo,
                  prerequisiteSemester: prereqInfo,
                  prerequisiteType: prereq.type,
                },
                source: prereq.source,
              });
            }
          }
        }
      }
    }

    return overloads;
  }

  private detectGradeLevelMismatches(): OverloadDetail[] {
    const overloads: OverloadDetail[] = [];

    for (const plan of this.semesterPlans) {
      for (const student of this.studentGrades) {
        if (student.gradeLevel !== plan.studentGrade) continue;

        const completedSet = new Set(student.completedCourses);

        for (const courseId of plan.courses) {
          const course = this.courses.find(c => c.id === courseId);
          if (course && course.gradeLevel && course.gradeLevel > student.gradeLevel + 1) {
            const courseName = this.getCourseName(courseId);
            overloads.push({
              type: 'grade_level_mismatch',
              semester: plan.semester,
              studentGrade: plan.studentGrade,
              description: `年级不匹配：学生 ${student.name} (${student.gradeLevel}年级) 计划修读高年级课程 ${courseName} (${course.gradeLevel}年级)`,
              involvedCourses: [courseId],
              details: {
                studentId: student.id,
                studentName: student.name,
                studentGrade: student.gradeLevel,
                courseGrade: course.gradeLevel,
              },
              source: plan.source,
            });
          }

          if (completedSet.has(courseId)) {
            const courseName = this.getCourseName(courseId);
            overloads.push({
              type: 'grade_level_mismatch',
              semester: plan.semester,
              studentGrade: plan.studentGrade,
              description: `重复修读：学生 ${student.name} 已修读完成 ${courseName}，但仍被安排在本学期计划中`,
              involvedCourses: [courseId],
              details: {
                studentId: student.id,
                studentName: student.name,
                completedCourse: courseId,
              },
              source: plan.source,
            });
          }
        }
      }
    }

    return overloads;
  }

  private detectSemesterConflicts(): OverloadDetail[] {
    const overloads: OverloadDetail[] = [];

    const coursePlanMap = new Map<string, { grade: number; semester: number; source: string }[]>();

    for (const plan of this.semesterPlans) {
      for (const courseId of plan.courses) {
        if (!coursePlanMap.has(courseId)) {
          coursePlanMap.set(courseId, []);
        }
        coursePlanMap.get(courseId)!.push({
          grade: plan.studentGrade,
          semester: plan.semester,
          source: plan.source,
        });
      }
    }

    for (const course of this.courses) {
      if (course.semester !== undefined) {
        const plans = coursePlanMap.get(course.id) || [];
        for (const plan of plans) {
          if (plan.semester !== course.semester) {
            const courseName = this.getCourseName(course.id);
            overloads.push({
              type: 'semester_conflict',
              semester: plan.semester,
              studentGrade: plan.grade,
              description: `学期安排冲突：${courseName} 课程定义为第${course.semester}学期，但被安排在第${plan.semester}学期`,
              involvedCourses: [course.id],
              details: {
                courseDefinedSemester: course.semester,
                plannedSemester: plan.semester,
                sourceDefinition: course.source,
                sourcePlan: plan.source,
              },
              source: plan.source,
            });
          }
        }
      }
    }

    coursePlanMap.forEach((plans, courseId) => {
      if (plans.length > 1) {
        const uniqueSemesters = new Set(plans.map(p => `${p.grade}-${p.semester}`));
        if (uniqueSemesters.size > 1) {
          const courseName = this.getCourseName(courseId);
          const planDescriptions = plans.map(p => `${p.grade}年级第${p.semester}学期`).join(', ');
          overloads.push({
            type: 'semester_conflict',
            semester: plans[0].semester,
            studentGrade: plans[0].grade,
            description: `多重学期安排冲突：${courseName} 被同时安排在多个学期：${planDescriptions}`,
            involvedCourses: [courseId],
            details: {
              plans: plans.map(p => ({
                grade: p.grade,
                semester: p.semester,
                source: p.source,
              })),
            },
            source: plans[0].source,
          });
        }
      }
    });

    return overloads;
  }

  private getCourseName(id: string): string {
    const course = this.courses.find(c => c.id === id);
    return course ? `${course.name} (${id})` : id;
  }

  private createAnomaly(overload: OverloadDetail): Anomaly {
    const severityMap: Record<OverloadType, Anomaly['severity']> = {
      credit_overload: 'error',
      prerequisite_order: 'error',
      grade_level_mismatch: 'warning',
      semester_conflict: 'warning',
      course_count_overload: 'warning',
    };

    const titleMap: Record<OverloadType, string> = {
      credit_overload: '学分超载',
      prerequisite_order: '先修顺序错误',
      grade_level_mismatch: '年级不匹配',
      semester_conflict: '学期安排冲突',
      course_count_overload: '课程数量过多',
    };

    return {
      id: uuidv4(),
      type: 'semester_overload',
      severity: severityMap[overload.type],
      title: titleMap[overload.type],
      description: overload.description,
      involvedCourses: overload.involvedCourses,
      path: overload.path,
      source: overload.source,
      details: {
        overloadType: overload.type,
        semester: overload.semester,
        studentGrade: overload.studentGrade,
        ...overload.details,
      },
    };
  }

  explainOverload(anomaly: Anomaly): string {
    const involvedNames = anomaly.involvedCourses.map(id => this.getCourseName(id));

    let explanation = `【${anomaly.title}】\n`;
    explanation += `严重程度: ${anomaly.severity}\n`;
    explanation += `说明: ${anomaly.description}\n`;
    explanation += `涉及课程: ${involvedNames.join(', ')}\n`;

    if (anomaly.path) {
      const pathNames = anomaly.path.map(id => this.getCourseName(id));
      explanation += `问题路径: ${pathNames.join(' → ')}\n`;
    }

    if (anomaly.details.totalCredits !== undefined) {
      explanation += `总学分: ${anomaly.details.totalCredits}, 上限: ${anomaly.details.maxCredits}, 超出: ${anomaly.details.exceededBy}\n`;
    }

    if (anomaly.details.courseCount !== undefined) {
      explanation += `课程数: ${anomaly.details.courseCount}, 建议上限: ${anomaly.details.maxRecommended}\n`;
    }

    if (anomaly.details.courseSemester && anomaly.details.prerequisiteSemester) {
      const cs = anomaly.details.courseSemester as { grade: number; semester: number };
      const ps = anomaly.details.prerequisiteSemester as { grade: number; semester: number };
      explanation += `课程学期: ${cs.grade}年级第${cs.semester}学期, 先修课学期: ${ps.grade}年级第${ps.semester}学期\n`;
    }

    explanation += `数据来源: ${anomaly.source}`;

    return explanation;
  }
}
