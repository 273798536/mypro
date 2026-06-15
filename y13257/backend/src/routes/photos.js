const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

const router = express.Router();

const uploadDir = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({ storage });

function recordSupplementChange(complaintId, photoId, changes, supplementedBy) {
  db.prepare(`
    INSERT INTO supplement_records (complaint_id, photo_id, changes_json, supplemented_by)
    VALUES (?, ?, ?, ?)
  `).run(complaintId, photoId, JSON.stringify(changes), supplementedBy);
}

router.post('/upload', upload.single('photo'), (req, res) => {
  const { complaint_id, is_inspection = 1, is_supplement = 0, supplement_note, parent_photo_id, uploaded_by = 1 } = req.body;

  if (!complaint_id || !req.file) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(complaint_id);
  if (!complaint) {
    return res.status(404).json({ error: '投诉不存在' });
  }

  let version = 1;
  if (parent_photo_id) {
    const parent = db.prepare('SELECT * FROM photos WHERE id = ?').get(parent_photo_id);
    if (parent) {
      version = parent.version + 1;
    }
  }

  const result = db.prepare(`
    INSERT INTO photos (
      complaint_id, file_path, file_name, file_type, is_inspection,
      is_supplement, supplement_note, uploaded_by, version, parent_photo_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    complaint_id,
    `/uploads/${req.file.filename}`,
    req.file.originalname,
    req.file.mimetype,
    is_inspection ? 1 : 0,
    is_supplement ? 1 : 0,
    supplement_note,
    uploaded_by,
    version,
    parent_photo_id || null
  );

  const photoId = result.lastInsertRowid;

  if (is_supplement) {
    const photoCount = db.prepare('SELECT COUNT(*) as count FROM photos WHERE complaint_id = ?').get(complaint_id).count;
    const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(complaint.location_id);
    
    const changes = {
      field: 'photos',
      action: 'add_supplement',
      previousPhotoCount: photoCount - 1,
      newPhotoCount: photoCount,
      supplementNote: supplement_note || '现场补录照片',
      mapPointUpdated: false,
      oldLatitude: location?.latitude,
      newLatitude: location?.latitude,
      oldLongitude: location?.longitude,
      newLongitude: location?.longitude
    };

    recordSupplementChange(complaint_id, photoId, changes, uploaded_by);
  }

  res.status(201).json({
    id: photoId,
    file_path: `/uploads/${req.file.filename}`,
    file_name: req.file.originalname
  });
});

router.post('/:id/update-location', (req, res) => {
  const { id } = req.params;
  const { latitude, longitude, updated_by = 1 } = req.body;

  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id);
  if (!photo) {
    return res.status(404).json({ error: '照片不存在' });
  }

  const complaint = db.prepare('SELECT * FROM complaints WHERE id = ?').get(photo.complaint_id);
  const location = db.prepare('SELECT * FROM locations WHERE id = ?').get(complaint.location_id);

  if (!location) {
    return res.status(400).json({ error: '投诉地点未设置' });
  }

  const changes = {
    field: 'location',
    action: 'update_point',
    photoId: id,
    oldLatitude: location.latitude,
    newLatitude: latitude,
    oldLongitude: location.longitude,
    newLongitude: longitude,
    deltaLatitude: (latitude - location.latitude).toFixed(6),
    deltaLongitude: (longitude - location.longitude).toFixed(6),
    distanceMeters: calculateDistance(location.latitude, location.longitude, latitude, longitude)
  };

  db.prepare('UPDATE locations SET latitude = ?, longitude = ? WHERE id = ?').run(latitude, longitude, location.id);
  recordSupplementChange(photo.complaint_id, id, changes, updated_by);

  res.json({
    success: true,
    changes
  });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c);
}

router.delete('/:id', (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) {
    return res.status(404).json({ error: '照片不存在' });
  }

  const filePath = path.join(__dirname, '..', '..', photo.file_path);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
