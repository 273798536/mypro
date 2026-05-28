import { ReportData, StudentData } from '@/types';
import { formatDateTime, formatNumber } from './helpers';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';

export function exportReportToPDF(report: ReportData): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let yPos = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('RC充放电实验分析报告', pageWidth / 2, yPos, { align: 'center' });
  yPos += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`实验名称: ${report.experimentName}`, margin, yPos);
  yPos += 6;
  doc.text(`生成时间: ${formatDateTime(report.generatedAt)}`, margin, yPos);
  yPos += 6;
  doc.text(`学生总数: ${report.totalStudents}`, margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('一、误差统计摘要', margin, yPos);
  yPos += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`平均均方误差 (MSE): ${formatNumber(report.errorSummary.averageMSE, 6)} V²`, margin, yPos);
  yPos += 6;
  doc.text(`平均均方根误差 (RMSE): ${formatNumber(report.errorSummary.averageRMSE, 6)} V`, margin, yPos);
  yPos += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('二、数据分类统计', margin, yPos);
  yPos += 8;

  const categoryData = [
    ['未处理数据', report.rawData.length, '原始导入，尚未处理'],
    ['已修正数据', report.correctedData.length, '人工修正完成'],
    ['需人工确认', report.needsReview.length, '存在异常或错误警告'],
  ];

  autoTable(doc, {
    startY: yPos,
    head: [['类别', '数量', '说明']],
    body: categoryData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [66, 153, 225] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  if (yPos > 250) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('三、误差分布', margin, yPos);
  yPos += 8;

  const errorDistData = Object.entries(report.errorSummary.errorDistribution).map(
    ([range, count]) => [range, count, `${((count / report.totalStudents) * 100).toFixed(1)}%`]
  );

  autoTable(doc, {
    startY: yPos,
    head: [['最大相对误差范围', '人数', '占比']],
    body: errorDistData,
    theme: 'grid',
    styles: { fontSize: 10 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  if (yPos > 250) {
    doc.addPage();
    yPos = margin;
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('四、警告类型统计', margin, yPos);
  yPos += 8;

  const warningTypeLabels: Record<string, string> = {
    unit_mismatch: '单位混用',
    time_constant_error: '时间常数异常',
    nonzero_initial: '初始电压非零',
    out_of_range: '参数超出范围',
    data_anomaly: '数据点异常',
  };

  const warningData = Object.entries(report.errorSummary.warningCounts).map(
    ([type, count]) => [warningTypeLabels[type] || type, count]
  );

  if (warningData.length > 0) {
    autoTable(doc, {
      startY: yPos,
      head: [['警告类型', '出现次数']],
      body: warningData,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [249, 115, 22] },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;
  }

  const exportStudentTable = (
    title: string,
    students: StudentData[],
    startY: number
  ): number => {
    if (students.length === 0) return startY;

    if (startY > 200) {
      doc.addPage();
      startY = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(title, margin, startY);
    startY += 8;

    const tableData = students.map(s => [
      s.studentId,
      s.studentName,
      s.source,
      s.corrections.length,
      s.errorAnalysis ? formatNumber(s.errorAnalysis.rmse, 4) : '-',
      formatDateTime(s.importedAt),
    ]);

    autoTable(doc, {
      startY,
      head: [['学号', '姓名', '数据来源', '修正次数', 'RMSE (V)', '导入时间']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [107, 114, 128] },
    });

    return (doc as any).lastAutoTable.finalY + 10;
  };

  yPos = exportStudentTable('五、未处理数据明细', report.rawData, yPos);
  yPos = exportStudentTable('六、已修正数据明细', report.correctedData, yPos);
  yPos = exportStudentTable('七、需人工确认数据明细', report.needsReview, yPos);

  if (report.needsReview.length > 0) {
    doc.addPage();
    yPos = margin;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('八、需人工确认数据警告详情', margin, yPos);
    yPos += 8;

    for (const student of report.needsReview) {
      if (yPos > 250) {
        doc.addPage();
        yPos = margin;
      }
      if (student.warnings.length > 0) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${student.studentId} - ${student.studentName}:`, margin, yPos);
        yPos += 6;
        for (const warning of student.warnings) {
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          doc.text(`  • [${warning.severity === 'error' ? '错误' : '警告'}] ${warning.message}`, margin + 4, yPos);
          yPos += 5;
          if (warning.suggestion) {
            doc.text(`    建议: ${warning.suggestion}`, margin + 4, yPos);
            yPos += 5;
          }
        }
        yPos += 4;
      }
    }
  }

  doc.save(`RC实验报告_${report.experimentName}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportReportToCSV(report: ReportData): void {
  const rows: Array<Record<string, any>> = [];

  rows.push({ '=== 报告摘要 ===': '' });
  rows.push({ '实验名称': report.experimentName });
  rows.push({ '生成时间': formatDateTime(report.generatedAt) });
  rows.push({ '学生总数': report.totalStudents });
  rows.push({ '平均MSE': formatNumber(report.errorSummary.averageMSE, 6) });
  rows.push({ '平均RMSE': formatNumber(report.errorSummary.averageRMSE, 6) });
  rows.push({});

  rows.push({ '=== 数据分类 ===': '' });
  rows.push({ '类别': '未处理', '数量': report.rawData.length });
  rows.push({ '类别': '已修正', '数量': report.correctedData.length });
  rows.push({ '类别': '需人工确认', '数量': report.needsReview.length });
  rows.push({});

  rows.push({ '=== 学生数据明细 ===': '' });
  rows.push({
    '学号': '学号',
    '姓名': '姓名',
    '状态': '状态',
    '数据来源': '数据来源',
    '修正次数': '修正次数',
    'MSE': 'MSE',
    'RMSE': 'RMSE',
    'MAE': 'MAE',
    '相关系数': '相关系数',
    '警告数': '警告数',
  });

  const statusLabels: Record<string, string> = {
    raw: '未处理',
    processed: '已处理',
    corrected: '已修正',
    needs_review: '需人工确认',
  };

  const allStudents = [...report.rawData, ...report.correctedData, ...report.needsReview];
  for (const student of allStudents) {
    rows.push({
      '学号': student.studentId,
      '姓名': student.studentName,
      '状态': statusLabels[student.status] || student.status,
      '数据来源': student.source,
      '修正次数': student.corrections.length,
      'MSE': student.errorAnalysis ? formatNumber(student.errorAnalysis.mse, 6) : '',
      'RMSE': student.errorAnalysis ? formatNumber(student.errorAnalysis.rmse, 6) : '',
      'MAE': student.errorAnalysis ? formatNumber(student.errorAnalysis.mae, 6) : '',
      '相关系数': student.errorAnalysis ? formatNumber(student.errorAnalysis.correlation, 4) : '',
      '警告数': student.warnings.length,
    });
  }

  const csv = Papa.unparse(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `RC实验报告_${report.experimentName}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportStudentDataToCSV(student: StudentData): void {
  const rows: Array<Record<string, any>> = [];
  
  rows.push({ '学号': student.studentId, '姓名': student.studentName });
  rows.push({ '数据来源': student.source, '状态': student.status });
  rows.push({ '修正次数': student.corrections.length, '导入时间': formatDateTime(student.importedAt) });
  rows.push({});

  if (student.errorAnalysis) {
    rows.push({ '=== 误差分析 ===': '' });
    rows.push({ 'MSE': formatNumber(student.errorAnalysis.mse, 6) });
    rows.push({ 'RMSE': formatNumber(student.errorAnalysis.rmse, 6) });
    rows.push({ 'MAE': formatNumber(student.errorAnalysis.mae, 6) });
    rows.push({ '最大误差': formatNumber(student.errorAnalysis.maxError, 6) });
    rows.push({ '相关系数': formatNumber(student.errorAnalysis.correlation, 4) });
    rows.push({});
  }

  if (student.corrections.length > 0) {
    rows.push({ '=== 修正历史 ===': '' });
    rows.push({ '版本': '版本', '字段': '字段', '原值': '原值', '新值': '新值', '原因': '原因', '操作人': '操作人', '时间': '时间' });
    for (const corr of student.corrections) {
      rows.push({
        '版本': corr.version,
        '字段': corr.field,
        '原值': JSON.stringify(corr.oldValue),
        '新值': JSON.stringify(corr.newValue),
        '原因': corr.reason,
        '操作人': corr.operator,
        '时间': formatDateTime(corr.timestamp),
      });
    }
    rows.push({});
  }

  if (student.warnings.length > 0) {
    rows.push({ '=== 警告信息 ===': '' });
    rows.push({ '类型': '类型', '级别': '级别', '消息': '消息', '建议': '建议' });
    for (const w of student.warnings) {
      rows.push({
        '类型': w.type,
        '级别': w.severity,
        '消息': w.message,
        '建议': w.suggestion || '',
      });
    }
    rows.push({});
  }

  rows.push({ '=== 实验数据 ===': '' });
  rows.push({ '序号': '序号', '时间(s)': '时间(s)', '电压(V)': '电压(V)', '电流(A)': '电流(A)', '数据来源': '数据来源' });
  student.dataPoints.forEach((p, i) => {
    rows.push({
      '序号': i + 1,
      '时间(s)': formatNumber(p.time, 4),
      '电压(V)': formatNumber(p.voltage, 4),
      '电流(A)': p.current ? formatNumber(p.current, 6) : '',
      '数据来源': p.source,
    });
  });

  const csv = Papa.unparse(rows);
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${student.studentId}_${student.studentName}_RC实验数据.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function parseStudentCSV(file: File): Promise<Array<{
  studentId: string;
  studentName: string;
  experimentId: string;
  source: string;
  dataPoints: Array<{ time: number; voltage: number; current?: number; source: 'student' }>;
  paramsSnapshot: any;
}>> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const data = results.data as Array<Record<string, string>>;
          const parsed: Array<{
            studentId: string;
            studentName: string;
            experimentId: string;
            source: string;
            dataPoints: Array<{ time: number; voltage: number; current?: number; source: 'student' }>;
            paramsSnapshot: any;
          }> = [];

          let currentStudent: any = null;
          let inDataSection = false;

          for (const row of data) {
            const keys = Object.keys(row);
            const firstKey = keys[0];
            const firstValue = row[firstKey];

            if (firstValue === '=== 实验数据 ===' || firstKey?.includes('序号') && firstKey?.includes('时间')) {
              inDataSection = true;
              continue;
            }

            if (inDataSection && firstValue && !isNaN(Number(firstValue))) {
              if (currentStudent) {
                const time = parseFloat(row['时间(s)'] || row['time'] || row['Time'] || '0');
                const voltage = parseFloat(row['电压(V)'] || row['voltage'] || row['Voltage'] || '0');
                const currentStr = row['电流(A)'] || row['current'] || row['Current'];
                const current = currentStr ? parseFloat(currentStr) : undefined;

                if (!isNaN(time) && !isNaN(voltage)) {
                  currentStudent.dataPoints.push({
                    time,
                    voltage,
                    current: isNaN(current!) ? undefined : current,
                    source: 'student' as const,
                  });
                }
              }
            } else if (!inDataSection) {
              if (firstKey?.includes('学号') || firstKey?.includes('studentId') || firstKey?.includes('Student ID')) {
                if (currentStudent && currentStudent.dataPoints.length > 0) {
                  parsed.push(currentStudent);
                }
                currentStudent = {
                  studentId: firstValue || row[firstKey] || '',
                  studentName: '',
                  experimentId: 'EXP-' + Date.now(),
                  source: file.name,
                  dataPoints: [],
                  paramsSnapshot: null,
                };
              } else if (firstKey?.includes('姓名') || firstKey?.includes('studentName') || firstKey?.includes('Name')) {
                if (currentStudent) {
                  currentStudent.studentName = firstValue || row[firstKey] || '';
                }
              }
            }
          }

          if (currentStudent && currentStudent.dataPoints.length > 0) {
            parsed.push(currentStudent);
          }

          if (parsed.length === 0 && data.length > 0) {
            const simpleParse: any = {
              studentId: file.name.replace(/\.[^/.]+$/, ''),
              studentName: '未知学生',
              experimentId: 'EXP-' + Date.now(),
              source: file.name,
              dataPoints: [],
              paramsSnapshot: null,
            };

            for (const row of data) {
              const values = Object.values(row);
              if (values.length >= 2) {
                const time = parseFloat(values[0]);
                const voltage = parseFloat(values[1]);
                const current = values.length >= 3 ? parseFloat(values[2]) : undefined;

                if (!isNaN(time) && !isNaN(voltage)) {
                  simpleParse.dataPoints.push({
                    time,
                    voltage,
                    current: isNaN(current!) ? undefined : current,
                    source: 'student' as const,
                  });
                }
              }
            }

            if (simpleParse.dataPoints.length > 0) {
              parsed.push(simpleParse);
            }
          }

          resolve(parsed);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => reject(error),
    });
  });
}

export function generateReportData(
  studentData: any[],
  params: any,
  result: any,
  classification: any,
  warningStats: any
): any {
  const allProcessed = studentData.filter(s => s.errorAnalysis);
  const avgMse = allProcessed.length > 0
    ? allProcessed.reduce((sum, s) => sum + (s.errorAnalysis?.mse || 0), 0) / allProcessed.length
    : 0;
  const avgRmse = allProcessed.length > 0
    ? allProcessed.reduce((sum, s) => sum + (s.errorAnalysis?.rmse || 0), 0) / allProcessed.length
    : 0;
  const avgMae = allProcessed.length > 0
    ? allProcessed.reduce((sum, s) => sum + (s.errorAnalysis?.mae || 0), 0) / allProcessed.length
    : 0;
  const avgCorrelation = allProcessed.length > 0
    ? allProcessed.reduce((sum, s) => sum + (s.errorAnalysis?.correlation || 0), 0) / allProcessed.length
    : 0;

  return {
    id: `report-${Date.now()}`,
    title: 'RC充放电实验分析报告',
    generatedAt: new Date().toISOString(),
    experimentName: params.name || '未命名实验',
    studentCount: studentData.length,
    params: {
      resistance: params.resistance,
      resistanceUnit: params.resistanceUnit,
      capacitance: params.capacitance,
      capacitanceUnit: params.capacitanceUnit,
      sourceVoltage: params.sourceVoltage,
      voltageUnit: params.voltageUnit,
      initialVoltage: params.initialVoltage,
      timeConstant: result?.timeConstant || 0,
      samplePoints: params.samplePoints,
    },
    summary: {
      totalStudents: studentData.length,
      untreatedCount: classification.untreated?.length || 0,
      correctedCount: classification.corrected?.length || 0,
      needsReviewCount: classification.needsReview?.length || 0,
      avgMse,
      avgRmse,
      avgMae,
      avgCorrelation,
      timeConstant: result?.timeConstant || 0,
      warningCount: warningStats.total || 0,
    },
    classification: {
      untreated: classification.untreated || [],
      corrected: classification.corrected || [],
      needsReview: classification.needsReview || [],
    },
    rawData: classification.rawData || classification.untreated || [],
    correctedData: classification.correctedData || classification.corrected || [],
    needsReview: classification.needsReview || [],
    errorSummary: {
      averageMSE: avgMse,
      averageRMSE: avgRmse,
      errorDistribution: {},
      warningCounts: warningStats.typeStats || {},
    },
    totalStudents: studentData.length,
  };
}
