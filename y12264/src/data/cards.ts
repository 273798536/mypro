import type { Card } from '../types/card';

function generateId(prefix: string, index: number): string {
  return `${prefix}_${index}_${Date.now().toString(36)}`;
}

const rainfallCards: Omit<Card, 'id'>[] = [
  {
    type: 'rainfall',
    name: '小雨',
    description: '降雨量10mm/h，轻度降雨，对管网压力较小',
    value: 10,
    rarity: 'common',
  },
  {
    type: 'rainfall',
    name: '中雨',
    description: '降雨量25mm/h，中度降雨，需关注管网负荷',
    value: 25,
    rarity: 'common',
  },
  {
    type: 'rainfall',
    name: '大雨',
    description: '降雨量50mm/h，强降雨，泵站压力骤增',
    value: 50,
    rarity: 'rare',
  },
  {
    type: 'rainfall',
    name: '暴雨',
    description: '降雨量80mm/h，暴雨红色预警，极易引发内涝',
    value: 80,
    rarity: 'epic',
  },
  {
    type: 'rainfall',
    name: '特大暴雨',
    description: '降雨量120mm/h，极端天气，需启动应急预案',
    value: 120,
    rarity: 'epic',
  },
  {
    type: 'rainfall',
    name: '雷阵雨',
    description: '降雨量35mm/h，短时强降雨，突发性强',
    value: 35,
    rarity: 'rare',
  },
];

const pipelineCards: Omit<Card, 'id'>[] = [
  {
    type: 'pipeline',
    name: '主干管网',
    description: '输送能力100m³/h，城市排水主干道',
    value: 100,
    rarity: 'common',
  },
  {
    type: 'pipeline',
    name: '支管扩容',
    description: '输送能力60m³/h，增加次级管网排水能力',
    value: 60,
    rarity: 'common',
  },
  {
    type: 'pipeline',
    name: '泵站升级',
    description: '输送能力150m³/h，提升泵站处理能力',
    value: 150,
    rarity: 'rare',
  },
  {
    type: 'pipeline',
    name: '管网疏通',
    description: '输送能力80m³/h，临时清淤提升流速',
    value: 80,
    rarity: 'common',
  },
  {
    type: 'pipeline',
    name: '备用管线',
    description: '输送能力120m³/h，启用备用排水通道',
    value: 120,
    rarity: 'rare',
  },
  {
    type: 'pipeline',
    name: '深隧排水',
    description: '输送能力200m³/h，深层隧道系统，超强排水',
    value: 200,
    rarity: 'epic',
  },
];

const disposalCards: Omit<Card, 'id'>[] = [
  {
    type: 'disposal',
    name: '移动泵车',
    description: '处置能力50m³/h，应急排水设备',
    value: 50,
    rarity: 'common',
  },
  {
    type: 'disposal',
    name: '临时围堰',
    description: '处置能力80m³/h，控制积水范围',
    value: 80,
    rarity: 'common',
  },
  {
    type: 'disposal',
    name: '调蓄池启用',
    description: '处置能力120m³/h，利用调蓄空间消纳雨水',
    value: 120,
    rarity: 'rare',
  },
  {
    type: 'disposal',
    name: '强排泵站',
    description: '处置能力150m³/h，强力排出低洼积水',
    value: 150,
    rarity: 'rare',
  },
  {
    type: 'disposal',
    name: '应急抢险',
    description: '处置能力100m³/h，人工+设备联合处置',
    value: 100,
    rarity: 'common',
  },
  {
    type: 'disposal',
    name: '分流转送',
    description: '处置能力180m³/h，将雨水转输至邻近区域',
    value: 180,
    rarity: 'epic',
  },
];

const gardenCards: Omit<Card, 'id'>[] = [
  {
    type: 'garden',
    name: '生态树池',
    description: '吸纳能力40m³，小型海绵设施',
    value: 40,
    rarity: 'common',
  },
  {
    type: 'garden',
    name: '雨水花园',
    description: '吸纳能力80m³，标准雨水花园',
    value: 80,
    rarity: 'common',
  },
  {
    type: 'garden',
    name: '透水铺装',
    description: '吸纳能力60m³，增加下渗面积',
    value: 60,
    rarity: 'common',
  },
  {
    type: 'garden',
    name: '人工湿地',
    description: '吸纳能力120m³，大型生态处理设施',
    value: 120,
    rarity: 'rare',
  },
  {
    type: 'garden',
    name: '多功能调蓄',
    description: '吸纳能力150m³，公园绿地兼作蓄滞空间',
    value: 150,
    rarity: 'rare',
  },
  {
    type: 'garden',
    name: '海绵综合体',
    description: '吸纳能力200m³，多设施协同，超强吸纳',
    value: 200,
    rarity: 'epic',
  },
];

export function createCard(template: Omit<Card, 'id'>, index: number): Card {
  const prefixMap = {
    rainfall: 'RAIN',
    pipeline: 'PIPE',
    disposal: 'DISP',
    garden: 'GARD',
  };
  return {
    ...template,
    id: generateId(prefixMap[template.type], index),
  };
}

export function createDeck(): Card[] {
  const deck: Card[] = [];
  
  rainfallCards.forEach((card, i) => {
    const count = card.rarity === 'common' ? 3 : card.rarity === 'rare' ? 2 : 1;
    for (let j = 0; j < count; j++) {
      deck.push(createCard(card, i * 10 + j));
    }
  });
  
  pipelineCards.forEach((card, i) => {
    const count = card.rarity === 'common' ? 3 : card.rarity === 'rare' ? 2 : 1;
    for (let j = 0; j < count; j++) {
      deck.push(createCard(card, i * 10 + j));
    }
  });
  
  disposalCards.forEach((card, i) => {
    const count = card.rarity === 'common' ? 3 : card.rarity === 'rare' ? 2 : 1;
    for (let j = 0; j < count; j++) {
      deck.push(createCard(card, i * 10 + j));
    }
  });
  
  gardenCards.forEach((card, i) => {
    const count = card.rarity === 'common' ? 3 : card.rarity === 'rare' ? 2 : 1;
    for (let j = 0; j < count; j++) {
      deck.push(createCard(card, i * 10 + j));
    }
  });
  
  return shuffleDeck(deck);
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function drawCards(deck: Card[], count: number): { drawn: Card[]; remaining: Card[] } {
  const drawn = deck.slice(0, count);
  const remaining = deck.slice(count);
  return { drawn, remaining };
}

export const rainfallCardTemplates = rainfallCards;
export const pipelineCardTemplates = pipelineCards;
export const disposalCardTemplates = disposalCards;
export const gardenCardTemplates = gardenCards;
