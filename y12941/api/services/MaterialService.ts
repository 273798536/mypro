import { MaterialRepository } from '../repositories/MaterialRepository';
import type { MaterialBatch, MaterialSource } from '../../shared/types';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

export class MaterialService {
  private materialRepo = new MaterialRepository();

  getBatches() {
    return this.materialRepo.findAll();
  }

  getBatchById(id: string) {
    return this.materialRepo.findById(id);
  }

  async importFile(filePath: string, sourceType: MaterialSource, fileName: string, operator: string) {
    const ext = path.extname(fileName).toLowerCase();
    const batchName = `${this.getSourceTypeName(sourceType)}_${new Date().toISOString().split('T')[0]}`;
    
    const batch = this.materialRepo.create({
      name: batchName,
      sourceType,
      fileName,
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      status: 'processing'
    });

    try {
      let records: any[] = [];
      
      if (ext === '.csv') {
        records = await this.parseCsv(filePath);
      } else if (ext === '.xlsx' || ext === '.xls') {
        records = this.parseExcel(filePath);
      } else if (ext === '.json') {
        records = this.parseJson(filePath);
      } else {
        throw new Error(`Unsupported file format: ${ext}`);
      }

      this.materialRepo.create({
        ...batch,
        totalRecords: records.length,
        status: 'completed'
      });

      return {
        batchId: batch.id,
        totalRecords: records.length,
        processedRecords: records.length,
        errorRecords: 0,
        sampleRecords: records.slice(0, 5)
      };
    } catch (error: any) {
      this.materialRepo.updateStatus(batch.id, 'failed', error.message);
      throw error;
    }
  }

  private async parseCsv(filePath: string): Promise<any[]> {
    const content = fs.readFileSync(filePath, 'utf-8');
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: reject
      });
    });
  }

  private parseExcel(filePath: string): any[] {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }

  private parseJson(filePath: string): any[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }

  private getSourceTypeName(type: MaterialSource): string {
    const names: Record<MaterialSource, string> = {
      annotation_record: '标注记录',
      segmentation_list: '切分清单',
      training_sample: '训练样本'
    };
    return names[type];
  }
}
