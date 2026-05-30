import type { MemberBehavior, MemberState } from '../types';

const MEMBER_NAMES = [
  '张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十',
  '郑十一', '陈十二', '刘十三', '杨十四', '黄十五', '朱十六',
  '林十七', '何十八', '高十九', '梁二十', '宋二十一', '唐二十二',
];

export function generateMockData(memberCount: number = 30): MemberBehavior[] {
  const behaviors: MemberBehavior[] = [];
  const now = new Date();

  for (let i = 0; i < memberCount; i++) {
    const memberId = `M${String(i + 1).padStart(3, '0')}`;
    const memberName = MEMBER_NAMES[i % MEMBER_NAMES.length];
    const joinDate = new Date(now.getTime() - Math.random() * 730 * 24 * 60 * 60 * 1000);
    const value = Math.floor(Math.random() * 2000) + 100;

    const stateSequence = generateStateSequence();
    let currentDate = new Date(joinDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    stateSequence.forEach((state, idx) => {
      const daysToAdd = Math.floor(Math.random() * 14) + 7;
      currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      if (currentDate > now) return;

      const isTouch = idx > 0 && Math.random() < 0.3;
      const remark = generateRemark(state, idx === 0);
      const source = isTouch ? 'campaign' : (Math.random() < 0.5 ? 'app' : 'system');

      behaviors.push({
        memberId,
        memberName,
        timestamp: currentDate.toISOString(),
        state,
        remark,
        source,
        isTouch,
        value: idx === 0 ? value : undefined,
        joinDate: idx === 0 ? joinDate.toISOString().split('T')[0] : undefined,
      });
    });
  }

  return behaviors;
}

function generateStateSequence(): MemberState[] {
  const states: MemberState[] = ['active'];
  const rand = Math.random();

  if (rand < 0.2) {
    states.push('active', 'active');
  } else if (rand < 0.4) {
    states.push('active', 'inactive', 'active');
  } else if (rand < 0.6) {
    states.push('inactive', 'dormant');
  } else if (rand < 0.75) {
    states.push('inactive', 'dormant', 'churned');
  } else if (rand < 0.85) {
    states.push('inactive', 'dormant', 'recalled', 'active');
  } else if (rand < 0.95) {
    states.push('churned', 'recalled', 'inactive');
  } else {
    states.push('active', 'inactive', 'active', 'inactive', 'dormant');
  }

  return states;
}

function generateRemark(state: MemberState, isFirst: boolean): string | undefined {
  if (isFirst) {
    return '注册会员';
  }

  const remarks: Record<MemberState, string[]> = {
    active: ['登录活跃', '完成购买', '参与活动', '浏览商品'],
    inactive: ['7天未登录', '未打开APP', '无浏览行为'],
    dormant: ['30天未登录', '沉睡用户', '60天无行为'],
    churned: ['90天未登录', '已流失', '长时间无响应'],
    recalled: ['召回成功', '活动唤醒', '优惠券召回'],
  };

  const options = remarks[state];
  return options[Math.floor(Math.random() * options.length)];
}

export function generateDirtyMockData(): MemberBehavior[] {
  const cleanData = generateMockData(25);
  const dirtyData: MemberBehavior[] = [...cleanData];
  const now = new Date();

  dirtyData.push({
    memberId: 'M026',
    memberName: '测试用户1',
    timestamp: now.toISOString(),
    state: 'active' as MemberState,
    remark: '数据完整',
    source: 'app',
    value: 500,
    joinDate: '2023-01-15',
  });

  dirtyData.push({
    memberId: '',
    memberName: '缺失ID用户',
    timestamp: now.toISOString(),
    state: 'inactive' as MemberState,
    remark: '会员ID缺失',
  });

  dirtyData.push({
    memberId: 'M028',
    memberName: '状态异常',
    timestamp: now.toISOString(),
    state: 'active' as MemberState,
  });

  dirtyData.push({
    memberId: 'M028',
    memberName: '状态异常',
    timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    state: 'churned' as MemberState,
    remark: '从流失直接跳活跃，异常跳转',
  });

  dirtyData.push({
    memberId: 'M029',
    memberName: '重复触达',
    timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
    state: 'dormant' as MemberState,
    isTouch: true,
    remark: '活动触达',
    source: 'sms',
  });

  dirtyData.push({
    memberId: 'M029',
    memberName: '重复触达',
    timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    state: 'dormant' as MemberState,
    isTouch: true,
    remark: '活动触达-重复',
    source: 'push',
  });

  dirtyData.push({
    memberId: 'M030',
    memberName: '数据晚到',
    timestamp: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    state: 'inactive' as MemberState,
    remark: '超出90天窗口',
  });

  return dirtyData;
}
