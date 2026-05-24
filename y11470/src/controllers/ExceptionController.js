const ExceptionService = require('../services/ExceptionService');
const { getUserId } = require('../middleware/auth');

class ExceptionController {
  static async memberCancel(req, res) {
    try {
      const { application_id } = req.body;
      if (!application_id) {
        return res.status(400).json({
          success: false,
          error: '缺少申请ID'
        });
      }

      const result = await ExceptionService.reserveExceptionsOnMemberCancel(
        application_id,
        getUserId(req)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getExceptionDetails(req, res) {
    try {
      const details = await ExceptionService.getExceptionDetails(req.params.applicationId);

      res.json({
        success: true,
        data: details
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getAllReservedExceptions(req, res) {
    try {
      const exceptions = await ExceptionService.getAllReservedExceptions(req.query);

      res.json({
        success: true,
        data: exceptions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async verifyIntegrity(req, res) {
    try {
      const result = await ExceptionService.verifyExceptionIntegrity(req.params.applicationId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = ExceptionController;
