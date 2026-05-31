import { Booking, BookingStatus } from '../types';
import { dataStore } from '../store/DataStore';
import { conflictDetectionService } from './ConflictDetectionService';

export type StateTransitionAction =
  | 'CONFIRM'
  | 'START_WAITLIST'
  | 'CHECK_IN'
  | 'COMPLETE'
  | 'CANCEL'
  | 'EXPIRE'
  | 'PROMOTE_FROM_WAITLIST';

export interface StateTransitionResult {
  success: boolean;
  newStatus?: BookingStatus;
  message: string;
  conflictCheck?: ReturnType<typeof conflictDetectionService.checkAllConflicts>;
}

export interface StateTransitionRule {
  from: BookingStatus[];
  to: BookingStatus;
  action: StateTransitionAction;
  preCondition?: (booking: Booking) => boolean | Promise<boolean>;
  postAction?: (booking: Booking) => void | Promise<void>;
}

export class BookingStateMachine {
  private static instance: BookingStateMachine;
  private transitionRules: StateTransitionRule[];

  private constructor() {
    this.transitionRules = this.initializeRules();
  }

  public static getInstance(): BookingStateMachine {
    if (!BookingStateMachine.instance) {
      BookingStateMachine.instance = new BookingStateMachine();
    }
    return BookingStateMachine.instance;
  }

  private initializeRules(): StateTransitionRule[] {
    return [
      {
        from: ['PENDING'],
        to: 'CONFIRMED',
        action: 'CONFIRM',
        preCondition: async (booking: Booking) => {
          const conflictCheck = conflictDetectionService.checkAllConflicts(booking, booking.id);
          return !conflictCheck.hasConflicts;
        },
        postAction: async (booking: Booking) => {
          await this.handleEquipmentLoans(booking);
        },
      },
      {
        from: ['PENDING'],
        to: 'WAITLIST',
        action: 'START_WAITLIST',
        preCondition: (booking: Booking) => {
          const conflictCheck = conflictDetectionService.checkAllConflicts(booking, booking.id);
          const hasRoomConflict = conflictCheck.conflicts.some(
            (c) => c.type === 'ROOM_OVERLAP'
          );
          return hasRoomConflict;
        },
      },
      {
        from: ['WAITLIST'],
        to: 'CONFIRMED',
        action: 'PROMOTE_FROM_WAITLIST',
        preCondition: async (booking: Booking) => {
          const conflictCheck = conflictDetectionService.checkAllConflicts(booking, booking.id);
          return !conflictCheck.hasConflicts;
        },
        postAction: async (booking: Booking) => {
          await this.handleEquipmentLoans(booking);
        },
      },
      {
        from: ['CONFIRMED'],
        to: 'IN_PROGRESS',
        action: 'CHECK_IN',
        preCondition: (booking: Booking) => {
          const now = new Date();
          return now >= booking.startTime && now < booking.endTime;
        },
      },
      {
        from: ['IN_PROGRESS', 'CONFIRMED'],
        to: 'COMPLETED',
        action: 'COMPLETE',
        preCondition: (booking: Booking) => {
          const now = new Date();
          return now >= booking.endTime;
        },
        postAction: async (booking: Booking) => {
          await this.completeEquipmentLoans(booking);
        },
      },
      {
        from: ['PENDING', 'CONFIRMED', 'WAITLIST', 'IN_PROGRESS'],
        to: 'CANCELLED',
        action: 'CANCEL',
        postAction: async (booking: Booking) => {
          await this.cancelEquipmentLoans(booking);
          await this.processWaitlist(booking);
        },
      },
      {
        from: ['PENDING', 'WAITLIST'],
        to: 'EXPIRED',
        action: 'EXPIRE',
      },
    ];
  }

  public getValidTransitions(currentStatus: BookingStatus): StateTransitionRule[] {
    return this.transitionRules.filter((rule) =>
      rule.from.includes(currentStatus)
    );
  }

  public canTransition(
    booking: Booking,
    action: StateTransitionAction
  ): { allowed: boolean; reason?: string } {
    const rule = this.transitionRules.find(
      (r) => r.action === action && r.from.includes(booking.status)
    );

    if (!rule) {
      return {
        allowed: false,
        reason: `无法从状态 ${booking.status} 执行操作 ${action}`,
      };
    }

    return { allowed: true };
  }

  public async transition(
    bookingId: string,
    action: StateTransitionAction
  ): Promise<StateTransitionResult> {
    const booking = dataStore.getBooking(bookingId);
    if (!booking) {
      return { success: false, message: '预约不存在' };
    }

    const rule = this.transitionRules.find(
      (r) => r.action === action && r.from.includes(booking.status)
    );

    if (!rule) {
      return {
        success: false,
        message: `无法从状态 ${booking.status} 执行操作 ${action}`,
      };
    }

    if (rule.preCondition) {
      const preConditionResult = await rule.preCondition(booking);
      if (!preConditionResult) {
        const conflictCheck = conflictDetectionService.checkAllConflicts(booking);
        if (conflictCheck.hasConflicts) {
          return {
            success: false,
            message: '前置条件不满足，存在冲突',
            conflictCheck,
          };
        }
        return {
          success: false,
          message: '前置条件不满足',
        };
      }
    }

    const updatedBooking = dataStore.updateBooking(bookingId, {
      status: rule.to,
    });

    if (!updatedBooking) {
      return { success: false, message: '状态更新失败' };
    }

    if (rule.postAction) {
      await rule.postAction(updatedBooking);
    }

    return {
      success: true,
      newStatus: rule.to,
      message: `状态已更新为 ${rule.to}`,
    };
  }

  public getStatusDescription(status: BookingStatus): {
    label: string;
    description: string;
    color: string;
  } {
    const descriptions: Record<
      BookingStatus,
      { label: string; description: string; color: string }
    > = {
      PENDING: {
        label: '待确认',
        description: '预约已提交，等待确认和冲突检测',
        color: '#fbbf24',
      },
      CONFIRMED: {
        label: '已确认',
        description: '预约已确认，无冲突',
        color: '#22c55e',
      },
      WAITLIST: {
        label: '候补',
        description: '时段冲突，已加入候补队列',
        color: '#f97316',
      },
      IN_PROGRESS: {
        label: '进行中',
        description: '预约正在进行',
        color: '#3b82f6',
      },
      COMPLETED: {
        label: '已完成',
        description: '预约已正常结束',
        color: '#6b7280',
      },
      CANCELLED: {
        label: '已取消',
        description: '预约已被取消',
        color: '#ef4444',
      },
      EXPIRED: {
        label: '已过期',
        description: '预约未确认且已过期',
        color: '#9ca3af',
      },
    };

    return descriptions[status];
  }

  public getStatusFlow(): {
    status: BookingStatus;
    label: string;
    transitions: { to: BookingStatus; action: StateTransitionAction }[];
  }[] {
    const allStatuses: BookingStatus[] = [
      'PENDING',
      'CONFIRMED',
      'WAITLIST',
      'IN_PROGRESS',
      'COMPLETED',
      'CANCELLED',
      'EXPIRED',
    ];

    return allStatuses.map((status) => {
      const transitions = this.transitionRules
        .filter((r) => r.from.includes(status))
        .map((r) => ({ to: r.to, action: r.action }));

      return {
        status,
        label: this.getStatusDescription(status).label,
        transitions,
      };
    });
  }

  private async handleEquipmentLoans(booking: Booking): Promise<void> {
    for (const equipmentId of booking.equipmentIds) {
      const equipment = dataStore.getEquipment(equipmentId);
      if (!equipment) continue;

      const existingLoan = dataStore
        .getEquipmentLoansByBooking(booking.id)
        .find((l) => l.equipmentId === equipmentId);

      if (!existingLoan) {
        dataStore.createEquipmentLoan({
          bookingId: booking.id,
          equipmentId,
          borrowerName: booking.customerName,
          borrowerPhone: booking.customerPhone,
          checkoutTime: booking.startTime,
          expectedReturnTime: booking.endTime,
          condition: 'GOOD',
        });
      }

      dataStore.updateEquipment(equipmentId, { status: 'IN_USE' });
    }
  }

  private async completeEquipmentLoans(booking: Booking): Promise<void> {
    const loans = dataStore.getEquipmentLoansByBooking(booking.id);
    const now = new Date();

    for (const loan of loans) {
      if (!loan.actualReturnTime) {
        dataStore.updateEquipmentLoan(loan.id, {
          actualReturnTime: now,
        });

        const equipment = dataStore.getEquipment(loan.equipmentId);
        if (equipment && equipment.status === 'IN_USE') {
          dataStore.updateEquipment(loan.equipmentId, { status: 'AVAILABLE' });
        }
      }
    }
  }

  private async cancelEquipmentLoans(booking: Booking): Promise<void> {
    const loans = dataStore.getEquipmentLoansByBooking(booking.id);

    for (const loan of loans) {
      if (!loan.actualReturnTime) {
        dataStore.updateEquipmentLoan(loan.id, {
          actualReturnTime: new Date(),
        });

        const equipment = dataStore.getEquipment(loan.equipmentId);
        if (equipment && equipment.status === 'IN_USE') {
          dataStore.updateEquipment(loan.equipmentId, { status: 'AVAILABLE' });
        }
      }
    }
  }

  private async processWaitlist(booking: Booking): Promise<void> {
    const waitlist = dataStore.getWaitlistByRoom(booking.roomId);

    for (const entry of waitlist) {
      const waitlistBooking = dataStore.getBooking(entry.bookingId);
      if (!waitlistBooking || waitlistBooking.status !== 'WAITLIST') continue;

      const conflictCheck = conflictDetectionService.checkAllConflicts(
        waitlistBooking,
        waitlistBooking.id
      );

      if (!conflictCheck.hasConflicts) {
        const result = await this.transition(entry.bookingId, 'PROMOTE_FROM_WAITLIST');
        if (result.success) {
          break;
        }
      }
    }
  }
}

export const bookingStateMachine = BookingStateMachine.getInstance();
