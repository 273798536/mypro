import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { recordController } from '../controllers/record.controller';
import { config } from '../config';

const router = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: config.upload.maxSize,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

router.get('/:recordType', recordController.getRecords.bind(recordController));
router.get('/:recordType/export', recordController.exportRecords.bind(recordController));
router.get('/:recordType/:id', recordController.getRecordById.bind(recordController));
router.get('/:recordType/:id/history', recordController.getRecordHistory.bind(recordController));
router.post('/:recordType', recordController.createRecord.bind(recordController));
router.post('/:recordType/import', recordController.importRecords.bind(recordController));
router.post('/:recordType/upload', upload.single('file'), recordController.uploadCsv.bind(recordController));

export default router;
