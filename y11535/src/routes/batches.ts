import { Router } from 'express';
import * as multer from 'multer';
import * as csv from 'csv-parser';
import { Readable } from 'stream';
import { authenticate, AuthRequest, requirePermission } from '../middleware/auth';
import { batchService } from '../services/BatchService';
import { ExceptionType, SourceType } from '../types';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post(
  '/',
  requirePermission('batch:create'),
  async (req: AuthRequest, res) => {
    try {
      const batch = await batchService.createBatch({
        ...req.body,
        createdBy: req.user!.id,
        creatorName: req.user!.name,
        creatorRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/',
  requirePermission('batch:read'),
  async (req: AuthRequest, res) => {
    try {
      const { trainingId, status, createdBy, page, pageSize } = req.query;
      const result = await batchService.getBatches({
        trainingId: trainingId as string,
        status: status as any,
        createdBy: createdBy as string,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 50
      });

      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id',
  requirePermission('batch:read'),
  async (req: AuthRequest, res) => {
    try {
      const batch = await batchService.getBatch(req.params.id);
      if (!batch) {
        return res.status(404).json({ error: 'BATCH_NOT_FOUND' });
      }
      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/import/registration',
  requirePermission('batch:create'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
      }

      const records = await parseCsv(req.file.buffer);
      const processedRecords = records.map((r, idx) => ({
        employeeId: r.employeeId || r['员工工号'],
        employeeName: r.employeeName || r['员工姓名'],
        department: r.department || r['部门'],
        trainingDate: new Date(r.trainingDate || r['培训日期']),
        exceptionType: (r.exceptionType || r['异常类型'] || ExceptionType.MISSING_SIGN) as ExceptionType,
        originalRow: idx + 2,
        originalValue: JSON.stringify(r)
      }));

      const batch = await batchService.importFromRegistrationForm(req.params.id, {
        fileName: req.file.originalname,
        fileContent: req.file.buffer,
        records: processedRecords,
        sourceType: SourceType.REGISTRATION_FORM,
        storagePath: `/uploads/${req.file.originalname}`,
        importedBy: req.user!.id,
        importerName: req.user!.name,
        importerRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/import/qrcode',
  requirePermission('batch:create'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
      }

      const records = await parseCsv(req.file.buffer);
      const processedRecords = records.map((r, idx) => ({
        employeeId: r.employeeId || r['员工工号'],
        employeeName: r.employeeName || r['员工姓名'],
        department: r.department || r['部门'],
        trainingDate: new Date(r.trainingDate || r['培训日期']),
        signTime: r.signTime || r['签到时间'] ? new Date(r.signTime || r['签到时间']) : undefined,
        qrCodeScanned: (r.qrCodeScanned || r['是否扫码']) === '是',
        location: r.location || r['地点'],
        deviceInfo: r.deviceInfo || r['设备信息'],
        originalRow: idx + 2,
        originalValue: JSON.stringify(r)
      }));

      const batch = await batchService.importFromSignQrcode(req.params.id, {
        fileName: req.file.originalname,
        fileContent: req.file.buffer,
        records: processedRecords,
        storagePath: `/uploads/${req.file.originalname}`,
        importedBy: req.user!.id,
        importerName: req.user!.name,
        importerRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/import/homework',
  requirePermission('batch:create'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
      }

      const records = await parseCsv(req.file.buffer);
      const processedRecords = records.map((r, idx) => ({
        employeeId: r.employeeId || r['员工工号'],
        employeeName: r.employeeName || r['员工姓名'],
        department: r.department || r['部门'],
        trainingDate: new Date(r.trainingDate || r['培训日期']),
        homeworkSubmitted: (r.homeworkSubmitted || r['是否提交作业']) === '是',
        homeworkScore: r.homeworkScore || r['作业分数'] ? parseFloat(r.homeworkScore || r['作业分数']) : undefined,
        originalRow: idx + 2,
        originalValue: JSON.stringify(r)
      }));

      const batch = await batchService.importFromHomework(req.params.id, {
        fileName: req.file.originalname,
        fileContent: req.file.buffer,
        records: processedRecords,
        storagePath: `/uploads/${req.file.originalname}`,
        importedBy: req.user!.id,
        importerName: req.user!.name,
        importerRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/import/photo',
  requirePermission('batch:create'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
      }

      const records = await parseCsv(req.file.buffer);
      const processedRecords = records.map((r, idx) => ({
        employeeId: r.employeeId || r['员工工号'],
        employeeName: r.employeeName || r['员工姓名'],
        department: r.department || r['部门'],
        trainingDate: new Date(r.trainingDate || r['培训日期']),
        photoAnalysis: r.photoAnalysis || r['照片分析'],
        isProxySign: (r.isProxySign || r['是否代签']) === '是',
        isMixedSign: (r.isMixedSign || r['是否混签']) === '是',
        originalRow: idx + 2,
        originalValue: JSON.stringify(r)
      }));

      const batch = await batchService.importFromAbnormalPhoto(req.params.id, {
        fileName: req.file.originalname,
        fileContent: req.file.buffer,
        records: processedRecords,
        storagePath: `/uploads/${req.file.originalname}`,
        importedBy: req.user!.id,
        importerName: req.user!.name,
        importerRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/:id/import/sms',
  requirePermission('batch:create'),
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'NO_FILE_UPLOADED' });
      }

      const records = await parseCsv(req.file.buffer);
      const processedRecords = records.map((r, idx) => ({
        employeeId: r.employeeId || r['员工工号'],
        employeeName: r.employeeName || r['员工姓名'],
        department: r.department || r['部门'],
        trainingDate: new Date(r.trainingDate || r['培训日期']),
        smsContent: r.smsContent || r['短信内容'],
        smsTime: new Date(r.smsTime || r['短信时间']),
        originalRow: idx + 2,
        originalValue: JSON.stringify(r)
      }));

      const batch = await batchService.addSmsEvidence(req.params.id, {
        fileName: req.file.originalname,
        fileContent: req.file.buffer,
        records: processedRecords,
        storagePath: `/uploads/${req.file.originalname}`,
        importedBy: req.user!.id,
        importerName: req.user!.name,
        importerRole: req.user!.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json(batch);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

router.get(
  '/:id/failed-records',
  requirePermission('batch:read'),
  async (req: AuthRequest, res) => {
    try {
      const failedRecords = await batchService.getFailedRecords(req.params.id);
      res.json(failedRecords);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }
);

async function parseCsv(buffer: Buffer): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const records: any[] = [];
    const stream = Readable.from(buffer);

    stream
      .pipe(csv())
      .on('data', (data) => records.push(data))
      .on('end', () => resolve(records))
      .on('error', reject);
  });
}

export default router;
