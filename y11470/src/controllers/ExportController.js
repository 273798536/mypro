const ExportService = require('../services/ExportService');
const DataConsistencyService = require('../services/DataConsistencyService');

class ExportController {
  static async exportBatches(req, res) {
    try {
      const result = await ExportService.exportBatchesToCSV(req.query);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="batches_${Date.now()}.csv"`);
      res.setHeader('X-Data-Signature', result.source_data_signature);
      res.setHeader('X-Record-Count', result.record_count);
      res.setHeader('X-Total-Quantity', result.total_quantity);
      res.setHeader('X-Total-Amount', result.total_amount);
      res.setHeader('X-Invalid-Count', result.invalid_count);

      res.send('\uFEFF' + result.csv);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async exportInternalView(req, res) {
    try {
      const result = await ExportService.exportInternalViewToCSV(req.query);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="internal_view_${Date.now()}.csv"`);
      res.setHeader('X-Data-Signature', result.source_data_signature);
      res.setHeader('X-Record-Count', result.record_count);
      res.setHeader('X-Total-Quantity', result.totals.总数量);
      res.setHeader('X-Total-Amount', result.totals.总金额);

      res.send('\uFEFF' + result.csv);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async exportSummary(req, res) {
    try {
      const result = await ExportService.exportSummaryToCSV(req.query);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="summary_${Date.now()}.csv"`);
      res.setHeader('X-Data-Signature', result.source_data_signature);

      res.send('\uFEFF' + result.csv);
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ExportController;
