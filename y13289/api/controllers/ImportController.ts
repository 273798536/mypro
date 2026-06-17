import { Request, Response } from 'express';
import { ImportService } from '../services/ImportService';
import multer from 'multer';
import type { DeliveryRecord } from '@shared/types';

const importService = new ImportService();
const storage = multer.memoryStorage();
export const upload = multer({ storage });

export async function importExcel(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传Excel文件' });
      return;
    }

    const result = await importService.importFromExcel(req.file.buffer, req.file.originalname);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function manualImport(req: Request, res: Response) {
  try {
    const data = req.body as Omit<DeliveryRecord, 'id' | 'createdAt' | 'updatedAt' | 'issues'>;
    data.source = 'manual';
    data.sourceFile = data.sourceFile || '手工录入';
    data.marketNameRaw = data.marketNameRaw || data.marketName;
    data.locationRaw = data.locationRaw || data.location;
    data.coordinatesRaw = data.coordinatesRaw || data.coordinates;
    data.deliveryTimeRaw = data.deliveryTimeRaw || data.deliveryTime;
    data.truckNumberRaw = data.truckNumberRaw || data.truckNumber;
    data.goodsTypeRaw = data.goodsTypeRaw || data.goodsType;
    data.status = data.status || 'pending';

    const id = await importService['recordService'].createRecord(data);
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}

export async function previewImport(req: Request, res: Response) {
  try {
    if (!req.file) {
      res.status(400).json({ error: '请上传Excel文件' });
      return;
    }

    const XLSX = await import('xlsx');
    const workbook = XLSX.read(req.file.buffer);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

    const headers = data[0] || [];
    const rows = data.slice(1, 11);

    res.json({
      fileName: req.file.originalname,
      totalRows: data.length - 1,
      headers,
      previewRows: rows,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
