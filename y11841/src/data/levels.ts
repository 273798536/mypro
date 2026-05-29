import type { Level } from './types';

export const levels: Level[] = [
  {
    id: 'level-001',
    originalName: '北京-上海干线冷链运输（入门）',
    originalDescription: '从北京新发地冷库出发，途径济南、南京，最终到达上海。包含冷冻、冷藏、常温三类货物，考验基本的温层区分能力。',
    difficulty: 'easy',
    originalTimeLimit: '装车时限：8分钟',
    timeLimitSeconds: 480,
    originalRules: '1. 冷冻区(-18°C以下)只能放冷冻货物；2. 冷藏区(2-8°C)只能放冷藏货物；3. 常温区无温度要求；4. 先到站点的货物要放在靠近车门的位置。',
    cargoBoxes: [
      {
        id: 'cargo-001',
        originalName: 'A箱-进口和牛牛排',
        temperatureZone: 'frozen',
        originalWeight: '毛重：25kg/箱 × 20箱',
        destination: '上海浦东仓',
        deliveryOrder: 3,
        originalNotes: '需要-18°C以下存储'
      },
      {
        id: 'cargo-002',
        originalName: 'B箱-厄瓜多尔白虾',
        temperatureZone: 'frozen',
        originalWeight: '毛重：18kg/箱 × 30箱',
        destination: '上海杨浦仓',
        deliveryOrder: 3,
        originalNotes: '需要-18°C以下存储'
      },
      {
        id: 'cargo-003',
        originalName: 'C箱-光明鲜牛奶',
        temperatureZone: 'chilled',
        originalWeight: '毛重：12kg/箱 × 40箱',
        destination: '南京江宁仓',
        deliveryOrder: 2,
        originalNotes: '需要2-8°C冷藏'
      },
      {
        id: 'cargo-004',
        originalName: 'D箱-云南有机蔬菜',
        temperatureZone: 'chilled',
        originalWeight: '毛重：8kg/箱 × 50箱',
        destination: '济南历城仓',
        deliveryOrder: 1,
        originalNotes: '需要2-8°C冷藏，怕压'
      },
      {
        id: 'cargo-005',
        originalName: 'E箱-五常大米',
        temperatureZone: 'normal',
        originalWeight: '毛重：50kg/袋 × 20袋',
        destination: '上海浦东仓',
        deliveryOrder: 3,
        originalNotes: '常温存放，注意防潮'
      },
      {
        id: 'cargo-006',
        originalName: 'F箱-德州扒鸡礼盒',
        temperatureZone: 'normal',
        originalWeight: '毛重：3kg/盒 × 100盒',
        destination: '济南历城仓',
        deliveryOrder: 1,
        originalNotes: '常温存放'
      }
    ],
    compartments: [
      {
        id: 'comp-001',
        originalName: '冷冻舱-后段A区',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '车厢后部，冷冻区靠里',
        position: { row: 0, col: 0 }
      },
      {
        id: 'comp-002',
        originalName: '冷冻舱-后段B区',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '车厢后部，冷冻区靠门',
        position: { row: 0, col: 1 }
      },
      {
        id: 'comp-003',
        originalName: '冷藏舱-中段A区',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '车厢中部，冷藏区靠里',
        position: { row: 1, col: 0 }
      },
      {
        id: 'comp-004',
        originalName: '冷藏舱-中段B区',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '车厢中部，冷藏区靠门',
        position: { row: 1, col: 1 }
      },
      {
        id: 'comp-005',
        originalName: '常温舱-前段A区',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '车厢前部，常温区',
        position: { row: 2, col: 0 }
      },
      {
        id: 'comp-006',
        originalName: '常温舱-前段B区',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '车厢前部，常温区靠门',
        position: { row: 2, col: 1 }
      }
    ]
  },
  {
    id: 'level-002',
    originalName: '华南生鲜配送（进阶）',
    originalDescription: '从广州江南市场出发，配送至深圳、东莞、惠州。货物种类更多，卸货顺序更复杂，容易出现先卸货被压住的情况。',
    difficulty: 'medium',
    originalTimeLimit: '装车时限：6分钟',
    timeLimitSeconds: 360,
    originalRules: '1. 严格区分温层，混放会导致货物变质；2. 卸货顺序：深圳(第一站)→东莞(第二站)→惠州(第三站)；3. 第一站货物必须放在最外侧，不能被后站货物压住；4. 注意时间限制，超时会导致温度上升。',
    cargoBoxes: [
      {
        id: 'cargo-101',
        originalName: 'A箱-澳洲进口龙虾',
        temperatureZone: 'frozen',
        originalWeight: '毛重：30kg/箱 × 10箱',
        destination: '深圳南山仓（第一站）',
        deliveryOrder: 1,
        originalNotes: '需-20°C深冻'
      },
      {
        id: 'cargo-102',
        originalName: 'B箱-加拿大北极贝',
        temperatureZone: 'frozen',
        originalWeight: '毛重：15kg/箱 × 15箱',
        destination: '惠州惠阳仓（第三站）',
        deliveryOrder: 3,
        originalNotes: '需-18°C冷冻'
      },
      {
        id: 'cargo-103',
        originalName: 'C箱-挪威三文鱼',
        temperatureZone: 'chilled',
        originalWeight: '毛重：20kg/箱 × 12箱',
        destination: '深圳南山仓（第一站）',
        deliveryOrder: 1,
        originalNotes: '需0-4°C冰鲜'
      },
      {
        id: 'cargo-104',
        originalName: 'D箱-广东水牛奶',
        temperatureZone: 'chilled',
        originalWeight: '毛重：10kg/箱 × 25箱',
        destination: '东莞虎门仓（第二站）',
        deliveryOrder: 2,
        originalNotes: '需2-6°C冷藏'
      },
      {
        id: 'cargo-105',
        originalName: 'E箱-海南妃子笑荔枝',
        temperatureZone: 'chilled',
        originalWeight: '毛重：12kg/箱 × 30箱',
        destination: '惠州惠阳仓（第三站）',
        deliveryOrder: 3,
        originalNotes: '需5-8°C预冷'
      },
      {
        id: 'cargo-106',
        originalName: 'F箱-潮汕牛肉丸',
        temperatureZone: 'frozen',
        originalWeight: '毛重：25kg/箱 × 20箱',
        destination: '东莞虎门仓（第二站）',
        deliveryOrder: 2,
        originalNotes: '需-18°C冷冻'
      },
      {
        id: 'cargo-107',
        originalName: 'G箱-广东腊肠礼盒',
        temperatureZone: 'normal',
        originalWeight: '毛重：5kg/箱 × 40箱',
        destination: '深圳南山仓（第一站）',
        deliveryOrder: 1,
        originalNotes: '常温保存'
      },
      {
        id: 'cargo-108',
        originalName: 'H箱-新会陈皮',
        temperatureZone: 'normal',
        originalWeight: '毛重：2kg/箱 × 50箱',
        destination: '惠州惠阳仓（第三站）',
        deliveryOrder: 3,
        originalNotes: '常温干燥保存'
      }
    ],
    compartments: [
      {
        id: 'comp-101',
        originalName: '冷冻舱-上层靠里',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区上层最内侧',
        position: { row: 0, col: 0 }
      },
      {
        id: 'comp-102',
        originalName: '冷冻舱-上层靠门',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区上层靠近车门',
        position: { row: 0, col: 1 }
      },
      {
        id: 'comp-103',
        originalName: '冷冻舱-下层靠里',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区下层最内侧',
        position: { row: 0, col: 2 }
      },
      {
        id: 'comp-104',
        originalName: '冷藏舱-上层靠里',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区上层最内侧',
        position: { row: 1, col: 0 }
      },
      {
        id: 'comp-105',
        originalName: '冷藏舱-上层靠门',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区上层靠近车门',
        position: { row: 1, col: 1 }
      },
      {
        id: 'comp-106',
        originalName: '冷藏舱-下层靠里',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区下层最内侧',
        position: { row: 1, col: 2 }
      },
      {
        id: 'comp-107',
        originalName: '常温舱-靠里',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '常温区内侧',
        position: { row: 2, col: 0 }
      },
      {
        id: 'comp-108',
        originalName: '常温舱-靠门',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '常温区靠近车门',
        position: { row: 2, col: 1 }
      }
    ]
  },
  {
    id: 'level-003',
    originalName: '川渝山区多温共配（挑战）',
    originalDescription: '从重庆双福市场出发，配送至重庆周边、成都、绵阳。山路多，行车时间长，对温度控制要求极高。货量大，温层混杂，极易出错。',
    difficulty: 'hard',
    originalTimeLimit: '装车时限：5分钟',
    timeLimitSeconds: 300,
    originalRules: '1. 三种温层严格区分，混放直接判定不合格；2. 卸货顺序复杂：重庆主城(1)→重庆涪陵(2)→成都(3)→绵阳(4)；3. 易碎品不能放在下层；4. 超时1分钟温度上升5°C，超过8°C冷藏货物报废。',
    cargoBoxes: [
      {
        id: 'cargo-201',
        originalName: 'A箱-内蒙羔羊肉卷',
        temperatureZone: 'frozen',
        originalWeight: '毛重：25kg/箱 × 30箱',
        destination: '成都白家仓（第三站）',
        deliveryOrder: 3,
        originalNotes: '需-18°C以下'
      },
      {
        id: 'cargo-202',
        originalName: 'B箱-泰国进口榴莲',
        temperatureZone: 'frozen',
        originalWeight: '毛重：20kg/箱 × 25箱',
        destination: '绵阳高水仓（第四站）',
        deliveryOrder: 4,
        originalNotes: '需-20°C冷冻'
      },
      {
        id: 'cargo-203',
        originalName: 'C箱-重庆火锅底料（冷冻装）',
        temperatureZone: 'frozen',
        originalWeight: '毛重：15kg/箱 × 40箱',
        destination: '重庆主城盘溪仓（第一站）',
        deliveryOrder: 1,
        originalNotes: '需-12°C冷冻'
      },
      {
        id: 'cargo-204',
        originalName: 'D箱-四川雅安猕猴桃',
        temperatureZone: 'chilled',
        originalWeight: '毛重：10kg/箱 × 50箱',
        destination: '重庆涪陵仓（第二站）',
        deliveryOrder: 2,
        originalNotes: '需0-5°C冷藏，怕压易碎'
      },
      {
        id: 'cargo-205',
        originalName: 'E箱-成都双流草莓',
        temperatureZone: 'chilled',
        originalWeight: '毛重：6kg/箱 × 60箱',
        destination: '重庆主城盘溪仓（第一站）',
        deliveryOrder: 1,
        originalNotes: '需2-8°C冷藏，极易损坏'
      },
      {
        id: 'cargo-206',
        originalName: 'F箱-新希望酸奶',
        temperatureZone: 'chilled',
        originalWeight: '毛重：12kg/箱 × 45箱',
        destination: '绵阳高水仓（第四站）',
        deliveryOrder: 4,
        originalNotes: '需2-6°C冷藏'
      },
      {
        id: 'cargo-207',
        originalName: 'G箱-涪陵榨菜',
        temperatureZone: 'normal',
        originalWeight: '毛重：20kg/箱 × 35箱',
        destination: '成都白家仓（第三站）',
        deliveryOrder: 3,
        originalNotes: '常温'
      },
      {
        id: 'cargo-208',
        originalName: 'H箱-宜宾五粮液礼盒',
        temperatureZone: 'normal',
        originalWeight: '毛重：8kg/箱 × 20箱',
        destination: '重庆主城盘溪仓（第一站）',
        deliveryOrder: 1,
        originalNotes: '常温，贵重易碎'
      },
      {
        id: 'cargo-209',
        originalName: 'I箱-四川泡菜',
        temperatureZone: 'normal',
        originalWeight: '毛重：18kg/箱 × 40箱',
        destination: '重庆涪陵仓（第二站）',
        deliveryOrder: 2,
        originalNotes: '常温'
      },
      {
        id: 'cargo-210',
        originalName: 'J箱-东北水饺',
        temperatureZone: 'frozen',
        originalWeight: '毛重：10kg/箱 × 50箱',
        destination: '重庆涪陵仓（第二站）',
        deliveryOrder: 2,
        originalNotes: '需-18°C冷冻'
      }
    ],
    compartments: [
      {
        id: 'comp-201',
        originalName: '冷冻舱-1区（最里层）',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区最内侧',
        position: { row: 0, col: 0 }
      },
      {
        id: 'comp-202',
        originalName: '冷冻舱-2区（中间层）',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区中间',
        position: { row: 0, col: 1 }
      },
      {
        id: 'comp-203',
        originalName: '冷冻舱-3区（靠门）',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区靠近车门',
        position: { row: 0, col: 2 }
      },
      {
        id: 'comp-204',
        originalName: '冷冻舱-4区（上层）',
        temperatureZone: 'frozen',
        capacity: 2,
        originalLocation: '冷冻区上层',
        position: { row: 0, col: 3 }
      },
      {
        id: 'comp-205',
        originalName: '冷藏舱-1区（最里层）',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区最内侧',
        position: { row: 1, col: 0 }
      },
      {
        id: 'comp-206',
        originalName: '冷藏舱-2区（中间层）',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区中间',
        position: { row: 1, col: 1 }
      },
      {
        id: 'comp-207',
        originalName: '冷藏舱-3区（靠门）',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区靠近车门',
        position: { row: 1, col: 2 }
      },
      {
        id: 'comp-208',
        originalName: '冷藏舱-4区（上层）',
        temperatureZone: 'chilled',
        capacity: 2,
        originalLocation: '冷藏区上层',
        position: { row: 1, col: 3 }
      },
      {
        id: 'comp-209',
        originalName: '常温舱-1区（靠里）',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '常温区内侧',
        position: { row: 2, col: 0 }
      },
      {
        id: 'comp-210',
        originalName: '常温舱-2区（靠门）',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '常温区靠近车门',
        position: { row: 2, col: 1 }
      },
      {
        id: 'comp-211',
        originalName: '常温舱-3区（上层）',
        temperatureZone: 'normal',
        capacity: 2,
        originalLocation: '常温区上层',
        position: { row: 2, col: 2 }
      }
    ]
  }
];

export const getLevelById = (id: string): Level | undefined => {
  return levels.find(level => level.id === id);
};

export const getZoneLabel = (zone: string): string => {
  const labels: Record<string, string> = {
    frozen: '冷冻区',
    chilled: '冷藏区',
    normal: '常温区'
  };
  return labels[zone] || zone;
};

export const getZoneTemperature = (zone: string): string => {
  const temps: Record<string, string> = {
    frozen: '-18°C以下',
    chilled: '2-8°C',
    normal: '常温'
  };
  return temps[zone] || '';
};
