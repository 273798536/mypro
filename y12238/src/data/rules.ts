export interface Rule {
  id: string;
  category: string;
  title: string;
  description: string;
  penalty: string;
  examples: string[];
}

export const RULES: Rule[] = [
  {
    id: 'rule-queue-order',
    category: '排队规则',
    title: '按预约顺序排队',
    description: '集卡必须按照预约时间先后顺序进行闸口判定。预约时间较早的集卡享有优先处理权。',
    penalty: '扣10分',
    examples: [
      '预约时间10:00的集卡必须在10:30的集卡之前处理',
      '除非有特殊优先级标记（如紧急物资）'
    ]
  },
  {
    id: 'rule-remark-update',
    category: '版本管理',
    title: '备注版本更新',
    description: '集卡备注发生变更时，版本号自动递增。判定时必须依据最新版本的备注信息。',
    penalty: '扣15分',
    examples: [
      'v1版本备注"危险品需检查"，v2更新为"已安检放行"，应按v2判定',
      '所有历史版本记录将作为证据保留'
    ]
  },
  {
    id: 'rule-yard-version',
    category: '版本管理',
    title: '堆场版本兼容性',
    description: '集卡转场目标必须与当前堆场版本兼容。堆场版本更新后，旧版本的转场指令可能失效。',
    penalty: '扣20分',
    examples: [
      '堆场v2关闭C区，v1版本的"转场至C区"指令需更新',
      '新版本发布时会有系统提示'
    ]
  },
  {
    id: 'rule-shift-overtime',
    category: '班次管理',
    title: '班次超时处理',
    description: '司机班次超时的集卡需要特别标记。超时记录将作为证据永久保留，不被版本更新覆盖。',
    penalty: '警告标记',
    examples: [
      '早班司机工作超过8小时标记为超时',
      '超时集卡建议暂扣，等待换班司机'
    ]
  },
  {
    id: 'rule-appointment-overdue',
    category: '预约管理',
    title: '预约过号重排',
    description: '预约时间已过且未处理的集卡视为过号。过号集卡需重新排队并标记为预约异常。',
    penalty: '扣5分',
    examples: [
      '预约10:00，10:30仍未处理视为过号',
      '过号集卡移至队列末尾等待重新调度'
    ]
  },
  {
    id: 'rule-gate-consistency',
    category: '判定规则',
    title: '闸口判定一致性',
    description: '闸口最终结论必须与集卡当前状态一致。若存在冲突，必须将司机班次记录作为补充证据。',
    penalty: '扣25分',
    examples: [
      '备注显示"放行"但判定为"暂扣"属于不一致',
      '不一致时需在详情中记录班次信息佐证'
    ]
  },
  {
    id: 'rule-release-criteria',
    category: '判定规则',
    title: '放行判定标准',
    description: '满足以下条件可判定放行：备注明确指示放行、预约有效、司机班次正常、货物无异常标记。',
    penalty: '-',
    examples: [
      '备注"正常货物"+班次正常=放行',
      '备注"紧急物资"+预约有效=放行'
    ]
  },
  {
    id: 'rule-detain-criteria',
    category: '判定规则',
    title: '暂扣判定标准',
    description: '以下情况需判定暂扣：备注标记待检、危险品未安检、班次超时、预约过号、货物异常。',
    penalty: '-',
    examples: [
      '备注"海关查验"=暂扣',
      '班次超时1小时=暂扣建议'
    ]
  },
  {
    id: 'rule-transfer-criteria',
    category: '判定规则',
    title: '转场判定标准',
    description: '备注明确指示转场且目标区域在当前堆场版本中可用时，判定为转场。',
    penalty: '-',
    examples: [
      '备注"转场至B区"+B区可用=转场',
      '目标区域关闭时需重新判定'
    ]
  },
  {
    id: 'rule-evidence-retention',
    category: '证据管理',
    title: '证据不可篡改',
    description: '所有操作记录、版本变更、班次信息、判定结论均作为证据永久保存，不可修改或删除。',
    penalty: '制度要求',
    examples: [
      '版本历史全程追溯',
      '判定记录带时间戳和操作人'
    ]
  }
];

export const getRuleById = (id: string): Rule | undefined => {
  return RULES.find(rule => rule.id === id);
};

export const getRulesByCategory = (category: string): Rule[] => {
  return RULES.filter(rule => rule.category === category);
};
