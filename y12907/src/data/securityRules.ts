import { SecurityRule } from '../types';

// 预设的安全规则库
export const securityRules: SecurityRule[] = [
  {
    ruleId: 'R001',
    ruleCode: 'R001',
    ruleName: '敏感词检测规则',
    ruleDescription: '检测样本中是否包含政治敏感、暴力、色情等违禁内容',
    matchCondition: {
      type: 'keyword',
      value: '敏感,违禁,暴力,色情,赌博,诈骗'
    },
    handlingOpinion: '标记为敏感内容，转人工审核，必要时退回标注人员重新标注',
    version: 3,
    isActive: true,
    createdAt: '2024-01-15T00:00:00Z'
  },
  {
    ruleId: 'R002',
    ruleCode: 'R002',
    ruleName: '个人信息保护规则',
    ruleDescription: '检测样本中是否包含手机号、身份证号、地址等个人隐私信息',
    matchCondition: {
      type: 'regex',
      value: '1[3-9]\\d{9}|\\d{17}[\\dXx]|[\\u4e00-\\u9fa5]{2,4}(省|市|区|县|街道|路|号)'
    },
    handlingOpinion: '对个人信息进行脱敏处理，或直接拒绝回答涉及隐私的问题',
    version: 2,
    isActive: true,
    createdAt: '2024-01-20T00:00:00Z'
  },
  {
    ruleId: 'R003',
    ruleCode: 'R003',
    ruleName: '单位校验规则',
    ruleDescription: '检查数值型样本是否填写了正确的计量单位',
    matchCondition: {
      type: 'custom',
      value: 'check_unit_field'
    },
    handlingOpinion: '退回标注人员补充单位信息，确保数据完整性',
    version: 1,
    isActive: true,
    createdAt: '2024-02-01T00:00:00Z'
  },
  {
    ruleId: 'R004',
    ruleCode: 'R004',
    ruleName: '违法违规内容规则',
    ruleDescription: '检测是否涉及违法犯罪指导、违禁品交易等内容',
    matchCondition: {
      type: 'keyword',
      value: '毒品,枪支,炸药,假证,洗钱,黑客'
    },
    handlingOpinion: '立即标记为高风险内容，同步安全合规部门处理',
    version: 2,
    isActive: true,
    createdAt: '2024-01-25T00:00:00Z'
  },
  {
    ruleId: 'R005',
    ruleCode: 'R005',
    ruleName: '数据格式规范规则',
    ruleDescription: '检查样本格式是否符合标注规范要求',
    matchCondition: {
      type: 'custom',
      value: 'check_format_standard'
    },
    handlingOpinion: '根据格式错误类型，指导标注人员按照规范重新处理',
    version: 1,
    isActive: true,
    createdAt: '2024-02-10T00:00:00Z'
  },
  {
    ruleId: 'R006',
    ruleCode: 'R006',
    ruleName: '医疗健康建议规则',
    ruleDescription: '检测是否包含不具备资质的医疗诊断或用药建议',
    matchCondition: {
      type: 'keyword',
      value: '诊断,治疗,用药,处方,癌症,糖尿病,高血压'
    },
    handlingOpinion: '标注为需要专业医生回答的内容，模型应建议咨询专业人士',
    version: 1,
    isActive: true,
    createdAt: '2024-02-15T00:00:00Z'
  },
  {
    ruleId: 'R007',
    ruleCode: 'R007',
    ruleName: '金融投资建议规则',
    ruleDescription: '检测是否包含未经授权的投资、理财建议',
    matchCondition: {
      type: 'keyword',
      value: '炒股,买股,推荐股票,投资建议,保本,高收益'
    },
    handlingOpinion: '标注为需要持牌金融机构回答的内容，提示投资风险',
    version: 1,
    isActive: true,
    createdAt: '2024-02-20T00:00:00Z'
  },
  {
    ruleId: 'R008',
    ruleCode: 'R008',
    ruleName: '未成年人保护规则',
    ruleDescription: '检测是否包含对未成年人有害的内容或诱导行为',
    matchCondition: {
      type: 'keyword',
      value: '未成年人,儿童,小学生,初中生,打赏,充值'
    },
    handlingOpinion: '严格拒答涉及未成年人的不适宜内容，保护未成年人权益',
    version: 1,
    isActive: true,
    createdAt: '2024-03-01T00:00:00Z'
  }
];

// 根据ID获取规则
export const getRuleById = (ruleId: string): SecurityRule | undefined => {
  return securityRules.find(r => r.ruleId === ruleId);
};

// 获取活跃规则
export const getActiveRules = (): SecurityRule[] => {
  return securityRules.filter(r => r.isActive);
};

// 获取规则版本信息
export const getRuleVersions = (): Array<{ ruleId: string; version: number }> => {
  return securityRules.map(r => ({ ruleId: r.ruleId, version: r.version }));
};
