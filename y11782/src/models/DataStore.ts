import { v4 as uuidv4 } from 'uuid';
import {
  Course,
  Prerequisite,
  SemesterPlan,
  AlternativeCourse,
  StudentGrade,
  HistoryRecord,
  DataBundle,
} from './types';

export class DataStore {
  private courses: Map<string, Course> = new Map();
  private prerequisites: Prerequisite[] = [];
  private semesterPlans: SemesterPlan[] = [];
  private alternativeCourses: AlternativeCourse[] = [];
  private studentGrades: StudentGrade[] = [];
  private history: HistoryRecord[] = [];
  private currentSource: string = 'manual';

  setSource(source: string): void {
    this.currentSource = source;
  }

  getSource(): string {
    return this.currentSource;
  }

  addCourse(course: Omit<Course, 'source'>): Course {
    const fullCourse: Course = { ...course, source: this.currentSource };
    this.courses.set(course.id, fullCourse);
    this.recordHistory('modify', `添加课程: ${course.name} (${course.id})`, [
      { field: 'courses', oldValue: null, newValue: fullCourse }
    ]);
    return fullCourse;
  }

  addCourses(courses: Array<Omit<Course, 'source'>>): Course[] {
    return courses.map(c => this.addCourse(c));
  }

  getCourse(id: string): Course | undefined {
    return this.courses.get(id);
  }

  getAllCourses(): Course[] {
    return Array.from(this.courses.values());
  }

  updateCourse(id: string, updates: Partial<Omit<Course, 'id' | 'source'>>): Course | undefined {
    const course = this.courses.get(id);
    if (!course) return undefined;
    const oldValue = { ...course };
    const updated = { ...course, ...updates };
    this.courses.set(id, updated);
    this.recordHistory('modify', `更新课程: ${course.name} (${id})`, [
      { field: 'courses', oldValue, newValue: updated }
    ]);
    return updated;
  }

  removeCourse(id: string): boolean {
    const course = this.courses.get(id);
    if (!course) return false;
    this.courses.delete(id);
    this.prerequisites = this.prerequisites.filter(
      p => p.courseId !== id && p.prerequisiteId !== id
    );
    this.recordHistory('modify', `删除课程: ${course.name} (${id})`, [
      { field: 'courses', oldValue: course, newValue: null }
    ]);
    return true;
  }

  addPrerequisite(prereq: Omit<Prerequisite, 'source'>): Prerequisite {
    const fullPrereq: Prerequisite = { ...prereq, source: this.currentSource };
    this.prerequisites.push(fullPrereq);
    const course = this.courses.get(prereq.courseId);
    const prereqCourse = this.courses.get(prereq.prerequisiteId);
    this.recordHistory('modify', `添加先修关系: ${prereqCourse?.name || prereq.prerequisiteId} → ${course?.name || prereq.courseId}`, [
      { field: 'prerequisites', oldValue: null, newValue: fullPrereq }
    ]);
    return fullPrereq;
  }

  addPrerequisites(prereqs: Array<Omit<Prerequisite, 'source'>>): Prerequisite[] {
    return prereqs.map(p => this.addPrerequisite(p));
  }

  getAllPrerequisites(): Prerequisite[] {
    return [...this.prerequisites];
  }

  removePrerequisite(courseId: string, prerequisiteId: string): boolean {
    const index = this.prerequisites.findIndex(
      p => p.courseId === courseId && p.prerequisiteId === prerequisiteId
    );
    if (index === -1) return false;
    const removed = this.prerequisites.splice(index, 1)[0];
    this.recordHistory('modify', `删除先修关系: ${prerequisiteId} → ${courseId}`, [
      { field: 'prerequisites', oldValue: removed, newValue: null }
    ]);
    return true;
  }

  addSemesterPlan(plan: Omit<SemesterPlan, 'source'>): SemesterPlan {
    const fullPlan: SemesterPlan = { ...plan, source: this.currentSource };
    this.semesterPlans.push(fullPlan);
    this.recordHistory('modify', `添加学期计划: ${plan.studentGrade}年级 第${plan.semester}学期`, [
      { field: 'semesterPlans', oldValue: null, newValue: fullPlan }
    ]);
    return fullPlan;
  }

  addSemesterPlans(plans: Array<Omit<SemesterPlan, 'source'>>): SemesterPlan[] {
    return plans.map(p => this.addSemesterPlan(p));
  }

  getAllSemesterPlans(): SemesterPlan[] {
    return [...this.semesterPlans];
  }

  addAlternativeCourse(alt: Omit<AlternativeCourse, 'source'>): AlternativeCourse {
    const fullAlt: AlternativeCourse = { ...alt, source: this.currentSource };
    this.alternativeCourses.push(fullAlt);
    const original = this.courses.get(alt.originalId);
    const alternative = this.courses.get(alt.alternativeId);
    this.recordHistory('modify', `添加替代课程: ${original?.name || alt.originalId} → ${alternative?.name || alt.alternativeId}`, [
      { field: 'alternativeCourses', oldValue: null, newValue: fullAlt }
    ]);
    return fullAlt;
  }

  addAlternativeCourses(alts: Array<Omit<AlternativeCourse, 'source'>>): AlternativeCourse[] {
    return alts.map(a => this.addAlternativeCourse(a));
  }

  getAllAlternativeCourses(): AlternativeCourse[] {
    return [...this.alternativeCourses];
  }

  getAlternativesFor(courseId: string): AlternativeCourse[] {
    return this.alternativeCourses.filter(a => a.originalId === courseId);
  }

  addStudentGrade(grade: Omit<StudentGrade, 'source'>): StudentGrade {
    const fullGrade: StudentGrade = { ...grade, source: this.currentSource };
    this.studentGrades.push(fullGrade);
    this.recordHistory('modify', `添加学生: ${grade.name} (${grade.id})`, [
      { field: 'studentGrades', oldValue: null, newValue: fullGrade }
    ]);
    return fullGrade;
  }

  addStudentGrades(grades: Array<Omit<StudentGrade, 'source'>>): StudentGrade[] {
    return grades.map(g => this.addStudentGrade(g));
  }

  getAllStudentGrades(): StudentGrade[] {
    return [...this.studentGrades];
  }

  importBundle(bundle: DataBundle, source: string): void {
    const oldSource = this.currentSource;
    this.currentSource = source;
    this.clearAll();
    this.addCourses(bundle.courses);
    this.addPrerequisites(bundle.prerequisites);
    this.addSemesterPlans(bundle.semesterPlans);
    this.addAlternativeCourses(bundle.alternativeCourses);
    this.addStudentGrades(bundle.studentGrades);
    this.recordHistory('import', `从 ${source} 导入数据`, []);
    this.currentSource = oldSource;
  }

  exportBundle(): DataBundle {
    return {
      courses: this.getAllCourses(),
      prerequisites: this.getAllPrerequisites(),
      semesterPlans: this.getAllSemesterPlans(),
      alternativeCourses: this.getAllAlternativeCourses(),
      studentGrades: this.getAllStudentGrades(),
    };
  }

  clearAll(): void {
    this.courses.clear();
    this.prerequisites = [];
    this.semesterPlans = [];
    this.alternativeCourses = [];
    this.studentGrades = [];
  }

  getHistory(): HistoryRecord[] {
    return [...this.history].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private recordHistory(
    action: HistoryRecord['action'],
    description: string,
    changes: HistoryRecord['changes']
  ): void {
    const record: HistoryRecord = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      action,
      description,
      dataSource: this.currentSource,
      changes,
    };
    this.history.push(record);
  }

  recordCheck(): void {
    this.recordHistory('check', '执行课程先修关系检查', []);
  }

  recordExport(format: string, path: string): void {
    this.recordHistory('export', `导出${format}格式报告: ${path}`, []);
  }
}

export const dataStore = new DataStore();
