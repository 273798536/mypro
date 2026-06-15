import { Router, Request, Response } from 'express';
import type { Complaint, Photo, ChangeRecord, AddPhotoRequest, RerunResponse } from '../../shared/types.js';
import {
  getComplaints,
  getComplaintById,
  updateComplaint,
  getSystemStatus,
  updateSystemStatus
} from '../services/dataStore.js';
import { checkCoordinates, calculateDistance } from '../services/coordinateService.js';
import { checkPhotoNames } from '../services/nameCheckService.js';
import { generateMarkdownReport } from '../services/reportService.js';
import { seedDatabase } from '../services/seedService.js';

const router = Router();

function generateId(prefix: string = 'ID'): string {
  return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6);
}

router.get('/complaints', (req: Request, res: Response) => {
  const complaints = getComplaints();
  res.json(complaints);
});

router.get('/complaints/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const complaint = getComplaintById(id);
  
  if (!complaint) {
    res.status(404).json({ error: '投诉记录不存在' });
    return;
  }
  
  res.json(complaint);
});

router.post('/complaints/:id/photos', (req: Request, res: Response) => {
  const { id } = req.params;
  const body = req.body as AddPhotoRequest;
  
  const complaint = getComplaintById(id);
  if (!complaint) {
    res.status(404).json({ error: '投诉记录不存在' });
    return;
  }

  const isMismatch = body.originalName !== body.systemName;
  const newPhoto: Photo = {
    id: generateId('P'),
    originalName: body.originalName,
    systemName: body.systemName,
    url: body.url,
    latitude: body.latitude,
    longitude: body.longitude,
    address: body.address,
    takenAt: new Date().toISOString(),
    isNameMismatch: isMismatch,
    source: body.source || '补录'
  };

  const oldPhotoCount = complaint.photos.length;
  const oldCoordStatus = complaint.hasCoordinateOffset;
  const oldOffsetDist = complaint.offsetDistance;

  complaint.photos.push(newPhoto);
  
  const nameResult = checkPhotoNames(complaint.photos);
  const coordResult = checkCoordinates(complaint.latitude, complaint.longitude, complaint.photos);
  
  complaint.hasCoordinateOffset = coordResult.hasOffset;
  complaint.offsetDistance = coordResult.offsetDistance;

  const changeRecord: ChangeRecord = {
    id: generateId('CH'),
    timestamp: new Date().toISOString(),
    type: 'photo_add',
    description: '补录现场照片',
    beforeValue: `照片数: ${oldPhotoCount}张, 坐标偏移: ${oldCoordStatus ? '是' : '否'}(${oldOffsetDist}米)`,
    afterValue: `照片数: ${complaint.photos.length}张, 坐标偏移: ${coordResult.hasOffset ? '是' : '否'}(${coordResult.offsetDistance}米), 新增照片: ${body.originalName}`
  };
  
  complaint.changeHistory.push(changeRecord);
  updateComplaint(complaint);

  const status = getSystemStatus();
  updateSystemStatus({
    lastProcessedAt: new Date().toISOString(),
    currentComplaintId: id,
    reportVersion: status.reportVersion + 1
  });

  res.json({
    success: true,
    message: '照片补录成功',
    photo: newPhoto,
    changeRecord
  });
});

router.post('/complaints/:id/rerun', (req: Request, res: Response) => {
  const { id } = req.params;
  const complaint = getComplaintById(id);
  
  if (!complaint) {
    res.status(404).json({ error: '投诉记录不存在' });
    return;
  }

  const oldMismatches = complaint.photos.filter(p => p.isNameMismatch).length;
  const oldOffsetStatus = complaint.hasCoordinateOffset;
  const oldOffsetDist = complaint.offsetDistance;

  const nameResult = checkPhotoNames(complaint.photos);
  const coordResult = checkCoordinates(complaint.latitude, complaint.longitude, complaint.photos);
  
  complaint.hasCoordinateOffset = coordResult.hasOffset;
  complaint.offsetDistance = coordResult.offsetDistance;

  const changeRecord: ChangeRecord = {
    id: generateId('CH'),
    timestamp: new Date().toISOString(),
    type: 'rerun',
    description: '重跑坐标和名称校验',
    beforeValue: `名称不一致: ${oldMismatches}张, 坐标偏移: ${oldOffsetStatus ? '是' : '否'}(${oldOffsetDist}米)`,
    afterValue: `名称不一致: ${nameResult.mismatches.length}张, 坐标偏移: ${coordResult.hasOffset ? '是' : '否'}(${coordResult.offsetDistance}米)`
  };
  
  complaint.changeHistory.push(changeRecord);
  updateComplaint(complaint);

  const status = getSystemStatus();
  updateSystemStatus({
    lastProcessedAt: new Date().toISOString(),
    currentComplaintId: id,
    reportVersion: status.reportVersion + 1
  });

  const response: RerunResponse = {
    success: true,
    message: '重跑校验完成',
    photosChecked: nameResult.totalChecked,
    nameMismatchesFound: nameResult.mismatches.length,
    coordinateOffsetsFound: coordResult.offsetPhotos.length
  };

  res.json(response);
});

router.get('/complaints/:id/report', (req: Request, res: Response) => {
  const { id } = req.params;
  const complaint = getComplaintById(id);
  
  if (!complaint) {
    res.status(404).json({ error: '投诉记录不存在' });
    return;
  }

  const status = getSystemStatus();
  const report = generateMarkdownReport(complaint, status.reportVersion);
  
  res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
  res.json({
    report,
    version: status.reportVersion,
    complaintId: id
  });
});

router.get('/status', (req: Request, res: Response) => {
  const status = getSystemStatus();
  const complaints = getComplaints();
  
  res.json({
    ...status,
    totalComplaints: complaints.length,
    pendingCount: complaints.filter(c => c.status === 'pending').length,
    processingCount: complaints.filter(c => c.status === 'processing').length,
    resolvedCount: complaints.filter(c => c.status === 'resolved').length
  });
});

router.post('/seed', (req: Request, res: Response) => {
  const result = seedDatabase();
  
  if (result.success) {
    updateSystemStatus({
      lastProcessedAt: new Date().toISOString(),
      reportVersion: 1
    });
  }
  
  res.json(result);
});

export default router;
