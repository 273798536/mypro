import type { ExperimentRecord, WasteBucketSummary } from '../types';
import { validateAllReagents, getValidationErrors, isExperimentRecordUsable } from './validation';

export function generatePlainTextReport(records: ExperimentRecord[]): string {
  const now = new Date().toLocaleString('zh-CN');
  const totalRecords = records.length;
  const abnormalRecords = records.filter(r => r.hasAbnormalities);
  const unusableRecords = records.filter(r => !isExperimentRecordUsable(r));
  const usableRecords = records.filter(r => isExperimentRecordUsable(r));

  let report = '';

  report += '========================================\n';
  report += '     化学实验废液分桶月度转交报告\n';
  report += '========================================\n';
  report += `报告生成时间：${now}\n`;
  report += `记录总数：${totalRecords} 条\n`;
  report += `异常记录：${abnormalRecords.length} 条\n`;
  report += `可用记录（可分桶）：${usableRecords.length} 条\n`;
  report += `不可用记录（待修正）：${unusableRecords.length} 条\n\n`;

  report += '【给同事的普通话说明】\n';
  report += '------------------------\n';
  if (unusableRecords.length > 0) {
    report += `本月共有 ${totalRecords} 条废液记录，其中 ${usableRecords.length} 条可以正常分桶处理，`;
    report += `${unusableRecords.length} 条存在问题暂时不能用。\n`;
    report += '主要问题集中在：\n';
    const problemTypes = new Map<string, number>();
    unusableRecords.forEach(r => {
      const errors = getValidationErrors(validateAllReagents(r.reagents));
      errors.forEach(e => {
        problemTypes.set(e.errorType, (problemTypes.get(e.errorType) || 0) + 1);
      });
    });
    problemTypes.forEach((count, type) => {
      report += `  - ${type}：${count} 处\n`;
    });
    report += '\n学生们在填写浓度时容易写错数字（比如把浓盐酸12mol/L写成20），或者干脆忘了填。这些有问题的记录我已经单独列出来了，请相关同学核对后重新提交。\n\n';
  } else {
    report += `本月 ${totalRecords} 条废液记录全部正常，可以按桶号正常分类处理。\n\n`;
  }

  report += '【不可用记录详情】\n';
  report += '------------------------\n';
  if (unusableRecords.length === 0) {
    report += '（无）\n\n';
  } else {
    unusableRecords.forEach((r, idx) => {
      report += `\n${idx + 1}. 实验：${r.experimentName}（${r.experimenter}，${r.experimentDate}）\n`;
      report += `   桶号：${r.bucketNumber} / 类别：${r.wasteCategory}\n`;
      report += `   状态：${r.status}\n`;

      const errors = getValidationErrors(validateAllReagents(r.reagents));
      if (errors.length > 0) {
        report += '   问题说明（学生版）：\n';
        errors.forEach(e => {
          report += `     · ${e.studentExplanation}\n`;
        });
      }

      if (r.manualNotes.trim()) {
        report += `   学生原始备注（原话保留）：${r.manualNotes}\n`;
      }

      report += `   为什么不能用：浓度校验没通过，信息不完整或明显错误，如果按这个标签处理废液可能出安全事故。请修正后再提交。\n`;
    });
    report += '\n';
  }

  report += '【可用记录详情】\n';
  report += '------------------------\n';
  usableRecords.forEach((r, idx) => {
    report += `${idx + 1}. ${r.experimentName}（${r.experimenter}）\n`;
    report += `   桶号：${r.bucketNumber} / 类别：${r.wasteCategory}\n`;
    report += `   试剂：${r.reagents.map(re => `${re.name} ${re.concentration}${re.concentrationUnit} × ${re.volume}${re.volumeUnit}`).join('；')}\n`;
    if (r.manualNotes.trim()) {
      report += `   备注（原话）：${r.manualNotes}\n`;
    }
    report += `   复核状态：${r.status}${r.reviewedBy ? `（${r.reviewedBy}）` : ''}\n`;
    report += '\n';
  });

  report += '========================================\n';
  report += '   环境监测员签字：__________  日期：________\n';
  report += '========================================\n';

  return report;
}

export function generateBucketSummary(records: ExperimentRecord[]): WasteBucketSummary[] {
  const bucketMap = new Map<string, WasteBucketSummary>();

  records.forEach(record => {
    if (!bucketMap.has(record.bucketNumber)) {
      bucketMap.set(record.bucketNumber, {
        bucketNumber: record.bucketNumber,
        wasteCategory: record.wasteCategory,
        totalVolume: 0,
        volumeUnit: 'mL',
        recordCount: 0,
        experiments: [],
        abnormalRecords: [],
        unusableRecords: [],
      });
    }
    const bucket = bucketMap.get(record.bucketNumber)!;
    bucket.recordCount++;
    bucket.experiments.push(record);

    record.reagents.forEach(r => {
      let vol = r.volume;
      if (r.volumeUnit === 'L') vol *= 1000;
      bucket.totalVolume += vol;
    });

    if (record.hasAbnormalities) {
      bucket.abnormalRecords.push(record);
    }
    if (!isExperimentRecordUsable(record)) {
      bucket.unusableRecords.push(record);
    }
  });

  return Array.from(bucketMap.values()).sort((a, b) => a.bucketNumber.localeCompare(b.bucketNumber));
}

export function downloadTextFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
