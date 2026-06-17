import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import type { PageSummary, Sample, FilterCriteria } from '@/types';
import { SEGMENTS, MODEL_VERSIONS } from '@/types';

const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

const getModelVersionName = (version: string, modelVersions: typeof MODEL_VERSIONS): string => {
  if (version === 'all') return '全部模型';
  const mv = modelVersions.find(m => m.id === version);
  return mv?.name || version;
};

const getSegmentNames = (segmentIds: string[], segments: typeof SEGMENTS): string => {
  if (segmentIds.length === 0) return '全部分层';
  return segmentIds.map(id => {
    const seg = segments.find(s => s.id === id);
    return seg?.name || id;
  }).join('、');
};

const getStatusName = (status: string): string => {
  const map: Record<string, string> = {
    all: '全部状态',
    pending: '待处理',
    approved: '已批准',
    rejected: '已拒绝',
    suspended: '已挂起',
  };
  return map[status] || status;
};

const formatCriteriaText = (
  criteria: FilterCriteria,
  segments: typeof SEGMENTS,
  modelVersions: typeof MODEL_VERSIONS
): string => {
  const parts: string[] = [];
  parts.push(`数据时间范围：${formatDate(criteria.startDate)} 至 ${formatDate(criteria.endDate)}`);
  if (criteria.minScore !== null || criteria.maxScore !== null) {
    const min = criteria.minScore ?? '不限';
    const max = criteria.maxScore ?? '不限';
    parts.push(`评分范围：${min} - ${max}分`);
  }
  parts.push(`模型版本：${getModelVersionName(criteria.modelVersion, modelVersions)}`);
  parts.push(`客户分层：${getSegmentNames(criteria.segments, segments)}`);
  parts.push(`样本状态：${getStatusName(criteria.status)}`);
  return parts.join('；');
};

export const capturePageState = (
  summary: PageSummary,
  samples: Sample[],
  segments: typeof SEGMENTS,
  modelVersions: typeof MODEL_VERSIONS
) => {
  return {
    summary,
    samples,
    criteriaText: formatCriteriaText(summary.criteria, segments, modelVersions),
    timestamp: new Date().toLocaleString('zh-CN'),
    exportNote: '本导出文件与页面显示完全一致，包含完整筛选口径说明',
  };
};

export const exportToPDF = async (
  elementId: string,
  summary: PageSummary,
  samples: Sample[],
  segments: typeof SEGMENTS,
  modelVersions: typeof MODEL_VERSIONS
): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('导出元素不存在');

  const pageState = capturePageState(summary, samples, segments, modelVersions);
  
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  pdf.setFillColor(26, 54, 93);
  pdf.rect(0, 0, pageWidth, 25, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('信贷评分指标看板 - 页面摘要', 10, 15);
  
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`导出时间：${pageState.timestamp}`, 10, 22);

  pdf.setTextColor(26, 54, 93);
  pdf.setFontSize(8);
  const criteriaLines = pdf.splitTextToSize(pageState.criteriaText, pageWidth - 20);
  let yPos = 32;
  pdf.text('【筛选口径】', 10, yPos);
  yPos += 5;
  criteriaLines.forEach((line: string) => {
    pdf.text(line, 10, yPos);
    yPos += 4;
  });

  yPos += 2;
  pdf.setDrawColor(214, 158, 46);
  pdf.setLineWidth(0.5);
  pdf.line(10, yPos, pageWidth - 10, yPos);
  yPos += 3;

  pdf.setFontSize(7);
  pdf.setTextColor(100, 100, 100);
  pdf.text(pageState.exportNote, 10, yPos);
  yPos += 5;

  const contentY = yPos;
  const availableHeight = pageHeight - contentY - 15;
  const finalImgHeight = Math.min(imgHeight, availableHeight);
  
  pdf.addImage(imgData, 'PNG', 10, contentY, imgWidth, finalImgHeight);

  if (imgHeight > availableHeight) {
    let remainingHeight = imgHeight - availableHeight;
    let yOffset = availableHeight;
    
    while (remainingHeight > 0) {
      pdf.addPage();
      
      const nextHeight = Math.min(remainingHeight, pageHeight - 30);
      const sourceY = (yOffset / imgHeight) * canvas.height;
      const sourceHeight = (nextHeight / imgHeight) * canvas.height;
      
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = canvas.width;
      tempCanvas.height = sourceHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
        const tempImgData = tempCanvas.toDataURL('image/png');
        pdf.addImage(tempImgData, 'PNG', 10, 15, imgWidth, nextHeight);
      }
      
      remainingHeight -= nextHeight;
      yOffset += nextHeight;
    }
  }

  pdf.setFillColor(240, 244, 248);
  pdf.rect(0, pageHeight - 12, pageWidth, 12, 'F');
  pdf.setTextColor(99, 125, 152);
  pdf.setFontSize(7);
  pdf.text(`第 ${pdf.internal.getNumberOfPages()} 页 | 数据截止：${formatDate(summary.dataAsOf)}`, pageWidth - 60, pageHeight - 5);

  pdf.save(`信贷评分指标看板_${summary.dataAsOf}.pdf`);
};

export const exportToExcel = (
  summary: PageSummary,
  samples: Sample[],
  segments: typeof SEGMENTS,
  modelVersions: typeof MODEL_VERSIONS
): void => {
  const pageState = capturePageState(summary, samples, segments, modelVersions);

  const wb = XLSX.utils.book_new();

  const summaryData = [
    ['信贷评分指标看板 - 页面摘要'],
    ['导出时间', pageState.timestamp],
    ['数据截止日期', formatDate(summary.dataAsOf)],
    ['最后更新时间', summary.lastUpdated],
    [],
    ['【筛选口径】'],
    ...pageState.criteriaText.split('；').map(line => [line]),
    [],
    ['【核心指标】'],
    ['样本总数', summary.totalSamples],
    ['通过率', `${(summary.passRate * 100).toFixed(2)}%`],
    ['平均评分', summary.avgScore.toFixed(0)],
    ['挂起样本数', summary.suspendedCount],
    ['数据完整性状态', summary.dataIntegrityStatus === 'complete' ? '完整' : 
                             summary.dataIntegrityStatus === 'partial' ? '部分缺失' : '存在挂起'],
    [],
    [pageState.exportNote],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 50 }];
  ws1['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 5, c: 0 }, e: { r: 5, c: 1 } },
    { s: { r: 9, c: 0 }, e: { r: 9, c: 1 } },
    { s: { r: 17, c: 0 }, e: { r: 17, c: 1 } },
  ];
  XLSX.utils.book_append_sheet(wb, ws1, '页面摘要');

  const samplesData = [
    ['样本ID', '客户名称', '客户分层', '申请日期', '当前状态', '最新评分', '阈值', '通过结果', '模型版本', '是否挂起', '是否有晚到附件', '引用完整'],
    ...samples.map(s => [
      s.id,
      s.customerName,
      s.segmentName,
      formatDate(s.applyDate),
      s.status === 'approved' ? '已批准' : 
      s.status === 'rejected' ? '已拒绝' : 
      s.status === 'suspended' ? '已挂起' : '待处理',
      s.latestScore,
      s.threshold,
      s.latestResult === 'pass' ? '通过' : '未通过',
      s.modelVersion,
      s.isSuspended ? '是' : '否',
      s.hasLateAttachment ? '是' : '否',
      s.referenceComplete ? '是' : '否',
    ]),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(samplesData);
  ws2['!cols'] = [
    { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 12 }, { wch: 10 },
    { wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 12 }, { wch: 10 }, { wch: 14 }, { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, ws2, '样本明细');

  XLSX.writeFile(wb, `信贷评分指标看板_${summary.dataAsOf}.xlsx`);
};
