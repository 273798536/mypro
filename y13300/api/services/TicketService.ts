import { TicketRepository, VersionRepository } from '../repositories/index.js';
import type { Ticket, TicketStatus, DashboardStats, TicketVersion } from '../../shared/types.js';

export class TicketService {
  private ticketRepo: TicketRepository;
  private versionRepo: VersionRepository;

  constructor() {
    this.ticketRepo = new TicketRepository();
    this.versionRepo = new VersionRepository();
  }

  getList(options?: { status?: TicketStatus; limit?: number; offset?: number }): {
    tickets: Ticket[];
    total: number;
  } {
    const tickets = this.ticketRepo.findAll(options);
    const total = this.ticketRepo.countAll(options?.status);
    return { tickets, total };
  }

  getById(id: string): Ticket | null {
    return this.ticketRepo.findById(id);
  }

  getWithVersion(id: string): {
    ticket: Ticket;
    activeVersion: TicketVersion;
  } | null {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) return null;

    const displayVersion = ticket.lockedVersion ?? ticket.currentVersion;
    const activeVersion = this.versionRepo.findByTicketAndVersion(id, displayVersion);
    if (!activeVersion) return null;

    return { ticket, activeVersion };
  }

  updateStatus(id: string, status: TicketStatus, operator: string): Ticket | null {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) return null;

    if (ticket.lockedVersion !== null) {
      throw new Error('工单已锁定，无法修改状态');
    }

    this.ticketRepo.updateStatus(id, status);
    return this.ticketRepo.findById(id);
  }

  getStats(): DashboardStats {
    return this.ticketRepo.getStats();
  }

  updateFlags(id: string, flags: { hasSampleLeak?: boolean; hasManualMark?: boolean }): Ticket | null {
    const ticket = this.ticketRepo.findById(id);
    if (!ticket) return null;

    this.ticketRepo.updateFlags(id, flags);
    return this.ticketRepo.findById(id);
  }
}
