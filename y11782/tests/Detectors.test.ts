import { CycleDetector } from '../src/detectors/CycleDetector';
import { AlternativeConflictDetector } from '../src/detectors/AlternativeConflictDetector';
import { SemesterOverloadDetector } from '../src/detectors/SemesterOverloadDetector';
import { Course, Prerequisite, AlternativeCourse, SemesterPlan, StudentGrade } from '../src/models/types';

describe('Detector Tests', () => {
  const courses: Course[] = [
    { id: 'CS101', name: '计算机导论', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS102', name: '程序设计基础', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS201', name: '数据结构', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS202', name: '离散数学', credits: 3, department: '计算机学院', source: 'test' },
    { id: 'CS301', name: '算法设计与分析', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS302', name: '操作系统', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS401', name: '计算机网络', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS501', name: '高级算法', credits: 3, department: '计算机学院', source: 'test' },
    { id: 'MATH101', name: '高等数学I', credits: 5, department: '数学学院', source: 'test' },
    { id: 'MATH201', name: '线性代数', credits: 3, department: '数学学院', source: 'test' },
  ];

  describe('CycleDetector', () => {
    it('应该检测到循环依赖', () => {
      const prerequisites: Prerequisite[] = [
        { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
        { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
        { courseId: 'CS302', prerequisiteId: 'CS401', type: 'required', source: 'test' },
        { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: 'test' },
      ];

      const detector = new CycleDetector(courses, prerequisites);
      const anomalies = detector.detect();

      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0].type).toBe('cycle');
      expect(anomalies[0].severity).toBe('error');
      expect(anomalies[0].involvedCourses).toContain('CS302');
      expect(anomalies[0].involvedCourses).toContain('CS401');
    });

    it('无环时应该返回空', () => {
      const prerequisites: Prerequisite[] = [
        { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
        { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
      ];

      const detector = new CycleDetector(courses, prerequisites);
      const anomalies = detector.detect();

      expect(anomalies.length).toBe(0);
    });

    it('应该检测到多个循环', () => {
      const prerequisites: Prerequisite[] = [
        { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
        { courseId: 'CS101', prerequisiteId: 'CS102', type: 'required', source: 'test' },
        { courseId: 'CS302', prerequisiteId: 'CS401', type: 'required', source: 'test' },
        { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: 'test' },
      ];

      const detector = new CycleDetector(courses, prerequisites);
      const anomalies = detector.detect();

      expect(anomalies.length).toBe(2);
    });
  });

  describe('AlternativeConflictDetector', () => {
    it('应该检测到循环替代', () => {
      const alternatives: AlternativeCourse[] = [
        { originalId: 'CS301', alternativeId: 'CS501', reason: '内容深度更高', effectiveFrom: '2024-09', source: 'test' },
        { originalId: 'CS501', alternativeId: 'CS301', reason: '互为替代', effectiveFrom: '2024-09', source: 'test' },
      ];

      const prerequisites: Prerequisite[] = [
        { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: 'test' },
        { courseId: 'CS501', prerequisiteId: 'CS301', type: 'required', source: 'test' },
      ];

      const detector = new AlternativeConflictDetector(courses, alternatives, prerequisites);
      const anomalies = detector.detect();

      const cycleAnomaly = anomalies.find(a => a.details?.conflictType === 'circular_alternative');
      expect(cycleAnomaly).toBeDefined();
      expect(cycleAnomaly?.severity).toBe('error');
    });

    it('应该检测到先修要求不匹配', () => {
      const alternatives: AlternativeCourse[] = [
        { originalId: 'CS301', alternativeId: 'MATH201', reason: '转专业学生可选', effectiveFrom: '2024-09', source: 'test' },
      ];

      const prerequisites: Prerequisite[] = [
        { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: 'test' },
        { courseId: 'MATH201', prerequisiteId: 'MATH101', type: 'required', source: 'test' },
      ];

      const detector = new AlternativeConflictDetector(courses, alternatives, prerequisites);
      const anomalies = detector.detect();

      const mismatchAnomaly = anomalies.find(a => a.details?.conflictType === 'prerequisite_mismatch');
      expect(mismatchAnomaly).toBeDefined();
    });

    it('应该检测到重复替代', () => {
      const alternatives: AlternativeCourse[] = [
        { originalId: 'CS301', alternativeId: 'CS501', reason: '内容深度更高', effectiveFrom: '2024-09', source: 'test' },
        { originalId: 'CS301', alternativeId: 'CS501', reason: '重复添加', effectiveFrom: '2024-09', source: 'test' },
      ];

      const detector = new AlternativeConflictDetector(courses, alternatives, []);
      const anomalies = detector.detect();

      const duplicateAnomaly = anomalies.find(a => a.details?.conflictType === 'duplicate_alternative');
      expect(duplicateAnomaly).toBeDefined();
    });
  });

  describe('SemesterOverloadDetector', () => {
    const studentGrades: StudentGrade[] = [
      { id: 'S001', name: '张三', gradeLevel: 2, completedCourses: ['CS101', 'CS102', 'MATH101'], source: 'test' },
    ];

    it('应该检测到先修顺序错误', () => {
      const semesterPlans: SemesterPlan[] = [
        { studentGrade: 1, semester: 1, maxCredits: 25, courses: ['CS102'], source: 'test' },
        { studentGrade: 2, semester: 1, maxCredits: 25, courses: ['CS101'], source: 'test' },
      ];

      const prerequisites: Prerequisite[] = [
        { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
      ];

      const detector = new SemesterOverloadDetector(courses, semesterPlans, prerequisites, studentGrades);
      const anomalies = detector.detect();

      const orderAnomaly = anomalies.find(a => a.details?.overloadType === 'prerequisite_order');
      expect(orderAnomaly).toBeDefined();
      expect(orderAnomaly?.severity).toBe('error');
    });

    it('应该检测到学分超载', () => {
      const semesterPlans: SemesterPlan[] = [
        { studentGrade: 1, semester: 1, maxCredits: 10, courses: ['CS101', 'CS102', 'MATH101'], source: 'test' },
      ];

      const detector = new SemesterOverloadDetector(courses, semesterPlans, [], studentGrades);
      const anomalies = detector.detect();

      const creditAnomaly = anomalies.find(a => a.details?.overloadType === 'credit_overload');
      expect(creditAnomaly).toBeDefined();
      expect(creditAnomaly?.severity).toBe('error');
    });

    it('应该检测到重复修读', () => {
      const semesterPlans: SemesterPlan[] = [
        { studentGrade: 2, semester: 1, maxCredits: 25, courses: ['CS101', 'CS201'], source: 'test' },
      ];

      const detector = new SemesterOverloadDetector(courses, semesterPlans, [], studentGrades);
      const anomalies = detector.detect();

      const gradeAnomaly = anomalies.find(a => a.details?.overloadType === 'grade_level_mismatch');
      expect(gradeAnomaly).toBeDefined();
      expect(gradeAnomaly?.severity).toBe('warning');
    });

    it('应该检测到多重学期安排冲突', () => {
      const semesterPlans: SemesterPlan[] = [
        { studentGrade: 1, semester: 1, maxCredits: 25, courses: ['CS101'], source: 'test' },
        { studentGrade: 2, semester: 1, maxCredits: 25, courses: ['CS101'], source: 'test' },
      ];

      const detector = new SemesterOverloadDetector(courses, semesterPlans, [], studentGrades);
      const anomalies = detector.detect();

      const multiConflict = anomalies.find(a => a.description.includes('多个学期'));
      expect(multiConflict).toBeDefined();
    });
  });
});
