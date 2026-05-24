const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { authenticateToken, requireRole, createAuditLog } = require('../middleware/auth');
const config = require('../config/config');

const router = express.Router();

const uploadDir = './uploads/photos';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'photo-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('只允许上传图片文件'));
    }
  }
});

router.post('/:workOrderId', authenticateToken, requireRole(config.roles.DATA_ENTRY, config.roles.SUPERVISOR), upload.array('photos', 10), async (req, res) => {
  const workOrder = await db.getSync('SELECT * FROM work_orders WHERE id = ?', [req.params.workOrderId]);
  
  if (!workOrder) {
    return res.status(404).json({ error: '派工单不存在' });
  }

  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: '未上传文件' });
  }

  const uploadedPhotos = [];
  for (const file of req.files) {
    const result = await db.runSync(`
      INSERT INTO site_photos (work_order_id, photo_path, photo_type, uploaded_by)
      VALUES (?, ?, ?, ?)
    `, [req.params.workOrderId, file.path, req.body.photo_type || 'site', req.user.id]);
    
    uploadedPhotos.push({
      id: result.lastID,
      path: file.path,
      originalName: file.originalname
    });
  }

  await createAuditLog(req.user.id, 'upload_photos', 'site_photos', req.params.workOrderId, { count: req.files.length }, req.ip);

  res.status(201).json({ 
    message: `成功上传 ${req.files.length} 张照片`,
    photos: uploadedPhotos
  });
});

router.get('/:workOrderId', authenticateToken, async (req, res) => {
  const photos = await db.allSync(`
    SELECT sp.*, u.username as uploaded_by_name
    FROM site_photos sp
    LEFT JOIN users u ON sp.uploaded_by = u.id
    WHERE sp.work_order_id = ?
    ORDER BY sp.created_at DESC
  `, [req.params.workOrderId]);

  res.json(photos);
});

module.exports = router;
