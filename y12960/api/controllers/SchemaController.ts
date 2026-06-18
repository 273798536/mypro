import { Request, Response } from 'express';
import { z } from 'zod';
import { schemaVersionRepository } from '../repositories/SchemaVersionRepository';
import { schemaCompareService } from '../services/SchemaCompareService';
import { exportService } from '../services/ExportService';
import { auditLogRepository } from '../repositories/AuditLogRepository';

const compareSchema = z.object({
  version1Id: z.string(),
  version2Id: z.string(),
});

const createVersionSchema = z.object({
  version: z.string(),
  tableName: z.string(),
  fields: z.array(
    z.object({
      name: z.string(),
      type: z.string(),
      nullable: z.boolean(),
      defaultValue: z.string(),
      comment: z.string(),
      length: z.number().optional(),
      precision: z.number().optional(),
    })
  ),
});

const exportReportSchema = z.object({
  version1Id: z.string(),
  version2Id: z.string(),
  format: z.enum(['excel', 'pdf']).default('excel'),
});

export class SchemaController {
  async getVersions(req: Request, res: Response) {
    try {
      const tableName = req.query.tableName as string | undefined;
      const versions = await schemaVersionRepository.findAll(tableName);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getVersionById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const version = await schemaVersionRepository.findById(id);

      if (!version) {
        return res.status(404).json({
          success: false,
          error: '版本不存在',
        });
      }

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getTableNames(req: Request, res: Response) {
    try {
      const tables = await schemaVersionRepository.getDistinctTableNames();

      res.json({
        success: true,
        data: tables,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async getVersionsForTable(req: Request, res: Response) {
    try {
      const { tableName } = req.params;
      const versions = await schemaVersionRepository.getVersionsForTable(tableName);

      res.json({
        success: true,
        data: versions,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async createVersion(req: Request, res: Response) {
    try {
      const body = createVersionSchema.parse(req.body);
      const userId = req.headers['x-user-id'] as string || 'user_2';

      const existing = await schemaVersionRepository.findByVersion(body.version, body.tableName);
      if (existing) {
        return res.status(400).json({
          success: false,
          error: '该表的该版本号已存在',
        });
      }

      const version = await schemaVersionRepository.create({
        ...body,
        createdBy: userId,
      });

      await auditLogRepository.create({
        userId,
        action: 'CREATE_SCHEMA_VERSION',
        resource: 'schema_version',
        details: {
          versionId: version.id,
          version: body.version,
          tableName: body.tableName,
          fieldCount: body.fields.length,
        },
      });

      res.json({
        success: true,
        data: version,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async compare(req: Request, res: Response) {
    try {
      const { version1Id, version2Id } = compareSchema.parse(req.body);

      const v1 = await schemaVersionRepository.findById(version1Id);
      const v2 = await schemaVersionRepository.findById(version2Id);

      if (!v1 || !v2) {
        return res.status(404).json({
          success: false,
          error: '版本不存在',
        });
      }

      if (v1.tableName !== v2.tableName) {
        return res.status(400).json({
          success: false,
          error: '只能对比同一张表的不同版本',
        });
      }

      const result = schemaCompareService.compare(
        { version: v1.version, fields: v1.fields },
        { version: v2.version, fields: v2.fields },
        v1.tableName
      );

      const riskAssessment = schemaCompareService.getRiskAssessment(result);
      const summary = schemaCompareService.generateChangeSummary(result);

      res.json({
        success: true,
        data: {
          ...result,
          riskAssessment,
          summary,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }

  async exportReport(req: Request, res: Response) {
    try {
      const body = exportReportSchema.parse(req.body);

      const v1 = await schemaVersionRepository.findById(body.version1Id);
      const v2 = await schemaVersionRepository.findById(body.version2Id);

      if (!v1 || !v2) {
        return res.status(404).json({
          success: false,
          error: '版本不存在',
        });
      }

      const result = schemaCompareService.compare(
        { version: v1.version, fields: v1.fields },
        { version: v2.version, fields: v2.fields },
        v1.tableName
      );

      let buffer;
      let filename;
      let contentType;

      if (body.format === 'pdf') {
        const records = [];
        for (const field of result.addedFields) {
          records.push({
            id: 'temp',
            recordNo: `NEW-${field.name}`,
            tableName: result.tableName,
            fieldName: field.name,
            changeType: 'ADD' as const,
            status: 'AVAILABLE' as const,
            anomalies: [],
            sourceInfo: { ticketNo: '', businessDesc: '', materialLink: '', requester: '' },
            schemaBefore: { name: '', type: '', nullable: false, defaultValue: '', comment: '' },
            schemaAfter: field,
            handlingOpinion: 'Schema对比新增字段',
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
        buffer = await exportService.exportToPDF(records, `Schema对比报告 - ${result.tableName}`);
        filename = `Schema对比报告_${result.tableName}.pdf`;
        contentType = 'application/pdf';
      } else {
        buffer = await exportService.exportSchemaCompareToExcel(result);
        filename = `Schema对比报告_${result.tableName}.xlsx`;
        contentType =
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(buffer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: '参数验证失败',
          details: error.errors,
        });
      }
      res.status(500).json({
        success: false,
        error: (error as Error).message,
      });
    }
  }
}

export const schemaController = new SchemaController();
