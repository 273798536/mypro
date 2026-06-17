import type { Request, Response, NextFunction } from 'express';
import { TicketService } from '../services/index.js';

export class DashboardController {
  private ticketService: TicketService;

  constructor() {
    this.ticketService = new TicketService();
  }

  getStats = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const stats = this.ticketService.getStats();

      const total = stats.pending + stats.processing + stats.needEvidence + stats.completed + stats.locked;

      res.status(200).json({
        success: true,
        data: {
          ...stats,
          total,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard stats',
      });
    }
  };

  getOverview = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const stats = this.ticketService.getStats();
      const total = stats.pending + stats.processing + stats.needEvidence + stats.completed + stats.locked;

      const recentTickets = this.ticketService.getList({
        limit: 5,
        offset: 0,
      });

      res.status(200).json({
        success: true,
        data: {
          stats: {
            ...stats,
            total,
          },
          recentTickets: recentTickets.tickets,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get dashboard overview',
      });
    }
  };

  getStatusDistribution = async (req: Request, res: Response, next?: NextFunction): Promise<void> => {
    try {
      const stats = this.ticketService.getStats();
      const total = stats.pending + stats.processing + stats.needEvidence + stats.completed + stats.locked;

      const distribution = [
        { status: 'pending', label: '待处理', count: stats.pending, percentage: total > 0 ? (stats.pending / total) * 100 : 0 },
        { status: 'processing', label: '处理中', count: stats.processing, percentage: total > 0 ? (stats.processing / total) * 100 : 0 },
        { status: 'need_evidence', label: '需补充证据', count: stats.needEvidence, percentage: total > 0 ? (stats.needEvidence / total) * 100 : 0 },
        { status: 'completed', label: '已完成', count: stats.completed, percentage: total > 0 ? (stats.completed / total) * 100 : 0 },
        { status: 'locked', label: '已锁定', count: stats.locked, percentage: total > 0 ? (stats.locked / total) * 100 : 0 },
      ];

      res.status(200).json({
        success: true,
        data: {
          total,
          distribution,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get status distribution',
      });
    }
  };
}
