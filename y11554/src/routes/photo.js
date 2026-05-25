const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { ROLES } = require('../models/User');
const RestockPhoto = require('../models/RestockPhoto');
const { upload, generateFileHash } = require('../config/multer');
const dayjs = require('dayjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const WRITE_ROLES = [ROLES.DATA_ENTRY, ROLES.REVIEWER, ROLES.SUPERVISOR];

router.use(authenticate);

router.post('/upload', authorize(...WRITE_ROLES), upload.array('photos', 20), async (req, res) => {
  try {
    const { cabinetId, photoType, compartmentId, remark, ledgerId } = req.body;
    
    if (!cabinetId) {
      return res.status(400).json({ error: '柜机ID不能为空' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '请选择要上传的照片' });
    }

    const savedPhotos = [];
    
    for (const file of req.files) {
      const photoId = `PHOTO${dayjs().format('YYYYMMDD')}${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const fileHash = await generateFileHash(file.path);
      
      const existingPhoto = await RestockPhoto.findOne({ fileHash });
      if (existingPhoto) {
        savedPhotos.push({
          ...existingPhoto.toObject(),
          isDuplicate: true,
          message: '该照片已存在'
        });
        fs.unlinkSync(file.path);
        continue;
      }

      const photo = new RestockPhoto({
        photoId,
        ledgerId: ledgerId || undefined,
        cabinetId,
        photoType: photoType || 'compartment_closeup',
        fileUrl: `/uploads/${file.filename}`,
        fileName: file.originalname,
        fileSize: file.size,
        fileHash,
        uploadedBy: req.user._id,
        compartmentId: compartmentId || undefined,
        remark: remark || undefined
      });

      await photo.save();
      savedPhotos.push(photo);
    }

    res.status(201).json({
      message: `成功上传 ${savedPhotos.length} 张照片`,
      photos: savedPhotos
    });
  } catch (error) {
    if (req.files) {
      for (const file of req.files) {
        try {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        } catch (e) {}
      }
    }
    res.status(400).json({ error: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, cabinetId, photoType, ledgerId } = req.query;
    const query = {};
    
    if (cabinetId) query.cabinetId = cabinetId;
    if (photoType) query.photoType = photoType;
    if (ledgerId) query.ledgerId = ledgerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const photos = await RestockPhoto.find(query)
      .sort({ uploadTime: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('uploadedBy', 'name');

    const total = await RestockPhoto.countDocuments(query);

    res.json({
      photos,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const photo = await RestockPhoto.findById(req.params.id)
      .populate('uploadedBy', 'name')
      .populate('verifiedBy', 'name');
    
    if (!photo) {
      return res.status(404).json({ error: '照片不存在' });
    }
    
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id/verify', authorize(ROLES.REVIEWER, ROLES.SUPERVISOR), async (req, res) => {
  try {
    const photo = await RestockPhoto.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: '照片不存在' });
    }

    photo.isVerified = true;
    photo.verifiedBy = req.user._id;
    photo.verifiedAt = new Date();
    await photo.save();

    res.json(photo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/:id/link-ledger', authorize(...WRITE_ROLES), async (req, res) => {
  try {
    const { ledgerId } = req.body;
    const photo = await RestockPhoto.findById(req.params.id);
    
    if (!photo) {
      return res.status(404).json({ error: '照片不存在' });
    }

    photo.ledgerId = ledgerId;
    await photo.save();

    res.json(photo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
