import type { Batten, HandoffLog } from '../types'

export const mockBattens: Batten[] = [
  {
    id: 'batten-001',
    name: '前檐吊杆1号',
    label: 'B1-前檐',
    status: 'suspended',
    currentPosition: { x: 2.5, y: 1.5, z: 8.2 },
    floorLevel: 8.2,
    floorUnit: 'meters',
    coordinateSystem: 'stage',
    hasUnitMismatch: true,
    detectedFloorUnits: ['meters', 'feet'],
    isSuspended: true,
    suspensionReason: '传感器记录中出现米(m)和英尺(ft)混写，需现场老师确认正确高度',
    confirmedByTeacher: false,
    sceneAnnotation: '前檐位置1号吊杆，高度存疑，已挂起等待确认，当前值8.2米可能为错误换算',
    sideDescription: 'B1-前檐吊杆：设计标高8.2米，但历史传感器分别记录为8.2m和26.9ft(约8.2m)，需现场确认实际安装高度',
    screenshotDescription: '前檐吊杆现场照片v2：从舞台侧视角拍摄，可见吊杆处于前檐位置，卷尺测量显示标高约8米',
    sensorRecords: [
      {
        id: 's1-001',
        timestamp: '2026-06-08 09:15:22',
        source: '激光测距传感器A1',
        coordinateSystem: 'stage',
        position: { x: 2.5, y: 1.5, z: 8.2 },
        rawPosition: { x: 2.5, y: 1.5, z: 26.9 },
        floorLevel: 8.2,
        floorUnit: 'meters',
        rawFloorUnit: 'feet',
        tension: 1250,
        tilt: 0.3,
        temperature: 24.5,
        hasCoordinateMismatch: true,
        originalNote: '安装队记录：前檐吊杆初调完成，高度26.9英尺——阿宁备注：现场实际用米，请老师确认换算是否正确'
      },
      {
        id: 's1-002',
        timestamp: '2026-06-09 14:30:10',
        source: '倾角传感器B1',
        coordinateSystem: 'local',
        position: { x: 2.48, y: 1.5, z: 8.22 },
        rawPosition: { x: 2.48, y: 1.5, z: 8.22 },
        floorLevel: 8.22,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 1245,
        tilt: 0.28,
        temperature: 25.1,
        hasCoordinateMismatch: false,
        originalNote: '例行巡检：倾角正常，吊杆位置无明显变化'
      },
      {
        id: 's1-003',
        timestamp: '2026-06-10 10:05:48',
        source: '张力传感器T1',
        coordinateSystem: 'global',
        position: { x: 125.3, y: 51.5, z: 8.18 },
        rawPosition: { x: 125.3, y: 51.5, z: 8.18 },
        floorLevel: 8.18,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 1260,
        tilt: 0.32,
        temperature: 23.8,
        hasCoordinateMismatch: true,
        originalNote: '全局坐标与舞台坐标偏差较大，可能上次校零有误——已备注需重新校准坐标系'
      }
    ],
    noteHistory: [
      {
        id: 'n1-001',
        timestamp: '2026-06-08 09:20:00',
        author: '安装队王工',
        content: '前檐吊杆1号安装完成，高度按图纸26.9英尺设置',
        type: 'annotation'
      },
      {
        id: 'n1-002',
        timestamp: '2026-06-08 15:42:00',
        author: '调度阿宁',
        content: '发现记录单位是英尺，现场实际使用米。已挂起，等待李老师现场确认实际高度',
        type: 'suspension'
      },
      {
        id: 'n1-003',
        timestamp: '2026-06-09 11:00:00',
        author: '系统',
        content: '检测到同一条吊杆存在米(m)和英尺(ft)两种单位记录，自动标记为单位混写异常',
        type: 'system'
      },
      {
        id: 'n1-004',
        timestamp: '2026-06-10 16:30:00',
        author: '调度阿宁',
        content: '李老师今天未到现场，继续挂起。补充：舞台侧测量显示约8.2米，但不能100%确定',
        type: 'annotation'
      }
    ],
    screenshots: [
      {
        id: 'sc1-001',
        timestamp: '2026-06-08 10:00:00',
        author: '安装队王工',
        description: '前檐吊杆安装完成时照片，从观众席视角拍摄',
        viewAngle: 'front',
        version: 1,
        processingResult: '初装完成，待验收'
      },
      {
        id: 'sc1-002',
        timestamp: '2026-06-10 17:15:00',
        author: '调度阿宁',
        description: '前檐吊杆从舞台侧视角拍摄，卷尺可见读数约8.2米。补充：由于卷尺下垂，实际可能略高',
        viewAngle: 'side',
        version: 2,
        processingResult: '补充测量照片，高度仍待老师最终确认'
      }
    ]
  },
  {
    id: 'batten-002',
    name: '景杆3号',
    label: 'B3-景杆',
    status: 'warning',
    currentPosition: { x: 8.0, y: 7.0, z: 12.5 },
    floorLevel: 12.5,
    floorUnit: 'meters',
    coordinateSystem: 'stage',
    hasUnitMismatch: false,
    detectedFloorUnits: ['meters'],
    isSuspended: false,
    confirmedByTeacher: true,
    sceneAnnotation: '第三道景杆，标高12.5米，张力略偏高需关注',
    sideDescription: 'B3-景杆：设计标高12.50米，当前实测12.5米，张力1580N较正常值偏高5%，建议下次巡检时重点检查',
    screenshotDescription: '景杆3号现场照片：吊杆水平状态良好，可见悬挂的景片挂钩，张力传感器读数偏高',
    sensorRecords: [
      {
        id: 's2-001',
        timestamp: '2026-06-07 08:30:00',
        source: '激光测距A3',
        coordinateSystem: 'stage',
        position: { x: 8.0, y: 7.0, z: 12.5 },
        rawPosition: { x: 8.0, y: 7.0, z: 12.5 },
        floorLevel: 12.5,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 1520,
        tilt: 0.15,
        temperature: 23.0,
        hasCoordinateMismatch: false,
        originalNote: '景杆3号调试完成，标高12.50m确认——张老师签字确认'
      },
      {
        id: 's2-002',
        timestamp: '2026-06-10 09:00:00',
        source: '激光测距A3',
        coordinateSystem: 'stage',
        position: { x: 8.0, y: 7.0, z: 12.5 },
        rawPosition: { x: 8.0, y: 7.0, z: 12.5 },
        floorLevel: 12.5,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 1580,
        tilt: 0.18,
        temperature: 25.2,
        hasCoordinateMismatch: false,
        originalNote: '例行巡检：高度正常，张力较上次升高，气温升高可能是原因之一，持续关注'
      }
    ],
    noteHistory: [
      {
        id: 'n2-001',
        timestamp: '2026-06-07 08:45:00',
        author: '调试张老师',
        content: '景杆3号调试完成，标高12.50m确认无误',
        type: 'confirmation'
      },
      {
        id: 'n2-002',
        timestamp: '2026-06-10 09:15:00',
        author: '调度阿宁',
        content: '张力传感器读数偏高，已标记为警告状态，下次演出前重点检查',
        type: 'annotation'
      }
    ],
    screenshots: [
      {
        id: 'sc2-001',
        timestamp: '2026-06-07 09:00:00',
        author: '调试张老师',
        description: '景杆3号调试完成正面照',
        viewAngle: 'front',
        version: 1,
        processingResult: '调试完成，验收通过'
      },
      {
        id: 'sc2-002',
        timestamp: '2026-06-10 09:20:00',
        author: '调度阿宁',
        description: '景杆3号张力传感器读数特写，显示1580N',
        viewAngle: 'side',
        version: 2,
        processingResult: '张力偏高，列为关注点'
      }
    ]
  },
  {
    id: 'batten-003',
    name: '灯光吊杆2号',
    label: 'L2-灯光',
    status: 'normal',
    currentPosition: { x: 5.5, y: 4.0, z: 10.0 },
    floorLevel: 10.0,
    floorUnit: 'meters',
    coordinateSystem: 'stage',
    hasUnitMismatch: false,
    detectedFloorUnits: ['meters'],
    isSuspended: false,
    confirmedByTeacher: true,
    sceneAnnotation: '第二道灯光吊杆，标高10.0米，运行正常',
    sideDescription: 'L2-灯光吊杆：设计标高10.00米，当前实测10.0米，各项参数正常，已安装灯具12台',
    screenshotDescription: '灯光吊杆2号照片：灯具已全部安装完成，布线整齐，吊杆水平度良好',
    sensorRecords: [
      {
        id: 's3-001',
        timestamp: '2026-06-05 14:00:00',
        source: '综合传感器L2',
        coordinateSystem: 'stage',
        position: { x: 5.5, y: 4.0, z: 10.0 },
        rawPosition: { x: 5.5, y: 4.0, z: 10.0 },
        floorLevel: 10.0,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 2100,
        tilt: 0.08,
        temperature: 26.5,
        hasCoordinateMismatch: false,
        originalNote: '灯光吊杆2号灯具安装完成，通电测试全部正常——王电工'
      }
    ],
    noteHistory: [
      {
        id: 'n3-001',
        timestamp: '2026-06-05 14:30:00',
        author: '灯光王工',
        content: '12台LED聚光灯全部安装完毕，水平角度已调',
        type: 'annotation'
      }
    ],
    screenshots: [
      {
        id: 'sc3-001',
        timestamp: '2026-06-05 15:00:00',
        author: '灯光王工',
        description: '灯光吊杆2号正面照，可见12台灯具整齐排列',
        viewAngle: 'front',
        version: 1,
        processingResult: '安装完成'
      }
    ]
  },
  {
    id: 'batten-004',
    name: '后檐吊杆',
    label: 'B5-后檐',
    status: 'error',
    currentPosition: { x: 14.0, y: 10.0, z: 9.85 },
    floorLevel: 9.85,
    floorUnit: 'meters',
    coordinateSystem: 'local',
    hasUnitMismatch: true,
    detectedFloorUnits: ['meters', 'millimeters'],
    isSuspended: false,
    confirmedByTeacher: false,
    sceneAnnotation: '后檐吊杆倾角异常，坐标系混乱，需紧急处理',
    sideDescription: 'B5-后檐吊杆：倾角达到2.8°超过阈值(1°)，且传感器同时出现米和毫米混写。本地坐标与全局坐标偏差较大，建议立即现场检查',
    screenshotDescription: '后檐吊杆异常照片：吊杆可见明显倾斜，西侧下垂，传感器读数混乱',
    sensorRecords: [
      {
        id: 's4-001',
        timestamp: '2026-06-09 22:10:35',
        source: '倾角报警',
        coordinateSystem: 'local',
        position: { x: 14.0, y: 10.0, z: 9850 },
        rawPosition: { x: 14.0, y: 10.0, z: 9850 },
        floorLevel: 9850,
        floorUnit: 'millimeters',
        rawFloorUnit: 'millimeters',
        tension: 1890,
        tilt: 2.8,
        temperature: 22.1,
        hasCoordinateMismatch: true,
        originalNote: '【报警】后檐吊杆倾角超限！请立即检查。注意：本次数据单位为毫米(mm)，之前记录为米(m)'
      },
      {
        id: 's4-002',
        timestamp: '2026-06-09 22:15:00',
        source: '人工复查',
        coordinateSystem: 'global',
        position: { x: 137.2, y: 60.0, z: 9.85 },
        rawPosition: { x: 137.2, y: 60.0, z: 9.85 },
        floorLevel: 9.85,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 1895,
        tilt: 2.85,
        temperature: 22.0,
        hasCoordinateMismatch: true,
        originalNote: '阿宁现场目测确认吊杆倾斜，西侧偏低。已通知机械班连夜处理'
      },
      {
        id: 's4-003',
        timestamp: '2026-06-10 07:30:00',
        source: '晨间巡检',
        coordinateSystem: 'stage',
        position: { x: 14.0, y: 10.0, z: 9.88 },
        rawPosition: { x: 14.0, y: 10.0, z: 9.88 },
        floorLevel: 9.88,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 1870,
        tilt: 2.6,
        temperature: 21.5,
        hasCoordinateMismatch: false,
        originalNote: '夜间临时加固后复测，倾角略有好转但仍超限。机械班将在下午演出后更换钢丝绳'
      }
    ],
    noteHistory: [
      {
        id: 'n4-001',
        timestamp: '2026-06-09 22:11:00',
        author: '系统',
        content: '倾角传感器触发报警：2.8° > 1.0°阈值',
        type: 'system'
      },
      {
        id: 'n4-002',
        timestamp: '2026-06-09 22:20:00',
        author: '调度阿宁',
        content: '已到现场确认，后檐吊杆西侧钢丝绳可能松弛。已通知机械班值班人员，今晚先做临时加固，明天下午演出后正式检修',
        type: 'annotation'
      },
      {
        id: 'n4-003',
        timestamp: '2026-06-10 08:00:00',
        author: '机械班赵师傅',
        content: '昨夜已做临时支撑，今天下午15:00演出结束后开始更换西侧两根钢丝绳，预计3小时完成',
        type: 'annotation'
      }
    ],
    screenshots: [
      {
        id: 'sc4-001',
        timestamp: '2026-06-09 22:25:00',
        author: '调度阿宁',
        description: '夜间手机拍摄，可见吊杆西侧下垂明显',
        viewAngle: 'side',
        version: 1,
        processingResult: '发现异常，启动应急预案'
      },
      {
        id: 'sc4-002',
        timestamp: '2026-06-10 07:45:00',
        author: '机械班赵师傅',
        description: '晨间拍摄，已加临时支撑，吊杆倾斜略有改善',
        viewAngle: 'side',
        version: 2,
        processingResult: '临时加固完成，待正式检修'
      }
    ]
  },
  {
    id: 'batten-005',
    name: '侧光灯架',
    label: 'L4-侧光',
    status: 'normal',
    currentPosition: { x: 11.0, y: 5.5, z: 6.5 },
    floorLevel: 6.5,
    floorUnit: 'meters',
    coordinateSystem: 'stage',
    hasUnitMismatch: false,
    detectedFloorUnits: ['meters'],
    isSuspended: false,
    confirmedByTeacher: true,
    sceneAnnotation: '侧光灯架，标高6.5米，运行正常',
    sideDescription: 'L4-侧光灯架：标高6.5米，侧光位置，灯具8台全部正常',
    screenshotDescription: '侧光灯架照片：安装于舞台左侧，灯具角度已调试完毕',
    sensorRecords: [
      {
        id: 's5-001',
        timestamp: '2026-06-06 10:00:00',
        source: '传感器L4',
        coordinateSystem: 'stage',
        position: { x: 11.0, y: 5.5, z: 6.5 },
        rawPosition: { x: 11.0, y: 5.5, z: 6.5 },
        floorLevel: 6.5,
        floorUnit: 'meters',
        rawFloorUnit: 'meters',
        tension: 980,
        tilt: 0.1,
        temperature: 24.0,
        hasCoordinateMismatch: false,
        originalNote: '侧光灯架调试完成'
      }
    ],
    noteHistory: [
      {
        id: 'n5-001',
        timestamp: '2026-06-06 10:30:00',
        author: '灯光王工',
        content: '8台侧光LED全部调试完成，投射角度45度',
        type: 'annotation'
      }
    ],
    screenshots: [
      {
        id: 'sc5-001',
        timestamp: '2026-06-06 11:00:00',
        author: '灯光王工',
        description: '侧光灯架完成照片',
        viewAngle: 'front',
        version: 1,
        processingResult: '完成'
      }
    ]
  }
]

export const mockHandoffLogs: HandoffLog[] = [
  {
    id: 'hand-001',
    timestamp: '2026-06-10 08:00:00',
    fromOperator: '夜班调度小陈',
    toOperator: '调度阿宁',
    battenIds: ['batten-001', 'batten-004'],
    summary: '后檐吊杆B5夜间发生倾斜报警，已临时加固，今日下午演出后检修。前檐吊杆B1单位混写问题待李老师确认。',
    attachments: {
      sensorRecordIds: ['s4-001', 's4-002', 's1-001'],
      screenshotIds: ['sc4-001', 'sc4-002', 'sc1-002'],
      noteIds: ['n4-002', 'n4-003', 'n1-004']
    }
  }
]
