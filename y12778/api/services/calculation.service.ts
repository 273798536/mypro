import type {
  Calculation,
  CalculationExplanation,
  Reagent,
  OperationalError,
  TemperatureCurve,
} from '../../shared/types';

function interpolateConcentration(
  curve: TemperatureCurve,
  observedTension: number
): number {
  const points = [...curve.points].sort((a, b) => a.tension - b.tension);

  if (observedTension >= points[points.length - 1].tension) {
    return points[0].concentration;
  }
  if (observedTension <= points[0].tension) {
    return points[points.length - 1].concentration;
  }

  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    if (
      observedTension >= p1.tension &&
      observedTension <= p2.tension
    ) {
      const ratio =
        (observedTension - p1.tension) / (p2.tension - p1.tension);
      return (
        p1.concentration + ratio * (p2.concentration - p1.concentration)
      );
    }
  }
  return points[0].concentration;
}

function findNearestCurve(
  curves: TemperatureCurve[],
  targetTemp: number
): TemperatureCurve | null {
  if (curves.length === 0) return null;
  return curves.reduce((best, curr) =>
    Math.abs(curr.temperature - targetTemp) <
    Math.abs(best.temperature - targetTemp)
      ? curr
      : best
  );
}

function buildExplanation(
  reagent: Reagent,
  observedTension: number,
  temperature: number,
  calculatedConcentration: number,
  deviation: number,
  curveUsed: TemperatureCurve
): CalculationExplanation {
  const threshold = 10;
  const innerThreshold = 15;
  const isPass = Math.abs(deviation) <= threshold;
  const isWarning =
    Math.abs(deviation) > threshold && Math.abs(deviation) <= innerThreshold;

  const direction = deviation > 0 ? '偏高' : deviation < 0 ? '偏低' : '一致';
  const absDev = Math.abs(deviation).toFixed(1);

  let summary = '';
  let detail = '';

  if (isPass) {
    summary = `试算浓度${calculatedConcentration.toFixed(
      1
    )}mg/L，较标称浓度${
      reagent.nominalConcentration
    }mg/L${direction}${absDev}%，在±10%合格范围内，结果正常。`;
  } else if (isWarning) {
    summary = `试算浓度${calculatedConcentration.toFixed(
      1
    )}mg/L，较标称浓度${
      reagent.nominalConcentration
    }mg/L${direction}${absDev}%，略超出合格阈值，建议人工复核样本配制记录。`;
  } else {
    summary = `试算浓度${calculatedConcentration.toFixed(
      1
    )}mg/L，较标称浓度${
      reagent.nominalConcentration
    }mg/L${direction}${absDev}%，超出±10%合格阈值，建议复核试剂台账原始记录。`;
  }

  detail = `基于${curveUsed.temperature}℃温度曲线${
    curveUsed.source === 'supplement' ? '（补录）' : ''
  }校准数据，观测表面张力${observedTension.toFixed(
    1
  )}mN/m通过线性插值计算对应浓度为${calculatedConcentration.toFixed(
    1
  )}mg/L。该批次（${reagent.batchNo}）标称浓度${
    reagent.nominalConcentration
  }mg/L，偏差${deviation > 0 ? '+' : ''}${deviation.toFixed(1)}%。`;

  if (!isPass) {
    if (reagent.isSupplemented) {
      detail += ` 注意：该批次试剂有补录历史（${reagent.supplementHistory.length}条），请查看追溯链路确认数据来源。`;
    }
    if (isWarning) {
      detail +=
        ' 建议检查：①样本稀释操作记录；②移液枪校准有效期；③温度波动记录。';
    } else {
      detail +=
        ' 初步判断可能原因为：①试剂台账原始浓度登记错误（需对照质检报告单）；②样本配制过程中稀释偏差。建议先回溯该批次试剂的录入记录和补录历史。';
    }
  } else {
    detail += ' 数据一致性良好，无需额外处理。';
  }

  return {
    summary,
    detail,
    factors: [
      {
        name: '观测表面张力',
        value: `${observedTension.toFixed(1)} mN/m`,
        impact: 'high',
      },
      {
        name: '测量温度',
        value: `${temperature} ℃`,
        impact:
          Math.abs(temperature - curveUsed.temperature) > 2 ? 'high' : 'low',
      },
      {
        name: reagent.isSupplemented ? '标称浓度（已修正）' : '标称浓度',
        value: `${reagent.nominalConcentration} mg/L`,
        impact: 'high',
      },
    ],
  };
}

export function calculateConcentration(params: {
  reagent: Reagent;
  observedTension: number;
  temperature: number;
}): { calculation?: Calculation; error?: OperationalError } {
  const { reagent, observedTension, temperature } = params;

  if (observedTension <= 0 || observedTension > 100) {
    return {
      error: {
        code: 'INVALID_INPUT',
        title: '观测表面张力值无效',
        actionableSteps: [
          '请检查表面张力仪读数是否在合理范围（0-100 mN/m）',
          '确认仪器校准状态和测量温度',
          '重新取样测量后再次录入',
        ],
      },
    };
  }

  const exactCurve = reagent.temperatureCurves.find(
    (c) => c.temperature === temperature
  );
  let curveUsed = exactCurve;

  if (!curveUsed) {
    const nearest = findNearestCurve(reagent.temperatureCurves, temperature);
    if (!nearest) {
      return {
        error: {
          code: 'MISSING_TEMPERATURE_CURVE',
          title: `缺少${temperature}℃温度曲线`,
          actionableSteps: [
            `进入试剂台账，找到批次${reagent.batchNo}（${reagent.name}）`,
            `点击"补录"按钮，补充${temperature}℃温度校准曲线数据`,
            '补录完成后返回本页重新发起试算',
          ],
          relatedResource: {
            type: 'reagent',
            id: reagent.id,
            batchNo: reagent.batchNo,
            temperature,
            navigationPath: `/reagent-ledger/${reagent.id}/supplement`,
          },
        },
      };
    }
    if (Math.abs(nearest.temperature - temperature) <= 5) {
      curveUsed = nearest;
    } else {
      return {
        error: {
          code: 'MISSING_TEMPERATURE_CURVE',
          title: `缺少${temperature}℃温度曲线`,
          actionableSteps: [
            `进入试剂台账，找到批次${reagent.batchNo}（${reagent.name}）`,
            `点击"补录"按钮，补充${temperature}℃温度校准曲线数据`,
            '补录完成后返回本页重新发起试算',
          ],
          relatedResource: {
            type: 'reagent',
            id: reagent.id,
            batchNo: reagent.batchNo,
            temperature,
            navigationPath: `/reagent-ledger/${reagent.id}/supplement`,
          },
        },
      };
    }
  }

  const calculatedConcentration = interpolateConcentration(
    curveUsed,
    observedTension
  );
  const deviation =
    ((calculatedConcentration - reagent.nominalConcentration) /
      reagent.nominalConcentration) *
    100;

  const explanation = buildExplanation(
    reagent,
    observedTension,
    temperature,
    calculatedConcentration,
    deviation,
    curveUsed
  );

  const now = new Date().toISOString();
  const calc: Calculation = {
    id: `calc_${Date.now().toString(36)}`,
    reagentId: reagent.id,
    reagentBatchNo: reagent.batchNo,
    observedTension,
    temperature,
    calculatedConcentration: Number(calculatedConcentration.toFixed(2)),
    deviation: Number(deviation.toFixed(2)),
    explanation,
    status: 'pending',
    createdBy: '质检工程师',
    createdAt: now,
    traceIds: [],
  };

  return { calculation: calc };
}

export { interpolateConcentration };
