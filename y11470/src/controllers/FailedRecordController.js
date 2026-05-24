const FailedRecord = require('../models/FailedRecord');

class FailedRecordController {
  static async getAll(req, res) {
    try {
      const records = await FailedRecord.findAll({
        resolved: req.query.resolved === 'true' ? true : (req.query.resolved === 'false' ? false : undefined),
        record_type: req.query.record_type,
        limit: req.query.limit ? parseInt(req.query.limit) : undefined
      });

      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getById(req, res) {
    try {
      const record = await FailedRecord.findById(req.params.id);
      if (!record) {
        return res.status(404).json({
          success: false,
          error: '失败记录不存在'
        });
      }

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async markResolved(req, res) {
    try {
      const result = await FailedRecord.markResolved(req.params.id);
      if (result.changes === 0) {
        return res.status(404).json({
          success: false,
          error: '失败记录不存在'
        });
      }

      res.json({
        success: true,
        message: '已标记为已解决'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = FailedRecordController;
