import { Op, fn, col, literal } from 'sequelize';
import {
  CompensationTicketModel,
  DeadLetterModel,
  RetryRecordModel,
} from '../models';
import { TicketStatus, RetryCategory } from '../types';

export interface StatusStatistics {
  status: TicketStatus;
  count: number;
  percentage: number;
}

export interface RetryCategoryStatistics {
  category: RetryCategory;
  count: number;
  canBeRecovered: number;
}

export interface DeadLetterStatistics {
  total: number;
  recovered: number;
  unrecovered: number;
  byCategory: RetryCategoryStatistics[];
  recoveryRate: number;
}

export interface DailyStatistics {
  date: string;
  created: number;
  submitted: number;
  compensated: number;
  failed: number;
}

export interface DashboardStatistics {
  totalTickets: number;
  pendingProcessing: number;
  processing: number;
  retrying: number;
  manualReview: number;
  compensated: number;
  deadLetter: number;
  closed: number;
  frozen: number;
  byStatus: StatusStatistics[];
  deadLetterStats: DeadLetterStatistics;
  retryCategories: RetryCategoryStatistics[];
  last7Days: DailyStatistics[];
  retrySuccessRate: number;
}

export const getDashboardStatistics = async (): Promise<DashboardStatistics> => {
  const allTickets = await CompensationTicketModel.findAll({
    attributes: ['status', 'isFrozen', 'retryCategory'],
  });

  const totalTickets = allTickets.length;

  const countByStatus = allTickets.reduce(
    (acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const byStatus = Object.values(TicketStatus).map((status) => ({
    status,
    count: countByStatus[status] || 0,
    percentage: totalTickets > 0
      ? ((countByStatus[status] || 0) / totalTickets) * 100
      : 0,
  }));

  const frozen = allTickets.filter((t) => t.isFrozen).length;

  const deadLetterStats = await getDeadLetterStatistics();
  const retryCategories = await getRetryCategoryStatistics();
  const last7Days = await getDailyStatistics(7);
  const retrySuccessRate = await calculateRetrySuccessRate();

  return {
    totalTickets,
    pendingProcessing: countByStatus[TicketStatus.PENDING] || 0,
    processing: countByStatus[TicketStatus.PROCESSING] || 0,
    retrying: countByStatus[TicketStatus.RETRYING] || 0,
    manualReview: countByStatus[TicketStatus.MANUAL_REVIEW] || 0,
    compensated: countByStatus[TicketStatus.COMPENSATED] || 0,
    deadLetter: countByStatus[TicketStatus.DEAD_LETTER] || 0,
    closed: countByStatus[TicketStatus.CLOSED] || 0,
    frozen,
    byStatus,
    deadLetterStats,
    retryCategories,
    last7Days,
    retrySuccessRate,
  };
};

export const getDeadLetterStatistics = async (): Promise<DeadLetterStatistics> => {
  const deadLetters = await DeadLetterModel.findAll({
    attributes: ['retryCategory', 'canBeRecovered', 'isRecovered'],
  });

  const total = deadLetters.length;
  const recovered = deadLetters.filter((d) => d.isRecovered).length;
  const unrecovered = total - recovered;

  const byCategoryMap = deadLetters.reduce(
    (acc, dl) => {
      const cat = dl.retryCategory;
      if (!acc[cat]) {
        acc[cat] = { category: cat, count: 0, canBeRecovered: 0 };
      }
      acc[cat].count++;
      if (dl.canBeRecovered && !dl.isRecovered) {
        acc[cat].canBeRecovered++;
      }
      return acc;
    },
    {} as Record<string, RetryCategoryStatistics>
  );

  return {
    total,
    recovered,
    unrecovered,
    byCategory: Object.values(byCategoryMap),
    recoveryRate: total > 0 ? (recovered / total) * 100 : 0,
  };
};

export const getRetryCategoryStatistics = async (): Promise<RetryCategoryStatistics[]> => {
  const retryingTickets = await CompensationTicketModel.findAll({
    where: { status: TicketStatus.RETRYING },
    attributes: ['retryCategory'],
  });

  const categoryMap = retryingTickets.reduce(
    (acc, ticket) => {
      const cat = ticket.retryCategory || RetryCategory.SYSTEM_ERROR;
      if (!acc[cat]) {
        acc[cat] = { category: cat, count: 0, canBeRecovered: 0 };
      }
      acc[cat].count++;
      acc[cat].canBeRecovered++;
      return acc;
    },
    {} as Record<string, RetryCategoryStatistics>
  );

  return Object.values(categoryMap);
};

export const getDailyStatistics = async (
  days: number = 7
): Promise<DailyStatistics[]> => {
  const result: DailyStatistics[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(0, 0, 0, 0);

    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);

    const created = await CompensationTicketModel.count({
      where: {
        createdAt: { [Op.between]: [date, nextDate] },
      },
    });

    const submitted = await CompensationTicketModel.count({
      where: {
        status: { [Op.not]: TicketStatus.PENDING },
        createdAt: { [Op.between]: [date, nextDate] },
      },
    });

    const compensated = await CompensationTicketModel.count({
      where: {
        status: TicketStatus.COMPENSATED,
        compensatedAt: { [Op.between]: [date, nextDate] },
      },
    });

    const failed = await DeadLetterModel.count({
      where: {
        failedAt: { [Op.between]: [date, nextDate] },
      },
    });

    result.push({
      date: date.toISOString().split('T')[0],
      created,
      submitted,
      compensated,
      failed,
    });
  }

  return result;
};

export const calculateRetrySuccessRate = async (): Promise<number> => {
  const retryRecords = await RetryRecordModel.findAll({
    attributes: ['success'],
  });

  if (retryRecords.length === 0) return 100;

  const successful = retryRecords.filter((r) => r.success).length;
  return (successful / retryRecords.length) * 100;
};

export const getBatchStatistics = async (
  batchId: string
): Promise<{
  batchId: string;
  total: number;
  byStatus: Record<TicketStatus, number>;
  totalAmount: number;
}> => {
  const tickets = await CompensationTicketModel.findAll({
    where: { batchId },
  });

  const byStatus = tickets.reduce(
    (acc, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalAmount = tickets.reduce((sum, ticket) => {
    const amounts = ticket.data.compensationAmounts || [];
    return sum + amounts.reduce((s: number, a: { amount: number }) => s + a.amount, 0);
  }, 0);

  return {
    batchId,
    total: tickets.length,
    byStatus: byStatus as Record<TicketStatus, number>,
    totalAmount,
  };
};

export default {
  getDashboardStatistics,
  getDeadLetterStatistics,
  getRetryCategoryStatistics,
  getDailyStatistics,
  getBatchStatistics,
  calculateRetrySuccessRate,
};
