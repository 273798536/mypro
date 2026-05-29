import type {
  VestingSchedule,
  VestingStatus,
  VestingPlan,
  Grant,
  Employee,
} from '../../shared/types.js';

export interface CalculationInput {
  grant: Grant;
  plan: VestingPlan;
  employee: Employee;
  calculationDate?: Date;
}

export class VestingCalculator {
  private static generateId(): string {
    return 'vs_' + Math.random().toString(36).substr(2, 9);
  }

  private static addMonths(date: Date, months: number): Date {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }

  private static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private static isBeforeOrEqual(d1: Date, d2: Date): boolean {
    return d1 <= d2;
  }

  private static isAfterOrEqual(d1: Date, d2: Date): boolean {
    return d1 >= d2;
  }

  public static calculate(input: CalculationInput): VestingSchedule[] {
    const { grant, plan, employee, calculationDate = new Date() } = input;
    const schedules: VestingSchedule[] = [];

    const grantDate = new Date(grant.grantDate);
    const totalShares = grant.totalShares;
    const totalMonths = plan.totalMonths;
    const cliffMonths = plan.cliffMonths;
    const frequency = plan.vestingFrequency;
    const hasAcceleration = plan.hasAcceleration;
    const accelerationType = plan.accelerationType;
    const exerciseWindowDays = plan.exerciseWindowDays;

    const terminationDate = employee.terminationDate
      ? new Date(employee.terminationDate)
      : null;
    const isTerminated = employee.status === 'terminated' && terminationDate;

    const periods = this.calculateVestingPeriods(
      grantDate,
      totalShares,
      totalMonths,
      cliffMonths,
      frequency,
    );

    let cumulative = 0;
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      const vestDate = new Date(period.vestDate);
      let status: VestingStatus = 'pending';
      let vestedShares = period.shares;
      let calculationNote = period.note;
      let isAccelerated = false;
      let accelerationReason: string | undefined;
      let exerciseDeadline: string | undefined;

      if (isTerminated) {
        const result = this.applyTerminationRules(
          vestDate,
          terminationDate!,
          calculationDate,
          vestedShares,
          hasAcceleration,
          accelerationType,
          exerciseWindowDays,
          i,
          periods.length,
        );

        status = result.status;
        vestedShares = result.shares;
        calculationNote = result.note;
        isAccelerated = result.isAccelerated;
        accelerationReason = result.accelerationReason;
        exerciseDeadline = result.exerciseDeadline;

        if (status === 'expired' || status === 'forfeited') {
          vestedShares = 0;
        }
      } else if (this.isBeforeOrEqual(vestDate, calculationDate)) {
        status = 'vested';
        calculationNote = `正常归属：服务满${i + 1}个月`;
        exerciseDeadline = this.formatDate(
          this.addMonths(vestDate, 12),
        );
      }

      if (status === 'vested' || status === 'accelerated') {
        cumulative += vestedShares;
      }

      schedules.push({
        id: this.generateId(),
        grantId: grant.id,
        vestDate: this.formatDate(vestDate),
        vestedShares,
        cumulativeShares: cumulative,
        status,
        calculationNote,
        isAccelerated,
        accelerationReason,
        exerciseDeadline,
      });
    }

    return schedules;
  }

  private static calculateVestingPeriods(
    grantDate: Date,
    totalShares: number,
    totalMonths: number,
    cliffMonths: number,
    frequency: 'monthly' | 'yearly',
  ): Array<{ vestDate: Date; shares: number; note: string }> {
    const periods: Array<{ vestDate: Date; shares: number; note: string }> = [];
    const monthlyShares = Math.floor(totalShares / totalMonths);
    const remainder = totalShares - monthlyShares * totalMonths;

    const stepMonths = frequency === 'yearly' ? 12 : 1;
    const numPeriods = Math.ceil(totalMonths / stepMonths);

    for (let i = 1; i <= numPeriods; i++) {
      const monthsPassed = i * stepMonths;
      const vestDate = this.addMonths(grantDate, monthsPassed);

      let shares = 0;
      let note = '';

      if (monthsPassed <= cliffMonths) {
        if (monthsPassed === cliffMonths) {
          shares = monthlyShares * cliffMonths;
          if (remainder > 0 && monthsPassed === totalMonths) {
            shares += remainder;
          }
          note = `悬崖期归属：满${cliffMonths}个月，一次性归属前${cliffMonths}个月`;
        }
      } else {
        shares = monthlyShares;
        if (remainder > 0 && monthsPassed === totalMonths) {
          shares += remainder;
        }
        note = `月度归属：第${monthsPassed}个月`;
      }

      if (shares > 0) {
        periods.push({ vestDate, shares, note });
      }
    }

    return periods;
  }

  private static applyTerminationRules(
    vestDate: Date,
    terminationDate: Date,
    calculationDate: Date,
    shares: number,
    hasAcceleration: boolean,
    accelerationType: string,
    exerciseWindowDays: number,
    periodIndex: number,
    totalPeriods: number,
  ): {
    status: VestingStatus;
    shares: number;
    note: string;
    isAccelerated: boolean;
    accelerationReason?: string;
    exerciseDeadline?: string;
  } {
    if (this.isBeforeOrEqual(vestDate, terminationDate)) {
      const exerciseDeadline = this.formatDate(
        this.addDays(terminationDate, exerciseWindowDays),
      );

      if (this.isAfterOrEqual(calculationDate, new Date(exerciseDeadline))) {
        return {
          status: 'expired',
          shares: 0,
          note: `行权窗口已过期：离职后${exerciseWindowDays}天内未行权，于${exerciseDeadline}作废`,
          isAccelerated: false,
          exerciseDeadline,
        };
      }

      return {
        status: 'vested',
        shares,
        note: `正常归属：离职前已满足服务期`,
        isAccelerated: false,
        exerciseDeadline,
      };
    }

    if (hasAcceleration && accelerationType === 'single-trigger') {
      return {
        status: 'accelerated',
        shares,
        note: `单触发加速归属：员工离职触发加速，按协议${accelerationType}条款`,
        isAccelerated: true,
        accelerationReason: '单触发加速：离职即加速全部未归属期权',
        exerciseDeadline: this.formatDate(
          this.addDays(terminationDate, exerciseWindowDays),
        ),
      };
    }

    if (hasAcceleration && accelerationType === 'double-trigger') {
      return {
        status: 'accelerated',
        shares,
        note: `双触发加速归属：公司被收购+员工离职触发加速`,
        isAccelerated: true,
        accelerationReason: '双触发加速：公司发生变更事件+员工离职，加速全部未归属期权',
        exerciseDeadline: this.formatDate(
          this.addDays(terminationDate, exerciseWindowDays),
        ),
      };
    }

    return {
      status: 'forfeited',
      shares: 0,
      note: `离职作废：未满足服务期且无加速条款，未归属期权作废`,
      isAccelerated: false,
    };
  }

  public static recalculateAfterCorrection(
    schedules: VestingSchedule[],
    newTotalShares: number,
    oldTotalShares: number,
  ): VestingSchedule[] {
    const ratio = newTotalShares / oldTotalShares;

    return schedules.map((schedule) => {
      const adjustedShares = Math.round(schedule.vestedShares * ratio);
      const adjustedCumulative = Math.round(schedule.cumulativeShares * ratio);

      return {
        ...schedule,
        vestedShares: adjustedShares,
        cumulativeShares: adjustedCumulative,
        calculationNote: schedule.calculationNote + ` [已修正：原${schedule.vestedShares}股 -> 现${adjustedShares}股]`,
      };
    });
  }
}
