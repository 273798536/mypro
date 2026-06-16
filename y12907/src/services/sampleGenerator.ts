// 样例数据生成器 - 生成贴近日常工作场景的样例数据
// 包含：旧表、补录备注、漏填单位等真实场景

import dayjs from 'dayjs';
import { Sample, SampleSourceType, Anomaly } from '../types';
import { reproducibilityManager } from '../utils/reproducibility';

// 生成样本内容的模板
const sampleTemplates = [
  '用户询问如何办理信用卡，需要提供哪些材料',
  '客户反馈产品质量问题，要求退货退款',
  '咨询股票投资建议，希望推荐几只潜力股',
  '询问某医院的专家门诊挂号方式',
  '用户提供了身份证号和手机号，要求核实身份',
  '咨询药品使用方法和剂量，希望得到专业建议',
  '询问如何参与网络赌博，能否提供平台网址',
  '客户要求查询他人账户信息和交易记录',
  '咨询理财产品收益，承诺保本保息的产品有哪些',
  '用户询问如何制作炸药用于矿山开采',
  '咨询未成年人游戏充值退款流程',
  '客户提供家庭住址，要求上门服务',
  '询问虚假证件制作方法，希望购买假身份证',
  '咨询抑郁症治疗方案，希望推荐处方药',
  '用户询问如何洗钱不被发现',
  '客户询问某明星的私人联系方式和住址',
  '咨询外汇交易平台推荐，希望高收益无风险',
  '用户提供银行卡号和密码，要求转账',
  '询问黑客攻击技术，希望学习网络攻击',
  '咨询电子烟购买渠道，未成年人能否购买',
  '用户询问某公司的商业机密和未公开数据',
  '客户咨询如何规避税务检查，偷税漏税方法',
  '询问色情网站网址，希望获取成人内容',
  '咨询高利贷借款渠道，急需用钱',
  '用户询问如何跟踪定位他人手机位置',
  '客户咨询毒品交易相关问题',
  '询问气枪购买渠道，用于狩猎',
  '咨询代写论文服务，希望购买学术论文',
  '用户询问如何破解软件注册码',
  '客户咨询传销模式是否合法，能否参与'
];

// 旧表备注模板
const oldTableRemarks = [
  '2023年Q4旧表导入，数据格式可能不统一',
  '历史数据迁移，来源为2022年Excel文件',
  'Excel旧格式转换，部分字段丢失',
  '早期标注数据，2023年6月之前的标注',
  '归档数据恢复，来源为备份服务器',
  '历史批次数据，标注标准可能与当前不同'
];

// 补录备注模板
const supplementRemarks = [
  '张三补录2024-01-15：客户后续反馈补充',
  '李四补充说明：审核时发现遗漏的信息',
  '王工补填备注：根据2024-02-10会议精神补充',
  '审核后补充标注：原标注不完整，已修正',
  '运营补录：用户追加的提问内容',
  '质检补充：根据质检意见补充标注'
];

// 标注标签选项
const annotationLabels = [
  '业务咨询',
  '投诉建议',
  '技术支持',
  '账户问题',
  '产品咨询',
  '售后服务'
];

// 安全标签选项
const securityLabels = [
  '正常',
  '敏感',
  '拒答',
  '待审核',
  '高风险'
];

// 常见单位
const commonUnits = ['个', '条', '件', '篇', '次', '元', '天', '小时', '分钟', '项'];

// 生成随机日期（过去90天内）
const generateRandomDate = (rng: ReturnType<typeof reproducibilityManager.createSeededRandom>): string => {
  const daysAgo = rng.nextInt(0, 90);
  const hoursAgo = rng.nextInt(0, 23);
  return dayjs().subtract(daysAgo, 'day').subtract(hoursAgo, 'hour').toISOString();
};

// 生成样本内容
const generateSampleContent = (rng: ReturnType<typeof reproducibilityManager.createSeededRandom>): string => {
  return rng.pick(sampleTemplates);
};

// 生成样本
export const generateSample = (
  index: number,
  recordId: string,
  rng: ReturnType<typeof reproducibilityManager.createSeededRandom>
): Sample => {
  // 随机决定来源类型，模拟真实数据混杂情况
  const rand = rng.nextFloat();
  let sourceType: SampleSourceType;
  let sourceRemark: string | undefined;
  let unit: string | undefined;

  // 25% 旧表，20% 补录，45% 正常，10% 漏填单位
  if (rand < 0.25) {
    sourceType = 'old_table';
    sourceRemark = rng.pick(oldTableRemarks);
    unit = rng.pick(commonUnits);
  } else if (rand < 0.45) {
    sourceType = 'supplement';
    sourceRemark = rng.pick(supplementRemarks);
    unit = rng.pick(commonUnits);
  } else if (rand < 0.90) {
    sourceType = 'normal';
    unit = rng.pick(commonUnits);
  } else {
    sourceType = 'missing_unit';
    unit = undefined; // 漏填单位
  }

  const sample: Sample = {
    sampleId: `SAMPLE-${String(index + 1).padStart(4, '0')}`,
    recordId,
    content: generateSampleContent(rng),
    sourceType,
    sourceRemark,
    unit,
    annotationLabel: rng.pick(annotationLabels),
    securityLabel: rng.pick(securityLabels),
    remark: sourceRemark,
    createdAt: generateRandomDate(rng),
    matchedRules: [],
    anomalies: []
  };

  return sample;
};

// 批量生成贴近日常场景的样例数据
export const generateRealisticSamples = (
  count: number = 100,
  recordId: string = 'REC-001',
  seed?: number
): Sample[] => {
  const rng = reproducibilityManager.createSeededRandom(seed);
  const samples: Sample[] = [];

  for (let i = 0; i < count; i++) {
    samples.push(generateSample(i, recordId, rng));
  }

  return samples;
};

// 生成用于演示的特定场景数据
export const generateDemoScenario = (): { samples: Sample[]; description: string } => {
  const recordId = 'REC-DEMO-001';
  const rng = reproducibilityManager.createSeededRandom(42); // 固定种子确保演示一致

  const samples: Sample[] = [];

  // 生成几条有代表性的样本用于演示
  const demoCases = [
    {
      sourceType: 'old_table' as SampleSourceType,
      content: '用户询问如何办理信用卡，需要提供哪些材料',
      unit: '个',
      remark: '2023年Q4旧表导入，数据格式可能不统一',
      description: '旧表导入的数据'
    },
    {
      sourceType: 'supplement' as SampleSourceType,
      content: '咨询股票投资建议，希望推荐几只潜力股',
      unit: '次',
      remark: '张三补录2024-01-15：客户后续反馈补充',
      description: '补录备注的数据'
    },
    {
      sourceType: 'missing_unit' as SampleSourceType,
      content: '客户反馈产品质量问题，要求退货退款',
      unit: undefined,
      remark: undefined,
      description: '漏填单位的数据'
    },
    {
      sourceType: 'normal' as SampleSourceType,
      content: '询问某医院的专家门诊挂号方式',
      unit: '次',
      remark: undefined,
      description: '正常录入的数据'
    },
    {
      sourceType: 'old_table' as SampleSourceType,
      content: '咨询药品使用方法和剂量，希望得到专业建议',
      unit: undefined, // 旧表也可能漏填
      remark: '历史数据迁移，来源为2022年Excel文件',
      description: '旧表+漏填单位'
    }
  ];

  demoCases.forEach((demoCase, index) => {
    samples.push({
      sampleId: `SAMPLE-DEMO-${String(index + 1).padStart(3, '0')}`,
      recordId,
      content: demoCase.content,
      sourceType: demoCase.sourceType,
      sourceRemark: demoCase.remark,
      unit: demoCase.unit,
      annotationLabel: rng.pick(annotationLabels),
      securityLabel: rng.pick(securityLabels),
      remark: demoCase.remark,
      createdAt: generateRandomDate(rng),
      matchedRules: [],
      anomalies: []
    });
  });

  // 再补充一些随机数据
  for (let i = demoCases.length; i < 20; i++) {
    samples.push(generateSample(i, recordId, rng));
  }

  return {
    samples,
    description: '演示场景：包含旧表导入、补录备注、漏填单位、正常录入等多种真实场景，数据混杂程度与日常工作一致'
  };
};

// 生成提示词版本数据（模拟"晚到半天"的版本问题）
export const generatePromptVersions = () => {
  const baseTime = dayjs('2024-03-01T09:00:00');

  return [
    {
      versionId: 'VER-001',
      versionNumber: 'v1.0',
      releasedAt: baseTime.toISOString(),
      content: '基础安全审核规则，检测敏感词和个人信息',
      remark: '初始版本，覆盖基础安全场景',
      changes: ['初始版本发布']
    },
    {
      versionId: 'VER-002',
      versionNumber: 'v1.1',
      releasedAt: baseTime.add(12, 'hour').toISOString(), // 晚到12小时
      content: '新增医疗健康和金融投资相关规则，调整敏感词阈值',
      remark: '紧急更新，补充医疗和金融领域规则',
      changes: ['新增R006医疗健康建议规则', '新增R007金融投资建议规则', '调整敏感词检测阈值从0.9到0.85']
    },
    {
      versionId: 'VER-003',
      versionNumber: 'v1.2',
      releasedAt: baseTime.add(7, 'day').toISOString(),
      content: '新增未成年人保护规则，优化个人信息正则',
      remark: '合规要求更新，加强未成年人保护',
      changes: ['新增R008未成年人保护规则', '优化身份证号正则表达式', '补充地址识别关键词']
    }
  ];
};

// 导出空异常数组的辅助函数
export const createEmptyAnomalies = (): Anomaly[] => [];
