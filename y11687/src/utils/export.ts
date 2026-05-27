import { FlightReport, FlightRoute, CollisionResult, FuelResult, Violation } from '../types';
import { formatFlightTime } from '../engine/fuelCalculator';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateReport = (
  route: FlightRoute,
  collisionResult: CollisionResult | null,
  fuelResult: FuelResult | null,
  hasAlternate: boolean
): FlightReport => {
  const recommendations: string[] = [];
  let overallStatus: 'safe' | 'warning' | 'danger' = 'safe';

  if (collisionResult?.hasCollision) {
    const hasDanger = collisionResult.violations.some(v => v.severity === 'danger');
    overallStatus = hasDanger ? 'danger' : 'warning';

    collisionResult.violations.forEach((v: Violation) => {
      if (v.type === 'storm') {
        recommendations.push(`气象规避：建议调整航线绕开「${v.message}」`);
      } else {
        recommendations.push(`空域合规：${v.message}`);
      }
    });
  }

  if (fuelResult?.isOverLimit) {
    overallStatus = 'danger';
    recommendations.push('燃油超限：燃油需求超过飞机容量，请调整航线或更换飞机');
  } else if (fuelResult && (fuelResult.totalFuel / fuelResult.fuelCapacity) > 0.8) {
    if (overallStatus === 'safe') overallStatus = 'warning';
    recommendations.push('燃油预警：燃油使用量较高，建议增加备降机场');
  }

  if (!hasAlternate) {
    if (overallStatus === 'safe') overallStatus = 'warning';
    recommendations.push('运行安全：未选择备降机场，建议至少选择一个备降场');
  }

  if (recommendations.length === 0) {
    recommendations.push('航线规划符合安全要求，可以执行飞行任务');
  }

  return {
    id: generateId(),
    routeId: route.id,
    createdAt: new Date().toISOString(),
    route: JSON.parse(JSON.stringify(route)),
    collisionResult: collisionResult || { hasCollision: false, violations: [] },
    fuelResult: fuelResult || {
      totalDistance: 0,
      totalFuel: 0,
      flightTime: 0,
      fuelCapacity: 0,
      isOverLimit: false,
      reserveFuel: 0,
      fuelPerSegment: [],
      distancePerSegment: [],
    },
    hasAlternate,
    recommendations,
    overallStatus,
  };
};

export const exportToJSON = (report: FlightReport) => {
  const dataStr = JSON.stringify(report, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `flight-report-${report.route.name}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToPDF = async (report: FlightReport) => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  let y = margin;

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('航空航线规划飞行报告', margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${new Date(report.createdAt).toLocaleString('zh-CN')}`, margin, y);
  y += 8;
  doc.text(`航线名称: ${report.route.name}`, margin, y);
  y += 8;
  doc.text(`机型: ${report.route.aircraftType}`, margin, y);
  y += 8;
  doc.text(`巡航高度: ${report.route.cruiseAlt} 米`, margin, y);
  y += 12;

  const statusColors: Record<string, [number, number, number]> = {
    safe: [16, 185, 129],
    warning: [245, 158, 11],
    danger: [220, 38, 38],
  };
  const statusTexts: Record<string, string> = {
    safe: '安全',
    warning: '警告',
    danger: '危险',
  };

  doc.setFillColor(...statusColors[report.overallStatus]);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 12, 3, 3, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(`总体评估: ${statusTexts[report.overallStatus]}`, margin + 5, y + 8);
  doc.setTextColor(0, 0, 0);
  y += 20;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('一、航线信息', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  report.route.waypoints.forEach((wp, i) => {
    doc.text(
      `${i + 1}. ${wp.name} (${wp.iataCode || 'WPT'}) - ${wp.lat.toFixed(4)}°N, ${wp.lng.toFixed(4)}°E`,
      margin + 5,
      y
    );
    y += 6;
  });
  y += 4;

  if (report.fuelResult && report.fuelResult.totalDistance > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('二、燃油与性能', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`总飞行距离: ${report.fuelResult.totalDistance.toFixed(0)} 公里`, margin + 5, y);
    y += 6;
    doc.text(`预计飞行时间: ${formatFlightTime(report.fuelResult.flightTime)}`, margin + 5, y);
    y += 6;
    doc.text(`燃油需求: ${report.fuelResult.totalFuel.toFixed(2)} 吨`, margin + 5, y);
    y += 6;
    doc.text(`油箱容量: ${report.fuelResult.fuelCapacity} 吨`, margin + 5, y);
    y += 6;
    doc.text(`储备燃油: ${report.fuelResult.reserveFuel.toFixed(2)} 吨`, margin + 5, y);
    y += 6;
    doc.text(
      `燃油状态: ${report.fuelResult.isOverLimit ? '超限' : '正常'}`,
      margin + 5,
      y
    );
    y += 12;
  }

  if (report.collisionResult.violations.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('三、违规警告', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    report.collisionResult.violations.forEach((v, i) => {
      const severity = v.severity === 'danger' ? '危险' : '警告';
      doc.text(`${i + 1}. [${severity}] ${v.message}`, margin + 5, y);
      y += 6;
    });
    y += 8;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('四、建议与说明', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  report.recommendations.forEach((rec, i) => {
    doc.text(`${i + 1}. ${rec}`, margin + 5, y);
    y += 6;
    if (y > 270) {
      doc.addPage();
      y = margin;
    }
  });

  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('本报告由航空航线规划系统自动生成，仅供科普教学使用', margin, y);

  doc.save(`flight-report-${report.route.name}-${new Date().toISOString().slice(0, 10)}.pdf`);
};
