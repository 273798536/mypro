import type { Reagent, ReagentRemarkParsed, DataQualityIssue } from '@/types';

export function parseReagentRemark(remark: string): ReagentRemarkParsed {
  const result: ReagentRemarkParsed = {};
  if (!remark) return result;

  const lower = remark.toLowerCase();

  const concMatch = remark.match(/(\d+(?:\.\d+)?)\s*(mol\/L|mol\/ml|M|N|%|g\/mL|mg\/mL)/i);
  if (concMatch) {
    result.concentration = `${concMatch[1]} ${concMatch[2]}`;
  }

  const batchMatch = remark.match(/(?:批号|batch|lot)[^\d]*([A-Za-z0-9\-_]+)/i);
  if (batchMatch) {
    result.batchNo = batchMatch[1];
  }

  const expiryMatch = remark.match(
    /(?:有效期|过期|expiry|expire|valid)[^\d]*(\d{4}[-\/]\d{1,2}(?:[-\/]\d{1,2})?)/i
  );
  if (expiryMatch) {
    result.expiryDate = expiryMatch[1].replace(/\//g, '-');
  }

  if (/冷藏|冷冻|4℃|避光|干燥|密封/.test(remark)) {
    const storageKeywords = remark.match(/(冷藏|冷冻|4℃|避光|干燥|密封)/g);
    if (storageKeywords) {
      result.storageCondition = storageKeywords.join('/');
    }
  }

  void lower;
  return result;
}

export function detectReagentIssues(reagents: Reagent[]): DataQualityIssue[] {
  const issues: DataQualityIssue[] = [];
  const seenCodes = new Map<string, string[]>();

  reagents.forEach((reagent) => {
    if (seenCodes.has(reagent.code)) {
      const ids = seenCodes.get(reagent.code)!;
      ids.push(reagent.id);
      if (ids.length === 2) {
        issues.push({
          type: 'duplicate',
          field: 'code',
          description: `试剂编号 "${reagent.code}" 存在重复条目（共 ${ids.length} 条），建议合并`,
          reagentId: ids.join(','),
        });
      } else {
        const existing = issues.find((i) => i.reagentId?.split(',').includes(ids[0]));
        if (existing) {
          existing.description = `试剂编号 "${reagent.code}" 存在重复条目（共 ${ids.length} 条），建议合并`;
          existing.reagentId = ids.join(',');
        }
      }
    } else {
      seenCodes.set(reagent.code, [reagent.id]);
    }

    const requiredFields: Array<keyof Reagent> = ['code', 'name', 'batchNo', 'expiryDate'];
    requiredFields.forEach((field) => {
      const value = reagent[field];
      if (value === undefined || value === null || value === '') {
        issues.push({
          type: 'empty',
          field: field as string,
          description: `试剂 "${reagent.name || reagent.code || '未知'}" 的 ${field} 字段为空`,
          reagentId: reagent.id,
        });
      }
    });

    if (reagent.remark && /批号|浓度|有效期|冷藏|避光|干燥/.test(reagent.remark)) {
      const parsed = parseReagentRemark(reagent.remark);
      const hasExtracted = Object.keys(parsed).length > 0;
      if (hasExtracted && (!reagent.batchNo || !reagent.expiryDate)) {
        issues.push({
          type: 'remark_mixed',
          field: 'remark',
          description: `试剂 "${reagent.name || reagent.code}" 的备注中包含结构化数据，已解析出：${Object.keys(parsed).join('、')}，建议更新正式字段`,
          reagentId: reagent.id,
        });
      }
    }
  });

  return issues;
}

export function mergeDuplicateReagents(reagents: Reagent[]): Reagent[] {
  const codeMap = new Map<string, Reagent>();

  reagents.forEach((r) => {
    const existing = codeMap.get(r.code);
    if (!existing) {
      codeMap.set(r.code, { ...r });
    } else {
      const merged: Reagent = {
        ...existing,
        name: existing.name || r.name,
        batchNo: existing.batchNo || r.batchNo,
        purity: existing.purity || r.purity,
        expiryDate: existing.expiryDate || r.expiryDate,
        remark: [existing.remark, r.remark].filter(Boolean).join(' | '),
        status: existing.status === 'available' ? r.status : existing.status,
      };
      codeMap.set(r.code, merged);
    }
  });

  return Array.from(codeMap.values());
}

export function checkReagentExpiry(expiryDate: string): 'expired' | 'warning' | 'ok' {
  if (!expiryDate) return 'warning';
  try {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffDays = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < 0) return 'expired';
    if (diffDays < 30) return 'warning';
    return 'ok';
  } catch {
    return 'warning';
  }
}
