import type { DiversionRule, ConversationCard, AgentResource } from '@/types';

export const DIVERSION_RULES: DiversionRule[] = [
  {
    id: 'R001',
    name: '愤怒情绪强制转人工',
    description: '客户情绪为愤怒时必须转人工',
    condition: (card: ConversationCard) => card.emotion === 'angry',
    priority: 1,
    category: 'emotion',
  },
  {
    id: 'R002',
    name: '投诉类意图转人工',
    description: '客户意图为投诉时必须转人工',
    condition: (card: ConversationCard) => card.intent === 'complaint',
    priority: 2,
    category: 'intent',
  },
  {
    id: 'R003',
    name: '退款请求转人工',
    description: '客户意图为退款时必须转人工',
    condition: (card: ConversationCard) => card.intent === 'refund',
    priority: 2,
    category: 'intent',
  },
  {
    id: 'R004',
    name: '机器人重复答复',
    description: '机器人已有2次以上相同回复时转人工',
    condition: (card: ConversationCard) => {
      const history = card.botReplyHistory;
      return history.length >= 2 && history.every(h => h === history[0]);
    },
    priority: 3,
    category: 'bot_limit',
  },
  {
    id: 'R005',
    name: '机器人回复缺失',
    description: '机器人无有效回复时转人工',
    condition: (card: ConversationCard) => !card.botReply && card.botReplyHistory.length === 0,
    priority: 3,
    category: 'bot_limit',
  },
  {
    id: 'R006',
    name: '坐席资源空闲可转人工',
    description: '坐席空闲时可优先转人工处理复杂问题',
    condition: (card: ConversationCard, resources: AgentResource) =>
      resources.busyLevel === 'low' && card.emotion === 'frustrated',
    priority: 4,
    category: 'resource',
  },
  {
    id: 'R007',
    name: '坐席资源紧张先观察',
    description: '坐席繁忙时，非紧急问题继续观察或AI处理',
    condition: (card: ConversationCard, resources: AgentResource) =>
      resources.busyLevel === 'critical' && card.emotion === 'neutral',
    priority: 4,
    category: 'resource',
  },
  {
    id: 'R008',
    name: '技术支持复杂问题',
    description: '技术支持类问题优先转人工',
    condition: (card: ConversationCard) => card.intent === 'technical_support',
    priority: 2,
    category: 'intent',
  },
  {
    id: 'R009',
    name: '情绪识别置信度过低',
    description: '情绪置信度<0.6时需人工判断',
    condition: (card: ConversationCard) =>
      card.emotionConfidence !== null && card.emotionConfidence < 0.6,
    priority: 3,
    category: 'emotion',
  },
  {
    id: 'R010',
    name: '包含特殊备注标记',
    description: '备注中包含"VIP"、"紧急"等标记时转人工',
    condition: (card: ConversationCard) =>
      card.remarks !== null && /VIP|紧急|重要|投诉已登记/.test(card.remarks),
    priority: 1,
    category: 'special',
  },
  {
    id: 'R011',
    name: '注销账户需人工核实',
    description: '账户注销类请求需人工核实',
    condition: (card: ConversationCard) => card.intent === 'cancellation',
    priority: 2,
    category: 'intent',
  },
  {
    id: 'R012',
    name: '简单咨询可AI处理',
    description: '普通咨询类问题且情绪中性可AI处理',
    condition: (card: ConversationCard) =>
      card.intent === 'inquiry' &&
      (card.emotion === 'neutral' || card.emotion === 'satisfied') &&
      card.botReply !== null,
    priority: 5,
    category: 'intent',
  },
];

export const getRuleById = (id: string): DiversionRule | undefined => {
  return DIVERSION_RULES.find(rule => rule.id === id);
};

export const getRulesByCategory = (category: string): DiversionRule[] => {
  return DIVERSION_RULES.filter(rule => rule.category === category);
};
