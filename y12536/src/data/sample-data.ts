import { DataStore } from './data-store';
import { MemberStatus, StatusHistory } from '../types';
import seedrandom from 'seedrandom';

export function generateSampleData(store: DataStore, memberCount: number = 500, seed: number = 42): void {
  const rng = seedrandom(seed.toString());
  const tiers: Array<'basic' | 'premium' | 'vip'> = ['basic', 'premium', 'vip'];
  const statuses: MemberStatus[] = ['new', 'active', 'silent', 'churned', 'resurrected'];

  for (let i = 0; i < memberCount; i++) {
    const joinDaysAgo = Math.floor(rng() * 365);
    const joinDate = new Date();
    joinDate.setDate(joinDate.getDate() - joinDaysAgo);

    const member = store.addMember({
      name: `Member_${i + 1}`,
      joinDate: joinDate.toISOString(),
      currentStatus: statuses[Math.floor(rng() * statuses.length)],
      tier: tiers[Math.floor(rng() * tiers.length)],
    });

    generateStatusHistory(store, member.id, joinDate, rng);

    if (member.currentStatus !== 'churned' && rng() > 0.3) {
      generateRenewalHistory(store, member.id, joinDate, rng);
    }
  }

  createSampleStrategies(store);
}

function generateStatusHistory(store: DataStore, memberId: string, joinDate: Date, rng: seedrandom.PRNG): void {
  const transitions: Record<MemberStatus, MemberStatus[]> = {
    new: ['active', 'active', 'silent'],
    active: ['active', 'active', 'active', 'silent', 'churned'],
    silent: ['silent', 'active', 'churned', 'resurrected'],
    churned: ['churned', 'resurrected'],
    resurrected: ['active', 'silent'],
  };

  let currentStatus: MemberStatus = 'new';
  let currentDate = new Date(joinDate);
  const history: StatusHistory[] = [];

  for (let i = 0; i < 8; i++) {
    const daysInStatus = Math.floor(rng() * 30) + 7;
    currentDate.setDate(currentDate.getDate() + daysInStatus);

    if (currentDate > new Date()) break;

    const possibleNext: MemberStatus[] = transitions[currentStatus];
    currentStatus = possibleNext[Math.floor(rng() * possibleNext.length)];

    history.push({
      memberId,
      status: currentStatus,
      date: currentDate.toISOString(),
      daysInStatus,
      source: 'sample_generator',
    });
  }

  history.forEach(h => store.addStatusHistory(h));
}

function generateRenewalHistory(store: DataStore, memberId: string, joinDate: Date, rng: seedrandom.PRNG): void {
  let currentDate = new Date(joinDate);
  const renewalCount = Math.floor(rng() * 5) + 1;

  for (let i = 0; i < renewalCount; i++) {
    const monthsToAdd = [1, 3, 6, 12][Math.floor(rng() * 4)];
    const amounts: Record<number, number> = { 1: 99, 3: 269, 6: 499, 12: 899 };

    currentDate.setMonth(currentDate.getMonth() + monthsToAdd);

    if (currentDate > new Date()) break;

    const previousExpiry = new Date(currentDate);
    const newExpiry = new Date(currentDate);
    newExpiry.setMonth(newExpiry.getMonth() + monthsToAdd);

    store.addRenewalRecord({
      memberId,
      amount: amounts[monthsToAdd],
      currency: 'CNY',
      renewalMonths: monthsToAdd,
      previousExpiry: previousExpiry.toISOString(),
      newExpiry: newExpiry.toISOString(),
    });
  }
}

function createSampleStrategies(store: DataStore): void {
  store.addStrategy({
    name: '沉默用户唤醒邮件',
    description: '对沉默7天以上的用户发送唤醒邮件，内含专属优惠',
    createdBy: 'growth_team',
    isActive: true,
    rules: [
      {
        triggerStatus: 'silent',
        triggerDays: 7,
        channel: 'email',
        type: 'winback',
        priority: 1,
        coolDownDays: 14,
      },
    ],
  });

  store.addStrategy({
    name: '续费提醒组合策略',
    description: '到期前7天邮件提醒，到期前3天短信提醒',
    createdBy: 'retention_team',
    isActive: true,
    rules: [
      {
        triggerStatus: 'active',
        triggerDays: -7,
        channel: 'email',
        type: 'renewal_reminder',
        priority: 1,
        coolDownDays: 30,
      },
      {
        triggerStatus: 'active',
        triggerDays: -3,
        channel: 'sms',
        type: 'renewal_reminder',
        priority: 2,
        coolDownDays: 30,
      },
    ],
  });

  store.addStrategy({
    name: '流失用户电话召回',
    description: '流失30天以上的VIP用户进行电话回访',
    createdBy: 'customer_success',
    isActive: true,
    rules: [
      {
        triggerStatus: 'churned',
        triggerDays: 30,
        channel: 'phone',
        type: 'winback',
        priority: 1,
        coolDownDays: 60,
      },
    ],
  });

  store.addStrategy({
    name: '新用户引导推送',
    description: '新用户注册后第1、3、7天推送引导消息',
    createdBy: 'onboarding_team',
    isActive: true,
    rules: [
      {
        triggerStatus: 'new',
        triggerDays: 1,
        channel: 'push',
        type: 'renewal_reminder',
        priority: 1,
        coolDownDays: 7,
      },
      {
        triggerStatus: 'new',
        triggerDays: 3,
        channel: 'wechat',
        type: 'exclusive_offer',
        priority: 2,
        coolDownDays: 7,
      },
    ],
  });

  store.addStrategy({
    name: '多渠道弹窗提醒（对照组）',
    description: '仅使用弹窗进行续费提醒，作为策略比较的基准',
    createdBy: 'growth_team',
    isActive: false,
    rules: [
      {
        triggerStatus: 'active',
        triggerDays: -5,
        channel: 'popup',
        type: 'renewal_reminder',
        priority: 1,
        coolDownDays: 15,
      },
    ],
  });
}
