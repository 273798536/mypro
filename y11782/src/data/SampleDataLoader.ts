import { DataBundle } from '../models/types';

export const sampleData: DataBundle = {
  courses: [
    { id: 'CS101', name: '计算机导论', credits: 4, department: '计算机学院', semester: 1, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'CS102', name: '程序设计基础', credits: 4, department: '计算机学院', semester: 1, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'CS201', name: '数据结构', credits: 4, department: '计算机学院', semester: 2, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'CS202', name: '离散数学', credits: 3, department: '计算机学院', semester: 2, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'CS301', name: '算法设计与分析', credits: 4, department: '计算机学院', semester: 1, gradeLevel: 2, source: '课程清单_2024' },
    { id: 'CS302', name: '操作系统', credits: 4, department: '计算机学院', semester: 2, gradeLevel: 2, source: '课程清单_2024' },
    { id: 'CS303', name: '数据库系统', credits: 4, department: '计算机学院', semester: 1, gradeLevel: 2, source: '课程清单_2024' },
    { id: 'CS401', name: '计算机网络', credits: 4, department: '计算机学院', semester: 1, gradeLevel: 3, source: '课程清单_2024' },
    { id: 'CS402', name: '软件工程', credits: 4, department: '计算机学院', semester: 2, gradeLevel: 3, source: '课程清单_2024' },
    { id: 'CS403', name: '人工智能导论', credits: 3, department: '计算机学院', semester: 2, gradeLevel: 3, source: '课程清单_2024' },
    { id: 'MATH101', name: '高等数学I', credits: 5, department: '数学学院', semester: 1, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'MATH102', name: '高等数学II', credits: 5, department: '数学学院', semester: 2, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'MATH201', name: '线性代数', credits: 3, department: '数学学院', semester: 1, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'ENG101', name: '大学英语I', credits: 3, department: '外语学院', semester: 1, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'ENG102', name: '大学英语II', credits: 3, department: '外语学院', semester: 2, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'PHY101', name: '大学物理', credits: 4, department: '物理学院', semester: 2, gradeLevel: 1, source: '课程清单_2024' },
    { id: 'CS501', name: '高级算法', credits: 3, department: '计算机学院', semester: 1, gradeLevel: 4, source: '课程清单_2024' },
    { id: 'CS502', name: '机器学习', credits: 3, department: '计算机学院', semester: 2, gradeLevel: 4, source: '课程清单_2024' },
    { id: 'ELEC101', name: '电路原理', credits: 4, department: '电子工程学院', semester: 1, gradeLevel: 2, source: '课程清单_2024' },
    { id: 'ELEC102', name: '数字电路', credits: 4, department: '电子工程学院', semester: 2, gradeLevel: 2, source: '课程清单_2024' },
  ],

  prerequisites: [
    { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS201', prerequisiteId: 'MATH102', type: 'required', source: '先修关系_数学' },
    { courseId: 'CS202', prerequisiteId: 'MATH101', type: 'required', source: '先修关系_数学' },
    { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS301', prerequisiteId: 'CS202', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS302', prerequisiteId: 'CS201', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS303', prerequisiteId: 'CS201', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS303', prerequisiteId: 'MATH201', type: 'required', source: '先修关系_数学' },
    { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS402', prerequisiteId: 'CS301', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS403', prerequisiteId: 'CS301', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS403', prerequisiteId: 'MATH201', type: 'required', source: '先修关系_数学' },
    { courseId: 'MATH102', prerequisiteId: 'MATH101', type: 'required', source: '先修关系_数学' },
    { courseId: 'ENG102', prerequisiteId: 'ENG101', type: 'required', source: '先修关系_外语' },
    { courseId: 'PHY101', prerequisiteId: 'MATH101', type: 'corequisite', source: '先修关系_物理' },
    { courseId: 'CS501', prerequisiteId: 'CS301', type: 'required', source: '先修关系_计算机' },
    { courseId: 'CS502', prerequisiteId: 'CS403', type: 'required', source: '先修关系_计算机' },
    { courseId: 'ELEC102', prerequisiteId: 'ELEC101', type: 'required', source: '先修关系_电子' },
    { courseId: 'CS302', prerequisiteId: 'CS401', type: 'required', source: '先修关系_错误' },
    { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: '先修关系_错误' },
    { courseId: 'CS301', prerequisiteId: 'CS303', type: 'required', source: '先修关系_错误' },
    { courseId: 'CS303', prerequisiteId: 'CS301', type: 'required', source: '先修关系_错误' },
  ],

  semesterPlans: [
    { studentGrade: 1, semester: 1, maxCredits: 25, courses: ['CS101', 'CS102', 'MATH101', 'MATH201', 'ENG101'], source: '学期计划_大一' },
    { studentGrade: 1, semester: 2, maxCredits: 25, courses: ['CS201', 'CS202', 'MATH102', 'ENG102', 'PHY101', 'ELEC101'], source: '学期计划_大一' },
    { studentGrade: 2, semester: 1, maxCredits: 25, courses: ['CS301', 'CS303', 'ELEC102', 'CS101'], source: '学期计划_大二' },
    { studentGrade: 2, semester: 2, maxCredits: 25, courses: ['CS302', 'CS403'], source: '学期计划_大二' },
    { studentGrade: 3, semester: 1, maxCredits: 25, courses: ['CS401', 'CS402', 'CS501'], source: '学期计划_大三' },
    { studentGrade: 3, semester: 2, maxCredits: 25, courses: ['CS502'], source: '学期计划_大三' },
  ],

  alternativeCourses: [
    { originalId: 'CS301', alternativeId: 'CS501', reason: '内容深度更高，适合优秀学生', effectiveFrom: '2024-01-01', source: '替代课程_计算机' },
    { originalId: 'CS501', alternativeId: 'CS301', reason: '互为替代', effectiveFrom: '2024-01-01', source: '替代课程_计算机' },
    { originalId: 'CS101', alternativeId: 'ELEC101', reason: '转专业学生可选', effectiveFrom: '2024-01-01', source: '替代课程_跨学科' },
    { originalId: 'MATH101', alternativeId: 'MATH201', reason: '先修要求不同', effectiveFrom: '2024-01-01', source: '替代课程_数学' },
    { originalId: 'CS402', alternativeId: 'CS403', reason: '软件工程可替代人工智能导论', effectiveFrom: '2024-01-01', source: '替代课程_计算机' },
  ],

  studentGrades: [
    { id: 'S001', name: '张三', gradeLevel: 2, completedCourses: ['CS101', 'CS102', 'MATH101', 'MATH102', 'ENG101'], source: '学生成绩_2023' },
    { id: 'S002', name: '李四', gradeLevel: 2, completedCourses: ['CS101', 'CS102', 'CS201', 'MATH101', 'MATH102', 'ENG101', 'ENG102'], source: '学生成绩_2023' },
    { id: 'S003', name: '王五', gradeLevel: 3, completedCourses: ['CS101', 'CS102', 'CS201', 'CS202', 'CS301', 'MATH101', 'MATH102', 'MATH201', 'ENG101', 'ENG102', 'PHY101'], source: '学生成绩_2022' },
    { id: 'S004', name: '赵六', gradeLevel: 1, completedCourses: [], source: '学生成绩_2024' },
  ],
};

export function getSampleData(): DataBundle {
  return JSON.parse(JSON.stringify(sampleData));
}

export function getCleanSampleData(): DataBundle {
  const data = getSampleData();

  data.prerequisites = data.prerequisites.filter(
    p => p.source !== '先修关系_错误'
  );

  data.alternativeCourses = data.alternativeCourses.filter(
    a => !(a.originalId === 'CS501' && a.alternativeId === 'CS301')
  );

  data.semesterPlans = data.semesterPlans.map(plan => {
    if (plan.studentGrade === 2 && plan.semester === 1) {
      return {
        ...plan,
        courses: plan.courses.filter(c => c !== 'CS101'),
      };
    }
    return plan;
  });

  return data;
}

export function getSampleDataWithDescription(): { data: DataBundle; description: string } {
  return {
    data: getSampleData(),
    description: `样例数据包包含：
- 20门课程（计算机、数学、英语、物理、电子工程）
- 21条先修关系（含2条故意引入的循环依赖错误）
- 6个学期计划（含1个重复修读错误）
- 5条替代课程（含1对循环替代、1条先修不匹配）
- 4名不同年级的学生

故意引入的异常包括：
1. CS302 ↔ CS401 循环依赖
2. CS301 ↔ CS303 循环依赖
3. CS301 ↔ CS501 循环替代
4. MATH101 → MATH201 替代课先修不匹配
5. 大二第一学期重复修读CS101`,
  };
}
