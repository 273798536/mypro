import { Request, Response } from 'express';
import { RecordType } from '../types';
import { recordService } from '../services/record.service';
import { importExportService } from '../services/import-export.service';
import { logger } from '../utils/logger';

export class RecordController {
  public async getRecords(req: Request, res: Response): Promise<void> {
    try {
      const { recordType } = req.params;
      const { page = 1, pageSize = 20, status, startDate, endDate, keyword } = req.query;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      const result = await recordService.getRecords(
        recordType as RecordType,
        {
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
          status: status as string,
          startDate: startDate ? parseInt(startDate as string) : undefined,
          endDate: endDate ? parseInt(endDate as string) : undefined,
          keyword: keyword as string,
        }
      );

      res.json({
        success: true,
        data: {
          records: result.records,
          total: result.total,
          page: parseInt(page as string),
          pageSize: parseInt(pageSize as string),
        },
      });
    } catch (error) {
      logger.error('Failed to get records', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async getRecordById(req: Request, res: Response): Promise<void> {
    try {
      const { recordType, id } = req.params;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      const record = await recordService.getRecordById(
        recordType as RecordType,
        id
      );

      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Record not found',
        });
        return;
      }

      res.json({
        success: true,
        data: record,
      });
    } catch (error) {
      logger.error('Failed to get record', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async getRecordHistory(req: Request, res: Response): Promise<void> {
    try {
      const { recordType, id } = req.params;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      const history = await recordService.getRecordHistory(
        recordType as RecordType,
        id
      );

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error('Failed to get record history', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async createRecord(req: Request, res: Response): Promise<void> {
    try {
      const { recordType } = req.params;
      const { data, sourceFile, lineNumber } = req.body;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      const importSource = {
        sourceFile: sourceFile || 'api_request',
        originalLineNumber: lineNumber || 1,
        rawValue: JSON.stringify(data),
        parsedValue: JSON.stringify(data),
      };

      const record = await recordService.createRecord(
        recordType as RecordType,
        data,
        importSource
      );

      logger.info('Record created via API', {
        recordType,
        recordId: record.id,
      });

      res.json({
        success: true,
        data: record,
        message: 'Record created successfully',
      });
    } catch (error) {
      logger.error('Failed to create record', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async importRecords(req: Request, res: Response): Promise<void> {
    try {
      const { recordType } = req.params;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      let records: any[];
      let sourceFile: string;

      if (Array.isArray(req.body)) {
        records = req.body;
        const typeName = recordType.replace(/_/g, ' ');
        const timestamp = new Date().toISOString().slice(0, 10);
        sourceFile = `api_import_${recordType}_${timestamp}.json`;
        logger.info('Detected raw array import format', {
          recordType,
          recordCount: records.length,
          sourceFile,
        });
      } else {
        const bodyRecords = req.body.records;
        sourceFile = req.body.sourceFile;

        if (!Array.isArray(bodyRecords)) {
          res.status(400).json({
            success: false,
            error: 'Invalid request format. Expected either:\n' +
                   '  1. Raw JSON array: [{...}, {...}]\n' +
                   '  2. Wrapped object: { "sourceFile": "xxx.json", "records": [{...}, {...}] }',
          });
          return;
        }

        records = bodyRecords;
        sourceFile = sourceFile || `api_import_${recordType}.json`;
      }

      const result = await importExportService.processImportWithTasks(
        records,
        recordType as RecordType,
        sourceFile
      );

      logger.info('Bulk import completed', {
        recordType,
        sourceFile,
        total: result.total,
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
      });

      res.json({
        success: true,
        data: {
          ...result,
          sourceFile,
        },
        message: `Imported ${result.total} records (created: ${result.created}, updated: ${result.updated}, skipped: ${result.skipped}) from ${sourceFile}`,
      });
    } catch (error) {
      logger.error('Failed to import records', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async exportRecords(req: Request, res: Response): Promise<void> {
    try {
      const { recordType } = req.params;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      const outputPath = await importExportService.exportToCsv(
        recordType as RecordType
      );

      res.download(outputPath, (err) => {
        if (err) {
          logger.error('Failed to download export file', err);
          res.status(500).json({
            success: false,
            error: 'Failed to download export file',
          });
        }
      });
    } catch (error) {
      logger.error('Failed to export records', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  public async uploadCsv(req: Request, res: Response): Promise<void> {
    try {
      const { recordType } = req.params;

      if (!Object.values(RecordType).includes(recordType as RecordType)) {
        res.status(400).json({
          success: false,
          error: `Invalid record type: ${recordType}`,
        });
        return;
      }

      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No file uploaded',
        });
        return;
      }

      const result = await importExportService.importFromCsv(
        req.file.path,
        recordType as RecordType,
        req.file.originalname
      );

      logger.info('CSV import completed', {
        recordType,
        fileName: req.file.originalname,
        ...result,
      });

      res.json({
        success: true,
        data: result,
        message: `Imported ${result.total} records from CSV`,
      });
    } catch (error) {
      logger.error('Failed to process CSV upload', error as Error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

export const recordController = new RecordController();
