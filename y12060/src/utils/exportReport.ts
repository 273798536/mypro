import { GameSession, CollisionRecord, DataConflict } from '../types/game';
import { Forklift } from '../types/forklift';
import { Shelf } from '../types/shelf';
import { formatTime, formatTimeWithMs } from './collision';
import { explainConflictInPlainChinese, getImprovementSuggestions } from './conflictCheck';

export interface ReportData {
  session: GameSession;
  forklift: Forklift | null;
  shelves: Shelf[];
  conflicts: DataConflict[];
}

export function generatePlainLanguageReport(data: ReportData): string {
  const { session, forklift, shelves, conflicts } = data;
  const { score, violations, route, startTime, endTime } = session;
  
  const totalTime = startTime && endTime ? endTime - startTime : 0;
  const actualDrivingTime = totalTime - session.totalPauseDuration;
  
  const shelfCollisions = violations.filter(v => v.type === 'shelf');
  const overheightViolations = violations.filter(v => v.type === 'overheight');
  const blindzoneViolations = violations.filter(v => v.type === 'blindzone');
  
  const grade = getGrade(score.total, score.maxPossible);
  
  let report = `
╔══════════════════════════════════════════════════════════════╗
║              叉车安全培训评估报告                              ║
╠══════════════════════════════════════════════════════════════╣
║  报告编号: ${session.id.padEnd(43)}║
║  生成时间: ${new Date().toLocaleString('zh-CN').padEnd(43)}║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  ━━━━━━━━━━━━ 一、基本信息 ━━━━━━━━━━━━                      ║
║                                                              ║
║  训练模式: ${getModeLabel(session.mode).padEnd(43)}║
║  难度等级: ${getDifficultyLabel(session.difficulty).padEnd(43)}║
║  使用叉车: ${(forklift?.name || '未选择').padEnd(43)}║
║  货架布局: ${getShelfLayoutLabel(session.selectedShelfConfig).padEnd(43)}║
║  训练时长: ${formatTime(actualDrivingTime).padEnd(43)}║
║  暂停时长: ${formatTime(session.totalPauseDuration).padEnd(43)}║
║                                                              ║
║  ━━━━━━━━━━━━ 二、综合评级 ━━━━━━━━━━━━                      ║
║                                                              ║
║  综合评分: ${score.total.toString().padEnd(8)} / ${score.maxPossible.toString().padEnd(8)}    等级: ${grade.label.padEnd(6)}║
║  ${'═'.repeat(Math.round((score.total / score.maxPossible) * 50)).padEnd(50)} ║
║                                                              ║
║  评分详情:                                                  ║
║    ✓ 基础分数: 1000 分                                       ║
║    ${score.timeBonus > 0 ? '+' : ' '} 时间奖励: ${score.timeBonus.toString().padStart(5)} 分                                       ║
║    - 货架碰撞: ${score.collisionPenalties.toString().padStart(5)} 分 (${shelfCollisions.length} 次)                     ║
║    - 超高装载: ${score.overheightPenalties.toString().padStart(5)} 分 (${overheightViolations.length} 次)                     ║
║    - 盲区穿行: ${score.blindzonePenalties.toString().padStart(5)} 分 (${blindzoneViolations.length} 次)                     ║
║    - 超速行驶: ${score.speedPenalties.toString().padStart(5)} 分                                       ║
║                                                              ║
║  ━━━━━━━━━━━━ 三、安全问题分析 ━━━━━━━━━━━━                  ║
║                                                              ║
`;

  if (violations.length === 0) {
    report += `║  🎉 太棒了！本次训练没有发生任何违规行为！                    ║
║     继续保持，安全驾驶是最高效的工作方式。                    ║
║                                                              ║
`;
  } else {
    report += `║  ⚠️  本次训练共发现 ${violations.length} 项违规记录             ║
║                                                              ║
`;
    
    if (shelfCollisions.length > 0) {
      report += `║  📦 货架碰撞问题:                                            ║
║     共发生 ${shelfCollisions.length} 次碰撞，扣 ${score.collisionPenalties} 分                   ║
║                                                              ║
`;
      shelfCollisions.slice(0, 3).forEach((v, i) => {
        const severity = v.severity === 'severe' ? '🔴 严重' : v.severity === 'moderate' ? '🟡 中等' : '🟢 轻微';
        report += `║     ${i + 1}. ${severity}  ${formatTimeWithMs(v.timestamp)}  ${v.objectName.padEnd(20)} ║
║        位置: (${v.position.x.toFixed(1)}, ${v.position.z.toFixed(1)})  速度: ${v.speed.toFixed(1)} km/h           ║
║        ${explainCollision(v).padEnd(54)} ║
║                                                              ║
`;
      });
      if (shelfCollisions.length > 3) {
        report += `║     ... 还有 ${shelfCollisions.length - 3} 次碰撞记录详见完整回放             ║
║                                                              ║
`;
      }
    }

    if (overheightViolations.length > 0) {
      report += `║  📏 超高装载问题:                                            ║
║     共发生 ${overheightViolations.length} 次超高，扣 ${score.overheightPenalties} 分                   ║
║     说明: 货物举升高度超过安全限制，容易刮到顶部管道或灯具    ║
║                                                              ║
`;
    }

    if (blindzoneViolations.length > 0) {
      report += `║  👁️ 盲区穿行问题:                                            ║
║     共发生 ${blindzoneViolations.length} 次盲区长时间穿行，扣 ${score.blindzonePenalties} 分       ║
║     说明: 在视野盲区长时间停留，无法观察周围情况，极易出事    ║
║                                                              ║
`;
    }
  }

  if (conflicts.length > 0) {
    report += `║  ━━━━━━━━━━━━ 四、数据冲突警告 ━━━━━━━━━━━━                  ║
║                                                              ║
║  ⚠️  检测到 ${conflicts.length} 项参数配置冲突，请关注：         ║
║     (注：叉车参数和货架参数由不同人员维护，合并时发现问题)    ║
║                                                              ║
`;
    
    conflicts.forEach((conflict, i) => {
      const icon = conflict.riskLevel === 'danger' ? '🔴' : '🟡';
      report += `║  ${icon} 冲突 ${i + 1}: ${conflict.forkliftParam} vs ${conflict.shelfParam}          ║
║     叉车数据: ${conflict.forkliftValue} (维护人: ${forklift?.maintainer || '未知'})            ║
║     货架数据: ${conflict.shelfValue} (维护人: ${shelves[0]?.maintainer || '未知'})          ║
║                                                              ║
║     人话解释:                                                ║
║     ${explainConflictInPlainChinese(conflict).match(/.{1,48}/g)?.join('\n║     ')} ║
║                                                              ║
`;
    });
  }

  const suggestions = generateSuggestions(data);
  if (suggestions.length > 0) {
    report += `║  ━━━━━━━━━━━━ 五、改进建议 ━━━━━━━━━━━━                      ║
║                                                              ║
`;
    suggestions.forEach((s, i) => {
      report += `║  ${i + 1}. ${s.padEnd(54)} ║
║                                                              ║
`;
    });
  }

  report += `║  ━━━━━━━━━━━━ 六、总结 ━━━━━━━━━━━━                          ║
║                                                              ║
${getSummaryText(grade, violations.length, conflicts.length)}
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

  return report;
}

function getGrade(score: number, max: number): { label: string; color: string } {
  const percentage = (score / max) * 100;
  if (percentage >= 90) return { label: '优秀', color: '#2A9D8F' };
  if (percentage >= 80) return { label: '良好', color: '#457B9D' };
  if (percentage >= 70) return { label: '中等', color: '#FFD700' };
  if (percentage >= 60) return { label: '及格', color: '#FF6B35' };
  return { label: '需改进', color: '#E63946' };
}

function getModeLabel(mode: string): string {
  const labels: Record<string, string> = {
    training: '基础训练',
    exam: '考核模式',
    free: '自由练习'
  };
  return labels[mode] || mode;
}

function getDifficultyLabel(difficulty: string): string {
  const labels: Record<string, string> = {
    easy: '简单',
    normal: '普通',
    hard: '困难'
  };
  return labels[difficulty] || difficulty;
}

function getShelfLayoutLabel(layout: string): string {
  const labels: Record<string, string> = {
    basic: '基础布局 (6个货架)',
    narrow: '窄通道布局 (6个货架)',
    complex: '复杂布局 (10个货架)'
  };
  return labels[layout] || layout;
}

function explainCollision(violation: CollisionRecord): string {
  const speed = violation.speed;
  
  if (speed < 3) {
    return '速度很慢，应该是操作不够精准，建议多练习距离感';
  } else if (speed < 8) {
    return '中速行驶时发生碰撞，注意观察左右距离';
  } else {
    return '速度过快！遇到情况来不及反应，这是最危险的';
  }
}

function generateSuggestions(data: ReportData): string[] {
  const { session, conflicts } = data;
  const { violations } = session;
  const suggestions: string[] = [];
  
  const shelfCollisions = violations.filter(v => v.type === 'shelf');
  const overheightViolations = violations.filter(v => v.type === 'overheight');
  const blindzoneViolations = violations.filter(v => v.type === 'blindzone');
  
  if (shelfCollisions.length >= 3) {
    suggestions.push('货架碰撞次数过多，建议先在空旷区域练习直线行驶和转弯');
  } else if (shelfCollisions.length > 0) {
    suggestions.push('注意观察叉车两侧与货架的距离，预留足够的安全空间');
  }
  
  if (overheightViolations.length > 0) {
    suggestions.push('举升货物前先观察周围环境，确认上方无障碍物');
    suggestions.push('养成"一看、二慢、三通过"的操作习惯');
  }
  
  if (blindzoneViolations.length > 0) {
    suggestions.push('尽量绕开盲区行驶，如必须通过请鸣笛并减速');
    suggestions.push('建议在仓库盲区安装广角镜，消除视线死角');
  }
  
  const highSpeedCollisions = shelfCollisions.filter(v => v.speed > 8);
  if (highSpeedCollisions.length > 0) {
    suggestions.push('⚠️ 多次高速碰撞！这是严重的安全隐患，请务必控制行驶速度');
  }
  
  const configSuggestions = getImprovementSuggestions(conflicts);
  suggestions.push(...configSuggestions.slice(0, 3));
  
  if (violations.length === 0) {
    suggestions.push('保持良好的安全驾驶习惯，为其他同事树立榜样');
    suggestions.push('可以尝试更高难度的训练，进一步提升驾驶技能');
  }
  
  return suggestions.slice(0, 6);
}

function getSummaryText(grade: { label: string; color: string }, violationCount: number, conflictCount: number): string {
  if (grade.label === '优秀' && violationCount === 0 && conflictCount === 0) {
    return `║  ✅ 本次训练表现优秀！安全意识强，操作规范。                    ║
║     请继续保持，安全是仓库运营的生命线。                        ║`;
  }
  
  if (conflictCount > 0) {
    return `║  ⚠️  本次训练发现 ${violationCount} 项违规和 ${conflictCount} 项配置冲突。        ║
║     请优先解决配置冲突问题，这会从根本上降低安全风险。          ║
║     个人操作方面也需要加强练习，特别是转弯和盲区判断。          ║`;
  }
  
  if (violationCount > 5) {
    return `║  ❌ 本次训练违规次数较多（${violationCount}次），安全意识有待加强。            ║
║     建议重新观看安全培训视频，在基础模式多加练习后再参加考核。  ║`;
  }
  
  return `║  📋 本次训练已完成，发现 ${violationCount} 项需要改进的地方。              ║
║     安全无小事，每次训练都是提升技能的机会。请对照改进建议加    ║
║     强练习，争取下次取得更好的成绩。                              ║`;
}

export function exportReportAsText(data: ReportData): string {
  return generatePlainLanguageReport(data);
}

export function downloadReport(data: ReportData, filename: string = '叉车安全培训报告.txt'): void {
  const report = generatePlainLanguageReport(data);
  const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportReportAsPDF(data: ReportData, filename: string = '叉车安全培训报告.pdf'): Promise<void> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');
    
    const reportElement = document.createElement('div');
    reportElement.innerHTML = `
      <div style="padding: 40px; font-family: 'Microsoft YaHei', sans-serif; background: #f5f5f5; min-width: 800px;">
        <h1 style="color: #1A1A2E; border-bottom: 3px solid #FF6B35; padding-bottom: 10px;">
          叉车安全培训评估报告
        </h1>
        <p style="color: #666; margin-top: 5px;">
          报告编号: ${data.session.id} | 生成时间: ${new Date().toLocaleString('zh-CN')}
        </p>
        <div style="margin-top: 30px; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 14px; line-height: 1.6; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          ${generatePlainLanguageReport(data).replace(/║/g, '').replace(/╔/g, '').replace(/╗/g, '').replace(/╠/g, '').replace(/╣/g, '').replace(/╚/g, '').replace(/╝/g, '').replace(/═/g, '─')}
        </div>
      </div>
    `;
    
    document.body.appendChild(reportElement);
    
    const canvas = await html2canvas(reportElement, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    document.body.removeChild(reportElement);
    
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(filename);
  } catch (error) {
    console.error('PDF导出失败，降级为TXT导出:', error);
    downloadReport(data, filename.replace('.pdf', '.txt'));
  }
}
