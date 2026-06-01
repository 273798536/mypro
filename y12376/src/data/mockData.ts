import dayjs from 'dayjs';
import type { Student, CoursePackage, LeaveRecord, Evaluation, RenewalAlert, TimelineEvent, OperationLog } from '../types';

export const mockStudents: Student[] = [
  { id: 's001', name: '张小明', phone: '138****1234', courseType: '钢琴', teacher: '李老师', enrollDate: '2025-09-15' },
  { id: 's002', name: '王芳', phone: '139****5678', courseType: '小提琴', teacher: '陈老师', enrollDate: '2025-08-20' },
  { id: 's003', name: '刘华', phone: '137****9012', courseType: '吉他', teacher: '王老师', enrollDate: '2025-10-01' },
  { id: 's004', name: '陈静', phone: '136****3456', courseType: '声乐', teacher: '赵老师', enrollDate: '2025-07-10' },
  { id: 's005', name: '赵强', phone: '135****7890', courseType: '钢琴', teacher: '李老师', enrollDate: '2025-06-05' },
  { id: 's006', name: '孙丽', phone: '134****2345', courseType: '古筝', teacher: '周老师', enrollDate: '2025-09-28' },
  { id: 's007', name: '周伟', phone: '133****6789', courseType: '架子鼓', teacher: '吴老师', enrollDate: '2025-08-15' },
  { id: 's008', name: '吴敏', phone: '132****0123', courseType: '小提琴', teacher: '陈老师', enrollDate: '2025-11-01' },
];

export const mockPackages: CoursePackage[] = [
  { id: 'p001', studentId: 's001', packageName: '钢琴精品班48课时', totalHours: 48, remainingHours: 8, purchaseDate: '2025-09-15', expireDate: '2026-09-15', status: 'active' },
  { id: 'p002', studentId: 's002', packageName: '小提琴初级班36课时', totalHours: 36, remainingHours: 3, purchaseDate: '2025-08-20', expireDate: '2026-08-20', status: 'active' },
  { id: 'p003', studentId: 's003', packageName: '吉他入门班24课时', totalHours: 24, remainingHours: 12, purchaseDate: '2025-10-01', expireDate: '2026-10-01', status: 'frozen', freezeRecords: [{ id: 'f001', startDate: '2025-12-01', endDate: '2025-12-15', reason: '学生外出旅游', operator: '教务员A' }] },
  { id: 'p004', studentId: 's004', packageName: '声乐进阶班48课时', totalHours: 48, remainingHours: 2, purchaseDate: '2025-07-10', expireDate: '2026-07-10', status: 'active' },
  { id: 'p005', studentId: 's005', packageName: '钢琴高级班60课时', totalHours: 60, remainingHours: 25, purchaseDate: '2025-06-05', expireDate: '2026-06-05', status: 'active' },
  { id: 'p006', studentId: 's006', packageName: '古筝初级班36课时', totalHours: 36, remainingHours: 18, purchaseDate: '2025-09-28', expireDate: '2026-09-28', status: 'active' },
  { id: 'p007', studentId: 's007', packageName: '架子鼓入门班24课时', totalHours: 24, remainingHours: 4, purchaseDate: '2025-08-15', expireDate: '2026-08-15', status: 'active' },
  { id: 'p008', studentId: 's008', packageName: '小提琴启蒙班24课时', totalHours: 24, remainingHours: 20, purchaseDate: '2025-11-01', expireDate: '2026-11-01', status: 'active' },
];

export const mockLeaves: LeaveRecord[] = [
  { id: 'l001', studentId: 's001', leaveDate: '2025-12-10', reason: '感冒发烧', hours: 1, status: 'approved', makeUpClass: { id: 'm001', scheduledDate: '2025-12-17', teacher: '李老师', status: 'scheduled' } },
  { id: 'l002', studentId: 's002', leaveDate: '2025-12-05', reason: '学校有活动', hours: 1, status: 'approved' },
  { id: 'l003', studentId: 's003', leaveDate: '2025-11-28', reason: '家庭外出', hours: 2, status: 'approved', makeUpClass: { id: 'm002', scheduledDate: '2025-12-05', teacher: '王老师', status: 'completed' } },
  { id: 'l004', studentId: 's004', leaveDate: '2025-12-08', reason: '嗓子不舒服', hours: 1, status: 'pending' },
  { id: 'l005', studentId: 's007', leaveDate: '2025-12-03', reason: '考试复习', hours: 1, status: 'approved' },
];

export const mockEvaluations: Evaluation[] = [
  { id: 'e001', studentId: 's001', evalDate: '2025-11-15', type: 'monthly', score: 85, comment: '弹奏流畅，继续保持', status: 'completed' },
  { id: 'e002', studentId: 's002', evalDate: null, type: 'monthly', status: 'missing' },
  { id: 'e003', studentId: 's003', evalDate: '2025-11-20', type: 'monthly', score: 72, comment: '和弦转换需要加强练习', status: 'completed' },
  { id: 'e004', studentId: 's004', evalDate: '2025-11-10', type: 'monthly', score: 92, comment: '音准很好，表现力强', status: 'completed' },
  { id: 'e005', studentId: 's005', evalDate: '2025-11-25', type: 'quarterly', score: 88, comment: '技巧熟练，音乐感好', status: 'completed' },
  { id: 'e006', studentId: 's006', evalDate: null, type: 'monthly', status: 'pending' },
  { id: 'e007', studentId: 's007', evalDate: '2025-11-18', type: 'monthly', score: 78, comment: '节奏稳定，注意力度变化', status: 'completed' },
  { id: 'e008', studentId: 's008', evalDate: '2025-11-22', type: 'monthly', score: 82, comment: '持弓姿势正确，音准有待提高', status: 'completed' },
];

export const mockAlerts: RenewalAlert[] = [
  { id: 'a001', studentId: 's001', student: mockStudents[0], renewalProbability: 65, riskLevel: 'medium', remainingHours: 8, nextEvalDate: dayjs().add(5, 'day').format('YYYY-MM-DD'), lastEvalDate: '2025-11-15', hasConflict: false, processStatus: 'pending', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a002', studentId: 's002', student: mockStudents[1], renewalProbability: 35, riskLevel: 'critical', remainingHours: 3, nextEvalDate: dayjs().subtract(8, 'day').format('YYYY-MM-DD'), lastEvalDate: null, hasConflict: true, conflictDetails: '测评缺失且请假未安排补课', processStatus: 'processing', handler: '教务员A', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a003', studentId: 's003', student: mockStudents[2], renewalProbability: 55, riskLevel: 'medium', remainingHours: 12, nextEvalDate: dayjs().add(10, 'day').format('YYYY-MM-DD'), lastEvalDate: '2025-11-20', hasConflict: true, conflictDetails: '课包冻结记录延迟录入', processStatus: 'pending', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a004', studentId: 's004', student: mockStudents[3], renewalProbability: 28, riskLevel: 'critical', remainingHours: 2, nextEvalDate: dayjs().add(3, 'day').format('YYYY-MM-DD'), lastEvalDate: '2025-11-10', hasConflict: false, processStatus: 'processing', handler: '教务员B', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a005', studentId: 's005', student: mockStudents[4], renewalProbability: 85, riskLevel: 'low', remainingHours: 25, nextEvalDate: dayjs().add(15, 'day').format('YYYY-MM-DD'), lastEvalDate: '2025-11-25', hasConflict: false, processStatus: 'completed', handler: '教务员A', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a006', studentId: 's006', student: mockStudents[5], renewalProbability: 72, riskLevel: 'low', remainingHours: 18, nextEvalDate: dayjs().add(8, 'day').format('YYYY-MM-DD'), lastEvalDate: null, hasConflict: false, processStatus: 'pending', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a007', studentId: 's007', student: mockStudents[6], renewalProbability: 42, riskLevel: 'high', remainingHours: 4, nextEvalDate: dayjs().add(7, 'day').format('YYYY-MM-DD'), lastEvalDate: '2025-11-18', hasConflict: true, conflictDetails: '请假补课与测评时间冲突', processStatus: 'pending', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
  { id: 'a008', studentId: 's008', student: mockStudents[7], renewalProbability: 78, riskLevel: 'low', remainingHours: 20, nextEvalDate: dayjs().add(12, 'day').format('YYYY-MM-DD'), lastEvalDate: '2025-11-22', hasConflict: false, processStatus: 'pending', updateTime: dayjs().format('YYYY-MM-DD HH:mm') },
];

export const getTimelineEvents = (studentId: string): TimelineEvent[] => {
  const events: TimelineEvent[] = [];
  const student = mockStudents.find(s => s.id === studentId);
  const pkg = mockPackages.find(p => p.studentId === studentId);
  const leaves = mockLeaves.filter(l => l.studentId === studentId);
  const evals = mockEvaluations.filter(e => e.studentId === studentId);

  if (student) {
    events.push({
      id: `enroll-${studentId}`,
      date: student.enrollDate,
      type: 'package',
      title: '入学报名',
      description: `${student.courseType}课程 - ${student.teacher}`,
      status: 'info'
    });
  }

  if (pkg) {
    events.push({
      id: `pkg-${pkg.id}`,
      date: pkg.purchaseDate,
      type: 'package',
      title: '购买课包',
      description: `${pkg.packageName}（共${pkg.totalHours}课时）`,
      status: 'normal'
    });

    if (pkg.freezeRecords) {
      pkg.freezeRecords.forEach(f => {
        events.push({
          id: `freeze-${f.id}`,
          date: f.startDate,
          type: 'freeze',
          title: '课包冻结',
          description: `原因：${f.reason}，操作人：${f.operator}`,
          status: 'warning'
        });
      });
    }
  }

  leaves.forEach(l => {
    events.push({
      id: `leave-${l.id}`,
      date: l.leaveDate,
      type: 'leave',
      title: '请假申请',
      description: `${l.reason}（${l.hours}课时）- ${l.status === 'approved' ? '已批准' : l.status === 'pending' ? '待审批' : '已拒绝'}`,
      status: l.status === 'approved' ? 'warning' : l.status === 'pending' ? 'info' : 'danger'
    });

    if (l.makeUpClass) {
      events.push({
        id: `makeup-${l.makeUpClass.id}`,
        date: l.makeUpClass.scheduledDate,
        type: 'makeup',
        title: '补课安排',
        description: `${l.makeUpClass.teacher} - ${l.makeUpClass.status === 'completed' ? '已完成' : '已预约'}`,
        status: l.makeUpClass.status === 'completed' ? 'normal' : 'info'
      });
    }
  });

  evals.forEach(e => {
    events.push({
      id: `eval-${e.id}`,
      date: e.evalDate || dayjs().format('YYYY-MM-DD'),
      type: 'evaluation',
      title: e.status === 'completed' ? '月度测评' : e.status === 'missing' ? '测评缺失' : '待测评',
      description: e.status === 'completed' ? `得分：${e.score}分 - ${e.comment}` : '未按时完成测评',
      status: e.status === 'completed' ? 'normal' : e.status === 'missing' ? 'danger' : 'warning'
    });
  });

  return events.sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf());
};

export const mockLogs: OperationLog[] = [
  { id: 'log001', operator: '教务员A', operateTime: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm:ss'), action: '更新续费预测', targetId: 'a002', targetType: 'alert', beforeData: { renewalProbability: 45, riskLevel: 'high' }, afterData: { renewalProbability: 35, riskLevel: 'critical' }, ip: '192.168.1.101' },
  { id: 'log002', operator: '教务员B', operateTime: dayjs().subtract(5, 'hour').format('YYYY-MM-DD HH:mm:ss'), action: '标记处理中', targetId: 'a004', targetType: 'alert', ip: '192.168.1.102' },
  { id: 'log003', operator: '教务员A', operateTime: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm:ss'), action: '完成续费跟进', targetId: 'a005', targetType: 'alert', ip: '192.168.1.101' },
  { id: 'log004', operator: '系统', operateTime: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'), action: '自动检测冲突', targetId: 'a002', targetType: 'alert', ip: '127.0.0.1' },
  { id: 'log005', operator: '教务员C', operateTime: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'), action: '更新学生档案', targetId: 's001', targetType: 'student', ip: '192.168.1.103' },
  { id: 'log006', operator: '系统', operateTime: dayjs().subtract(4, 'day').format('YYYY-MM-DD HH:mm:ss'), action: '生成预警记录', targetId: 'a007', targetType: 'alert', ip: '127.0.0.1' },
  { id: 'log007', operator: '校长', operateTime: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'), action: '导出异常清单', targetId: 'export', targetType: 'system', ip: '192.168.1.1' },
];

export const courseTypes = ['钢琴', '小提琴', '吉他', '声乐', '古筝', '架子鼓', '大提琴'];

export const exportFields = [
  { key: 'student.name', label: '学生姓名' },
  { key: 'student.courseType', label: '课程类型' },
  { key: 'student.teacher', label: '授课老师' },
  { key: 'renewalProbability', label: '续费概率' },
  { key: 'riskLevel', label: '风险等级' },
  { key: 'remainingHours', label: '剩余课时' },
  { key: 'hasConflict', label: '数据冲突' },
  { key: 'processStatus', label: '处理状态' },
  { key: 'handler', label: '处理人' },
  { key: 'updateTime', label: '更新时间' },
];
