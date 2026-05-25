import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { run, get, all } from '../database';
import { Batch, BatchStatus, BatchStrategy, ProcessResult, MaterialType, NewMaterialInput, DuplicateBatchInput, Material } from '../types';
import { AuditService } from './audit-service';

export class BatchService {
  static async createBatch(
    batchNumber: string,
    trainingName: string,
    trainingDate: string,
    createdBy: string,
    remark?: string
  ): Promise<Batch> {
    const existing = await this.getBatchByNumber(batchNumber);

    if (existing) {
      throw new Error(`批次号 ${batchNumber} 已存在`);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO batches (id, batch_number, training_name, training_date, status, created_by, created_at, updated_at, remark)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, batchNumber, trainingName, trainingDate, BatchStatus.DRAFT, createdBy, now, now, remark || null]
    );

    return this.getBatchById(id) as Promise<Batch>;
  }

  static async getBatchById(id: string): Promise<Batch | undefined> {
    const row = await get<any>(`SELECT * FROM batches WHERE id = ?`, [id]);
    return row ? this.mapBatchRow(row) : undefined;
  }

  static async getBatchByNumber(batchNumber: string): Promise<Batch | undefined> {
    const row = await get<any>(`SELECT * FROM batches WHERE batch_number = ?`, [batchNumber]);
    return row ? this.mapBatchRow(row) : undefined;
  }

  static async listBatches(
    status?: BatchStatus,
    page: number = 1,
    pageSize: number = 50
  ): Promise<{ data: Batch[]; total: number }> {
    const offset = (page - 1) * pageSize;
    let sql = `SELECT * FROM batches`;
    let countSql = `SELECT COUNT(*) as count FROM batches`;
    const params: any[] = [];

    if (status) {
      sql += ` WHERE status = ?`;
      countSql += ` WHERE status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    
    const rows = await all<any>(sql, [...params, pageSize, offset]);
    const totalResult = await all<{ count: number }>(countSql, params);
    
    return { data: rows.map(r => this.mapBatchRow(r)), total: totalResult[0]?.count || 0 };
  }

  private static mapBatchRow(row: any): Batch {
    return {
      id: row.id,
      batchNumber: row.batch_number,
      trainingName: row.training_name,
      trainingDate: row.training_date,
      status: row.status,
      processResult: row.process_result,
      remark: row.remark,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  static async updateBatchStatus(
    batchId: string,
    newStatus: BatchStatus,
    operatedBy: string,
    reason: string
  ): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    const validTransitions: Record<BatchStatus, BatchStatus[]> = {
      [BatchStatus.DRAFT]: [BatchStatus.SUBMITTED],
      [BatchStatus.SUBMITTED]: [BatchStatus.REJECTED, BatchStatus.SECONDARY_CONFIRMED],
      [BatchStatus.REJECTED]: [BatchStatus.SUBMITTED],
      [BatchStatus.SECONDARY_CONFIRMED]: [BatchStatus.AUDIT_ONLY],
      [BatchStatus.AUDIT_ONLY]: []
    };

    if (!validTransitions[batch.status].includes(newStatus)) {
      throw new Error(`不允许从 ${batch.status} 转换到 ${newStatus}`);
    }

    const now = new Date().toISOString();

    await AuditService.recordStatusTransition(
      batchId,
      batch.status,
      newStatus,
      operatedBy,
      reason
    );

    await run(
      `UPDATE batches SET status = ?, updated_at = ? WHERE id = ?`,
      [newStatus, now, batchId]
    );

    return this.getBatchById(batchId) as Promise<Batch>;
  }

  static async processDuplicateBatch(
    input: DuplicateBatchInput
  ): Promise<{ action: string; batch: Batch; addedMaterials: Material[]; overwrittenMaterials: Material[]; ignoredMaterials: Material[] }> {
    const { batchNumber, strategy, operatedBy, trainingName, trainingDate, remark, materials = [] } = input;

    const existingBatch = await this.getBatchByNumber(batchNumber);
    if (!existingBatch) {
      throw new Error(`批次不存在: ${batchNumber}`);
    }

    if (existingBatch.status === BatchStatus.AUDIT_ONLY && strategy !== BatchStrategy.IGNORE) {
      throw new Error(`批次已进入只读审计状态，只能使用 ignore 策略`);
    }

    const addedMaterials: Material[] = [];
    const overwrittenMaterials: Material[] = [];
    const ignoredMaterials: Material[] = [];
    const now = new Date().toISOString();

    switch (strategy) {
      case BatchStrategy.IGNORE: {
        await AuditService.recordChange(
          existingBatch.id,
          'batch_strategy',
          'original',
          'ignored',
          operatedBy,
          `忽略重复批次数据，保留原有 ${materials.length} 份新材料`
        );
        ignoredMaterials.push(...await this.persistMaterials(existingBatch.id, materials, operatedBy));
        return { action: 'ignored', batch: existingBatch, addedMaterials, overwrittenMaterials, ignoredMaterials };
      }

      case BatchStrategy.OVERWRITE: {
        const existingMaterials = await this.getMaterialsByBatchId(existingBatch.id);

        for (const material of existingMaterials) {
          await this.deleteMaterialInternal(material.id, operatedBy, `覆盖策略：删除旧材料 ${material.fileName}`);
          overwrittenMaterials.push(material);
        }

        const newMaterials = await this.persistMaterials(existingBatch.id, materials, operatedBy);
        addedMaterials.push(...newMaterials);

        const updates: string[] = [];
        const params: any[] = [];

        if (trainingName !== undefined) {
          updates.push(`training_name = ?`);
          params.push(trainingName);
          await AuditService.recordChange(existingBatch.id, 'training_name', existingBatch.trainingName, trainingName, operatedBy, '覆盖策略更新培训名称');
        }
        if (trainingDate !== undefined) {
          updates.push(`training_date = ?`);
          params.push(trainingDate);
          await AuditService.recordChange(existingBatch.id, 'training_date', existingBatch.trainingDate, trainingDate, operatedBy, '覆盖策略更新培训日期');
        }
        if (remark !== undefined) {
          updates.push(`remark = ?`);
          params.push(remark);
          await AuditService.recordChange(existingBatch.id, 'remark', existingBatch.remark, remark, operatedBy, '覆盖策略更新备注');
        }

        updates.push(`updated_at = ?`);
        params.push(now, existingBatch.id);

        if (updates.length > 1) {
          await run(`UPDATE batches SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        await AuditService.recordChange(
          existingBatch.id,
          'batch_strategy',
          'original',
          'overwritten',
          operatedBy,
          `覆盖策略：删除 ${overwrittenMaterials.length} 份旧材料，新增 ${addedMaterials.length} 份新材料`
        );

        const updatedBatch = await this.getBatchById(existingBatch.id);
        return { action: 'overwritten', batch: updatedBatch!, addedMaterials, overwrittenMaterials, ignoredMaterials };
      }

      case BatchStrategy.APPEND: {
        const existingMaterialTypes = new Set<string>();
        const existingMaterials = await this.getMaterialsByBatchId(existingBatch.id);
        existingMaterials.forEach(m => existingMaterialTypes.add(m.type));

        for (const materialInput of materials) {
          if (existingMaterialTypes.has(materialInput.type)) {
            const existingOfType = existingMaterials.find(m => m.type === materialInput.type);
            if (existingOfType) {
              await this.deleteMaterialInternal(existingOfType.id, operatedBy, `追加策略：替换同类型材料 ${materialInput.fileName}`);
              overwrittenMaterials.push(existingOfType);
            }
          }
        }

        const newMaterials = await this.persistMaterials(existingBatch.id, materials, operatedBy);
        addedMaterials.push(...newMaterials);

        if (remark !== undefined) {
          await AuditService.recordChange(existingBatch.id, 'remark', existingBatch.remark, remark, operatedBy, '追加策略更新备注');
          await run(`UPDATE batches SET remark = ?, updated_at = ? WHERE id = ?`, [remark, now, existingBatch.id]);
        } else {
          await run(`UPDATE batches SET updated_at = ? WHERE id = ?`, [now, existingBatch.id]);
        }

        await AuditService.recordChange(
          existingBatch.id,
          'batch_strategy',
          'original',
          'appended',
          operatedBy,
          `追加策略：替换 ${overwrittenMaterials.length} 份同类型材料，新增 ${addedMaterials.length} 份新材料`
        );

        const updatedBatch = await this.getBatchById(existingBatch.id);
        return { action: 'appended', batch: updatedBatch!, addedMaterials, overwrittenMaterials, ignoredMaterials };
      }

      default:
        throw new Error(`未知策略: ${strategy}`);
    }
  }

  private static async persistMaterials(batchId: string, materials: NewMaterialInput[], operatedBy: string): Promise<Material[]> {
    const result: Material[] = [];
    for (const input of materials) {
      const fileBuffer = Buffer.from(input.fileContent, 'base64');
      const material = await this.uploadMaterialInternal(batchId, input.type, fileBuffer, input.fileName, operatedBy, input.isSensitive || false);
      result.push(material);
    }
    return result;
  }

  private static async uploadMaterialInternal(
    batchId: string,
    type: MaterialType,
    fileBuffer: Buffer,
    fileName: string,
    uploadedBy: string,
    isSensitive: boolean = false
  ): Promise<Material> {
    const fileHash = crypto.createHash('md5').update(fileBuffer).digest('hex');
    const fileSize = fileBuffer.length;

    const fileExt = path.extname(fileName);
    const storedFileName = `${uuidv4()}${fileExt}`;
    const uploadPath = path.join(process.cwd(), 'uploads', storedFileName);

    fs.writeFileSync(uploadPath, fileBuffer);

    const fileUrl = `/uploads/${storedFileName}`;
    const id = uuidv4();
    const now = new Date().toISOString();

    await run(
      `INSERT INTO materials (id, batch_id, type, file_name, file_url, file_hash, file_size, uploaded_by, uploaded_at, is_sensitive)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, batchId, type, fileName, fileUrl, fileHash, fileSize, uploadedBy, now, isSensitive ? 1 : 0]
    );

    return this.getMaterialById(id) as Promise<Material>;
  }

  private static async getMaterialById(id: string): Promise<Material | undefined> {
    const material = await get<any>(`SELECT * FROM materials WHERE id = ?`, [id]);
    if (material) {
      return this.mapMaterialRow(material);
    }
    return undefined;
  }

  private static async getMaterialsByBatchId(batchId: string): Promise<Material[]> {
    const materials = await all<any>(`SELECT * FROM materials WHERE batch_id = ? ORDER BY uploaded_at DESC`, [batchId]);
    return materials.map(m => this.mapMaterialRow(m));
  }

  private static mapMaterialRow(row: any): Material {
    return {
      id: row.id,
      batchId: row.batch_id,
      type: row.type,
      fileName: row.file_name,
      fileUrl: row.file_url,
      fileHash: row.file_hash,
      fileSize: row.file_size,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at,
      isSensitive: row.is_sensitive === 1,
      processResult: row.process_result,
      processNote: row.process_note
    };
  }

  private static async deleteMaterialInternal(materialId: string, operatedBy: string, reason: string): Promise<void> {
    const material = await this.getMaterialById(materialId);
    if (!material) return;

    await AuditService.recordChange(
      material.batchId,
      'material_deleted',
      material.fileName,
      null as any,
      operatedBy,
      reason,
      materialId
    );

    await run(`DELETE FROM materials WHERE id = ?`, [materialId]);

    const filePath = path.join(process.cwd(), material.fileUrl);
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch {}
    }
  }

  static async setProcessResult(
    batchId: string,
    result: ProcessResult,
    remark: string,
    operatedBy: string
  ): Promise<Batch> {
    const batch = await this.getBatchById(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    await AuditService.recordChange(
      batchId,
      'process_result',
      batch.processResult,
      result,
      operatedBy,
      remark
    );

    const now = new Date().toISOString();
    await run(
      `UPDATE batches SET process_result = ?, remark = ?, updated_at = ? WHERE id = ?`,
      [result, remark, now, batchId]
    );

    return this.getBatchById(batchId) as Promise<Batch>;
  }

  static async getBatchStats(): Promise<{
    total: number;
    byStatus: Record<BatchStatus, number>;
    byResult: Record<ProcessResult, number>;
  }> {
    const rows = await all<any>(`SELECT * FROM batches`);
    const allBatches = rows.map(r => this.mapBatchRow(r));

    const byStatus = {} as Record<BatchStatus, number>;
    const byResult = {} as Record<ProcessResult, number>;

    Object.values(BatchStatus).forEach(s => byStatus[s as BatchStatus] = 0);
    Object.values(ProcessResult).forEach(r => byResult[r as ProcessResult] = 0);

    allBatches.forEach(b => {
      byStatus[b.status] = (byStatus[b.status] || 0) + 1;
      if (b.processResult) {
        byResult[b.processResult] = (byResult[b.processResult] || 0) + 1;
      }
    });

    return {
      total: allBatches.length,
      byStatus,
      byResult
    };
  }
}
