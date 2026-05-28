import { TopologicalSort } from '../src/algorithms/TopologicalSort';
import { Course, Prerequisite } from '../src/models/types';

describe('TopologicalSort', () => {
  const courses: Course[] = [
    { id: 'CS101', name: '计算机导论', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS102', name: '程序设计基础', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS201', name: '数据结构', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS202', name: '离散数学', credits: 3, department: '计算机学院', source: 'test' },
    { id: 'CS301', name: '算法设计与分析', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS302', name: '操作系统', credits: 4, department: '计算机学院', source: 'test' },
    { id: 'CS401', name: '计算机网络', credits: 4, department: '计算机学院', source: 'test' },
  ];

  describe('无环图排序', () => {
    const prerequisites: Prerequisite[] = [
      { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
      { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
      { courseId: 'CS202', prerequisiteId: 'CS101', type: 'required', source: 'test' },
      { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: 'test' },
      { courseId: 'CS301', prerequisiteId: 'CS202', type: 'required', source: 'test' },
      { courseId: 'CS302', prerequisiteId: 'CS201', type: 'required', source: 'test' },
      { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: 'test' },
    ];

    it('应该正确执行拓扑排序', () => {
      const ts = new TopologicalSort(courses, prerequisites);
      const result = ts.sort();
      expect(result.hasCycle).toBe(false);
      expect(result.order.length).toBe(courses.length);

      const orderMap = new Map<string, number>();
      result.order.forEach((id, index) => orderMap.set(id, index));

      expect(orderMap.get('CS101')!).toBeLessThan(orderMap.get('CS102')!);
      expect(orderMap.get('CS102')!).toBeLessThan(orderMap.get('CS201')!);
      expect(orderMap.get('CS201')!).toBeLessThan(orderMap.get('CS301')!);
      expect(orderMap.get('CS202')!).toBeLessThan(orderMap.get('CS301')!);
    });

    it('应该找到所有路径', () => {
      const ts = new TopologicalSort(courses, prerequisites);
      const paths = ts.getAllPaths('CS101', 'CS301');
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.some(p =>
        p.includes('CS101') && p.includes('CS102') && p.includes('CS201') && p.includes('CS301')
      )).toBe(true);
      expect(paths.some(p =>
        p.includes('CS101') && p.includes('CS202') && p.includes('CS301')
      )).toBe(true);
    });

    it('应该找到先修路径', () => {
      const ts = new TopologicalSort(courses, prerequisites);
      const path = ts.getPrerequisitePath('CS101', 'CS401');
      expect(path).not.toBeNull();
      expect(path![0]).toBe('CS101');
      expect(path![path!.length - 1]).toBe('CS401');
    });

    it('不应该检测到环', () => {
      const ts = new TopologicalSort(courses, prerequisites);
      const cycles = ts.findAllCycles();
      expect(cycles.length).toBe(0);
    });

    it('应该计算正确的入度', () => {
      const ts = new TopologicalSort(courses, prerequisites);
      const result = ts.sort();
      expect(result.inDegree['CS101']).toBe(0);
      expect(result.inDegree['CS102']).toBe(1);
      expect(result.inDegree['CS301']).toBe(2);
    });
  });

  describe('有环图检测', () => {
    const cyclicPrerequisites: Prerequisite[] = [
      { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
      { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
      { courseId: 'CS302', prerequisiteId: 'CS401', type: 'required', source: 'test' },
      { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: 'test' },
    ];

    it('应该检测到环', () => {
      const ts = new TopologicalSort(courses, cyclicPrerequisites);
      const result = ts.sort();
      expect(result.hasCycle).toBe(true);
      expect(result.cycles.length).toBeGreaterThan(0);
    });

    it('应该找到所有环', () => {
      const ts = new TopologicalSort(courses, cyclicPrerequisites);
      const cycles = ts.findAllCycles();
      expect(cycles.length).toBe(1);
      expect(cycles[0]).toContain('CS302');
      expect(cycles[0]).toContain('CS401');
    });

    it('应该正确识别参与环的课程', () => {
      const ts = new TopologicalSort(courses, cyclicPrerequisites);
      const involved = ts.getInvolvedInCycles();
      expect(involved.has('CS302')).toBe(true);
      expect(involved.has('CS401')).toBe(true);
      expect(involved.has('CS101')).toBe(false);
    });
  });

  describe('多环检测', () => {
    const multiCyclePrerequisites: Prerequisite[] = [
      { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
      { courseId: 'CS101', prerequisiteId: 'CS102', type: 'required', source: 'test' },
      { courseId: 'CS302', prerequisiteId: 'CS401', type: 'required', source: 'test' },
      { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: 'test' },
    ];

    it('应该检测到多个环', () => {
      const ts = new TopologicalSort(courses, multiCyclePrerequisites);
      const cycles = ts.findAllCycles();
      expect(cycles.length).toBe(2);
    });
  });

  describe('边界情况', () => {
    it('处理单个课程', () => {
      const singleCourse: Course[] = [
        { id: 'CS101', name: '计算机导论', credits: 4, department: '计算机学院', source: 'test' }
      ];
      const ts = new TopologicalSort(singleCourse, []);
      const result = ts.sort();
      expect(result.hasCycle).toBe(false);
      expect(result.order).toEqual(['CS101']);
    });

    it('处理无先修关系', () => {
      const ts = new TopologicalSort(courses, []);
      const result = ts.sort();
      expect(result.hasCycle).toBe(false);
      expect(result.order.length).toBe(courses.length);
    });

    it('处理不存在的路径', () => {
      const ts = new TopologicalSort(courses, []);
      const path = ts.getPrerequisitePath('CS101', 'CS999');
      expect(path).toBeNull();
    });

    it('路径深度限制应该生效', () => {
      const prerequisites: Prerequisite[] = [
        { courseId: 'CS102', prerequisiteId: 'CS101', type: 'required', source: 'test' },
        { courseId: 'CS201', prerequisiteId: 'CS102', type: 'required', source: 'test' },
        { courseId: 'CS301', prerequisiteId: 'CS201', type: 'required', source: 'test' },
        { courseId: 'CS302', prerequisiteId: 'CS301', type: 'required', source: 'test' },
        { courseId: 'CS401', prerequisiteId: 'CS302', type: 'required', source: 'test' },
      ];
      const ts = new TopologicalSort(courses, prerequisites);
      const paths = ts.getAllPaths('CS101', 'CS401', 3);
      expect(paths.length).toBe(0);
    });
  });
});
