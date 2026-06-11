import * as XLSX from 'xlsx';
import type { ExportData, Sample, CultureRecord, ReviewOpinion, FinalConclusion } from '../types';

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('zh-CN');
  } catch {
    return isoString;
  }
}

function samplesToCSV(samples: Sample[]): string {
  const headers = [
    '样本条码',
    '采样地点',
    '原始行号',
    '图片名',
    '来源备注',
    '状态',
    '批次号',
    '创建时间',
    '更新时间',
  ];

  const rows = samples.map((s) => [
    s.barcode,
    s.samplingLocation,
    s.originalRowNumber,
    s.imageName,
    s.sourceNote,
    s.status,
    s.batchNumber,
    formatDate(s.createdAt),
    formatDate(s.updatedAt),
  ]);

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return csvContent;
}

export function exportToCSV(data: ExportData, filename: string = '伦理核对结果') {
  const { samples, cultureRecords, reviewOpinions, finalConclusions } = data;

  const sampleCSV = samplesToCSV(samples);

  const blob = new Blob(['\uFEFF' + sampleCSV], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToExcel(data: ExportData, filename: string = '伦理核对结果') {
  const { samples, cultureRecords, reviewOpinions, finalConclusions } = data;

  const sampleData = samples.map((s) => ({
    样本条码: s.barcode,
    采样地点: s.samplingLocation,
    原始行号: s.originalRowNumber,
    图片名: s.imageName,
    来源备注: s.sourceNote,
    状态: s.status,
    批次号: s.batchNumber,
    创建时间: formatDate(s.createdAt),
    更新时间: formatDate(s.updatedAt),
  }));

  const cultureData = cultureRecords.map((c) => ({
    样本条码: samples.find((s) => s.id === c.sampleId)?.barcode || '',
    时间点: c.timePoint,
    培养记录: c.content,
    操作人员: c.operator,
    记录日期: formatDate(c.recordDate),
    是否缺失: c.isMissing ? '是' : '否',
  }));

  const opinionData = reviewOpinions.map((o) => {
    const round = data.samples.length > 0
      ? samples.find((s) => {
          const relatedRound = data.finalConclusions.find((fc) => fc.reviewRoundId === o.reviewRoundId);
          return relatedRound ? true : false;
        })
      : null;
    return {
      复核意见: o.content,
      缺失时间点: o.missingTimePoints.join(', '),
      提交时间: formatDate(o.createdAt),
    };
  });

  const conclusionData = finalConclusions.map((fc) => ({
    结论: fc.result === 'pass' ? '通过' : fc.result === 'fail' ? '不通过' : '待确认',
    关联培养记录ID: fc.linkedCultureRecordId || '',
    生成时间: formatDate(fc.createdAt),
  }));

  const wb = XLSX.utils.book_new();
  const ws1 = XLSX.utils.json_to_sheet(sampleData);
  const ws2 = XLSX.utils.json_to_sheet(cultureData);
  const ws3 = XLSX.utils.json_to_sheet(opinionData);
  const ws4 = XLSX.utils.json_to_sheet(conclusionData);

  XLSX.utils.book_append_sheet(wb, ws1, '样本信息');
  XLSX.utils.book_append_sheet(wb, ws2, '培养记录');
  XLSX.utils.book_append_sheet(wb, ws3, '复核意见');
  XLSX.utils.book_append_sheet(wb, ws4, '最终结论');

  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportSupervisorReport(
  samples: Sample[],
  reviewOpinions: ReviewOpinion[],
  finalConclusions: FinalConclusion[],
  batchNumber: string
) {
  const reportData = samples.map((s) => {
    const relatedOpinion = reviewOpinions.find((o) => {
      // 找到与样本关联的意见
      return true;
    });
    const relatedConclusion = finalConclusions.find((fc) => {
      return true;
    });

    return {
      批次号: s.batchNumber,
      样本条码: s.barcode,
      采样地点: s.samplingLocation,
      原始行号: s.originalRowNumber,
      图片名: s.imageName,
      来源备注: s.sourceNote,
      复核意见: relatedOpinion?.content || '',
      缺失时间点: relatedOpinion?.missingTimePoints.join(', ') || '',
      最终结论:
        relatedConclusion?.result === 'pass'
          ? '通过'
          : relatedConclusion?.result === 'fail'
          ? '不通过'
          : '待确认',
      状态: s.status,
    };
  });

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(reportData);
  XLSX.utils.book_append_sheet(wb, ws, '导师报告');
  XLSX.writeFile(wb, `导师复核报告_${batchNumber}_${new Date().toISOString().split('T')[0]}.xlsx`);
}
