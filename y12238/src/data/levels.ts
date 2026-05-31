import { Level, Truck, TruckVersion, ShiftRecord } from '@/types';

const createTruck = (
  id: string,
  plateNumber: string,
  driverName: string,
  appointmentNo: string,
  appointmentTime: Date,
  remark: string,
  shiftType: string,
  shiftHours: number,
  expectedDecision: 'release' | 'detain' | 'transfer'
): Truck => {
  const now = new Date();
  const startTime = new Date(now.getTime() - shiftHours * 60 * 60 * 1000);
  const endTime = new Date(startTime.getTime() + 8 * 60 * 60 * 1000);
  
  const initialVersion: TruckVersion = {
    id: `${id}-v1`,
    version: 1,
    remark,
    timestamp: now,
    operator: '系统初始化',
  };

  const shiftRecord: ShiftRecord = {
    id: `${id}-shift`,
    shiftType,
    startTime,
    endTime,
    isOvertime: false,
  };

  return {
    id,
    plateNumber,
    driverName,
    appointmentNo,
    appointmentTime,
    currentRemark: remark,
    currentVersion: 1,
    versionHistory: [initialVersion],
    shiftRecord,
    expectedDecision,
  };
};

export const LEVELS: Level[] = [
  {
    id: 'level-1',
    name: '入门关卡',
    difficulty: 1,
    description: '基础排队规则练习，处理5辆集卡，学习基本判定流程',
    passScore: 80,
    yardVersion: 1,
    initialTrucks: [
      createTruck(
        'truck-1',
        '沪A·12345',
        '张三',
        'APP-2024-001',
        new Date(Date.now() + 30 * 60 * 1000),
        '正常货物，优先放行',
        '早班',
        4,
        'release'
      ),
      createTruck(
        'truck-2',
        '沪B·67890',
        '李四',
        'APP-2024-002',
        new Date(Date.now() + 60 * 60 * 1000),
        '危险品，需检查',
        '早班',
        5,
        'detain'
      ),
      createTruck(
        'truck-3',
        '沪C·54321',
        '王五',
        'APP-2024-003',
        new Date(Date.now() + 90 * 60 * 1000),
        '转场至B区',
        '中班',
        2,
        'transfer'
      ),
      createTruck(
        'truck-4',
        '沪D·09876',
        '赵六',
        'APP-2024-004',
        new Date(Date.now() + 120 * 60 * 1000),
        '正常货物',
        '中班',
        3,
        'release'
      ),
      createTruck(
        'truck-5',
        '沪E·11223',
        '钱七',
        'APP-2024-005',
        new Date(Date.now() + 150 * 60 * 1000),
        '大件货物，需确认',
        '晚班',
        1,
        'detain'
      ),
    ],
    events: [
      {
        triggerStep: 2,
        type: 'remark_change',
        truckId: 'truck-2',
        data: { newRemark: '危险品已安检，可以放行' },
        message: '集卡 [沪B·67890] 备注更新：危险品已安检，可以放行',
      },
    ],
  },
  {
    id: 'level-2',
    name: '进阶关卡',
    difficulty: 2,
    description: '处理备注变更、堆场更新和闸口冲突场景',
    passScore: 70,
    yardVersion: 1,
    initialTrucks: [
      createTruck(
        'truck-1',
        '苏A·11111',
        '陈一',
        'APP-2024-006',
        new Date(Date.now() + 20 * 60 * 1000),
        '生鲜货物，优先处理',
        '早班',
        6,
        'release'
      ),
      createTruck(
        'truck-2',
        '苏B·22222',
        '林二',
        'APP-2024-007',
        new Date(Date.now() + 40 * 60 * 1000),
        '海关查验',
        '早班',
        7,
        'detain'
      ),
      createTruck(
        'truck-3',
        '苏C·33333',
        '黄三',
        'APP-2024-008',
        new Date(Date.now() + 60 * 60 * 1000),
        '转场至C区',
        '中班',
        4,
        'transfer'
      ),
      createTruck(
        'truck-4',
        '苏D·44444',
        '周四',
        'APP-2024-009',
        new Date(Date.now() + 80 * 60 * 1000),
        '普通货物',
        '中班',
        5,
        'release'
      ),
      createTruck(
        'truck-5',
        '苏E·55555',
        '吴五',
        'APP-2024-010',
        new Date(Date.now() + 100 * 60 * 1000),
        '冷藏货物',
        '中班',
        6,
        'release'
      ),
      createTruck(
        'truck-6',
        '苏F·66666',
        '郑六',
        'APP-2024-011',
        new Date(Date.now() + 120 * 60 * 1000),
        '待检验',
        '晚班',
        2,
        'detain'
      ),
      createTruck(
        'truck-7',
        '苏G·77777',
        '冯七',
        'APP-2024-012',
        new Date(Date.now() + 140 * 60 * 1000),
        '转场至A区',
        '晚班',
        3,
        'transfer'
      ),
      createTruck(
        'truck-8',
        '苏H·88888',
        '褚八',
        'APP-2024-013',
        new Date(Date.now() + 160 * 60 * 1000),
        '贵重物品',
        '晚班',
        4,
        'detain'
      ),
    ],
    events: [
      {
        triggerStep: 2,
        type: 'remark_change',
        truckId: 'truck-2',
        data: { newRemark: '海关查验完成，准予放行' },
        message: '集卡 [苏B·22222] 备注更新：海关查验完成，准予放行',
      },
      {
        triggerStep: 4,
        type: 'yard_update',
        data: { newVersion: 2 },
        message: '堆场版本更新至 v2：C区暂停接收，请转至D区',
      },
      {
        triggerStep: 5,
        type: 'remark_change',
        truckId: 'truck-6',
        data: { newRemark: '检验通过' },
        message: '集卡 [苏F·66666] 备注更新：检验通过',
      },
    ],
  },
  {
    id: 'level-3',
    name: '挑战关卡',
    difficulty: 3,
    description: '综合场景：班次超时、预约过号、多次版本变更',
    passScore: 60,
    yardVersion: 1,
    initialTrucks: [
      createTruck(
        'truck-1',
        '浙A·99999',
        '卫一',
        'APP-2024-014',
        new Date(Date.now() - 10 * 60 * 1000),
        '紧急物资',
        '早班',
        9,
        'release'
      ),
      createTruck(
        'truck-2',
        '浙B·88888',
        '蒋二',
        'APP-2024-015',
        new Date(Date.now() + 30 * 60 * 1000),
        '普通货物',
        '早班',
        8,
        'release'
      ),
      createTruck(
        'truck-3',
        '浙C·77777',
        '沈三',
        'APP-2024-016',
        new Date(Date.now() + 50 * 60 * 1000),
        '保税货物',
        '中班',
        7,
        'detain'
      ),
      createTruck(
        'truck-4',
        '浙D·66666',
        '韩四',
        'APP-2024-017',
        new Date(Date.now() - 30 * 60 * 1000),
        '预约已过号',
        '中班',
        6,
        'detain'
      ),
      createTruck(
        'truck-5',
        '浙E·55555',
        '杨五',
        'APP-2024-018',
        new Date(Date.now() + 70 * 60 * 1000),
        '转场货物',
        '中班',
        5,
        'transfer'
      ),
      createTruck(
        'truck-6',
        '浙F·44444',
        '朱六',
        'APP-2024-019',
        new Date(Date.now() + 90 * 60 * 1000),
        '危险品',
        '晚班',
        4,
        'detain'
      ),
      createTruck(
        'truck-7',
        '浙G·33333',
        '秦七',
        'APP-2024-020',
        new Date(Date.now() + 110 * 60 * 1000),
        '生鲜冷链',
        '晚班',
        3,
        'release'
      ),
      createTruck(
        'truck-8',
        '浙H·22222',
        '尤八',
        'APP-2024-021',
        new Date(Date.now() + 130 * 60 * 1000),
        '大件运输',
        '晚班',
        2,
        'transfer'
      ),
      createTruck(
        'truck-9',
        '浙J·11111',
        '许九',
        'APP-2024-022',
        new Date(Date.now() + 150 * 60 * 1000),
        '普通货物',
        '夜班',
        1,
        'release'
      ),
      createTruck(
        'truck-10',
        '浙K·00000',
        '何十',
        'APP-2024-023',
        new Date(Date.now() + 170 * 60 * 1000),
        '海关监管',
        '夜班',
        0,
        'detain'
      ),
      createTruck(
        'truck-11',
        '皖A·12121',
        '吕一',
        'APP-2024-024',
        new Date(Date.now() + 190 * 60 * 1000),
        '中转货物',
        '夜班',
        0,
        'transfer'
      ),
      createTruck(
        'truck-12',
        '皖B·34343',
        '施二',
        'APP-2024-025',
        new Date(Date.now() + 210 * 60 * 1000),
        '易碎品',
        '夜班',
        0,
        'release'
      ),
    ],
    events: [
      {
        triggerStep: 1,
        type: 'shift_overtime',
        truckId: 'truck-1',
        data: { overtimeMinutes: 60 },
        message: '警告：集卡 [浙A·99999] 司机班次已超时1小时',
      },
      {
        triggerStep: 2,
        type: 'remark_change',
        truckId: 'truck-3',
        data: { newRemark: '保税货物审批通过' },
        message: '集卡 [浙C·77777] 备注更新：保税货物审批通过',
      },
      {
        triggerStep: 3,
        type: 'yard_update',
        data: { newVersion: 2 },
        message: '堆场版本更新至 v2：A区泊位已满',
      },
      {
        triggerStep: 4,
        type: 'appointment_overdue',
        truckId: 'truck-4',
        data: { overdueMinutes: 30 },
        message: '集卡 [浙D·66666] 预约已过号30分钟',
      },
      {
        triggerStep: 6,
        type: 'remark_change',
        truckId: 'truck-6',
        data: { newRemark: '危险品报备完成' },
        message: '集卡 [浙F·44444] 备注更新：危险品报备完成',
      },
      {
        triggerStep: 7,
        type: 'yard_update',
        data: { newVersion: 3 },
        message: '堆场版本更新至 v3：D区恢复作业',
      },
      {
        triggerStep: 8,
        type: 'remark_change',
        truckId: 'truck-10',
        data: { newRemark: '海关放行' },
        message: '集卡 [浙K·00000] 备注更新：海关放行',
      },
    ],
  },
];

export const getLevelById = (id: string): Level | undefined => {
  return LEVELS.find(level => level.id === id);
};
