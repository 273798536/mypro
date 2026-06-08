import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import type { Inspection, SectionParams, MeasurePoint } from '../../shared/types.js';

export const ReportService = {
  async exportExcel(
    inspection: Inspection,
    params: SectionParams,
    points: MeasurePoint[]
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = '净空检查系统';
    workbook.created = new Date();

    const overviewSheet = workbook.addWorksheet('检查概览');
    overviewSheet.columns = [
      { header: '项目', key: 'label', width: 25 },
      { header: '内容', key: 'value', width: 50 },
    ];
    overviewSheet.getRow(1).font = { bold: true, size: 14 };
    overviewSheet.addRows([
      { label: '项目名称', value: inspection.projectName },
      { label: '车库编号', value: inspection.garageCode },
      { label: '检查范围', value: inspection.scope || '-' },
      { label: '单位', value: inspection.baseUnit },
      { label: '', value: '' },
      { label: '—— 剖面参数 ——', value: '' },
      { label: '梁高 (beamHeight)', value: params.beamHeight },
      { label: '管道直径 (pipeDiameter)', value: params.pipeDiameter },
      { label: '吊顶厚度 (ceilingThickness)', value: params.ceilingThickness },
      { label: '楼板厚度 (slabThickness)', value: params.slabThickness },
      { label: '地面标高 (floorElevation)', value: params.floorElevation },
      { label: '', value: '' },
      { label: '最小净空要求', value: inspection.minClearanceRequired },
      { label: '异常点数', value: points.filter((p) => p.isAbnormal).length },
      { label: '总测量点数', value: points.length },
    ]);
    overviewSheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    overviewSheet.getCell('B1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    const pointsSheet = workbook.addWorksheet('截图清单');
    pointsSheet.columns = [
      { header: '编号', key: 'code', width: 12 },
      { header: 'X坐标', key: 'x', width: 12 },
      { header: 'Y坐标', key: 'y', width: 12 },
      { header: 'Z坐标', key: 'z', width: 12 },
      { header: '测量值', key: 'measuredValue', width: 14 },
      { header: '计算净空', key: 'calculatedClearance', width: 14 },
      { header: '是否异常', key: 'isAbnormal', width: 12 },
      { header: '状态', key: 'status', width: 12 },
      { header: '备注', key: 'remark', width: 25 },
      { header: '处理意见', key: 'handlingOpinion', width: 25 },
    ];
    pointsSheet.getRow(1).font = { bold: true };
    for (const p of points) {
      const row = pointsSheet.addRow({
        code: p.code,
        x: p.coordinate.x,
        y: p.coordinate.y,
        z: p.coordinate.z,
        measuredValue: p.measuredValue,
        calculatedClearance: p.calculatedClearance,
        isAbnormal: p.isAbnormal ? '是' : '否',
        status: p.status,
        remark: p.remark,
        handlingOpinion: p.handlingOpinion,
      });
      if (p.isAbnormal) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFFFE0E0' },
          };
          cell.font = { color: { argb: 'FFFF0000' } };
        });
      }
    }

    const buffer = (await workbook.xlsx.writeBuffer()) as Buffer;
    return buffer;
  },

  exportPDF(
    inspection: Inspection,
    params: SectionParams,
    points: MeasurePoint[]
  ): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));

      doc.fontSize(18).text('地下车库净空检查报告', { align: 'center' });
      doc.moveDown(2);

      doc.fontSize(14).text('一、检查概览', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      const overviewItems = [
        ['项目名称', inspection.projectName],
        ['车库编号', inspection.garageCode],
        ['检查范围', inspection.scope || '-'],
        ['单位', inspection.baseUnit],
        ['最小净空要求', String(inspection.minClearanceRequired)],
        ['异常点数', String(points.filter((p) => p.isAbnormal).length)],
        ['总测量点数', String(points.length)],
      ];
      for (const [label, value] of overviewItems) {
        doc.text(`${label}: ${value}`);
      }
      doc.moveDown();

      doc.fontSize(14).text('二、剖面参数', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11);
      const paramItems = [
        ['梁高', String(params.beamHeight)],
        ['管道直径', String(params.pipeDiameter)],
        ['吊顶厚度', String(params.ceilingThickness)],
        ['楼板厚度', String(params.slabThickness)],
        ['地面标高', String(params.floorElevation)],
      ];
      for (const [label, value] of paramItems) {
        doc.text(`${label}: ${value}`);
      }
      doc.moveDown();

      doc.fontSize(14).text('三、截图清单', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10);

      const tableTop = doc.y;
      const colWidths = [60, 50, 50, 50, 60, 60, 50, 55, 80, 80];
      const headers = ['编号', 'X', 'Y', 'Z', '测量值', '计算净空', '异常', '状态', '备注', '处理意见'];
      let x = 50;
      let y = tableTop;

      doc.font('Helvetica-Bold');
      for (let i = 0; i < headers.length; i++) {
        doc.rect(x, y, colWidths[i], 20).stroke();
        doc.text(headers[i], x + 3, y + 5, { width: colWidths[i] - 6, align: 'center' });
        x += colWidths[i];
      }
      doc.font('Helvetica');
      y += 20;

      for (const p of points) {
        x = 50;
        const rowData = [
          p.code,
          String(p.coordinate.x),
          String(p.coordinate.y),
          String(p.coordinate.z),
          String(p.measuredValue),
          String(p.calculatedClearance),
          p.isAbnormal ? '是' : '否',
          p.status,
          p.remark,
          p.handlingOpinion,
        ];
        const rowHeight = 20;
        if (y + rowHeight > 750) {
          doc.addPage();
          y = 50;
        }
        for (let i = 0; i < rowData.length; i++) {
          doc.rect(x, y, colWidths[i], rowHeight).stroke();
          if (p.isAbnormal && i === 6) {
            doc.fillColor('red');
          }
          doc.text(rowData[i], x + 3, y + 5, { width: colWidths[i] - 6, align: 'center' });
          doc.fillColor('black');
          x += colWidths[i];
        }
        y += rowHeight;
      }

      doc.end();
    });
  },
};
