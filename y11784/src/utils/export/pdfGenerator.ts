import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type {
  VectorField,
  Path,
  IntegrationResult,
  Anomaly,
  RevisionEntry,
  ExportConfig,
} from '@/types';
import { getMethodLabel } from '../math/numericalIntegration';
import { getAnomalyTypeLabel, getSeverityLabel } from '../math/anomalyDetection';

export async function generatePdfReport(
  elementId: string,
  vectorField: VectorField | null,
  paths: Path[],
  results: IntegrationResult[],
  anomalies: Anomaly[],
  revisions: RevisionEntry[],
  config: ExportConfig,
  title: string = '曲线积分路径比较报告'
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let yPosition = margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(title, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(
    `生成时间: ${new Date().toLocaleString('zh-CN')}`,
    pageWidth / 2,
    yPosition,
    { align: 'center' }
  );
  yPosition += 15;

  const element = document.getElementById(elementId);
  if (element) {
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 2 * margin;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const maxImgHeight = pageHeight - yPosition - margin;

      if (imgHeight > maxImgHeight) {
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yPosition,
          imgWidth,
          maxImgHeight
        );
        yPosition = margin;
        pdf.addPage();
        const remainingHeight = imgHeight - maxImgHeight;
        pdf.addImage(
          imgData,
          'PNG',
          margin,
          yPosition - (maxImgHeight * imgWidth) / canvas.width,
          imgWidth,
          imgHeight
        );
        yPosition += remainingHeight + 10;
      } else {
        pdf.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
      }
    } catch {
      pdf.setFontSize(10);
      pdf.text('(图表截图失败，跳过图表)', margin, yPosition);
      yPosition += 8;
    }
  }

  if (yPosition > pageHeight - margin - 20) {
    pdf.addPage();
    yPosition = margin;
  }

  if (config.includeVectorField && vectorField) {
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('向量场信息', margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const vfLines = [
      `名称: ${vectorField.name}`,
      `来源: ${vectorField.source || '手动输入'}`,
      `X 分量: ${vectorField.expressionX}`,
      `Y 分量: ${vectorField.expressionY}`,
      `范围: X: [${vectorField.range.minX}, ${vectorField.range.maxX}], Y: [${vectorField.range.minY}, ${vectorField.range.maxY}]`,
    ];
    vfLines.forEach((line) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }
      pdf.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }

  if (config.includePaths && paths.length > 0) {
    if (yPosition > pageHeight - margin - 20) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('路径列表', margin, yPosition);
    yPosition += 8;

    paths.forEach((path) => {
      if (yPosition > pageHeight - margin - 30) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text(path.name, margin, yPosition);
      yPosition += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const pathLines = [
        `ID: ${path.id}`,
        `来源: ${path.source || '手动输入'}`,
        path.studentRemark ? `学生备注: ${path.studentRemark}` : null,
        `节点: ${path.nodes.map((n) => `(${n.x.toFixed(2)}, ${n.y.toFixed(2)})`).join(' → ')}`,
      ].filter(Boolean) as string[];

      pathLines.forEach((line) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        const splitLines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
        splitLines.forEach((splitLine) => {
          pdf.text(splitLine, margin, yPosition);
          yPosition += 5;
        });
      });
      yPosition += 3;
    });
  }

  if (config.includeResults && results.length > 0) {
    if (yPosition > pageHeight - margin - 40) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('积分结果对比', margin, yPosition);
    yPosition += 8;

    const colWidths = [35, 25, 20, 25, 25, 20, 20];
    const headers = ['路径名称', '方法', '步长', '积分值', '误差', '时间(ms)', '异常'];

    pdf.setFontSize(9);
    let xPos = margin;
    headers.forEach((header, idx) => {
      pdf.setFont('helvetica', 'bold');
      pdf.text(header, xPos, yPosition);
      xPos += colWidths[idx];
    });
    yPosition += 6;

    pdf.setDrawColor(200);
    pdf.line(margin, yPosition - 2, pageWidth - margin, yPosition - 2);

    results.forEach((result) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      const path = paths.find((p) => p.id === result.pathId);
      const row = [
        path?.name || '未知',
        getMethodLabel(result.method),
        result.stepSize.toFixed(3),
        result.value.toFixed(4),
        result.errorEstimate.toExponential(1),
        result.computationTime.toFixed(1),
        result.hasAnomalies ? '是' : '否',
      ];

      pdf.setFont('helvetica', 'normal');
      xPos = margin;
      row.forEach((cell, idx) => {
        const splitCells = pdf.splitTextToSize(cell, colWidths[idx] - 2);
        splitCells.forEach((splitCell) => {
          pdf.text(splitCell, xPos, yPosition);
          yPosition += 5;
        });
        xPos += colWidths[idx];
      });
      yPosition += 2;
    });
  }

  if (config.includeAnomalies && anomalies.length > 0) {
    if (yPosition > pageHeight - margin - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('异常检测报告', margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    anomalies.forEach((a) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      const path = paths.find((p) => p.id === results.find((r) => r.id === a.resultId)?.pathId);
      const pos =
        a.positionX !== undefined && a.positionY !== undefined
          ? ` (${a.positionX.toFixed(2)}, ${a.positionY.toFixed(2)})`
          : '';

      const prefix = a.severity === 'error' ? '[错误]' : '[警告]';
      const line = `${prefix} ${getAnomalyTypeLabel(a.type)} - ${path?.name || '未知'}${pos}: ${a.description}`;
      const splitLines = pdf.splitTextToSize(line, pageWidth - 2 * margin);
      splitLines.forEach((splitLine) => {
        if (yPosition > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
        }
        pdf.setTextColor(a.severity === 'error' ? 239 : 245, a.severity === 'error' ? 68 : 158, a.severity === 'error' ? 68 : 11);
        pdf.text(splitLine, margin, yPosition);
        yPosition += 5;
      });
      pdf.setTextColor(0);
    });
  }

  if (config.includeRevisionHistory && revisions.length > 0) {
    if (yPosition > pageHeight - margin - 30) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text('修订历史', margin, yPosition);
    yPosition += 8;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);

    revisions.forEach((rev) => {
      if (yPosition > pageHeight - margin) {
        pdf.addPage();
        yPosition = margin;
      }

      const typeLabel =
        rev.targetType === 'vectorField' ? '向量场' : rev.targetType === 'path' ? '路径' : '配置';
      const actionLabel =
        rev.action === 'create'
          ? '创建'
          : rev.action === 'update'
          ? '更新'
          : rev.action === 'delete'
          ? '删除'
          : '导入';

      const line = `${new Date(rev.timestamp).toLocaleString('zh-CN')} - ${actionLabel} ${typeLabel}`;
      pdf.text(line, margin, yPosition);
      yPosition += 5;

      if (rev.correctionNote) {
        const noteLines = pdf.splitTextToSize(
          `  修正: ${rev.correctionNote}`,
          pageWidth - 2 * margin
        );
        noteLines.forEach((noteLine) => {
          if (yPosition > pageHeight - margin) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(noteLine, margin, yPosition);
          yPosition += 5;
        });
      }
    });
  }

  const filename = `${title}_${Date.now()}.pdf`;
  pdf.save(filename);
}

export async function downloadScreenshot(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) return;

  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
