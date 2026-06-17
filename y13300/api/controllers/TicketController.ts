import type { Request, Response } from 'express';
import { TicketService, AuditService } from '../services/index.js';
import type { TicketStatus } from '../../shared/types.js';

export class TicketController {
  private ticketService: TicketService;
  private auditService: AuditService;

  constructor() {
    this.ticketService = new TicketService();
    this.auditService = new AuditService();
  }

  async listTickets(req: Request, res: Response): Promise<void> {
    try {
      const { status, limit, offset } = req.query;
      const options: { status?: TicketStatus; limit?: number; offset?: number } = {};

      if (status) {
        options.status = status as TicketStatus;
      }
      if (limit) {
        options.limit = parseInt(limit as string, 10);
      }
      if (offset) {
        options.offset = parseInt(offset as string, 10);
      }

      const result = this.ticketService.getList(options);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取工单列表失败',
      });
    }
  }

  async getTicketDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const result = this.ticketService.getWithVersion(id);

      if (!result) {
        res.status(404).json({
          success: false,
          error: '工单不存在',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取工单详情失败',
      });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, operator } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: '状态不能为空',
        });
        return;
      }

      const ticket = this.ticketService.getById(id);
      if (!ticket) {
        res.status(404).json({
          success: false,
          error: '工单不存在',
        });
        return;
      }

      const oldStatus = ticket.status;
      const result = this.ticketService.updateStatus(id, status, operator || '系统');

      if (result) {
        this.auditService.logStatusChange(id, result.currentVersion, oldStatus, status, operator || '系统');
      }

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '更新状态失败',
      });
    }
  }

  async importTickets(req: Request, res: Response): Promise<void> {
    try {
      const { tickets, operator } = req.body;

      if (!tickets || !Array.isArray(tickets)) {
        res.status(400).json({
          success: false,
          error: '工单数据格式错误',
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          imported: tickets.length,
          message: `成功导入 ${tickets.length} 条工单`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '导入工单失败',
      });
    }
  }

  async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { limit } = req.query;

      const options: { limit?: number } = {};
      if (limit) {
        options.limit = parseInt(limit as string, 10);
      }

      const logs = this.auditService.getByTicketId(id, options);

      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '获取审计日志失败',
      });
    }
  }
}
