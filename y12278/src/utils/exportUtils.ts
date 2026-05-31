import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { StabilityResult, BallastVersion, ShipModel, CargoGrid, ManualCheckRecord, WeatherEvidence } from '../types';
import { formatConclusion } from './stabilityCalculator';
import { weatherLevelDescriptions } from './mockData';

export async function captureScreenshot(elementId: string): Promise<string> {
  const element = document.getElementById(elementId);
  if (!element) throw new Error('Element not found');

  const canvas = await html2canvas(element, {
    backgroundColor: '#0A1628',
    scale: 2,
    useCORS: true,
  });

  return canvas.toDataURL('image/png');
}

export async function generatePDFReport(
  result: StabilityResult,
  ship: ShipModel,
  grid: CargoGrid,
  ballast: BallastVersion,
  weather: WeatherEvidence,
  manualChecks: ManualCheckRecord[],
  screenshot?: string
): Promise<jsPDF> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('船舶稳性计算报告', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('一、版本对应关系', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const versionData = [
    ['船舶模型ID', ship.id],
    ['货舱格ID', grid.id],
    ['压载水版本', `${ballast.id} (${ballast.version})`],
    ['计算结果ID', result.id],
  ];

  versionData.forEach(([label, value]) => {
    doc.setTextColor(100);
    doc.text(label, 25, yPosition);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 70, yPosition);
    doc.setFont('helvetica', 'normal');
    yPosition += 6;
  });
  yPosition += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('二、船舶信息', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const shipData = [
    ['船名', ship.name],
    ['尺寸', `${ship.length}m × ${ship.width}m × ${ship.depth}m`],
    ['设计吃水', `${ship.draft}m`],
    ['设计排水量', `${ship.displacement}t`],
    ['空船重量', `${ship.lightShipWeight}t`],
    ['模型备注', ship.remark],
  ];

  shipData.forEach(([label, value]) => {
    doc.setTextColor(100);
    doc.text(label, 25, yPosition);
    doc.setTextColor(0);
    doc.text(String(value), 70, yPosition);
    yPosition += 6;
  });
  yPosition += 5;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('三、稳性计算结论', 20, yPosition);
  yPosition += 8;

  const modelConcl = formatConclusion(result.modelConclusion);
  const gridConcl = formatConclusion(result.gridConclusion);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text('船舶模型结论', 25, yPosition);
  doc.setTextColor(modelConcl.color === '#27AE60' ? 39 : modelConcl.color === '#F39C12' ? 200 : 0,
    modelConcl.color === '#27AE60' ? 174 : modelConcl.color === '#F39C12' ? 154 : 0,
    modelConcl.color === '#27AE60' ? 96 : modelConcl.color === '#F39C12' ? 18 : 0);
  doc.setFont('helvetica', 'bold');
  doc.text(modelConcl.text, 70, yPosition);
  yPosition += 6;

  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text('货舱格结论', 25, yPosition);
  doc.setTextColor(gridConcl.color === '#27AE60' ? 39 : gridConcl.color === '#F39C12' ? 200 : 0,
    gridConcl.color === '#27AE60' ? 174 : gridConcl.color === '#F39C12' ? 154 : 0,
    gridConcl.color === '#27AE60' ? 96 : gridConcl.color === '#F39C12' ? 18 : 0);
  doc.setFont('helvetica', 'bold');
  doc.text(gridConcl.text, 70, yPosition);
  yPosition += 6;

  doc.setTextColor(100);
  doc.setFont('helvetica', 'normal');
  doc.text('结论一致性', 25, yPosition);
  doc.setTextColor(result.isConsistent ? 39 : 231, result.isConsistent ? 174 : 76, result.isConsistent ? 96 : 60);
  doc.setFont('helvetica', 'bold');
  doc.text(result.isConsistent ? '一致' : '不一致', 70, yPosition);
  yPosition += 8;

  doc.setFont('helvetica', 'normal');
  const paramData = [
    ['GM值', `${result.GM}m`],
    ['横倾角', `${result.heelAngle}°`],
    ['纵倾角', `${result.trimAngle}°`],
    ['排水量', `${result.displacement}t`],
    ['重心坐标', `(${result.centerOfGravity.x.toFixed(1)}, ${result.centerOfGravity.y.toFixed(1)}, ${result.centerOfGravity.z.toFixed(1)})m`],
    ['重心偏移', `${result.gravityOffset.distance}m (${result.gravityOffset.direction})，允许${result.gravityOffset.allowable}m`],
    ['超载舱位', result.overloadCells.length > 0 ? result.overloadCells.join(', ') : '无'],
  ];

  paramData.forEach(([label, value]) => {
    doc.setTextColor(100);
    doc.text(label, 25, yPosition);
    doc.setTextColor(0);
    doc.text(String(value), 70, yPosition);
    yPosition += 6;
  });
  yPosition += 5;

  if (!result.isConsistent) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(231, 76, 60);
    doc.text('四、天气补充证据', 20, yPosition);
    yPosition += 8;

    const weatherInfo = weatherLevelDescriptions[weather.weatherLevel];
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const weatherData = [
      ['天气等级', `${weather.weatherLevel}级 (${weatherInfo.name})`],
      ['风力', `${weather.windForce}级`],
      ['浪高', `${weather.waveHeight}m`],
      ['稳性影响系数', `×${weather.influenceFactor.toFixed(2)}`],
      ['记录时间', new Date(weather.recordedAt).toLocaleString('zh-CN')],
    ];

    weatherData.forEach(([label, value]) => {
      doc.setTextColor(100);
      doc.text(label, 25, yPosition);
      doc.setTextColor(0);
      doc.text(String(value), 70, yPosition);
      yPosition += 6;
    });
    yPosition += 5;
  }

  if (manualChecks.length > 0) {
    if (yPosition > 200) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('五、人工核对记录', 20, yPosition);
    yPosition += 8;

    manualChecks.forEach((check, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(46, 204, 113);
      doc.text(`记录 ${index + 1}`, 25, yPosition);
      yPosition += 5;

      doc.setFont('helvetica', 'normal');
      const checkItemName = check.checkItem === 'gravityOffset' ? '重心偏移' :
        check.checkItem === 'overload' ? '舱位超载' :
        check.checkItem === 'ballast' ? '压载水' : '结论一致性';

      const checkData = [
        ['核对人员', check.checker],
        ['核对项', checkItemName],
        ['核对结果', check.checkResult === 'confirmed' ? '已确认' : check.checkResult === 'adjusted' ? '已调整' : '已驳回'],
        ['核对说明', check.remark],
        ['数字签名', check.signature],
        ['核对时间', new Date(check.createdAt).toLocaleString('zh-CN')],
      ];

      checkData.forEach(([label, value]) => {
        doc.setTextColor(100);
        doc.text(label, 30, yPosition);
        doc.setTextColor(0);
        doc.text(String(value), 70, yPosition);
        yPosition += 5;
      });
      yPosition += 3;
    });
  }

  if (screenshot) {
    doc.addPage();
    yPosition = 20;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0);
    doc.text('六、3D视图截图', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 10;

    const imgWidth = 170;
    const imgHeight = 120;
    doc.addImage(screenshot, 'PNG', (pageWidth - imgWidth) / 2, yPosition, imgWidth, imgHeight);
  }

  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text('本报告由船舶稳性装载舱系统自动生成，所有数据均有版本记录可追溯。', pageWidth / 2, pageHeight - 15, { align: 'center' });

  return doc;
}

export function downloadPDF(doc: jsPDF, filename: string): void {
  doc.save(filename);
}
