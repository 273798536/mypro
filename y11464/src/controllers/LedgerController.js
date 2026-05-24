const { TraceabilityLedger } = require('../models/TraceabilityLedger');
const Implant = require('../models/Implant');
const Appointment = require('../models/Appointment');
const SupplierInvoice = require('../models/SupplierInvoice');
const AuditLog = require('../models/AuditLog');
const FailedRecord = require('../models/FailedRecord');
const ExportService = require('../services/ExportService');
const DirectorViewService = require('../services/DirectorViewService');

class LedgerController {
  static async createLedger(req, res) {
    try {
      const operator = {
        id: req.headers['x-operator-id'] || 'unknown',
        name: req.headers['x-operator-name'] || 'system',
        role: req.headers['x-operator-role'] || 'replenisher'
      };

      const ledger = await TraceabilityLedger.create(req.body, operator);
      
      res.json({
        success: true,
        data: ledger,
        message: '台账创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getLedger(req, res) {
    try {
      const { id } = req.params;
      const ledger = await TraceabilityLedger.findById(id);
      
      if (!ledger) {
        return res.status(404).json({
          success: false,
          error: '台账记录不存在'
        });
      }

      const auditLogs = await AuditLog.findByLedgerId(id);
      
      res.json({
        success: true,
        data: {
          ...ledger,
          audit_logs: auditLogs
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listLedgers(req, res) {
    try {
      const options = req.query;
      const ledgers = await TraceabilityLedger.findAll(options);
      
      res.json({
        success: true,
        data: ledgers,
        total: ledgers.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getDetailedLedgers(req, res) {
    try {
      const options = req.query;
      const records = await TraceabilityLedger.getDetailedRecords(options);
      
      res.json({
        success: true,
        data: records,
        total: records.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async submitLedger(req, res) {
    try {
      const { id } = req.params;
      const operator = {
        id: req.headers['x-operator-id'] || 'unknown',
        name: req.headers['x-operator-name'] || 'system',
        role: req.headers['x-operator-role'] || 'supervisor'
      };

      const ledger = await TraceabilityLedger.submit(id, operator);
      
      res.json({
        success: true,
        data: ledger,
        message: '提交审核成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async rejectLedger(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const operator = {
        id: req.headers['x-operator-id'] || 'unknown',
        name: req.headers['x-operator-name'] || 'system',
        role: req.headers['x-operator-role'] || 'supervisor'
      };

      const ledger = await TraceabilityLedger.reject(id, operator, reason);
      
      res.json({
        success: true,
        data: ledger,
        message: '驳回成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async confirmLedger(req, res) {
    try {
      const { id } = req.params;
      const operator = {
        id: req.headers['x-operator-id'] || 'unknown',
        name: req.headers['x-operator-name'] || 'system',
        role: req.headers['x-operator-role'] || 'director'
      };

      const ledger = await TraceabilityLedger.confirm(id, operator);
      
      res.json({
        success: true,
        data: ledger,
        message: '审核通过成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async markReadonly(req, res) {
    try {
      const { id } = req.params;
      const operator = {
        id: req.headers['x-operator-id'] || 'unknown',
        name: req.headers['x-operator-name'] || 'system',
        role: req.headers['x-operator-role'] || 'auditor'
      };

      const ledger = await TraceabilityLedger.markReadonly(id, operator);
      
      res.json({
        success: true,
        data: ledger,
        message: '标记为只读审计成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getSummary(req, res) {
    try {
      const options = req.query;
      const summary = await TraceabilityLedger.getSummary(options);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async exportLedgers(req, res) {
    try {
      const options = req.query;
      const result = await ExportService.exportToCSV(options);
      
      res.json({
        success: true,
        data: result,
        message: '导出成功'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static getExportFiles(req, res) {
    try {
      const files = ExportService.getExportFiles();
      
      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAuditLogs(req, res) {
    try {
      const { ledgerId } = req.params;
      const logs = await AuditLog.findByLedgerId(ledgerId);
      
      res.json({
        success: true,
        data: logs
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAllAuditLogs(req, res) {
    try {
      const options = req.query;
      const logs = await AuditLog.findAll(options);
      
      res.json({
        success: true,
        data: logs,
        total: logs.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getFailedRecords(req, res) {
    try {
      const options = req.query;
      const records = await FailedRecord.findAll(options);
      
      res.json({
        success: true,
        data: records,
        total: records.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async resolveFailedRecord(req, res) {
    try {
      const { id } = req.params;
      const resolvedBy = req.headers['x-operator-name'] || 'system';
      const record = await FailedRecord.markResolved(id, resolvedBy);
      
      res.json({
        success: true,
        data: record,
        message: '已标记为已解决'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getFailedStats(req, res) {
    try {
      const stats = await FailedRecord.getStats();
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getDirectorView(req, res) {
    try {
      const { date } = req.params;
      const view = await DirectorViewService.getViewByDate(date);
      
      res.json({
        success: true,
        data: view
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getRecentDirectorViews(req, res) {
    try {
      const limit = parseInt(req.query.limit) || 7;
      const views = await DirectorViewService.getRecentViews(limit);
      
      res.json({
        success: true,
        data: views
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async generateDirectorView(req, res) {
    try {
      const { date } = req.params;
      const view = await DirectorViewService.generateDailyView(date);
      
      res.json({
        success: true,
        data: view,
        message: '主任视图已生成'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getSensitiveFieldReport(req, res) {
    try {
      const report = await DirectorViewService.getSensitiveFieldReport(req.query);
      
      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAuditTrailSummary(req, res) {
    try {
      const summary = await DirectorViewService.getAuditTrailSummary(req.query);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createImplant(req, res) {
    try {
      const implant = await Implant.create(req.body);
      res.json({
        success: true,
        data: implant,
        message: '种植体创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listImplants(req, res) {
    try {
      const implants = await Implant.findAll(req.query);
      res.json({
        success: true,
        data: implants
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createAppointment(req, res) {
    try {
      const appointment = await Appointment.create(req.body);
      res.json({
        success: true,
        data: appointment,
        message: '预约记录创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listAppointments(req, res) {
    try {
      const appointments = await Appointment.findAll(req.query);
      res.json({
        success: true,
        data: appointments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async createInvoice(req, res) {
    try {
      const invoice = await SupplierInvoice.create(req.body);
      res.json({
        success: true,
        data: invoice,
        message: '发票创建成功'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  static async listInvoices(req, res) {
    try {
      const invoices = await SupplierInvoice.findAll(req.query);
      res.json({
        success: true,
        data: invoices
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = LedgerController;
