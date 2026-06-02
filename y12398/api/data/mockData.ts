import type { Device, BorrowRecord, Anomaly, InventoryCheck } from '../../shared/types';

export const mockDevices: Device[] = [
  {
    id: 'DEV-001',
    name: 'Yamaha C40 古典吉他',
    category: '弦乐器',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classical%20guitar%20yamaha%20on%20wooden%20stand%20professional%20photo&image_size=square_hd',
    status: 'borrowed',
    currentBorrower: '张明',
    notes: [
      {
        id: 'NOTE-001',
        content: '2024年秋季购入，状态良好，音色饱满',
        author: '李老师',
        timestamp: '2024-09-15T10:30:00Z',
        version: 1
      },
      {
        id: 'NOTE-002',
        content: '备注更新：1弦有轻微磨损，建议下次归还时更换',
        author: '王老师',
        timestamp: '2026-05-20T14:20:00Z',
        version: 2
      }
    ],
    createdAt: '2024-09-15T10:00:00Z',
    updatedAt: '2026-05-20T14:20:00Z'
  },
  {
    id: 'DEV-002',
    name: 'Casio PX-S7000 电钢琴',
    category: '键盘乐器',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=digital%20piano%20casio%20black%20sleek%20design%20music%20room&image_size=square_hd',
    status: 'in_stock',
    currentBorrower: null,
    notes: [
      {
        id: 'NOTE-003',
        content: '88键重锤，音质优秀，适合演出和练习',
        author: '李老师',
        timestamp: '2024-11-20T09:15:00Z',
        version: 1
      }
    ],
    createdAt: '2024-11-20T09:00:00Z',
    updatedAt: '2024-11-20T09:15:00Z'
  },
  {
    id: 'DEV-003',
    name: 'Pearl Export 架子鼓',
    category: '打击乐器',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=pearl%20drum%20set%20red%20professional%20stage%20lighting&image_size=square_hd',
    status: 'anomaly',
    currentBorrower: '李华',
    notes: [
      {
        id: 'NOTE-004',
        content: '5鼓3镲配置，演出专用',
        author: '王老师',
        timestamp: '2025-01-10T16:45:00Z',
        version: 1
      },
      {
        id: 'NOTE-005',
        content: '损坏备注：军鼓边缘有凹陷，踩镲架螺丝松动',
        author: '张同学',
        timestamp: '2026-05-25T11:30:00Z',
        version: 2
      }
    ],
    createdAt: '2025-01-10T16:00:00Z',
    updatedAt: '2026-05-25T11:30:00Z'
  },
  {
    id: 'DEV-004',
    name: 'Shure SM58 麦克风',
    category: '音频设备',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=shure%20sm58%20microphone%20professional%20black%20background&image_size=square_hd',
    status: 'borrowed',
    currentBorrower: '王芳',
    notes: [
      {
        id: 'NOTE-006',
        content: '经典人声麦克风，共3支',
        author: '李老师',
        timestamp: '2025-03-05T11:20:00Z',
        version: 1
      }
    ],
    createdAt: '2025-03-05T11:00:00Z',
    updatedAt: '2025-03-05T11:20:00Z'
  },
  {
    id: 'DEV-005',
    name: 'Yamaha YFL-222 长笛',
    category: '管乐器',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=silver%20flute%20yamaha%20on%20velvet%20case%20elegant&image_size=square_hd',
    status: 'damaged',
    currentBorrower: null,
    notes: [
      {
        id: 'NOTE-007',
        content: '标准C调长笛，适合初学者',
        author: '王老师',
        timestamp: '2025-04-12T14:30:00Z',
        version: 1
      },
      {
        id: 'NOTE-008',
        content: '损坏备注：吹口垫破损，需送修',
        author: '李同学',
        timestamp: '2026-05-28T09:15:00Z',
        version: 2
      }
    ],
    createdAt: '2025-04-12T14:00:00Z',
    updatedAt: '2026-05-28T09:15:00Z'
  },
  {
    id: 'DEV-006',
    name: 'Line 6 Spider V 吉他音箱',
    category: '音频设备',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=guitar%20amplifier%20line%206%20black%20rock%20stage&image_size=square_hd',
    status: 'in_stock',
    currentBorrower: null,
    notes: [
      {
        id: 'NOTE-009',
        content: '120W大功率，多种效果预设',
        author: '李老师',
        timestamp: '2025-06-18T10:45:00Z',
        version: 1
      }
    ],
    createdAt: '2025-06-18T10:00:00Z',
    updatedAt: '2025-06-18T10:45:00Z'
  },
  {
    id: 'DEV-007',
    name: 'Korg PA700 编曲键盘',
    category: '键盘乐器',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=korg%20arranger%20keyboard%20professional%20music%20studio&image_size=square_hd',
    status: 'borrowed',
    currentBorrower: '赵强',
    notes: [
      {
        id: 'NOTE-010',
        content: '专业编曲键盘，含海量音色和节奏',
        author: '王老师',
        timestamp: '2025-08-22T15:30:00Z',
        version: 1
      }
    ],
    createdAt: '2025-08-22T15:00:00Z',
    updatedAt: '2025-08-22T15:30:00Z'
  },
  {
    id: 'DEV-008',
    name: 'Adams 1号行进小号',
    category: '管乐器',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=brass%20trumpet%20gold%20polished%20on%20stand&image_size=square_hd',
    status: 'in_stock',
    currentBorrower: null,
    notes: [
      {
        id: 'NOTE-011',
        content: '降B调小号，漆面完好',
        author: '李老师',
        timestamp: '2025-10-10T09:00:00Z',
        version: 1
      }
    ],
    createdAt: '2025-10-10T09:00:00Z',
    updatedAt: '2025-10-10T09:00:00Z'
  }
];

export const mockRecords: BorrowRecord[] = [
  {
    id: 'REC-001',
    deviceId: 'DEV-001',
    deviceName: 'Yamaha C40 古典吉他',
    borrower: '张明',
    borrowDate: '2026-05-20T09:00:00Z',
    expectedReturnDate: '2026-05-27T18:00:00Z',
    actualReturnDate: null,
    status: 'overdue',
    damageNote: null,
    damagePhotoUrl: null,
    versions: [
      {
        id: 'VER-001',
        field: 'expectedReturnDate',
        oldValue: '2026-05-27T18:00:00Z',
        newValue: '2026-06-03T18:00:00Z',
        author: '李老师',
        timestamp: '2026-05-26T16:30:00Z',
        reason: '排练日程更新，延长借用时间'
      }
    ],
    createdAt: '2026-05-20T09:00:00Z',
    updatedAt: '2026-05-26T16:30:00Z'
  },
  {
    id: 'REC-002',
    deviceId: 'DEV-003',
    deviceName: 'Pearl Export 架子鼓',
    borrower: '李华',
    borrowDate: '2026-05-15T10:00:00Z',
    expectedReturnDate: '2026-05-22T18:00:00Z',
    actualReturnDate: null,
    status: 'overdue',
    damageNote: '军鼓边缘有凹陷，踩镲架螺丝松动',
    damagePhotoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=drum%20dent%20damage%20close%20up%20photo&image_size=square_hd',
    versions: [],
    createdAt: '2026-05-15T10:00:00Z',
    updatedAt: '2026-05-25T11:30:00Z'
  },
  {
    id: 'REC-003',
    deviceId: 'DEV-004',
    deviceName: 'Shure SM58 麦克风',
    borrower: '王芳',
    borrowDate: '2026-05-28T14:00:00Z',
    expectedReturnDate: '2026-06-04T18:00:00Z',
    actualReturnDate: null,
    status: 'borrowed',
    damageNote: null,
    damagePhotoUrl: null,
    versions: [],
    createdAt: '2026-05-28T14:00:00Z',
    updatedAt: '2026-05-28T14:00:00Z'
  },
  {
    id: 'REC-004',
    deviceId: 'DEV-007',
    deviceName: 'Korg PA700 编曲键盘',
    borrower: '赵强',
    borrowDate: '2026-05-25T08:30:00Z',
    expectedReturnDate: '2026-06-01T18:00:00Z',
    actualReturnDate: null,
    status: 'borrowed',
    damageNote: null,
    damagePhotoUrl: null,
    versions: [
      {
        id: 'VER-002',
        field: 'expectedReturnDate',
        oldValue: '2026-05-28T18:00:00Z',
        newValue: '2026-06-01T18:00:00Z',
        author: '王老师',
        timestamp: '2026-05-27T10:00:00Z',
        reason: '新版本排练日程安排'
      }
    ],
    createdAt: '2026-05-25T08:30:00Z',
    updatedAt: '2026-05-27T10:00:00Z'
  },
  {
    id: 'REC-005',
    deviceId: 'DEV-005',
    deviceName: 'Yamaha YFL-222 长笛',
    borrower: '陈静',
    borrowDate: '2026-05-10T13:00:00Z',
    expectedReturnDate: '2026-05-17T18:00:00Z',
    actualReturnDate: '2026-05-28T09:15:00Z',
    status: 'returned',
    damageNote: '吹口垫破损，需送修',
    damagePhotoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flute%20mouthpiece%20damage%20close%20up%20photo&image_size=square_hd',
    versions: [
      {
        id: 'VER-003',
        field: 'expectedReturnDate',
        oldValue: '2026-05-17T18:00:00Z',
        newValue: '2026-05-24T18:00:00Z',
        author: '李老师',
        timestamp: '2026-05-16T14:00:00Z',
        reason: '排练日程更新，被新版本覆盖的超时记录'
      }
    ],
    createdAt: '2026-05-10T13:00:00Z',
    updatedAt: '2026-05-28T09:15:00Z'
  },
  {
    id: 'REC-006',
    deviceId: 'DEV-001',
    deviceName: 'Yamaha C40 古典吉他',
    borrower: '周杰',
    borrowDate: '2026-05-01T09:00:00Z',
    expectedReturnDate: '2026-05-08T18:00:00Z',
    actualReturnDate: '2026-05-08T17:30:00Z',
    status: 'returned',
    damageNote: null,
    damagePhotoUrl: null,
    versions: [],
    createdAt: '2026-05-01T09:00:00Z',
    updatedAt: '2026-05-08T17:30:00Z'
  }
];

export const mockAnomalies: Anomaly[] = [
  {
    id: 'ANOM-001',
    type: 'overdue_return',
    severity: 'high',
    title: '设备归还超时',
    description: 'Yamaha C40 古典吉他已超过预定归还日期 6 天，原计划 5月27日 归还。虽然预期归还日期已更新至 6月3日，但原始超时记录已保留作为证据。',
    deviceId: 'DEV-001',
    recordIds: ['REC-001'],
    evidenceChain: [
      {
        id: 'EVID-001',
        type: 'borrow_record',
        title: '借出登记',
        content: '张明于 2026-05-20 借出 Yamaha C40 古典吉他，原定归还日期 2026-05-27',
        timestamp: '2026-05-20T09:00:00Z',
        photoUrl: null
      },
      {
        id: 'EVID-002',
        type: 'device_note',
        title: '设备备注（版本2）',
        content: '1弦有轻微磨损，建议下次归还时更换',
        timestamp: '2026-05-20T14:20:00Z',
        photoUrl: null
      },
      {
        id: 'EVID-003',
        type: 'return_record',
        title: '版本变更记录',
        content: '预期归还日期从 2026-05-27 修改为 2026-06-03，原因：排练日程更新。原始超时记录已保留。',
        timestamp: '2026-05-26T16:30:00Z',
        photoUrl: null
      }
    ],
    status: 'open',
    resolvedAt: null,
    resolutionNote: null,
    createdAt: '2026-05-28T00:00:00Z'
  },
  {
    id: 'ANOM-002',
    type: 'damage_unrecorded',
    severity: 'high',
    title: '损坏未登记',
    description: 'Pearl Export 架子鼓归还时发现损坏（军鼓凹陷、踩镲架松动），但在借出前的设备清单中无此损坏记录。存在损坏未及时登记的风险。',
    deviceId: 'DEV-003',
    recordIds: ['REC-002'],
    evidenceChain: [
      {
        id: 'EVID-004',
        type: 'device_note',
        title: '设备清单备注（借出前）',
        content: '5鼓3镲配置，演出专用',
        timestamp: '2025-01-10T16:45:00Z',
        photoUrl: null
      },
      {
        id: 'EVID-005',
        type: 'damage_photo',
        title: '损坏照片',
        content: '军鼓边缘凹陷，踩镲架螺丝松动',
        timestamp: '2026-05-25T11:30:00Z',
        photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=drum%20dent%20damage%20close%20up%20photo&image_size=square_hd'
      },
      {
        id: 'EVID-006',
        type: 'device_note',
        title: '设备备注（版本2）- 损坏补充',
        content: '损坏备注：军鼓边缘有凹陷，踩镲架螺丝松动',
        timestamp: '2026-05-25T11:30:00Z',
        photoUrl: null
      }
    ],
    status: 'open',
    resolvedAt: null,
    resolutionNote: null,
    createdAt: '2026-05-25T11:30:00Z'
  },
  {
    id: 'ANOM-003',
    type: 'overdue_return',
    severity: 'medium',
    title: '设备归还超时',
    description: 'Pearl Export 架子鼓已超过预定归还日期 11 天，原计划 5月22日 归还。',
    deviceId: 'DEV-003',
    recordIds: ['REC-002'],
    evidenceChain: [
      {
        id: 'EVID-007',
        type: 'borrow_record',
        title: '借出登记',
        content: '李华于 2026-05-15 借出 Pearl Export 架子鼓，原定归还日期 2026-05-22',
        timestamp: '2026-05-15T10:00:00Z',
        photoUrl: null
      },
      {
        id: 'EVID-008',
        type: 'damage_photo',
        title: '损坏照片',
        content: '归还时发现的损坏',
        timestamp: '2026-05-25T11:30:00Z',
        photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=drum%20dent%20damage%20close%20up%20photo&image_size=square_hd'
      }
    ],
    status: 'open',
    resolvedAt: null,
    resolutionNote: null,
    createdAt: '2026-05-23T00:00:00Z'
  },
  {
    id: 'ANOM-004',
    type: 'damage_unrecorded',
    severity: 'medium',
    title: '历史损坏未记',
    description: 'Yamaha YFL-222 长笛在 5月28日 归还时报告损坏（吹口垫破损），但在之前的设备清单中从未记录此问题。存在历史损坏未登记的风险。',
    deviceId: 'DEV-005',
    recordIds: ['REC-005'],
    evidenceChain: [
      {
        id: 'EVID-009',
        type: 'device_note',
        title: '设备清单备注（借出前）',
        content: '标准C调长笛，适合初学者',
        timestamp: '2025-04-12T14:30:00Z',
        photoUrl: null
      },
      {
        id: 'EVID-010',
        type: 'borrow_record',
        title: '借出登记',
        content: '陈静于 2026-05-10 借出长笛，原定 5月17日 归还',
        timestamp: '2026-05-10T13:00:00Z',
        photoUrl: null
      },
      {
        id: 'EVID-011',
        type: 'damage_photo',
        title: '损坏照片',
        content: '吹口垫破损',
        timestamp: '2026-05-28T09:15:00Z',
        photoUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=flute%20mouthpiece%20damage%20close%20up%20photo&image_size=square_hd'
      },
      {
        id: 'EVID-012',
        type: 'return_record',
        title: '归还记录',
        content: '5月28日归还，比原计划（5月17日）晚 11 天，版本中记录了排练日程更新覆盖超时的情况',
        timestamp: '2026-05-28T09:15:00Z',
        photoUrl: null
      }
    ],
    status: 'resolved',
    resolvedAt: '2026-05-29T10:00:00Z',
    resolutionNote: '已确认损坏发生在本次借用期间，由借用人负责维修。设备状态更新为损坏，待修。',
    createdAt: '2026-05-28T09:15:00Z'
  }
];

export const mockInventoryChecks: InventoryCheck[] = [
  {
    id: 'INV-001',
    checkDate: '2026-06-01',
    items: [
      {
        deviceId: 'DEV-001',
        deviceName: 'Yamaha C40 古典吉他',
        expectedStatus: 'borrowed',
        actualStatus: 'borrowed',
        isMatch: true,
        note: ''
      },
      {
        deviceId: 'DEV-002',
        deviceName: 'Casio PX-S7000 电钢琴',
        expectedStatus: 'in_stock',
        actualStatus: 'in_stock',
        isMatch: true,
        note: ''
      },
      {
        deviceId: 'DEV-003',
        deviceName: 'Pearl Export 架子鼓',
        expectedStatus: 'borrowed',
        actualStatus: 'anomaly',
        isMatch: false,
        note: '账面显示借出中，实际状态标记为异常，存在损坏未处理'
      },
      {
        deviceId: 'DEV-004',
        deviceName: 'Shure SM58 麦克风',
        expectedStatus: 'borrowed',
        actualStatus: 'borrowed',
        isMatch: true,
        note: ''
      },
      {
        deviceId: 'DEV-005',
        deviceName: 'Yamaha YFL-222 长笛',
        expectedStatus: 'in_stock',
        actualStatus: 'damaged',
        isMatch: false,
        note: '账面显示在库，实际状态为损坏待修'
      },
      {
        deviceId: 'DEV-006',
        deviceName: 'Line 6 Spider V 吉他音箱',
        expectedStatus: 'in_stock',
        actualStatus: 'in_stock',
        isMatch: true,
        note: ''
      },
      {
        deviceId: 'DEV-007',
        deviceName: 'Korg PA700 编曲键盘',
        expectedStatus: 'borrowed',
        actualStatus: 'borrowed',
        isMatch: true,
        note: ''
      },
      {
        deviceId: 'DEV-008',
        deviceName: 'Adams 1号行进小号',
        expectedStatus: 'in_stock',
        actualStatus: 'in_stock',
        isMatch: true,
        note: ''
      }
    ],
    status: 'completed',
    createdAt: '2026-06-01T10:00:00Z'
  }
];

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
