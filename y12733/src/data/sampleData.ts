import { CondProbParam } from '@/types';
import { generateId, calcProbability, generateExplanation } from '@/utils';

const now = Date.now();
const day = 86400000;

function make(
  condition: string,
  outcome: string,
  jointCount: number,
  conditionCount: number,
  status: CondProbParam['status'],
  reviewStatus: CondProbParam['reviewStatus'],
  isBoundary = false,
  boundaryNote?: string,
  daysAgo = 0,
): CondProbParam {
  const probability = calcProbability(jointCount, conditionCount);
  return {
    id: generateId(),
    condition,
    outcome,
    jointCount,
    conditionCount,
    probability,
    status,
    reviewStatus,
    explanation: generateExplanation(probability, status, jointCount, conditionCount),
    isBoundary,
    boundaryNote,
    createdAt: now - daysAgo * day,
    updatedAt: now - daysAgo * day,
  };
}

export const SAMPLE_PARAMS: CondProbParam[] = [
  make('用户注册满30天', '完成首次付费', 280, 400, 'available', 'approved', false, undefined, 12),
  make('浏览商品详情页超过5分钟', '加入购物车', 520, 2000, 'available', 'approved', false, undefined, 9),
  make('新用户首日登录3次以上', '7日留存', 45, 60, 'pending', 'pending', false, undefined, 5),
  make('领取优惠券未使用', '次月复购', 12, 800, 'recollect', 'pending', true, '样本极端稀疏，可能是异常低概率', 3),
  make('来自搜索引擎渠道', '注册后激活', 1800, 3000, 'available', 'approved', false, undefined, 20),
  make('使用iOS设备', '购买会员套餐', 15, 20000, 'recollect', 'pending', true, '概率异常低，疑似埋点问题', 1),
  make('完成新手教程', '进行首次分享', 310, 500, 'pending', 'pending', false, undefined, 4),
  make('连续签到7天', '月活跃用户', 950, 1000, 'available', 'approved', false, undefined, 15),
];
