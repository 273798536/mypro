import jsPDF from 'jspdf';
import { useStore } from '../store/useStore';

export async function exportReport() {
  const state = useStore.getState();
  const { events, probes, shelves, fans, products, selection } = state;

  const doc = new jsPDF();
  let yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('冷库温场巡检报告', 105, yPos, { align: 'center' });
  yPos += 15;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`生成时间: ${new Date().toLocaleString('zh-CN')}`, 14, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('一、异常事件汇总', 14, yPos);
  yPos += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  events.forEach((event, idx) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${idx + 1}. [${event.severity === 'critical' ? '严重' : event.severity === 'warning' ? '警告' : '提示'}] ${event.description}`, 14, yPos);
    yPos += 5;
    doc.text(`   时间: ${event.timestamp}`, 18, yPos);
    yPos += 5;
    doc.text(`   位置: ${event.location}`, 18, yPos);
    yPos += 5;
    doc.text(`   触发源: ${event.triggerSource}`, 18, yPos);
    yPos += 5;
    doc.text(`   处理建议: ${event.nextAction}`, 18, yPos);
    yPos += 8;
  });

  doc.addPage();
  yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('二、温度探头状态', 14, yPos);
  yPos += 10;

  doc.setFontSize(9);
  const headers = ['探头编号', '状态', '当前温度', '安装货架', '上次校准'];
  const colWidths = [35, 20, 25, 35, 30];
  let xPos = 14;

  doc.setFont('helvetica', 'bold');
  headers.forEach((header, i) => {
    doc.text(header, xPos, yPos);
    xPos += colWidths[i];
  });
  yPos += 6;

  doc.setFont('helvetica', 'normal');
  probes.forEach((probe) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    xPos = 14;
    const shelf = shelves.find((s) => s.id === probe.shelfId);
    doc.text(probe.name, xPos, yPos);
    xPos += colWidths[0];
    doc.text(probe.status === 'online' ? '在线' : probe.status === 'offline' ? '离线' : '告警', xPos, yPos);
    xPos += colWidths[1];
    doc.text(`${probe.currentTemp.toFixed(1)}°C`, xPos, yPos);
    xPos += colWidths[2];
    doc.text(shelf?.name || '-', xPos, yPos);
    xPos += colWidths[3];
    doc.text(probe.lastCalibration, xPos, yPos);
    yPos += 6;
  });

  doc.addPage();
  yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('三、货架与探头对应关系', 14, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  shelves.forEach((shelf) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    const shelfProbes = probes.filter((p) => p.shelfId === shelf.id);
    doc.text(`${shelf.name}:`, 14, yPos);
    yPos += 5;
    shelfProbes.forEach((probe) => {
      doc.text(`  - ${probe.name} (位置: ${probe.position.join(', ')})`, 18, yPos);
      yPos += 5;
    });
    yPos += 3;
  });

  doc.addPage();
  yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('四、风机状态', 14, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  fans.forEach((fan) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.text(`${fan.name}:`, 14, yPos);
    yPos += 5;
    doc.text(`  状态: ${fan.status === 'running' ? '运行中' : fan.status === 'stopped' ? '已停止' : '异常'}`, 18, yPos);
    yPos += 5;
    doc.text(`  转速: ${fan.speed}%`, 18, yPos);
    yPos += 5;
    doc.text(`  位置: (${fan.position.join(', ')})`, 18, yPos);
    yPos += 8;
  });

  doc.addPage();
  yPos = 20;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('五、货品批次信息', 14, yPos);
  yPos += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  products.forEach((product) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    const shelf = shelves.find((s) => s.id === product.shelfId);
    doc.text(`${product.name}:`, 14, yPos);
    yPos += 5;
    doc.text(`  存放货架: ${shelf?.name || '-'}`, 18, yPos);
    yPos += 5;
    doc.text(`  温敏等级: ${product.temperatureSensitivity === 'high' ? '高敏感' : product.temperatureSensitivity === 'medium' ? '中敏感' : '低敏感'}`, 18, yPos);
    yPos += 5;
    doc.text(`  入库时间: ${product.storageTime}`, 18, yPos);
    yPos += 5;
    if (product.isBlocking) {
      doc.setTextColor(255, 0, 0);
      doc.text(`  ⚠ 遮挡告警: 是`, 18, yPos);
      doc.setTextColor(0, 0, 0);
    }
    yPos += 8;
  });

  doc.save(`冷库温场巡检报告_${new Date().toISOString().split('T')[0]}.pdf`);
}
