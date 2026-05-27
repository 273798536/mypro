import type { GameRecord } from '../game/types';
import { FAIL_REASON_MESSAGES, DIFFICULTY_LABELS } from '../game/config';
import { formatTime } from './math';

export const generateReportContent = (record: GameRecord): string => {
  const date = new Date(record.timestamp);
  const dateStr = date.toLocaleString('zh-CN');
  
  const difficulty = record.levelId <= 2 ? 'easy' : record.levelId <= 5 ? 'medium' : 'hard';
  
  let content = '';
  content += '╔══════════════════════════════════════════════════════════════╗\n';
  content += '║              电磁迷宫逃脱 - 逃脱报告                          ║\n';
  content += '╚══════════════════════════════════════════════════════════════╝\n\n';
  
  content += '【基本信息】\n';
  content += `  报告编号: ${record.id}\n`;
  content += `  生成时间: ${dateStr}\n\n`;
  
  content += '【关卡信息】\n';
  content += `  关卡名称: ${record.levelName}\n`;
  content += `  关卡难度: ${DIFFICULTY_LABELS[difficulty]}\n`;
  content += `  关卡编号: #${record.levelId}\n\n`;
  
  content += '【游戏结果】\n';
  content += `  通关状态: ${record.success ? '✓ 成功逃脱' : '✗ 逃脱失败'}\n`;
  if (record.failReason) {
    content += `  失败原因: ${FAIL_REASON_MESSAGES[record.failReason]}\n`;
  }
  content += `  最终得分: ${record.score} 分\n`;
  content += `  获得星级: ${'★'.repeat(record.stars)}${'☆'.repeat(3 - record.stars)}\n\n`;
  
  content += '【详细数据】\n';
  content += `  完成用时: ${formatTime(record.duration)}\n`;
  content += `  消耗能量: ${Math.round(record.energyUsed)}\n`;
  content += `  放置电荷: ${record.chargesPlaced} 个\n`;
  content += `  最大电场: ${Math.round(record.maxFieldStrength)}\n\n`;
  
  content += '【电荷配置】\n';
  if (record.charges.length === 0) {
    content += '  未放置任何电荷\n';
  } else {
    record.charges.forEach((charge, index) => {
      const type = charge.magnitude > 0 ? '正电荷(+)' : '负电荷(-)';
      content += `  ${index + 1}. ${type} 强度:${charge.strength} 位置:(${Math.round(charge.position.x)}, ${Math.round(charge.position.y)})\n`;
    });
  }
  content += '\n';
  
  content += '【评分说明】\n';
  content += '  得分 = 时间得分(40%) + 能量得分(30%) + 效率得分(30%)\n';
  content += '  ★☆☆: 0-59分  |  ★★☆: 60-79分  |  ★★★: 80-100分\n\n';
  
  content += '【物理原理】\n';
  content += '  本游戏基于库仑定律模拟电荷间的相互作用：\n';
  content += '  F = k * q1 * q2 / r²\n';
  content += '  同种电荷相互排斥，异种电荷相互吸引\n\n';
  
  content += '═══════════════════════════════════════════════════════════════\n';
  content += '  电磁迷宫逃脱 | 物理兴趣小组专用\n';
  content += '═══════════════════════════════════════════════════════════════\n';
  
  return content;
};

export const exportAsText = (record: GameRecord): void => {
  const content = generateReportContent(record);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const date = new Date(record.timestamp);
  const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
  link.download = `电磁迷宫报告_${record.levelName}_${dateStr}.txt`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

export const exportAsJSON = (record: GameRecord): void => {
  const content = JSON.stringify(record, null, 2);
  const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  const date = new Date(record.timestamp);
  const dateStr = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2,'0')}${date.getDate().toString().padStart(2,'0')}`;
  link.download = `电磁迷宫数据_${record.levelName}_${dateStr}.json`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};

export const exportAllRecordsAsCSV = (): void => {
  const { loadGameRecords } = require('../game/recorder');
  const records = loadGameRecords();
  
  if (records.length === 0) {
    alert('没有可导出的记录');
    return;
  }
  
  const headers = ['编号','关卡名称','难度','状态','得分','星级','用时(s)','能量消耗','电荷数','最大电场','失败原因','时间'];
  const rows = records.map((r, i) => {
    const difficulty = r.levelId <= 2 ? '简单' : r.levelId <= 5 ? '中等' : '困难';
    return [
      i + 1,
      r.levelName,
      difficulty,
      r.success ? '成功' : '失败',
      r.score,
      r.stars,
      r.duration.toFixed(2),
      Math.round(r.energyUsed),
      r.chargesPlaced,
      Math.round(r.maxFieldStrength),
      r.failReason ? FAIL_REASON_MESSAGES[r.failReason] : '',
      new Date(r.timestamp).toLocaleString('zh-CN')
    ].join(',');
  });
  
  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.download = `电磁迷宫全部记录_${new Date().toISOString().slice(0,10)}.csv`;
  link.href = url;
  link.click();
  
  URL.revokeObjectURL(url);
};
