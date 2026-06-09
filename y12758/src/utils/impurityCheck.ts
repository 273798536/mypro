import type { CheckResult, ExperimentBatch, ImpurityResult } from '@/types';

export function runImpurityCheck(batch: ExperimentBatch): CheckResult {
  const impurityResults: ImpurityResult[] = [];
  let hasFail = false;
  let hasBorderline = false;

  for (const impurity of batch.impurities) {
    const { measuredValue, limitValue, name, standard, id } = impurity;
    let status: ImpurityResult['status'];
    let deviation: number;
    let explanation: string;

    if (measuredValue <= limitValue) {
      status = 'PASS';
      deviation = limitValue === 0 ? 0 : ((limitValue - measuredValue) / limitValue) * 100;
      const standardText = standard ? `符合${standard}要求` : '符合标准要求';
      explanation = `${name}实测${measuredValue}%低于限度${limitValue}%，${standardText}`;
    } else {
      status = 'FAIL';
      hasFail = true;
      deviation = limitValue === 0 ? 0 : ((measuredValue - limitValue) / limitValue) * 100;
      explanation = `${name}实测${measuredValue}%超出限度${limitValue}%，超出比例${deviation.toFixed(1)}%，需关注`;
    }

    const ratio = limitValue === 0 ? 0 : measuredValue / limitValue;
    if (ratio >= 0.9 && ratio <= 1.0) {
      hasBorderline = true;
    }

    impurityResults.push({
      impurityId: id,
      name,
      status,
      measured: measuredValue,
      limit: limitValue,
      deviation: Number(deviation.toFixed(2)),
      explanation,
    });
  }

  const overallStatus: CheckResult['overallStatus'] = hasFail ? 'FAIL' : 'PASS';

  const passCount = impurityResults.filter((r) => r.status === 'PASS').length;
  const failCount = impurityResults.filter((r) => r.status === 'FAIL').length;
  let explanation: string;

  if (overallStatus === 'PASS') {
    explanation = `批次${batch.batchId}共检查${impurityResults.length}项杂质，全部合格（PASS ${passCount}项），结果符合标准要求。`;
  } else {
    explanation = `批次${batch.batchId}共检查${impurityResults.length}项杂质，其中${failCount}项超限（FAIL ${failCount}项，PASS ${passCount}项），需关注超限项目。`;
  }

  const result: CheckResult = {
    batchId: batch.batchId,
    overallStatus,
    impurityResults,
    explanation,
  };

  if (hasBorderline) {
    result.retestAdvice = '建议复测以确认 borderline 结果';
  }

  return result;
}
