import type { GCRecord } from '@/types';
import * as XLSX from 'xlsx';

export async function exportToExcel(record: GCRecord): Promise<void> {
  const wb = XLSX.utils.book_new();

  const infoData: (string | number)[][] = [
    ['气相色谱保留时间对齐报告'],
    [],
    ['批号', record.batchNumber],
    ['样品名称', record.sampleName],
    ['进样时间', record.injectionTime],
    ['仪器型号', record.instrumentModel],
    ['操作人员', record.operator],
    ['数据状态', record.status === 'ready' ? '可直接使用' : record.status === 'needs_review' ? '需安全员复核' : '无效数据'],
    [],
    ['判读结论', record.conclusion],
    ['结论依据', record.conclusionSource],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoData), '基本信息');

  const peakHeader = ['序号', '组分名', '保留时间(min)', '峰面积', '峰高', '理论塔板数', '数据质量', '备注'];
  const peakData: (string | number | null)[][] = [peakHeader, ...record.peaks.map(p => [
    p.peakIndex,
    p.compoundName || '',
    p.retentionTime ?? '',
    p.peakArea ?? '',
    p.peakHeight ?? '',
    p.theoreticalPlates ?? '',
    p.dataQuality,
    p.note || p.inlineNote || '',
  ])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(peakData as any[][]), '谱图数据');

  if (record.calculationResult) {
    const calc = record.calculationResult;
    const calcHeader = ['组分', '峰面积', '百分含量(%)'];
    const calcDataRows: (string | number)[][] = [];
    calcDataRows.push(['配平计算结果']);
    calcDataRows.push(['计算方法', calc.method === 'normalization' ? '归一化法' : calc.method]);
    calcDataRows.push(['公式', calc.formula]);
    calcDataRows.push([]);
    calcDataRows.push(calcHeader);
    calc.components.forEach(c => calcDataRows.push([c.name, c.area, c.percentage]));
    calcDataRows.push([]);
    calcDataRows.push(['配平总和(%)', calc.totalPercentage]);
    calcDataRows.push(['主含量结果(%)', calc.finalResult]);
    calcDataRows.push(['备注', calc.note || '']);
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(calcDataRows as any[][]), '配平计算');
  }

  const alignHeader = ['步骤', '名称', '描述', '完成'];
  const alignData: (string | number)[][] = [alignHeader, ...record.alignmentSteps.map(s => [
    s.stepOrder,
    s.stepName,
    s.description,
    s.isCompleted ? '是' : '否',
  ])];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(alignData as any[][]), '对齐步骤');

  const filename = `GC_${record.batchNumber}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export async function exportToPdf(record: GCRecord, elementId: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    useCORS: true,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;
  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  pdf.save(`GC_${record.batchNumber}_${new Date().toISOString().slice(0, 10)}.pdf`);
}
