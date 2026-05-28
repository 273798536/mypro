import { CheckService } from '../src/algorithms/CheckService';
import { PathExplainer } from '../src/utils/PathExplainer';
import { getSampleData, getCleanSampleData } from '../src/data/SampleDataLoader';
import { Course, Prerequisite, SemesterPlan, AlternativeCourse, StudentGrade, Anomaly } from '../src/models/types';

describe('CheckService', () => {
  const courses: Course[] = [
    { id: 'CS101', name: '计算机导论', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS102', name: '程序设计基础', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS201', name: '数据结构', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS301', name: '算法设计与分析', credits: 4, department: '计算机学院', source: 'test' },
  ];

  const prerequisites: Prerequisite[] = [
    { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
    { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
    { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: 'test' },
  ];

  const semesterPlans: SemesterPlan[] = [
    { studentGrade: 1, semester: 1, maxCredits: 25, courses: ['CS101'], source: 'test' },
    { studentGrade: 1, semester: 2, maxCredits: 25, courses: ['CS102'], source: 'test' },
    { studentGrade: 2, semester: 1, maxCredits: 25, courses: ['CS201'], source: 'test' },
    { studentGrade: 2, semester: 2, maxCredits: 25, courses: ['CS301'], source: 'test' },
  ];

  const studentGrades: StudentGrade[] = [
    { id: 'S001', name: '张三', gradeLevel: 2, completedCourses: ['CS101'], source: 'test' },
  ];

  const alternatives: AlternativeCourse[] = [];

  it('应该成功执行完整检查', () => {
    const checkService = new CheckService(courses, prerequisites, semesterPlans, alternatives, studentGrades, 'test');
    const report = checkService.runCheck();

    expect(report).toBeDefined();
    expect(report.summary.totalCourses).toBe(courses.length);
    expect(report.summary.totalPrerequisites).toBe(prerequisites.length);
    expect(report.topology).toBeDefined();
  });

  it('无异常数据应该返回空异常列表', () => {
    const checkService = new CheckService(courses, prerequisites, semesterPlans, alternatives, studentGrades, 'test');
    const report = checkService.runCheck();

    expect(report.anomalies.length).toBe(0);
  });

  it('应该正确统计异常', () => {
    const cyclicPrerequisites: Prerequisite[] = [
      ...prerequisites,
      { courseId: 'CS101', prerequisiteId: 'CS301', type: 'required', source: 'test' },
    ];

    const checkService = new CheckService(courses, cyclicPrerequisites, semesterPlans, alternatives, studentGrades, 'test');
    const report = checkService.runCheck();

    expect(report.summary.anomaliesCount).toBeGreaterThan(0);
    expect(report.summary.cyclesCount).toBeGreaterThan(0);
  });

  it('应该生成建议', () => {
    const cyclicPrerequisites: Prerequisite[] = [
      ...prerequisites,
      { courseId: 'CS101', prerequisiteId: 'CS301', type: 'required', source: 'test' },
    ];

    const checkService = new CheckService(courses, cyclicPrerequisites, semesterPlans, alternatives, studentGrades, 'test');
    const report = checkService.runCheck();

    expect(report.recommendations.length).toBeGreaterThan(0);
  });

  it('应该解释路径', () => {
    const checkService = new CheckService(courses, prerequisites, semesterPlans, alternatives, studentGrades, 'test');
    const explanation = checkService.explainPath('CS101', 'CS301');

    expect(explanation).toBeDefined();
    expect(explanation).toContain('CS101');
    expect(explanation).toContain('CS301');
  });

  it('解释不存在的路径应该返回提示', () => {
    const checkService = new CheckService(courses, prerequisites, semesterPlans, alternatives, studentGrades, 'test');
    const explanation = checkService.explainPath('CS101', 'CS999');

    expect(explanation).toContain('无法找到');
  });

  describe('样例数据测试', () => {
    it('有异常的样例数据应该检测到异常', () => {
      const data = getSampleData();
      const checkService = new CheckService(
        data.courses,
        data.prerequisites,
        data.semesterPlans,
        data.alternativeCourses,
        data.studentGrades,
        'sample'
      );
      const report = checkService.runCheck();

      expect(report.anomalies.length).toBeGreaterThan(0);
      expect(report.summary.cyclesCount).toBeGreaterThan(0);
    });

    it('干净的样例数据应该没有循环依赖', () => {
      const data = getCleanSampleData();
      const checkService = new CheckService(
        data.courses,
        data.prerequisites,
        data.semesterPlans,
        data.alternativeCourses,
        data.studentGrades,
        'clean'
      );
      const report = checkService.runCheck();

      expect(report.summary.cyclesCount).toBe(0);
    });
  });
});

describe('PathExplainer', () => {
  const courses: Course[] = [
    { id: 'CS101', name: '计算机导论', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS102', name: '程序设计基础', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS201', name: '数据结构', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS301', name: '算法设计与分析', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS501', name: '高级算法', credits: 3, department: '计算机学院', source: 'test' },
  ];

  const prerequisites: Prerequisite[] = [
    { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
    { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
    { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: 'test' },
    { courseId: 'CS501', prerequisiteId: 'CS301', type: 'required', source: 'test' },
  ];

  const alternatives: AlternativeCourse[] = [
    { originalId: 'CS301', alternativeId: 'CS501', reason: '内容深度更高', effectiveFrom: '2024-09', source: 'test' },
  ];

  it('应该解释课程详情', () => {
    const explainer = new PathExplainer(courses, prerequisites, alternatives);
    const explanation = explainer.explainCourse('CS301');

    expect(explanation).toContain('算法设计与分析');
    expect(explanation).toContain('CS301');
    expect(explanation).toContain('先修课程');
    expect(explanation).toContain('后续课程');
    expect(explanation).toContain('可替代课程');
  });

  it('应该解释异常', () => {
    const anomaly: Anomaly = {
      id: 'test-1',
      type: 'cycle',
      severity: 'error',
      title: '循环依赖',
      description: '检测到课程循环',
      involvedCourses: ['CS101', 'CS102'],
      path: ['CS101', 'CS102', 'CS101'],
      source: 'test',
      details: {}
    };

    const explainer = new PathExplainer(courses, prerequisites, alternatives);
    const explanation = explainer.explainAnomaly(anomaly);

    expect(explanation).toContain('循环依赖');
    expect(explanation).toContain('建议操作');
    expect(explanation).toContain('数据来源');
  });

  it('应该解释所有路径', () => {
    const explainer = new PathExplainer(courses, prerequisites, alternatives);
    const explanation = explainer.explainAllPaths('CS101', 'CS301');

    expect(explanation).toContain('路径');
    expect(explanation).toContain('CS101');
    expect(explanation).toContain('CS301');
  });

  it('应该处理不存在的课程', () => {
    const explainer = new PathExplainer(courses, prerequisites, alternatives);
    const explanation = explainer.explainCourse('CS999');

    expect(explanation).toContain('未找到');
  });
});
