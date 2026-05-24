const path = require('path');
const multer = require('multer');
const Attachment = require('../models/Attachment');
const StateMachineService = require('../services/StateMachineService');
const { getUserId } = require('../middleware/auth');
const { ATTACHMENT_TYPES } = require('../utils/common');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

class AttachmentController {
  static getUploadMiddleware() {
    return upload.single('file');
  }

  static async upload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: '未上传文件'
        });
      }

      const { batch_id, application_id, type } = req.body;
      if (!batch_id && !application_id) {
        return res.status(400).json({
          success: false,
          error: '需要指定批次ID或申请ID'
        });
      }

      if (!type || !Object.values(ATTACHMENT_TYPES).includes(type)) {
        return res.status(400).json({
          success: false,
          error: '无效的附件类型'
        });
      }

      const attachment = await Attachment.create({
        batch_id: batch_id || null,
        application_id: application_id || null,
        type: type,
        file_name: req.file.originalname,
        file_path: req.file.path,
        file_size: req.file.size,
        uploaded_by: getUserId(req)
      });

      if (batch_id) {
        try {
          await StateMachineService.uploadAttachment(batch_id, getUserId(req));
        } catch (e) {
        }
      }

      res.json({
        success: true,
        data: attachment
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getByBatchId(req, res) {
    try {
      const attachments = await Attachment.findByBatchId(req.params.batchId);

      res.json({
        success: true,
        data: attachments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  static async getByApplicationId(req, res) {
    try {
      const attachments = await Attachment.findByApplicationId(req.params.applicationId);

      res.json({
        success: true,
        data: attachments
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}

module.exports = AttachmentController;
