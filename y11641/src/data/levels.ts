import { LevelConfig } from '../types';

export const levels: LevelConfig[] = [
  {
    id: 'level-1',
    name: '入门：常规配药',
    description: '练习基本的处方核对流程，包含简单的剂量确认和批号检查',
    difficulty: 1,
    timeLimit: 180,
    patientInfo: {
      name: '张三',
      age: 45,
      gender: '男',
      conditions: ['高血压'],
      allergies: ['青霉素']
    },
    prescriptions: [
      {
        id: 'rx-1-1',
        lineNumber: 1,
        drugName: '阿莫西林胶囊',
        drugCode: 'AMX-001',
        dosage: '0.5g',
        dosageValue: 0.5,
        dosageUnit: 'g',
        frequency: '每日三次',
        route: '口服'
      },
      {
        id: 'rx-1-2',
        lineNumber: 2,
        drugName: '硝苯地平缓释片',
        drugCode: 'NFP-001',
        dosage: '30mg',
        dosageValue: 30,
        dosageUnit: 'mg',
        frequency: '每日一次',
        route: '口服'
      }
    ],
    availableDrugs: [
      {
        id: 'drug-amx',
        name: '阿莫西林胶囊',
        code: 'AMX-001',
        specifications: '0.25g/粒',
        unit: 'g',
        unitConversions: [{ from: 'g', to: 'mg', factor: 1000 }],
        batchNumbers: [
          { id: 'batch-amx-1', number: 'AMX20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false },
          { id: 'batch-amx-2', number: 'AMX20220101', productionDate: '2022-01-01', expiryDate: '2024-01-01', isExpired: true }
        ],
        contraindications: ['对青霉素过敏者禁用'],
        warnings: ['用药前需确认无青霉素过敏史']
      },
      {
        id: 'drug-nfp',
        name: '硝苯地平缓释片',
        code: 'NFP-001',
        specifications: '30mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-nfp-1', number: 'NFP20250201', productionDate: '2025-02-01', expiryDate: '2028-02-01', isExpired: false }
        ],
        contraindications: [],
        warnings: ['可能引起低血压']
      },
      {
        id: 'drug-vitc',
        name: '维生素C片',
        code: 'VTC-001',
        specifications: '0.1g/片',
        unit: 'g',
        batchNumbers: [
          { id: 'batch-vtc-1', number: 'VTC20250301', productionDate: '2025-03-01', expiryDate: '2027-03-01', isExpired: false }
        ],
        contraindications: [],
        warnings: []
      }
    ],
    targetScore: 100
  },
  {
    id: 'level-2',
    name: '进阶：单位换算',
    description: '需要进行剂量单位换算，注意不同规格的药品',
    difficulty: 2,
    timeLimit: 240,
    patientInfo: {
      name: '李四',
      age: 62,
      gender: '女',
      conditions: ['糖尿病', '高血压'],
      allergies: []
    },
    prescriptions: [
      {
        id: 'rx-2-1',
        lineNumber: 1,
        drugName: '二甲双胍片',
        drugCode: 'DMF-001',
        dosage: '500mg',
        dosageValue: 500,
        dosageUnit: 'mg',
        frequency: '每日两次',
        route: '口服'
      },
      {
        id: 'rx-2-2',
        lineNumber: 2,
        drugName: '氨氯地平片',
        drugCode: 'ALM-001',
        dosage: '0.005g',
        dosageValue: 0.005,
        dosageUnit: 'g',
        frequency: '每日一次',
        route: '口服'
      }
    ],
    availableDrugs: [
      {
        id: 'drug-dmf',
        name: '二甲双胍片',
        code: 'DMF-001',
        specifications: '0.25g/片',
        unit: 'g',
        unitConversions: [{ from: 'g', to: 'mg', factor: 1000 }],
        batchNumbers: [
          { id: 'batch-dmf-1', number: 'DMF20250115', productionDate: '2025-01-15', expiryDate: '2028-01-15', isExpired: false },
          { id: 'batch-dmf-2', number: 'DMF20230115', productionDate: '2023-01-15', expiryDate: '2026-01-15', isExpired: false },
          { id: 'batch-dmf-3', number: 'DMF20210115', productionDate: '2021-01-15', expiryDate: '2024-01-15', isExpired: true }
        ],
        contraindications: ['严重肝肾功能不全者禁用'],
        warnings: ['可能引起胃肠道反应']
      },
      {
        id: 'drug-alm',
        name: '氨氯地平片',
        code: 'ALM-001',
        specifications: '5mg/片',
        unit: 'mg',
        unitConversions: [{ from: 'mg', to: 'g', factor: 0.001 }],
        batchNumbers: [
          { id: 'batch-alm-1', number: 'ALM20250201', productionDate: '2025-02-01', expiryDate: '2028-02-01', isExpired: false }
        ],
        contraindications: [],
        warnings: ['可能引起头痛、水肿']
      },
      {
        id: 'drug-asp',
        name: '阿司匹林肠溶片',
        code: 'ASP-001',
        specifications: '100mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-asp-1', number: 'ASP20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['活动性出血者禁用', '胃溃疡者禁用'],
        warnings: ['可能增加出血风险']
      }
    ],
    targetScore: 120
  },
  {
    id: 'level-3',
    name: '挑战：禁忌识别',
    description: '包含禁忌药品，需要仔细核对患者病情和过敏史',
    difficulty: 3,
    timeLimit: 300,
    patientInfo: {
      name: '王五',
      age: 58,
      gender: '男',
      conditions: ['胃溃疡', '高血压', '痛风'],
      allergies: ['磺胺类药物']
    },
    prescriptions: [
      {
        id: 'rx-3-1',
        lineNumber: 1,
        drugName: '奥美拉唑胶囊',
        drugCode: 'OMZ-001',
        dosage: '20mg',
        dosageValue: 20,
        dosageUnit: 'mg',
        frequency: '每日两次',
        route: '口服'
      },
      {
        id: 'rx-3-2',
        lineNumber: 2,
        drugName: '氢氯噻嗪片',
        drugCode: 'HCT-001',
        dosage: '25mg',
        dosageValue: 25,
        dosageUnit: 'mg',
        frequency: '每日一次',
        route: '口服'
      },
      {
        id: 'rx-3-3',
        lineNumber: 3,
        drugName: '别嘌醇片',
        drugCode: 'ALP-001',
        dosage: '0.1g',
        dosageValue: 0.1,
        dosageUnit: 'g',
        frequency: '每日一次',
        route: '口服'
      }
    ],
    availableDrugs: [
      {
        id: 'drug-omz',
        name: '奥美拉唑胶囊',
        code: 'OMZ-001',
        specifications: '20mg/粒',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-omz-1', number: 'OMZ20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false },
          { id: 'batch-omz-2', number: 'OMZ20220101', productionDate: '2022-01-01', expiryDate: '2024-01-01', isExpired: true }
        ],
        contraindications: [],
        warnings: ['长期使用需监测肝功能']
      },
      {
        id: 'drug-hct',
        name: '氢氯噻嗪片',
        code: 'HCT-001',
        specifications: '25mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-hct-1', number: 'HCT20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false }
        ],
        contraindications: ['对磺胺类药物过敏者禁用'],
        warnings: ['可能引起电解质紊乱', '痛风患者慎用']
      },
      {
        id: 'drug-alp',
        name: '别嘌醇片',
        code: 'ALP-001',
        specifications: '0.1g/片',
        unit: 'g',
        unitConversions: [{ from: 'g', to: 'mg', factor: 1000 }],
        batchNumbers: [
          { id: 'batch-alp-1', number: 'ALP20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false }
        ],
        contraindications: [],
        warnings: ['用药初期可能诱发痛风']
      },
      {
        id: 'drug-ibp',
        name: '布洛芬缓释胶囊',
        code: 'IBP-001',
        specifications: '0.3g/粒',
        unit: 'g',
        batchNumbers: [
          { id: 'batch-ibp-1', number: 'IBP20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['活动期消化道溃疡者禁用'],
        warnings: ['可能加重胃溃疡']
      }
    ],
    targetScore: 150
  },
  {
    id: 'level-4',
    name: '高手：综合考核',
    description: '包含单位换算、禁忌识别和批号核对的综合考验',
    difficulty: 4,
    timeLimit: 360,
    patientInfo: {
      name: '赵六',
      age: 72,
      gender: '女',
      conditions: ['冠心病', '糖尿病', '肾功能不全'],
      allergies: ['青霉素', '头孢菌素']
    },
    prescriptions: [
      {
        id: 'rx-4-1',
        lineNumber: 1,
        drugName: '硝酸甘油片',
        drugCode: 'NTG-001',
        dosage: '0.5mg',
        dosageValue: 0.5,
        dosageUnit: 'mg',
        frequency: '必要时',
        route: '舌下含服'
      },
      {
        id: 'rx-4-2',
        lineNumber: 2,
        drugName: '格列美脲片',
        drugCode: 'GLM-001',
        dosage: '0.002g',
        dosageValue: 0.002,
        dosageUnit: 'g',
        frequency: '每日一次',
        route: '口服'
      },
      {
        id: 'rx-4-3',
        lineNumber: 3,
        drugName: '阿托伐他汀钙片',
        drugCode: 'ATV-001',
        dosage: '20mg',
        dosageValue: 20,
        dosageUnit: 'mg',
        frequency: '每晚一次',
        route: '口服'
      }
    ],
    availableDrugs: [
      {
        id: 'drug-ntg',
        name: '硝酸甘油片',
        code: 'NTG-001',
        specifications: '0.5mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-ntg-1', number: 'NTG20250101', productionDate: '2025-01-01', expiryDate: '2026-07-01', isExpired: false },
          { id: 'batch-ntg-2', number: 'NTG20230101', productionDate: '2023-01-01', expiryDate: '2024-07-01', isExpired: true }
        ],
        contraindications: [],
        warnings: ['可能引起头痛、低血压']
      },
      {
        id: 'drug-glm',
        name: '格列美脲片',
        code: 'GLM-001',
        specifications: '2mg/片',
        unit: 'mg',
        unitConversions: [{ from: 'mg', to: 'g', factor: 0.001 }],
        batchNumbers: [
          { id: 'batch-glm-1', number: 'GLM20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false }
        ],
        contraindications: [],
        warnings: ['注意监测血糖', '可能引起低血糖']
      },
      {
        id: 'drug-atv',
        name: '阿托伐他汀钙片',
        code: 'ATV-001',
        specifications: '20mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-atv-1', number: 'ATV20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false },
          { id: 'batch-atv-2', number: 'ATV20240101', productionDate: '2024-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['严重肝功能不全者禁用'],
        warnings: ['定期监测肝功能和肌酶']
      },
      {
        id: 'drug-cef',
        name: '头孢呋辛酯片',
        code: 'CEF-001',
        specifications: '0.25g/片',
        unit: 'g',
        unitConversions: [{ from: 'g', to: 'mg', factor: 1000 }],
        batchNumbers: [
          { id: 'batch-cef-1', number: 'CEF20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['对头孢菌素过敏者禁用'],
        warnings: ['注意交叉过敏反应'],
        isTrap: true,
        trapType: 'CONTRAINDICATION'
      }
    ],
    targetScore: 180
  },
  {
    id: 'level-5',
    name: '专家：极限挑战',
    description: '高难度综合考核，包含多个陷阱和复杂情况',
    difficulty: 5,
    timeLimit: 420,
    patientInfo: {
      name: '钱七',
      age: 85,
      gender: '男',
      conditions: ['心力衰竭', '房颤', '糖尿病', '肾功能不全'],
      allergies: ['青霉素', '磺胺类', '非甾体抗炎药']
    },
    prescriptions: [
      {
        id: 'rx-5-1',
        lineNumber: 1,
        drugName: '地高辛片',
        drugCode: 'DGX-001',
        dosage: '0.125mg',
        dosageValue: 0.125,
        dosageUnit: 'mg',
        frequency: '每日一次',
        route: '口服'
      },
      {
        id: 'rx-5-2',
        lineNumber: 2,
        drugName: '华法林钠片',
        drugCode: 'WFR-001',
        dosage: '0.003g',
        dosageValue: 0.003,
        dosageUnit: 'g',
        frequency: '每日一次',
        route: '口服'
      },
      {
        id: 'rx-5-3',
        lineNumber: 3,
        drugName: '呋塞米片',
        drugCode: 'FSM-001',
        dosage: '40mg',
        dosageValue: 40,
        dosageUnit: 'mg',
        frequency: '每日两次',
        route: '口服'
      },
      {
        id: 'rx-5-4',
        lineNumber: 4,
        drugName: '二甲双胍片',
        drugCode: 'DMF-001',
        dosage: '0.5g',
        dosageValue: 0.5,
        dosageUnit: 'g',
        frequency: '每日两次',
        route: '口服'
      }
    ],
    availableDrugs: [
      {
        id: 'drug-dgx',
        name: '地高辛片',
        code: 'DGX-001',
        specifications: '0.25mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-dgx-1', number: 'DGX20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false },
          { id: 'batch-dgx-2', number: 'DGX20200101', productionDate: '2020-01-01', expiryDate: '2023-01-01', isExpired: true }
        ],
        contraindications: [],
        warnings: ['治疗窗窄，需监测血药浓度', '可能引起心律失常']
      },
      {
        id: 'drug-wfr',
        name: '华法林钠片',
        code: 'WFR-001',
        specifications: '3mg/片',
        unit: 'mg',
        unitConversions: [{ from: 'mg', to: 'g', factor: 0.001 }],
        batchNumbers: [
          { id: 'batch-wfr-1', number: 'WFR20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['活动性出血者禁用', '严重高血压者禁用'],
        warnings: ['需定期监测INR', '注意药物相互作用']
      },
      {
        id: 'drug-fsm',
        name: '呋塞米片',
        code: 'FSM-001',
        specifications: '20mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-fsm-1', number: 'FSM20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false }
        ],
        contraindications: [],
        warnings: ['注意监测电解质', '可能引起低钾血症']
      },
      {
        id: 'drug-dmf5',
        name: '二甲双胍片',
        code: 'DMF-001',
        specifications: '0.5g/片',
        unit: 'g',
        unitConversions: [{ from: 'g', to: 'mg', factor: 1000 }],
        batchNumbers: [
          { id: 'batch-dmf5-1', number: 'DMF20250101', productionDate: '2025-01-01', expiryDate: '2028-01-01', isExpired: false },
          { id: 'batch-dmf5-2', number: 'DMF20220101', productionDate: '2022-01-01', expiryDate: '2025-01-01', isExpired: false },
          { id: 'batch-dmf5-3', number: 'DMF20200101', productionDate: '2020-01-01', expiryDate: '2023-01-01', isExpired: true }
        ],
        contraindications: ['严重肾功能不全者禁用'],
        warnings: ['可能引起乳酸酸中毒', '老年人需减量']
      },
      {
        id: 'drug-asp5',
        name: '阿司匹林肠溶片',
        code: 'ASP-001',
        specifications: '100mg/片',
        unit: 'mg',
        batchNumbers: [
          { id: 'batch-asp5-1', number: 'ASP20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['活动性出血者禁用'],
        warnings: ['可能增加出血风险'],
        isTrap: true,
        trapType: 'CONTRAINDICATION'
      },
      {
        id: 'drug-ibp5',
        name: '布洛芬缓释胶囊',
        code: 'IBP-001',
        specifications: '0.3g/粒',
        unit: 'g',
        batchNumbers: [
          { id: 'batch-ibp5-1', number: 'IBP20250101', productionDate: '2025-01-01', expiryDate: '2027-01-01', isExpired: false }
        ],
        contraindications: ['对非甾体抗炎药过敏者禁用'],
        warnings: ['可能影响肾功能'],
        isTrap: true,
        trapType: 'CONTRAINDICATION'
      }
    ],
    targetScore: 200
  }
];

export const getLevelById = (id: string): LevelConfig | undefined => {
  return levels.find(level => level.id === id);
};

export const calculateMaxScore = (level: LevelConfig): number => {
  return level.prescriptions.length * 50;
};
