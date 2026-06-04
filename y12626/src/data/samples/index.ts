import { SampleScenario, TrackPoint, SourceMaterial, Batch } from '../../types';
import { generateId } from '../../utils/coordinate';

const centerLng = 116.397;
const centerLat = 39.908;
const baseTime = Date.now() - 86400000 * 7;

function createPoint(
  batchId: string,
  materialId: string,
  lng: number,
  lat: number,
  elevation: number,
  color: string,
  operator: string,
  status: TrackPoint['status'] = 'normal',
  isSupplement: boolean = false,
  options: Partial<TrackPoint> = {}
): TrackPoint {
  return {
    id: generateId(),
    batchId,
    timestamp: baseTime + Math.random() * 86400000,
    originalLng: lng,
    originalLat: lat,
    lng,
    lat,
    elevation,
    color,
    sourceMaterial: materialId,
    operator,
    status,
    isSupplement,
    ...options
  };
}

const sampleScenarios: SampleScenario[] = [
  {
    id: 'sample-old-form-001',
    name: '旧表数据混录 - 2018年故宫周边踏勘',
    description: '包含2018年手工旧表转录的数据，部分坐标精度不足，混入了当年的近似值记录。这类问题在老材料数字化时最常见。',
    hasBadData: true,
    badDataTypes: ['坐标精度不足', '旧表格式转换误差', '近似值混录'],
    difficulty: 'easy',
    batch: {
      id: 'batch-old-001',
      name: '2018年故宫周边踏勘记录（转录）',
      createTime: baseTime,
      operator: '张建国',
      description: '2018年纸质记录数字化转录，共3份材料'
    },
    materials: [
      {
        id: 'mat-old-001',
        name: '2018-03-15 故宫东侧踏勘记录表.xls',
        type: 'old-form',
        uploadTime: baseTime,
        uploader: '张建国',
        remark: '2018年旧表，坐标保留4位小数',
        pointCount: 12,
        anomalyCount: 2
      },
      {
        id: 'mat-old-002',
        name: '2018-03-16 景山周边手绘图转录.pdf',
        type: 'old-form',
        uploadTime: baseTime + 1000,
        uploader: '张建国',
        remark: '手绘图转录，部分坐标为估读值',
        pointCount: 10,
        anomalyCount: 3
      },
      {
        id: 'mat-field-001',
        name: '2024-06-01 现场补测记录.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 2000,
        uploader: '李梅',
        remark: '新采集的对照数据',
        pointCount: 8,
        anomalyCount: 0
      }
    ],
    points: []
  },
  {
    id: 'sample-supplement-002',
    name: '补录备注混杂 - 南池子片区',
    description: '多人多次补录的数据混杂在一起，补录备注格式不统一，有的写在备注栏，有的用颜色标记，训练员需要能从报告中看出哪条是哪次补录的。',
    hasBadData: true,
    badDataTypes: ['多人补录', '备注格式不统一', '颜色标记混乱'],
    difficulty: 'medium',
    batch: {
      id: 'batch-supplement-002',
      name: '南池子片区轨迹补录汇总',
      createTime: baseTime + 86400000,
      operator: '王芳',
      description: '三次补录数据合并，涉及4位录入人员'
    },
    materials: [
      {
        id: 'mat-supp-001',
        name: '第一次补录 - 王芳.xlsx',
        type: 'supplementary',
        uploadTime: baseTime + 86400000,
        uploader: '王芳',
        remark: '补录缺失的5个点，备注写在"备注"列',
        pointCount: 5,
        anomalyCount: 1
      },
      {
        id: 'mat-supp-002',
        name: '第二次补录 - 刘强.xlsx',
        type: 'supplementary',
        uploadTime: baseTime + 86400000 * 2,
        uploader: '刘强',
        remark: '补录点位用黄色标记，无备注',
        pointCount: 4,
        anomalyCount: 1
      },
      {
        id: 'mat-supp-003',
        name: '第三次补录 - 陈晓.xlsx',
        type: 'supplementary',
        uploadTime: baseTime + 86400000 * 3,
        uploader: '陈晓',
        remark: '补录点用星号标注在"序号"列',
        pointCount: 3,
        anomalyCount: 0
      },
      {
        id: 'mat-orig-001',
        name: '原始记录.xlsx',
        type: 'field-note',
        uploadTime: baseTime,
        uploader: '王芳',
        remark: '原始采集数据',
        pointCount: 15,
        anomalyCount: 2
      }
    ],
    points: []
  },
  {
    id: 'sample-missing-unit-003',
    name: '漏填单位问题 - 北海沿岸',
    description: '部分记录漏填海拔单位，有的是"米"有的空白，有的甚至填了"公尺"或"M"。这类小问题在人工录入时最容易被忽略。',
    hasBadData: true,
    badDataTypes: ['海拔单位缺失', '单位格式不统一', '公尺/米混用'],
    difficulty: 'easy',
    batch: {
      id: 'batch-missing-003',
      name: '北海沿岸徒步记录',
      createTime: baseTime + 86400000 * 4,
      operator: '赵伟',
      description: '环北海徒步记录，海拔单位问题较多'
    },
    materials: [
      {
        id: 'mat-miss-001',
        name: 'GPS导出数据.csv',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 4,
        uploader: '赵伟',
        remark: 'GPS设备导出，单位自动填充',
        pointCount: 20,
        anomalyCount: 0
      },
      {
        id: 'mat-miss-002',
        name: '人工录入补充.xlsx',
        type: 'supplementary',
        uploadTime: baseTime + 86400000 * 4 + 3600000,
        uploader: '赵伟',
        remark: '人工补录，漏填了多个单位',
        pointCount: 8,
        anomalyCount: 5
      }
    ],
    points: []
  },
  {
    id: 'sample-color-invalid-004',
    name: '颜色越界问题 - 长安街沿线',
    description: '录入员误用了荧光色、纯黑、纯白等不在色卡范围内的颜色。特别注意那条"#FFFF00"荧光黄，是平时材料里最容易混进来的小麻烦。',
    hasBadData: true,
    badDataTypes: ['荧光色越界', '纯黑纯白越界', '色相不在允许范围'],
    difficulty: 'medium',
    batch: {
      id: 'batch-color-004',
      name: '长安街沿线踏勘记录',
      createTime: baseTime + 86400000 * 5,
      operator: '孙丽',
      description: '新录入员不熟悉色卡规范，颜色问题较多'
    },
    materials: [
      {
        id: 'mat-color-001',
        name: '上午段 - 西单到天安门.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 5,
        uploader: '孙丽',
        remark: '新录入员操作，误用了荧光色',
        pointCount: 12,
        anomalyCount: 3
      },
      {
        id: 'mat-color-002',
        name: '下午段 - 天安门到王府井.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 5 + 3600000 * 4,
        uploader: '孙丽',
        remark: '有几条用了纯黑和纯白标记',
        pointCount: 10,
        anomalyCount: 2
      }
    ],
    points: []
  },
  {
    id: 'sample-boundary-005',
    name: '边界误判典型 - 故宫核心区周边',
    description: '多个点靠近或越界核心保护区边界，包括吸附前在界外、吸附后进入界内的误判案例。训练员从报告里要能看出每个越界点对应哪份材料。',
    hasBadData: true,
    badDataTypes: ['核心区越界', '缓冲区边界误判', '吸附前后状态变化'],
    difficulty: 'hard',
    batch: {
      id: 'batch-boundary-005',
      name: '故宫核心区周边踏勘',
      createTime: baseTime + 86400000 * 6,
      operator: '周明',
      description: '重点关注边界碰撞问题，含多处误判'
    },
    materials: [
      {
        id: 'mat-bound-001',
        name: '东华门外侧记录.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 6,
        uploader: '周明',
        remark: '东华门附近，有3个点靠近边界',
        pointCount: 10,
        anomalyCount: 4
      },
      {
        id: 'mat-bound-002',
        name: '午门广场记录.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 6 + 7200000,
        uploader: '周明',
        remark: '午门区域，有2个点进入核心区',
        pointCount: 8,
        anomalyCount: 3
      },
      {
        id: 'mat-bound-003',
        name: '补测数据 - 李军.xlsx',
        type: 'supplementary',
        uploadTime: baseTime + 86400000 * 6 + 86400000,
        uploader: '李军',
        remark: '重新测量的修正数据',
        pointCount: 5,
        anomalyCount: 1
      }
    ],
    points: []
  },
  {
    id: 'sample-mixed-006',
    name: '综合混乱场景 - 什刹海片区',
    description: '以上所有问题混合在一起的真实场景：旧表转录、多人补录、漏填单位、颜色越界、边界误判。这是最接近实际工作的完整测试案例。',
    hasBadData: true,
    badDataTypes: ['综合问题', '旧表+补录+缺项+颜色+边界全包含'],
    difficulty: 'hard',
    batch: {
      id: 'batch-mixed-006',
      name: '什刹海片区综合踏勘',
      createTime: baseTime + 86400000 * 8,
      operator: '吴涛',
      description: '综合案例，包含各种常见问题'
    },
    materials: [
      {
        id: 'mat-mix-001',
        name: '2019年旧表转录.xlsx',
        type: 'old-form',
        uploadTime: baseTime + 86400000 * 8,
        uploader: '吴涛',
        remark: '2019年旧表，坐标精度不足',
        pointCount: 8,
        anomalyCount: 2
      },
      {
        id: 'mat-mix-002',
        name: '现场记录 - 钱红.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 8 + 3600000,
        uploader: '钱红',
        remark: '颜色使用不规范',
        pointCount: 10,
        anomalyCount: 3
      },
      {
        id: 'mat-mix-003',
        name: '补录数据 - 郑军.xlsx',
        type: 'supplementary',
        uploadTime: baseTime + 86400000 * 9,
        uploader: '郑军',
        remark: '漏填多个单位',
        pointCount: 6,
        anomalyCount: 3
      },
      {
        id: 'mat-mix-004',
        name: '重点区域复测.xlsx',
        type: 'field-note',
        uploadTime: baseTime + 86400000 * 10,
        uploader: '吴涛',
        remark: '靠近核心区，有边界问题',
        pointCount: 8,
        anomalyCount: 2
      }
    ],
    points: []
  }
];

function generateTrackPoints(scenario: SampleScenario): TrackPoint[] {
  const points: TrackPoint[] = [];
  const batchId = scenario.batch.id;

  switch (scenario.id) {
    case 'sample-old-form-001': {
      const mat1 = scenario.materials[0].id;
      const mat2 = scenario.materials[1].id;
      const mat3 = scenario.materials[2].id;

      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        const r = 0.015 + Math.random() * 0.005;
        points.push(createPoint(
          batchId, mat1,
          centerLng + Math.cos(angle) * r,
          centerLat + Math.sin(angle) * r * 1.3,
          45 + Math.random() * 20,
          '#2E5EAA',
          '张建国',
          i % 6 === 0 ? 'normal' : 'normal'
        ));
      }

      points.push(createPoint(
        batchId, mat1,
        Number((centerLng + 0.012).toFixed(4)),
        Number((centerLat + 0.008).toFixed(4)),
        52.3,
        '#2E5EAA',
        '张建国',
        'normal',
        false,
        { originalLng: centerLng + 0.012345, originalLat: centerLat + 0.008765 }
      ));
      points.push(createPoint(
        batchId, mat1,
        Number((centerLng - 0.015).toFixed(4)),
        Number((centerLat - 0.01).toFixed(4)),
        48.7,
        '#2E5EAA',
        '张建国',
        'normal',
        false,
        { originalLng: centerLng - 0.015678, originalLat: centerLat - 0.010987 }
      ));

      for (let i = 0; i < 7; i++) {
        const t = i / 7;
        points.push(createPoint(
          batchId, mat2,
          centerLng - 0.02 + t * 0.04,
          centerLat + 0.018 - t * 0.005,
          50 + Math.random() * 15,
          '#8B4513',
          '张建国',
          'normal'
        ));
      }

      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.008,
        centerLat - 0.012,
        55.2,
        '#8B4513',
        '张建国',
        'normal',
        false,
        { supplementNote: '此点为估读值，原图标注不清晰' }
      ));
      points.push(createPoint(
        batchId, mat2,
        centerLng - 0.005,
        centerLat + 0.015,
        47.8,
        '#8B4513',
        '张建国',
        'normal',
        false,
        { supplementNote: '坐标为近似值，需复核' }
      ));
      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.002,
        centerLat - 0.005,
        51.5,
        '#8B4513',
        '张建国',
        'normal',
        false,
        { supplementNote: '原表涂改处辨认' }
      ));

      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        points.push(createPoint(
          batchId, mat3,
          centerLng - 0.015 + t * 0.03,
          centerLat - 0.02 + t * 0.04,
          42 + Math.random() * 25,
          '#2E5EAA',
          '李梅',
          'normal'
        ));
      }
      break;
    }

    case 'sample-supplement-002': {
      const mat1 = scenario.materials[0].id;
      const mat2 = scenario.materials[1].id;
      const mat3 = scenario.materials[2].id;
      const mat4 = scenario.materials[3].id;

      for (let i = 0; i < 15; i++) {
        const t = i / 15;
        points.push(createPoint(
          batchId, mat4,
          centerLng - 0.03 + t * 0.06,
          centerLat + 0.02 - t * 0.01,
          40 + Math.random() * 30,
          '#2E5EAA',
          '王芳',
          i === 3 || i === 11 ? 'normal' : 'normal'
        ));
      }

      points[3].status = 'supplementary';
      points[3].isSupplement = true;
      points[3].supplementNote = '补录：原第4点缺失，2024-06-02补测';
      points[11].status = 'supplementary';
      points[11].isSupplement = true;
      points[11].supplementNote = '补录：GPS信号丢失段';

      for (let i = 0; i < 4; i++) {
        points.push(createPoint(
          batchId, mat1,
          centerLng - 0.025 + i * 0.008,
          centerLat + 0.01,
          45 + Math.random() * 20,
          '#E6A817',
          '王芳',
          'supplementary',
          true,
          { supplementNote: i === 2 ? '此处原记录为空，现场补测' : '补录点' }
        ));
      }

      points.push(createPoint(
        batchId, mat1,
        centerLng - 0.005,
        centerLat + 0.012,
        52.0,
        '#E6A817',
        '王芳',
        'supplementary',
        true,
        { supplementNote: '备注写在这里了' }
      ));

      for (let i = 0; i < 3; i++) {
        points.push(createPoint(
          batchId, mat2,
          centerLng + 0.01 + i * 0.006,
          centerLat - 0.005,
          48 + Math.random() * 15,
          '#E6A817',
          '刘强',
          'supplementary',
          true
        ));
      }

      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.028,
        centerLat - 0.008,
        55.5,
        '#FFFF00',
        '刘强',
        'color-invalid',
        true
      ));

      for (let i = 0; i < 3; i++) {
        points.push(createPoint(
          batchId, mat3,
          centerLng + 0.015 + i * 0.005,
          centerLat + 0.018,
          43 + Math.random() * 18,
          '#E6A817',
          '陈晓',
          'supplementary',
          true,
          { supplementNote: '*补录*' }
        ));
      }
      break;
    }

    case 'sample-missing-unit-003': {
      const mat1 = scenario.materials[0].id;
      const mat2 = scenario.materials[1].id;

      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI * 2;
        const r = 0.02;
        points.push(createPoint(
          batchId, mat1,
          centerLng - 0.025 + Math.cos(angle) * r,
          centerLat + 0.02 + Math.sin(angle) * r * 1.3,
          42 + Math.sin(angle * 3) * 15,
          '#2E5EAA',
          '赵伟'
        ));
      }

      const unitProblems = [
        { lng: centerLng - 0.03, lat: centerLat + 0.025, unit: '' },
        { lng: centerLng - 0.028, lat: centerLat + 0.022, unit: '' },
        { lng: centerLng - 0.026, lat: centerLat + 0.018, unit: '公尺' },
        { lng: centerLng - 0.024, lat: centerLat + 0.015, unit: '' },
        { lng: centerLng - 0.022, lat: centerLat + 0.012, unit: 'M' },
      ];

      unitProblems.forEach((p, i) => {
        const point = createPoint(
          batchId, mat2,
          p.lng, p.lat,
          45 + i * 3,
          '#8B4513',
          '赵伟',
          p.unit === '' ? 'missing-unit' : 'normal',
          false,
          { supplementNote: p.unit ? `单位：${p.unit}` : '单位字段为空' }
        );
        points.push(point);
      });

      for (let i = 0; i < 3; i++) {
        points.push(createPoint(
          batchId, mat2,
          centerLng - 0.02 + i * 0.003,
          centerLat + 0.025 - i * 0.003,
          48 + i * 2,
          '#8B4513',
          '赵伟'
        ));
      }
      break;
    }

    case 'sample-color-invalid-004': {
      const mat1 = scenario.materials[0].id;
      const mat2 = scenario.materials[1].id;

      for (let i = 0; i < 9; i++) {
        const t = i / 9;
        points.push(createPoint(
          batchId, mat1,
          centerLng + t * 0.04,
          centerLat - 0.005 + Math.sin(t * Math.PI * 2) * 0.005,
          40 + t * 20,
          '#2E5EAA',
          '孙丽'
        ));
      }

      points.push(createPoint(
        batchId, mat1,
        centerLng + 0.008,
        centerLat - 0.002,
        52.5,
        '#FFFF00',
        '孙丽',
        'color-invalid',
        false,
        { supplementNote: '用了荧光黄，太亮了' }
      ));
      points.push(createPoint(
        batchId, mat1,
        centerLng + 0.025,
        centerLat + 0.003,
        48.0,
        '#00FF00',
        '孙丽',
        'color-invalid',
        false,
        { supplementNote: '荧光绿，不在色卡' }
      ));
      points.push(createPoint(
        batchId, mat1,
        centerLng + 0.035,
        centerLat - 0.004,
        55.2,
        '#FF00FF',
        '孙丽',
        'color-invalid',
        false,
        { supplementNote: '品红色，色相差太远' }
      ));

      for (let i = 0; i < 8; i++) {
        const t = i / 8;
        points.push(createPoint(
          batchId, mat2,
          centerLng + 0.005 + t * 0.035,
          centerLat + 0.01 + Math.cos(t * Math.PI) * 0.005,
          45 + t * 18,
          '#8B4513',
          '孙丽'
        ));
      }

      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.015,
        centerLat + 0.012,
        50.8,
        '#000000',
        '孙丽',
        'color-invalid',
        false,
        { supplementNote: '纯黑，亮度太低' }
      ));
      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.03,
        centerLat + 0.008,
        53.2,
        '#FFFFFF',
        '孙丽',
        'color-invalid',
        false,
        { supplementNote: '纯白，在图上看不见' }
      ));
      break;
    }

    case 'sample-boundary-005': {
      const mat1 = scenario.materials[0].id;
      const mat2 = scenario.materials[1].id;
      const mat3 = scenario.materials[2].id;

      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        points.push(createPoint(
          batchId, mat1,
          centerLng + 0.008 + t * 0.005,
          centerLat + 0.008 - t * 0.002,
          50 + t * 8,
          '#2E5EAA',
          '周明'
        ));
      }

      points.push(createPoint(
        batchId, mat1,
        centerLng + 0.003,
        centerLat + 0.003,
        58.5,
        '#C41E3A',
        '周明',
        'out-of-bounds',
        false,
        {
          originalLng: centerLng + 0.0085,
          originalLat: centerLat + 0.0082,
          snappedLng: centerLng + 0.003,
          snappedLat: centerLat + 0.003,
          boundaryCollision: {
            boundaryId: 'boundary-core-001',
            boundaryName: '核心保护区 - 故宫红墙内',
            distance: -35.2,
            type: 'inside', threshold: 50
          }
        }
      ));
      points.push(createPoint(
        batchId, mat1,
        centerLng + 0.0145,
        centerLat + 0.0055,
        55.0,
        '#C41E3A',
        '周明',
        'out-of-bounds',
        false,
        {
          boundaryCollision: {
            boundaryId: 'boundary-core-001',
            boundaryName: '核心保护区 - 故宫红墙内',
            distance: -18.7,
            type: 'inside', threshold: 50
          }
        }
      ));
      points.push(createPoint(
        batchId, mat1,
        centerLng - 0.002,
        centerLat + 0.0098,
        52.3,
        '#E6A817',
        '周明',
        'out-of-bounds',
        false,
        {
          boundaryCollision: {
            boundaryId: 'boundary-buffer-001',
            boundaryName: '缓冲区 - 皇城根遗址公园',
            distance: 28.5,
            type: 'crossing', threshold: 50
          }
        }
      ));
      points.push(createPoint(
        batchId, mat1,
        centerLng + 0.005,
        centerLat - 0.0095,
        49.8,
        '#E6A817',
        '周明',
        'out-of-bounds',
        false,
        {
          boundaryCollision: {
            boundaryId: 'boundary-buffer-001',
            boundaryName: '缓冲区 - 皇城根遗址公园',
            distance: 38.2,
            type: 'crossing', threshold: 50
          }
        }
      ));

      for (let i = 0; i < 5; i++) {
        const t = i / 5;
        points.push(createPoint(
          batchId, mat2,
          centerLng - 0.003 + t * 0.006,
          centerLat - 0.008,
          48 + t * 10,
          '#2E5EAA',
          '周明'
        ));
      }

      points.push(createPoint(
        batchId, mat2,
        centerLng - 0.0005,
        centerLat - 0.0015,
        56.2,
        '#C41E3A',
        '周明',
        'out-of-bounds',
        false,
        {
          originalLng: centerLng - 0.0002,
          originalLat: centerLat - 0.0018,
          snappedLng: centerLng - 0.0005,
          snappedLat: centerLat - 0.0015,
          boundaryCollision: {
            boundaryId: 'boundary-core-001',
            boundaryName: '核心保护区 - 故宫红墙内',
            distance: -42.1,
            type: 'inside', threshold: 50
          }
        }
      ));
      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.0018,
        centerLat - 0.0008,
        54.5,
        '#C41E3A',
        '周明',
        'out-of-bounds',
        false,
        {
          boundaryCollision: {
            boundaryId: 'boundary-core-001',
            boundaryName: '核心保护区 - 故宫红墙内',
            distance: -25.6,
            type: 'inside', threshold: 50
          }
        }
      ));
      points.push(createPoint(
        batchId, mat2,
        centerLng + 0.0042,
        centerLat - 0.0068,
        51.0,
        '#E6A817',
        '周明',
        'out-of-bounds',
        false,
        {
          boundaryCollision: {
            boundaryId: 'boundary-buffer-001',
            boundaryName: '缓冲区 - 皇城根遗址公园',
            distance: 32.4,
            type: 'crossing', threshold: 50
          }
        }
      ));

      for (let i = 0; i < 4; i++) {
        points.push(createPoint(
          batchId, mat3,
          centerLng + 0.006 + i * 0.002,
          centerLat + 0.006 - i * 0.0015,
          53 + i * 2,
          '#2E5EAA',
          '李军'
        ));
      }

      points.push(createPoint(
        batchId, mat3,
        centerLng + 0.0088,
        centerLat + 0.0022,
        57.8,
        '#E6A817',
        '李军',
        'out-of-bounds',
        true,
        {
          supplementNote: '复测确认：此处实际在界外，原记录有误',
          boundaryCollision: {
            boundaryId: 'boundary-buffer-001',
            boundaryName: '缓冲区 - 皇城根遗址公园',
            distance: 45.3,
            type: 'crossing', threshold: 50
          }
        }
      ));
      break;
    }

    case 'sample-mixed-006': {
      const mat1 = scenario.materials[0].id;
      const mat2 = scenario.materials[1].id;
      const mat3 = scenario.materials[2].id;
      const mat4 = scenario.materials[3].id;

      for (let i = 0; i < 6; i++) {
        points.push(createPoint(
          batchId, mat1,
          centerLng - 0.04 + i * 0.003,
          centerLat + 0.03 - i * 0.002,
          45 + Math.random() * 15,
          '#2E5EAA',
          '吴涛'
        ));
      }

      points.push(createPoint(
        batchId, mat1,
        Number((centerLng - 0.035).toFixed(4)),
        Number((centerLat + 0.025).toFixed(4)),
        52.0,
        '#2E5EAA',
        '吴涛',
        'normal',
        false,
        { originalLng: centerLng - 0.035123, originalLat: centerLat + 0.025456 }
      ));
      points.push(createPoint(
        batchId, mat1,
        Number((centerLng - 0.032).toFixed(4)),
        Number((centerLat + 0.022).toFixed(4)),
        49.5,
        '#2E5EAA',
        '吴涛',
        'normal',
        false,
        { originalLng: centerLng - 0.032789, originalLat: centerLat + 0.022123, supplementNote: '旧表字迹不清，估读' }
      ));

      for (let i = 0; i < 7; i++) {
        points.push(createPoint(
          batchId, mat2,
          centerLng - 0.035 + i * 0.004,
          centerLat + 0.015,
          48 + Math.random() * 12,
          i === 2 ? '#FFFF00' : '#8B4513',
          '钱红',
          i === 2 ? 'color-invalid' : 'normal'
        ));
      }

      points.push(createPoint(
        batchId, mat2,
        centerLng - 0.025,
        centerLat + 0.018,
        51.2,
        '#000000',
        '钱红',
        'color-invalid',
        false,
        { supplementNote: '不小心选了黑色' }
      ));
      points.push(createPoint(
        batchId, mat2,
        centerLng - 0.015,
        centerLat + 0.012,
        54.0,
        '#FF00FF',
        '钱红',
        'color-invalid',
        false,
        { supplementNote: '随手选的颜色，不知道规范' }
      ));

      for (let i = 0; i < 3; i++) {
        points.push(createPoint(
          batchId, mat3,
          centerLng - 0.02 + i * 0.005,
          centerLat + 0.005,
          46 + i * 3,
          '#E6A817',
          '郑军',
          'missing-unit',
          true,
          { supplementNote: '单位漏填了' }
        ));
      }

      points.push(createPoint(
        batchId, mat3,
        centerLng - 0.012,
        centerLat + 0.008,
        50.0,
        '#E6A817',
        '郑军',
        'normal',
        true,
        { supplementNote: '单位：公尺' }
      ));
      points.push(createPoint(
        batchId, mat3,
        centerLng - 0.008,
        centerLat + 0.003,
        52.5,
        '#E6A817',
        '郑军',
        'missing-unit',
        true
      ));
      points.push(createPoint(
        batchId, mat3,
        centerLng - 0.005,
        centerLat + 0.006,
        48.8,
        '#E6A817',
        '郑军',
        'normal',
        true,
        { supplementNote: '单位：M' }
      ));

      for (let i = 0; i < 6; i++) {
        const t = i / 6;
        points.push(createPoint(
          batchId, mat4,
          centerLng + 0.002 + t * 0.01,
          centerLat - 0.005 + t * 0.008,
          50 + t * 15,
          '#2E5EAA',
          '吴涛',
          i === 3 ? 'out-of-bounds' : 'normal'
        ));
      }

      points[points.length - 3].boundaryCollision = {
        boundaryId: 'boundary-core-002',
        boundaryName: '核心保护区 - 中南海',
        distance: -28.5,
        type: 'inside', threshold: 50
      };

      points.push(createPoint(
        batchId, mat4,
        centerLng + 0.032,
        centerLat - 0.012,
        56.5,
        '#C41E3A',
        '吴涛',
        'out-of-bounds',
        false,
        {
          boundaryCollision: {
            boundaryId: 'boundary-core-002',
            boundaryName: '核心保护区 - 中南海',
            distance: -35.8,
            type: 'inside', threshold: 50
          }
        }
      ));
      break;
    }
  }

  return points;
}

sampleScenarios.forEach(scenario => {
  scenario.points = generateTrackPoints(scenario);
});

export { sampleScenarios };
export const getSampleScenarios = (): SampleScenario[] => sampleScenarios;

export const getSampleById = (id: string): SampleScenario | undefined => {
  return sampleScenarios.find(s => s.id === id);
};

export const defaultScenario = sampleScenarios[4];
