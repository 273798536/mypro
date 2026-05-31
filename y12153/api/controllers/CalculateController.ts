import type { Request, Response } from 'express';
import type { CalculateRequest, CalculateResult } from '../../shared/types';
import { performCalculation } from '../services/RollCalculationService';
import { detectAllAnomalies } from '../services/AnomalyDetectionService';
import {
  calculateParamsHash,
  findDuplicate,
  insertCalculation,
  insertAnomalies,
  insertTraceInfo,
} from '../repositories/CalculationRepository';

export async function handleCalculate(req: Request, res: Response): Promise<void> {
  try {
    const request = req.body as CalculateRequest;

    const paramsHash = calculateParamsHash(request);
    const duplicateRecord = findDuplicate(paramsHash);

    const anomalies = detectAllAnomalies(request);
    const hasFatalErrors = anomalies.some(a => a.severity === 'error' && a.type !== 'wave_missing');

    let result: CalculateResult;

    if (hasFatalErrors) {
      result = {
        id: '',
        shipName: request.shipName,
        rollFrequency: 0,
        rollAmplitude: 0,
        comfortScore: 0,
        comfortLevel: '计算中断',
        rollFrequencyUnit: 'rad/s',
        rollAmplitudeUnit: '°',
        comfortScoreUnit: '级',
        applicableScope: '',
        failureReason: '存在致命数据错误，无法继续计算。请检查异常信息并修正数据。',
        calculationSuccess: false,
        anomalies,
        traceability: [],
        isDuplicate: false,
        createdAt: new Date().toISOString()
      };
    } else {
      result = performCalculation(request);
      result.anomalies = anomalies;
    }

    const isDuplicate = duplicateRecord !== null;
    const duplicateOf = duplicateRecord?.id || null;

    result.isDuplicate = isDuplicate;
    result.duplicateOf = duplicateOf || undefined;

    const id = insertCalculation(request, result, paramsHash, isDuplicate, duplicateOf);
    result.id = id;

    if (anomalies.length > 0) {
      insertAnomalies(id, anomalies);
    }

    if (result.traceability.length > 0) {
      insertTraceInfo(id, result.traceability);
    }

    res.json(result);
  } catch (error) {
    console.error('Calculation error:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error instanceof Error ? error.message : '未知错误'
    });
  }
}
