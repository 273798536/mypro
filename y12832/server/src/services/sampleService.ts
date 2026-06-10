import { AppDataSource } from '../data-source';
import { Sample, SampleStatus, QualityStatus } from '../entities/Sample';
import { ProcessingRecord, RecordType, RecordResult } from '../entities/ProcessingRecord';
import { createAuditLog } from './auditService';
import { In } from 'typeorm';

const sampleRepository = AppDataSource.getRepository(Sample);
const recordRepository = AppDataSource.getRepository(ProcessingRecord);

export interface SampleImportData {
  barcode: string;
  sampleName: string;
  bacteriaName: string;
  resistanceProfile?: string;
  collectionTime?: string;
  testTime?: string;
  sequencingBatch?: string;
  notes?: string;
  [key: string]: any;
}

export async function importSamples(dataList: SampleImportData[], operator: string): Promise<Sample[]> {
  const samples: Sample[] = [];
  const barcodes = dataList.map(d => d.barcode);
  
  const existingBarcodes = await sampleRepository.find({
    where: { barcode: In(barcodes) },
    select: ['barcode']
  }).then(s => s.map(s => s.barcode));

  for (const data of dataList) {
    const hasDuplicate = existingBarcodes.includes(data.barcode);
    const hasMissingTimePoint = !data.collectionTime || !data.testTime;
    
    const qualityStatus: QualityStatus = hasDuplicate || hasMissingTimePoint ? 'warning' : 'pass';
    const qualityNotes: string[] = [];
    if (hasDuplicate) qualityNotes.push('条码重复');
    if (hasMissingTimePoint) qualityNotes.push('时间点缺失');

    const sample = sampleRepository.create({
      ...data,
      status: 'imported',
      qualityStatus,
      qualityNotes: qualityNotes.join('; '),
      hasDuplicateBarcode: hasDuplicate,
      hasMissingTimePoint,
      rawData: JSON.stringify(data),
      importedBy: operator,
    });

    const savedSample = await sampleRepository.save(sample);
    samples.push(savedSample);

    await createAuditLog({
      sampleId: savedSample.id,
      action: 'sample_import',
      operator,
      extraInfo: JSON.stringify({ hasDuplicate, hasMissingTimePoint }),
    });

    await recordRepository.save(recordRepository.create({
      sampleId: savedSample.id,
      recordType: 'quality_check',
      description: '导入时质量自动检查',
      analysisData: JSON.stringify({ hasDuplicate, hasMissingTimePoint }),
      result: qualityStatus === 'pass' ? 'pass' : 'warning',
      createdBy: operator,
    }));
  }

  return samples;
}

export async function getSamples(page = 1, pageSize = 20, status?: SampleStatus, barcode?: string): Promise<{ samples: Sample[]; total: number }> {
  const queryBuilder = sampleRepository.createQueryBuilder('sample')
    .leftJoinAndSelect('sample.processingRecords', 'records')
    .orderBy('sample.createdAt', 'DESC');

  if (status) {
    queryBuilder.where('sample.status = :status', { status });
  }
  if (barcode) {
    queryBuilder.andWhere('sample.barcode LIKE :barcode', { barcode: `%${barcode}%` });
  }

  const [samples, total] = await queryBuilder
    .skip((page - 1) * pageSize)
    .take(pageSize)
    .getManyAndCount();

  return { samples, total };
}

export async function getSampleById(id: number): Promise<Sample | null> {
  return await sampleRepository.findOne({
    where: { id },
    relations: ['processingRecords'],
  });
}

export async function updateSampleStatus(id: number, status: SampleStatus, operator: string, reason?: string): Promise<Sample | null> {
  const sample = await sampleRepository.findOneBy({ id });
  if (!sample) return null;

  const oldStatus = sample.status;
  sample.status = status;

  if (status === 'reviewed') {
    sample.reviewedBy = operator;
    sample.reviewedAt = new Date();
  }

  const updated = await sampleRepository.save(sample);

  await createAuditLog({
    sampleId: id,
    action: 'status_change',
    fieldName: 'status',
    oldValue: oldStatus,
    newValue: status,
    reason,
    operator,
  });

  await recordRepository.save(recordRepository.create({
    sampleId: id,
    recordType: 'status_update',
    description: `状态从 ${oldStatus} 变更为 ${status}`,
    reviewComment: reason,
    result: 'pass',
    createdBy: operator,
  }));

  return updated;
}

export async function submitReview(
  sampleId: number,
  reviewData: {
    hasMissingTimePoint: boolean;
    hasDuplicateBarcode: boolean;
    qualityStatus: QualityStatus;
    qualityNotes?: string;
    reviewComment?: string;
  },
  operator: string
): Promise<Sample | null> {
  const sample = await sampleRepository.findOneBy({ id: sampleId });
  if (!sample) return null;

  const oldMissingTime = sample.hasMissingTimePoint;
  const oldDuplicate = sample.hasDuplicateBarcode;

  sample.hasMissingTimePoint = reviewData.hasMissingTimePoint;
  sample.hasDuplicateBarcode = reviewData.hasDuplicateBarcode;
  sample.qualityStatus = reviewData.qualityStatus;
  sample.qualityNotes = reviewData.qualityNotes || sample.qualityNotes;
  sample.status = 'reviewed';
  sample.reviewedBy = operator;
  sample.reviewedAt = new Date();

  const updated = await sampleRepository.save(sample);

  if (oldMissingTime !== reviewData.hasMissingTimePoint && !reviewData.hasMissingTimePoint) {
    await createAuditLog({
      sampleId,
      action: 'timepoint_fix',
      fieldName: 'hasMissingTimePoint',
      oldValue: String(oldMissingTime),
      newValue: String(reviewData.hasMissingTimePoint),
      reason: reviewData.reviewComment || '复核通过，时间点已补充',
      operator,
    });
  }

  await createAuditLog({
    sampleId,
    action: 'review_submit',
    operator,
    extraInfo: JSON.stringify(reviewData),
  });

  await recordRepository.save(recordRepository.create({
    sampleId,
    recordType: 'exception_review',
    description: '异常复核完成',
    exceptionDetails: JSON.stringify({
      oldMissingTime,
      oldDuplicate,
      ...reviewData,
    }),
    reviewComment: reviewData.reviewComment,
    result: reviewData.qualityStatus === 'pass' ? 'pass' : 'warning',
    isReviewed: true,
    reviewedBy: operator,
    reviewedAt: new Date(),
    handlingOpinion: reviewData.reviewComment,
    createdBy: operator,
  }));

  return updated;
}

export async function updateProcessingRecord(
  recordId: number,
  updateData: {
    result?: RecordResult;
    handlingOpinion?: string;
    reviewComment?: string;
    isReviewed?: boolean;
    reviewedBy?: string;
    differenceDetails?: string;
  },
  operator: string
): Promise<ProcessingRecord | null> {
  const record = await recordRepository.findOneBy({ id: recordId });
  if (!record) return null;

  const oldResult = record.result;
  Object.assign(record, updateData);
  
  if (updateData.isReviewed) {
    record.reviewedAt = new Date();
    record.reviewedBy = operator;
  }

  const updated = await recordRepository.save(record);

  await createAuditLog({
    sampleId: record.sampleId,
    action: 'record_update',
    fieldName: `record_${record.recordType}`,
    oldValue: oldResult,
    newValue: updateData.result || oldResult,
    reason: updateData.reviewComment,
    operator,
  });

  return updated;
}

export async function createDifferenceAnalysis(
  sampleId: number,
  analysisData: {
    description: string;
    differenceDetails: string;
    analysisData?: string;
  },
  operator: string
): Promise<ProcessingRecord> {
  const record = recordRepository.create({
    sampleId,
    recordType: 'difference_analysis',
    description: analysisData.description,
    differenceDetails: analysisData.differenceDetails,
    analysisData: analysisData.analysisData,
    result: 'pending',
    createdBy: operator,
  });

  const saved = await recordRepository.save(record);

  await createAuditLog({
    sampleId,
    action: 'record_create',
    fieldName: 'difference_analysis',
    operator,
    extraInfo: JSON.stringify({ recordId: saved.id }),
  });

  return saved;
}

export async function getProcessingRecords(sampleId: number): Promise<ProcessingRecord[]> {
  return await recordRepository.find({
    where: { sampleId },
    order: { createdAt: 'DESC' },
  });
}

export async function getRecordById(recordId: number): Promise<ProcessingRecord | null> {
  return await recordRepository.findOne({
    where: { id: recordId },
    relations: ['sample'],
  });
}

export async function traceException(recordId: number): Promise<{
  record: ProcessingRecord;
  sample: Sample;
  relatedRecords: ProcessingRecord[];
  auditLogs: any[];
} | null> {
  const record = await recordRepository.findOne({
    where: { id: recordId },
    relations: ['sample'],
  });
  if (!record) return null;

  const relatedRecords = await recordRepository.find({
    where: { sampleId: record.sampleId },
    order: { createdAt: 'ASC' },
  });

  const auditLogs = await AppDataSource.getRepository('AuditLog').find({
    where: { sampleId: record.sampleId },
    order: { timestamp: 'DESC' },
  });

  return {
    record,
    sample: record.sample,
    relatedRecords,
    auditLogs,
  };
}
