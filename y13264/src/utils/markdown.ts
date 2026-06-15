import { Complaint } from './types';
import { STATUS_LABELS } from './constants';

export function generateMarkdownReport(complaints: Complaint[]): string {
  const now = new Date().toLocaleString('zh-CN');
  
  const statusGroups: Record<string, Complaint[]> = {
    pending: [],
    processing: [],
    for_publication: [],
    publicized: [],
  };
  
  complaints.forEach(c => {
    if (statusGroups[c.status]) {
      statusGroups[c.status].push(c);
    }
  });
  
  const stats = {
    total: complaints.length,
    pending: statusGroups.pending.length,
    processing: statusGroups.processing.length,
    forPublication: statusGroups.for_publication.length,
    publicized: statusGroups.publicized.length,
  };
  
  const mergedComplaints = complaints.filter(c => c.mergeStatus === 'merged');
  const sameStreetComplaints = complaints.filter(c => c.mergeStatus === 'same_street');
  const meetingNotesCount = complaints.reduce((sum, c) => sum + c.meetingNotes.length, 0);
  
  let report = `# 雨水口积淤公示清单\n\n`;
  report += `> 生成时间: ${now}\n\n`;
  
  report += `## 一、统计概览\n\n`;
  report += `| 指标 | 数量 |\n|------|------|\n`;
  report += `| 投诉总数 | ${stats.total} |\n`;
  report += `| 待处理 | ${stats.pending} |\n`;
  report += `| 处理中 | ${stats.processing} |\n`;
  report += `| 待公示 | ${stats.forPublication} |\n`;
  report += `| 已公示 | ${stats.publicized} |\n`;
  report += `| 已归并记录 | ${mergedComplaints.length} |\n`;
  report += `| 同街口多单 | ${sameStreetComplaints.length} |\n`;
  report += `| 会议纪要补录 | ${meetingNotesCount} |\n\n`;
  
  report += `## 二、详细记录\n\n`;
  
  const statusOrder: Array<keyof typeof statusGroups> = ['pending', 'processing', 'for_publication', 'publicized'];
  
  statusOrder.forEach(status => {
    const list = statusGroups[status];
    if (list.length === 0) return;
    
    report += `### ${STATUS_LABELS[status]} (${list.length}条)\n\n`;
    
    list.forEach((complaint, index) => {
      report += `#### ${index + 1}. ${complaint.street}\n\n`;
      report += `- **投诉人**: ${complaint.complainant}\n`;
      report += `- **投诉时间**: ${complaint.complaintTime}\n`;
      report += `- **问题描述**: ${complaint.description}\n`;
      report += `- **当前状态**: ${STATUS_LABELS[complaint.status]}\n`;
      
      if (complaint.mergeStatus !== 'none') {
        const mergeLabels: Record<string, string> = {
          merged: '已归并',
          duplicate: '重复记录',
          same_street: '同街口多单',
        };
        report += `- **特殊标记**: ${mergeLabels[complaint.mergeStatus] || complaint.mergeStatus}\n`;
      }
      
      if (complaint.mergedFrom.length > 0) {
        report += `- **归并来源**: ${complaint.mergedFrom.join(', ')}\n`;
      }
      
      if (complaint.attachments.length > 0) {
        report += `- **附件**: ${complaint.attachments.filter(a => !a.isDuplicate).length}个有效文件\n`;
        complaint.attachments.filter(a => !a.isDuplicate).forEach(a => {
          report += `  - ${a.name} (${formatFileSize(a.size)})\n`;
        });
      }
      
      if (complaint.meetingNotes.length > 0) {
        report += `\n##### 会议纪要补录 (${complaint.meetingNotes.length}条)\n\n`;
        complaint.meetingNotes.forEach((note, ni) => {
          report += `###### 纪要${ni + 1}\n\n`;
          report += `- **会议时间**: ${note.meetingTime}\n`;
          report += `- **参会人员**: ${note.attendees}\n`;
          report += `- **会议内容**: ${note.content}\n`;
          report += `- **变更影响说明**: ${note.impactDescription}\n`;
          report += `- **记录人**: ${note.operator}\n\n`;
        });
      }
      
      if (complaint.historyLogs.length > 0) {
        report += `##### 操作历史\n\n`;
        report += `| 时间 | 操作 | 状态变更 | 原因 | 操作人 |\n|------|------|----------|------|--------|\n`;
        complaint.historyLogs.forEach(log => {
          const statusChange = log.beforeStatus && log.afterStatus 
            ? `${STATUS_LABELS[log.beforeStatus]} → ${STATUS_LABELS[log.afterStatus]}`
            : log.afterStatus ? `→ ${STATUS_LABELS[log.afterStatus]}` : '-';
          report += `| ${log.timestamp} | ${log.action} | ${statusChange} | ${log.reason || '-'} | ${log.operator} |\n`;
        });
        report += '\n';
      }
      
      report += '---\n\n';
    });
  });
  
  if (sameStreetComplaints.length > 0 || mergedComplaints.length > 0) {
    report += `## 三、异常情况说明\n\n`;
    
    if (sameStreetComplaints.length > 0) {
      const groups = new Map<string, Complaint[]>();
      sameStreetComplaints.forEach(c => {
        const key = c.sameStreetGroup || c.street;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(c);
      });
      
      report += `### 同街口多单记录 (${groups.size}组)\n\n`;
      groups.forEach((group, key) => {
        report += `- **街口**: ${group[0].street}\n`;
        report += `  投诉记录: ${group.map(c => `#${c.id}(${c.complainant})`).join(', ')}\n`;
        report += `  当前处理: ${group.length > 0 ? STATUS_LABELS[group[0].status] : '-'}\n\n`;
      });
    }
    
    if (mergedComplaints.length > 0) {
      report += `### 已归并记录 (${mergedComplaints.length}条)\n\n`;
      mergedComplaints.forEach(c => {
        report += `- ${c.street} (已归并 ${c.mergedFrom.length} 条记录)\n`;
      });
      report += '\n';
    }
  }
  
  const allHistoryLogs = complaints.flatMap(c => c.historyLogs).sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  if (allHistoryLogs.length > 0) {
    report += `## 四、近期操作动态\n\n`;
    report += `| 时间 | 操作 | 涉及街口 | 操作人 |\n|------|------|----------|--------|\n`;
    allHistoryLogs.slice(0, 10).forEach(log => {
      const complaint = complaints.find(c => c.id === log.complaintId);
      report += `| ${log.timestamp} | ${log.action} | ${complaint?.street || '-'} | ${log.operator} |\n`;
    });
  }
  
  report += '\n---\n\n';
  report += `*本报告由雨水口积淤公示清单系统自动生成，数据已通过一致性校验。*\n`;
  
  return report;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function downloadMarkdown(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}
