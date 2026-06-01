import type { ScheduleEntry, Volunteer, Position, Stage, TimeSlot, Conflict, ScheduleStats } from '../types';
import { CONFLICT_TYPE_LABELS } from '../types';

export const exportToCSV = (
  entries: ScheduleEntry[], volunteers: Volunteer[], positions: Position[], stages: Stage[], timeSlots: TimeSlot[]
): Blob => {
  const headers = ['日期', '舞台', '时段', '岗位', '志愿者', '联系方式', '技能', '证件状态', '冲突', '状态'];

  const rows = entries.map(entry => {
    const volunteer = volunteers.find(v => v.id === entry.volunteerId);
    const position = positions.find(p => p.id === entry.positionId);
    const stage = stages.find(s => s.id === entry.stageId);
    const timeSlot = timeSlots.find(t => t.id === entry.timeSlotId);

    return [
      timeSlot?.date || '',
      stage?.name || '',
      timeSlot?.label || '',
      position?.name || '',
      volunteer?.name || '',
      volunteer?.phone || '',
      volunteer?.skills?.join('; ') || '',
      volunteer?.hasCredential ? '已领取' : '未领取',
      entry.conflicts?.map(c => c.message).join('; ') || '',
      entry.status === 'scheduled' ? '已排班' : entry.status === 'swapped' ? '已换班' : '已取消'
    ];
  });

  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  return new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
};

export const exportToJSON = (data: unknown): Blob => {
  const jsonContent = JSON.stringify(data, null, 2);
  return new Blob([jsonContent], { type: 'application/json' });
};

export const exportReport = (
  conflicts: Conflict[], stats: ScheduleStats
): Blob => {
  const conflictByType = Object.entries(stats.conflictByType)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `- ${CONFLICT_TYPE_LABELS[type as keyof typeof CONFLICT_TYPE_LABELS]}: ${count} 项`)
    .join('\n');

  const reportContent = `
音乐节志愿者排班 - 冲突检测报告
================================

生成时间: ${new Date().toLocaleString('zh-CN')}

一、排班统计
------------
- 志愿者总数: ${stats.totalVolunteers} 人
- 已排班人数: ${stats.scheduledVolunteers} 人
- 待分配人数: ${stats.pendingVolunteers} 人
- 岗位完成率: ${((stats.positionsFilled / stats.totalPositions) * 100).toFixed(1)}%

二、冲突统计
------------
总冲突数: ${stats.totalConflicts} 项

${conflictByType || '- 无冲突'}

三、冲突详情
------------
${conflicts.length > 0 ? conflicts.map((c, i) => `
${i + 1}. 【${CONFLICT_TYPE_LABELS[c.type]}】${c.severity === 'error' ? '[严重]' : '[警告]'}
   ${c.message}
   影响排班记录: ${c.affectedEntries.length} 项
`).join('\n') : '暂无冲突记录'}

四、检测口径说明
----------------
1. 餐休冲突：排班时段与志愿者预设餐休时间重叠
2. 证件缺失：志愿者未领取工作证件
3. 岗位缺人：岗位实际分配人数少于需求人数
4. 技能不匹配：志愿者缺少岗位要求的技能
5. 时段重叠：同一志愿者在同一时段被分配到多个岗位
`.trim();

  return new Blob(['\ufeff' + reportContent], { type: 'text/plain;charset=utf-8;' });
};

export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
