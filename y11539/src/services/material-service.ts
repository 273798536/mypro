import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { run, get, all } from '../database';
import { Material, MaterialType, ProcessResult, BatchStatus } from '../types';
import { AuditService } from './audit-service';
import { BatchService } from './batch-service';

export class MaterialService {
  static async uploadMaterial(
    batchId: string,
    type: MaterialType,
    fileBuffer: Buffer,
    fileName: string,
    uploadedBy: string,
    isSensitive: boolean = false
  ): Promise<Material> {
    const batch = await BatchService.getBatchById(batchId);
    if (!batch) {
      throw new Error(`批次不存在: ${batchId}`);
    }

    if (batch.status === BatchStatus.AUDIT_ONLY) {
      throw new Error(`批次已进入只读审计状态，无法上传材料`);
    }

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

  static async getMaterialById(id: string): Promise<Material | undefined> {
    const material = await get<any>(
      `SELECT * FROM materials WHERE id = ?`,
      [id]
    );
    
    if (material) {
      return this.mapMaterialRow(material);
    }
    return undefined;
  }

  static async getMaterialsByBatchId(batchId: string): Promise<Material[]> {
    const materials = await all<any>(
      `SELECT * FROM materials WHERE batch_id = ? ORDER BY uploaded_at DESC`,
      [batchId]
    );
    
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

  static async setMaterialProcessResult(
    materialId: string,
    result: ProcessResult,
    processNote: string,
    operatedBy: string
  ): Promise<Material> {
    const material = await this.getMaterialById(materialId);
    if (!material) {
      throw new Error(`材料不存在: ${materialId}`);
    }

    await AuditService.recordChange(
      material.batchId,
      `material_${materialId}_processResult`,
      material.processResult,
      result,
      operatedBy,
      processNote,
      materialId
    );

    await run(
      `UPDATE materials SET process_result = ?, process_note = ? WHERE id = ?`,
      [result, processNote, materialId]
    );

    return this.getMaterialById(materialId) as Promise<Material>;
  }

  static async deleteMaterial(materialId: string, operatedBy: string, reason: string): Promise<void> {
    const material = await this.getMaterialById(materialId);
    if (!material) {
      throw new Error(`材料不存在: ${materialId}`);
    }

    const batch = await BatchService.getBatchById(material.batchId);
    if (batch?.status === BatchStatus.AUDIT_ONLY) {
      throw new Error(`批次已进入只读审计状态，无法删除材料`);
    }

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
  }

  static async getMaterialStats(batchId?: string): Promise<{
    total: number;
    byType: Record<MaterialType, number>;
    byResult: Record<ProcessResult, number>;
  }> {
    let sql = `SELECT * FROM materials`;
    const params: any[] = [];

    if (batchId) {
      sql += ` WHERE batch_id = ?`;
      params.push(batchId);
    }

    const materials = await all<Material & { is_sensitive: number }>(sql, params);
    
    const byType = {} as Record<MaterialType, number>;
    const byResult = {} as Record<ProcessResult, number>;

    Object.values(MaterialType).forEach(t => byType[t as MaterialType] = 0);
    Object.values(ProcessResult).forEach(r => byResult[r as ProcessResult] = 0);

    materials.forEach(m => {
      byType[m.type] = (byType[m.type] || 0) + 1;
      if (m.processResult) {
        byResult[m.processResult] = (byResult[m.processResult] || 0) + 1;
      }
    });

    return {
      total: materials.length,
      byType,
      byResult
    };
  }
}
