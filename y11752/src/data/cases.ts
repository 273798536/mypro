import { Case } from '@/types/game';

export const cases: Case[] = [
  {
    id: 'case-001',
    title: '张先生的意外医疗保险理赔',
    description: '客户张先生因意外摔倒导致骨折，提交了医疗费用理赔申请。请审核材料是否完整，是否存在风险点。',
    customer: {
      name: '张先生',
      avatar: '👨',
      emotion: 'neutral'
    },
    timeLimit: 300,
    difficulty: 'easy',
    materials: [
      {
        id: 'mat-001',
        type: 'claim',
        title: '理赔申请书',
        content: '理赔申请书编号：CL202401001\n申请人：张三\n身份证号：310101198001011234\n联系电话：13800138000\n理赔类型：意外医疗\n出险时间：2024-01-15\n出险地点：上海市浦东新区\n出险原因：意外摔倒\n申请金额：12,500元',
        source: '客户提交',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-002',
        type: 'invoice',
        title: '住院收费票据（第一联）',
        content: '票据编号：INV20240115001\n医院名称：上海市第一人民医院\n患者姓名：张三\n收费日期：2024-01-20\n项目：住院费\n金额：8,500元\n状态：已缴费',
        source: '医院提供',
        hasRisk: true,
        riskType: 'duplicate',
        riskDescription: '该票据编号与另一张票据重复，可能存在重复报销',
        isComplete: true,
        relatedMaterialIds: ['mat-003']
      },
      {
        id: 'mat-003',
        type: 'invoice',
        title: '住院收费票据（第二联）',
        content: '票据编号：INV20240115001\n医院名称：上海市第一人民医院\n患者姓名：张三\n收费日期：2024-01-20\n项目：住院费\n金额：8,500元\n状态：已缴费\n备注：第二联（报销联）',
        source: '客户提交',
        hasRisk: true,
        riskType: 'duplicate',
        riskDescription: '该票据编号与另一张票据重复，为同一费用的不同联次',
        isComplete: true,
        relatedMaterialIds: ['mat-002']
      },
      {
        id: 'mat-004',
        type: 'invoice',
        title: '药品收费票据',
        content: '票据编号：INV20240120002\n药房名称：华氏大药房\n患者姓名：张三\n日期：2024-01-22\n项目：伤科接骨片、钙片\n金额：850元',
        source: '药房提供',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-005',
        type: 'photo',
        title: '医院诊断证明照片',
        content: '诊断证明照片\n诊断日期：2024-01-15\n诊断结果：右胫腓骨骨折\n治疗建议：住院手术治疗，休息三个月\n医生签名：王医生\n医院盖章：是',
        source: '客户拍摄',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-006',
        type: 'photo',
        title: '事故现场照片',
        content: '事故现场照片\n拍摄时间：2024-01-15 14:30\n地点：小区楼道\n可见：地面有积水，无防滑警示标志\n伤者位置：楼梯拐角处',
        source: '客户拍摄',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-007',
        type: 'policy',
        title: '保险单条款',
        content: '保险单编号：POL2023001234\n险种：意外伤害保险\n保险期间：2023-01-01至2024-12-31\n保险金额：50万元\n\ud83d\udd34【责任免除】\n被保险人因下列原因导致医疗费用支出的，本公司不承担给付保险金责任：\n（五）被保险人酒后驾驶、无有效驾驶证驾驶或驾驶无有效行驶证的机动车期间；\n（七）被保险人未遵医嘱，私自服用、涂用、注射药物；\n（十）被保险人在进行高风险运动时发生的意外伤害。',
        source: '保险公司存档',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-008',
        type: 'policy',
        title: '保单特别约定',
        content: '特别约定条款：\n1. 本保单医疗费用免赔额为100元，赔付比例90%\n2. 每次事故门诊限额1000元，住院限额50000元\n3. \ud83d\udd34【重要提示】本保单不承担因整容、整形手术导致的医疗费用\n4. \ud83d\udd34【重要提示】既往症及其并发症不在保障范围内',
        source: '保险公司存档',
        hasRisk: true,
        riskType: 'exemption',
        riskDescription: '客户骨折若为既往症，根据特别约定第4条不予赔付',
        isComplete: true
      },
      {
        id: 'mat-009',
        type: 'emotion',
        title: '客户通话记录摘要',
        content: '通话时间：2024-01-25 10:30\n通话时长：15分钟\n客户情绪：\ud83d\ude10 一般\n客户表述：\n- "材料都交了快一周了，什么时候能有结果？"\n- "每次打电话都说在审核，能不能快点？"\n- "我这还等着钱付后续治疗费呢"\n客服回复：已加急处理，预计3个工作日内回复',
        source: '客服系统记录',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-010',
        type: 'report',
        title: '初步审核报告',
        content: '报告编号：REP202401001\n审核日期：2024-01-26\n审核人：李审核\n初步结论：\n1. 理赔申请书填写完整，信息准确\n2. 医疗票据齐全，金额合计9,350元\n3. 诊断证明清晰，与事故描述一致\n4. 事故现场照片合理可信\n⚠️ 待核实事项：\n- 需确认客户是否有既往骨折病史\n- 两张相同编号票据需确认是否重复报销',
        source: '审核员提交',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-011',
        type: 'report',
        title: '补材通知书（补料超时）',
        content: '补材通知书编号：SUP202401001\n发送日期：2024-01-22\n要求补充材料：\n1. 既往病史承诺书\n2. 事故目击证人联系方式\n\ud83d\udd34 补材期限：收到通知后3个工作日内\n\ud83d\udd34 当前状态：已逾期5天\n客户回复：正在找证人，还需要几天时间',
        source: '理赔系统',
        hasRisk: true,
        riskType: 'timeout',
        riskDescription: '客户补充材料已超过规定期限5天，影响理赔时效',
        isComplete: false
      },
      {
        id: 'mat-012',
        type: 'emotion',
        title: '客户微信聊天记录',
        content: '聊天对象：理赔专员\n时间：2024-01-28 16:45\n\ud83d\ude24 客户：又要补材料？上次不是都给你们了吗？\n\ud83d\udcd3 专员：不好意思，需要您提供一下既往病史的情况\n\ud83d\ude24 客户：没有没有！我身体一直很好！你们就是不想赔钱！\n\ud83d\udcd3 专员：请您理解，这是流程要求...\n\ud83d\ude24 客户：我要投诉！什么破保险公司！',
        source: '微信记录截图',
        hasRisk: false,
        isComplete: true
      }
    ],
    correctAnswers: [
      {
        materialId: 'mat-001',
        shouldMarkRisk: false,
        points: 10,
        explanation: '理赔申请书填写完整，信息准确，无风险'
      },
      {
        materialId: 'mat-002',
        shouldMarkRisk: true,
        riskType: 'duplicate',
        points: 15,
        explanation: '该票据编号与mat-003重复，属于同一费用的不同联次，存在重复报销风险'
      },
      {
        materialId: 'mat-003',
        shouldMarkRisk: true,
        riskType: 'duplicate',
        points: 15,
        explanation: '该票据编号与mat-002重复，属于同一费用的不同联次，存在重复报销风险'
      },
      {
        materialId: 'mat-004',
        shouldMarkRisk: false,
        points: 10,
        explanation: '药品票据正常，无风险'
      },
      {
        materialId: 'mat-005',
        shouldMarkRisk: false,
        points: 10,
        explanation: '诊断证明清晰完整，无风险'
      },
      {
        materialId: 'mat-006',
        shouldMarkRisk: false,
        points: 10,
        explanation: '事故现场照片合理可信，无风险'
      },
      {
        materialId: 'mat-007',
        shouldMarkRisk: false,
        points: 10,
        explanation: '保单条款正常，本案不涉及免责条款'
      },
      {
        materialId: 'mat-008',
        shouldMarkRisk: true,
        riskType: 'exemption',
        points: 30,
        explanation: '特别约定第4条明确既往症不予赔付，需核实客户是否有既往骨折病史，此为重要免责条款'
      },
      {
        materialId: 'mat-009',
        shouldMarkRisk: false,
        points: 10,
        explanation: '客户情绪正常，无特殊风险'
      },
      {
        materialId: 'mat-010',
        shouldMarkRisk: false,
        points: 10,
        explanation: '初步审核报告内容完整，待核实事项已标注'
      },
      {
        materialId: 'mat-011',
        shouldMarkRisk: true,
        riskType: 'timeout',
        points: 15,
        explanation: '客户补充材料已逾期5天，需关注对理赔时效和客户满意度的影响'
      },
      {
        materialId: 'mat-012',
        shouldMarkRisk: false,
        points: 10,
        explanation: '客户情绪激动但未发现风险点，需做好客户安抚工作'
      }
    ]
  },
  {
    id: 'case-002',
    title: '李女士的重疾险理赔调查',
    description: '客户李女士确诊甲状腺癌，提交了重疾理赔申请。请仔细审核材料，特别关注投保前健康告知情况。',
    customer: {
      name: '李女士',
      avatar: '👩',
      emotion: 'angry'
    },
    timeLimit: 360,
    difficulty: 'medium',
    materials: [
      {
        id: 'mat-101',
        type: 'claim',
        title: '重疾理赔申请书',
        content: '理赔申请书编号：CL202402001\n申请人：李四\n身份证号：310101198505055678\n联系电话：13900139000\n理赔类型：重大疾病\n出险时间：2024-02-10\n确诊疾病：甲状腺乳头状癌\n申请金额：50万元\n投保时间：2023-06-15',
        source: '客户提交',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-102',
        type: 'invoice',
        title: '住院收费票据',
        content: '票据编号：INV20240215001\n医院名称：复旦大学附属肿瘤医院\n患者姓名：李四\n收费日期：2024-02-20\n项目：甲状腺癌根治术\n金额：35,800元\n状态：已缴费',
        source: '医院提供',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-103',
        type: 'photo',
        title: '病理诊断报告',
        content: '病理号：P202402123\n患者：李四\n诊断：甲状腺乳头状癌（左侧）\n肿瘤大小：1.2cm\n淋巴结转移：无\n手术日期：2024-02-12\n报告日期：2024-02-15\n病理医师签名：陈病理\n医院盖章：是',
        source: '医院提供',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-104',
        type: 'policy',
        title: '重大疾病保险条款',
        content: '保险单编号：POL2023061234\n险种：重大疾病保险\n保险金额：50万元\n\ud83d\udd34【责任免除】\n因下列情形之一，导致被保险人发生疾病、达到疾病状态或进行手术的，本公司不承担给付保险金的责任：\n（一）投保人对被保险人的故意杀害、故意伤害；\n（二）被保险人故意自伤、故意犯罪或者抗拒依法采取的刑事强制措施；\n（三）被保险人主动吸食或注射毒品；\n\ud83d\udd34【重要提示】投保前已患的疾病、症状、体征、生理缺陷或畸形不在保障范围内',
        source: '保险公司存档',
        hasRisk: true,
        riskType: 'exemption',
        riskDescription: '需核实客户投保前是否有甲状腺相关病史',
        isComplete: true
      },
      {
        id: 'mat-105',
        type: 'report',
        title: '投保健康告知书',
        content: '投保日期：2023-06-15\n健康告知问卷：\n1. 过去两年内是否曾住院治疗？答：否\n2. 是否曾患有或被告知患有甲状腺结节、甲状腺肿等甲状腺疾病？答：否\n3. 是否曾患有或被告知患有肿瘤、囊肿、息肉？答：否\n4. 过去一年内是否做过B超、CT等检查？答：否\n客户签名：李四\n日期：2023-06-15\n\ud83d\udd34 审核发现：投保仅8个月即出险，需调取体检记录核实',
        source: '投保档案',
        hasRisk: true,
        riskType: 'missing',
        riskDescription: '需调取客户投保前的体检记录，核实健康告知真实性',
        isComplete: false
      },
      {
        id: 'mat-106',
        type: 'report',
        title: '医院体检记录调查报告',
        content: '调查机构：XX调查公司\n调查日期：2024-02-25\n\ud83d\udd34 调查发现：\n客户于2022年11月20日在XX体检中心体检\nB超报告显示：甲状腺双侧叶多发结节（TI-RADS 3类）\n医生建议：定期复查，必要时穿刺活检\n\ud83d\udd34 结论：客户投保前已知患有甲状腺结节，但健康告知填写"否"，属于未如实告知',
        source: '调查报告',
        hasRisk: true,
        riskType: 'exemption',
        riskDescription: '客户投保前未如实告知甲状腺结节病史，违反最大诚信原则',
        isComplete: true
      },
      {
        id: 'mat-107',
        type: 'emotion',
        title: '客户投诉记录',
        content: '投诉时间：2024-02-28 09:15\n投诉方式：12378热线\n\ud83d\ude21 客户情绪：非常愤怒\n投诉内容：\n- "你们保险公司就是骗钱的！"\n- "我得了癌症要赔钱了，你们就找各种理由拒赔！"\n- "我要去法院告你们！"\n- "我要找媒体曝光你们！"\n处理状态：处理中\n处理人：王主管',
        source: '投诉系统',
        hasRisk: false,
        isComplete: true
      },
      {
        id: 'mat-108',
        type: 'report',
        title: '理赔调查结论',
        content: '调查编号：INV202402001\n调查日期：2024-03-01\n调查人：张调查\n\ud83d\udd34 调查结论：\n1. 客户投保前（2022年11月）体检发现甲状腺结节\n2. 客户2023年6月投保时，健康告知未如实告知\n3. 客户2024年2月确诊甲状腺癌，距离投保仅8个月\n4. 甲状腺结节与甲状腺癌存在明确的医学关联\n\ud83d\udd34 处理建议：\n根据《保险法》第十六条，投保人故意不履行如实告知义务，保险人有权解除合同，不承担赔偿责任',
        source: '理赔调查部',
        hasRisk: false,
        isComplete: true
      }
    ],
    correctAnswers: [
      {
        materialId: 'mat-101',
        shouldMarkRisk: false,
        points: 10,
        explanation: '理赔申请书填写完整，信息准确'
      },
      {
        materialId: 'mat-102',
        shouldMarkRisk: false,
        points: 10,
        explanation: '住院票据正常，无风险'
      },
      {
        materialId: 'mat-103',
        shouldMarkRisk: false,
        points: 10,
        explanation: '病理诊断报告清晰，确诊甲状腺癌'
      },
      {
        materialId: 'mat-104',
        shouldMarkRisk: true,
        riskType: 'exemption',
        points: 30,
        explanation: '需关注投保前疾病免责条款，需核实健康告知真实性'
      },
      {
        materialId: 'mat-105',
        shouldMarkRisk: true,
        riskType: 'missing',
        points: 15,
        explanation: '投保仅8个月即出险，需补充调查投保前健康状况'
      },
      {
        materialId: 'mat-106',
        shouldMarkRisk: true,
        riskType: 'exemption',
        points: 30,
        explanation: '客户投保前已知甲状腺结节但未如实告知，构成保险欺诈'
      },
      {
        materialId: 'mat-107',
        shouldMarkRisk: false,
        points: 10,
        explanation: '客户情绪激动属于正常反应，无风险点'
      },
      {
        materialId: 'mat-108',
        shouldMarkRisk: false,
        points: 10,
        explanation: '调查结论清晰，建议合法合规'
      }
    ]
  }
];

export const getCaseById = (id: string): Case | undefined => {
  return cases.find(c => c.id === id);
};

export const getAllCases = (): Case[] => {
  return cases;
};
