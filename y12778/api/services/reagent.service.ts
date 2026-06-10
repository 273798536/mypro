import type { Reagent, SupplementRecord, OperationalError } from '../../shared/types';
import { dataStore } from '../repositories/store';

export function checkDuplicate(params: {
  batchNo: string;
  fieldName?: string;
}): { isDuplicate: boolean; existing?: Reagent; conflictField?: string } {
  const existing = dataStore.getReagentByBatchNo(params.batchNo);
  if (!existing) return { isDuplicate: false };

  if (params.fieldName) {
    if (
      params.fieldName === 'nominalConcentration' ||
      params.fieldName === 'temperatureCurves'
    ) {
      return {
        isDuplicate: true,
        existing,
        conflictField: params.fieldName,
      };
    }
  }
  return { isDuplicate: true, existing };
}

export function createReagent(
  data: Omit<Reagent, 'id' | 'createdAt' | 'isSupplemented' | 'supplementHistory' | 'status'>
): { reagent?: Reagent; error?: OperationalError } {
  const dup = checkDuplicate({ batchNo: data.batchNo });
  if (dup.isDuplicate && dup.existing) {
    return {
      error: {
        code: 'DUPLICATE_CONCLUSION',
        title: `批次${data.batchNo}已存在`,
        actionableSteps: [
          `系统已检测到批次${data.batchNo}的试剂记录`,
          '如为补充数据，请在现有记录上使用"补录"功能，而非新建',
          `跳转至该记录：试剂台账 → 搜索${data.batchNo} → 补录`,
        ],
        relatedResource: {
          type: 'reagent',
          id: dup.existing.id,
          batchNo: data.batchNo,
          navigationPath: `/reagent-ledger/${dup.existing.id}/supplement`,
        },
      },
    };
  }

  const now = new Date().toISOString();
  const reagent: Reagent = {
    ...data,
    id: `reagent_${Date.now().toString(36)}`,
    createdAt: now,
    isSupplemented: false,
    supplementHistory: [],
    status: 'active',
  };

  return { reagent: dataStore.addReagent(reagent) };
}

export function supplementReagent(
  reagentId: string,
  params: {
    fieldName: string;
    newValue: string;
    reason: string;
    operator: string;
  }
): { reagent?: Reagent; error?: OperationalError } {
  const reagent = dataStore.getReagentById(reagentId);
  if (!reagent) {
    return {
      error: {
        code: 'REAGENT_NOT_FOUND',
        title: '试剂记录不存在',
        actionableSteps: ['返回试剂台账列表', '确认试剂ID或批次号是否正确'],
      },
    };
  }

  const dup = checkDuplicate({ batchNo: reagent.batchNo, fieldName: params.fieldName });
  if (dup.isDuplicate && dup.existing && dup.existing.id !== reagentId) {
    return {
      error: {
        code: 'DUPLICATE_CONCLUSION',
        title: '该字段已存在补录结论',
        actionableSteps: [
          `批次${reagent.batchNo}的${params.fieldName}已有最新补录值`,
          '系统自动以最新补录为准，不产生重复结论',
          '查看追溯链路可获取完整变更历史',
        ],
      },
    };
  }

  const oldValue = getFieldValue(reagent, params.fieldName);

  const suppRecord: SupplementRecord = {
    id: `supp_${Date.now().toString(36)}`,
    fieldName: params.fieldName,
    oldValue,
    newValue: params.newValue,
    supplementedBy: params.operator,
    supplementedAt: new Date().toISOString(),
    reason: params.reason,
  };

  const updated = applyFieldUpdate(reagent, params.fieldName, params.newValue);
  updated.supplementHistory = [...reagent.supplementHistory, suppRecord];
  updated.isSupplemented = true;
  updated.updatedBy = params.operator;
  updated.updatedAt = new Date().toISOString();

  const result = dataStore.updateReagent(reagentId, updated);
  return { reagent: result };
}

function getFieldValue(reagent: Reagent, fieldName: string): string | undefined {
  switch (fieldName) {
    case 'nominalConcentration':
      return String(reagent.nominalConcentration);
    case 'actualConcentration':
      return reagent.actualConcentration ? String(reagent.actualConcentration) : undefined;
    case 'name':
      return reagent.name;
    case 'supplier':
      return reagent.supplier;
    default:
      return undefined;
  }
}

function applyFieldUpdate(reagent: Reagent, fieldName: string, newValue: string): Reagent {
  const updated = { ...reagent };
  switch (fieldName) {
    case 'nominalConcentration':
      updated.nominalConcentration = Number(newValue);
      break;
    case 'actualConcentration':
      updated.actualConcentration = Number(newValue);
      break;
    case 'name':
      updated.name = newValue;
      break;
    case 'supplier':
      updated.supplier = newValue;
      break;
  }
  return updated;
}
