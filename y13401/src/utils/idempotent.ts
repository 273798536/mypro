import type {
  Parameter,
  BatchResultItem,
  Batch,
  BatchRunInput,
  ValueType,
} from "@/types";

export function parametersEqual(
  a: { value: number | null; valueType: ValueType; formula: string; unit: string; category: string },
  b: { value: number | null; valueType: ValueType; formula: string; unit: string; category: string },
): boolean {
  return (
    a.value === b.value &&
    a.valueType === b.valueType &&
    a.formula === b.formula &&
    a.unit === b.unit &&
    a.category === b.category
  );
}

export function runIdempotentBatch(
  input: BatchRunInput,
  existingParameters: Parameter[],
  previousBatchId?: string,
): { batch: Batch; results: BatchResultItem[]; newParameters: Parameter[] } {
  const results: BatchResultItem[] = [];
  const newParameters: Parameter[] = [];
  const now = new Date().toISOString();
  const batchId = `batch-${Date.now()}`;

  let newCount = 0;
  let skippedCount = 0;
  let updatedCount = 0;
  let errorCount = 0;

  input.parameters.forEach((paramInput, index) => {
    const existing = existingParameters.find(
      (p) => p.name === paramInput.name && p.category === paramInput.category,
    );

    const resultId = `br-${Date.now()}-${index}`;

    if (!paramInput.name || paramInput.name.trim() === "") {
      errorCount++;
      results.push({
        id: resultId,
        batchId,
        parameterId: `error-${index}`,
        parameterName: "(未命名参数)",
        resultType: "error",
        reason: "参数名称为空",
      });
      return;
    }

    if (existing) {
      if (parametersEqual(existing, paramInput)) {
        skippedCount++;
        results.push({
          id: resultId,
          batchId,
          parameterId: existing.id,
          parameterName: existing.name,
          resultType: "skipped",
          reason: "参数已存在且值完全相同",
          previousValue: existing.value,
          currentValue: paramInput.value,
          previousValueType: existing.valueType,
          currentValueType: paramInput.valueType,
        });
      } else {
        updatedCount++;
        results.push({
          id: resultId,
          batchId,
          parameterId: existing.id,
          parameterName: existing.name,
          resultType: "updated",
          reason: "参数值或属性发生变化",
          previousValue: existing.value,
          currentValue: paramInput.value,
          previousValueType: existing.valueType,
          currentValueType: paramInput.valueType,
        });
      }
    } else {
      newCount++;
      const newParam: Parameter = {
        ...paramInput,
        id: `param-${Date.now()}-${index}`,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
      newParameters.push(newParam);
      results.push({
        id: resultId,
        batchId,
        parameterId: newParam.id,
        parameterName: newParam.name,
        resultType: "new",
        reason: "首次录入",
        currentValue: newParam.value,
        currentValueType: newParam.valueType,
      });
    }
  });

  const batch: Batch = {
    id: batchId,
    name: input.batchName,
    runAt: now,
    totalCount: input.parameters.length,
    newCount,
    skippedCount,
    updatedCount,
    errorCount,
    previousBatchId,
  };

  return { batch, results, newParameters };
}

export function detectDuplicates(
  parameters: Parameter[],
): Array<{ param: Parameter; duplicateOf: Parameter }> {
  const duplicates: Array<{ param: Parameter; duplicateOf: Parameter }> = [];
  const seen = new Map<string, Parameter>();

  parameters.forEach((p) => {
    const key = `${p.name}-${p.category}-${p.value}-${p.valueType}`;
    if (seen.has(key)) {
      duplicates.push({ param: p, duplicateOf: seen.get(key)! });
    } else {
      seen.set(key, p);
    }
  });

  return duplicates;
}
