import { Complaint } from './types';

export function validateComplaintConsistency(complaint: Complaint): string[] {
  const issues: string[] = [];
  
  const lastLog = complaint.historyLogs[complaint.historyLogs.length - 1];
  if (lastLog && lastLog.afterStatus && lastLog.afterStatus !== complaint.status) {
    issues.push(`状态不一致: 当前状态为"${complaint.status}"，但最后一条历史记录状态为"${lastLog.afterStatus}"`);
  }
  
  complaint.meetingNotes.forEach(note => {
    const hasCorrespondingLog = complaint.historyLogs.some(
      log => log.action === '补录会议纪要' && 
             new Date(log.timestamp).getTime() >= new Date(note.createdAt).getTime() - 5000
    );
    if (!hasCorrespondingLog) {
      issues.push(`会议纪要"${note.content.substring(0, 20)}..."缺少对应的历史操作记录`);
    }
  });
  
  complaint.attachments.forEach(att => {
    if (att.complaintId !== complaint.id) {
      issues.push(`附件"${att.name}"所属投诉ID不匹配`);
    }
  });
  
  return issues;
}

export function validateAllComplaintsConsistency(complaints: Complaint[]): { valid: boolean; issues: string[] } {
  const allIssues: string[] = [];
  
  complaints.forEach(complaint => {
    const issues = validateComplaintConsistency(complaint);
    issues.forEach(issue => {
      allIssues.push(`[${complaint.street}] ${issue}`);
    });
  });
  
  return {
    valid: allIssues.length === 0,
    issues: allIssues
  };
}

export function fixConsistencyIssues(complaints: Complaint[]): Complaint[] {
  return complaints.map(complaint => {
    const issues = validateComplaintConsistency(complaint);
    if (issues.length === 0) return complaint;
    
    let fixedComplaint = { ...complaint };
    
    const lastLog = complaint.historyLogs[complaint.historyLogs.length - 1];
    if (lastLog && lastLog.afterStatus && lastLog.afterStatus !== complaint.status) {
      fixedComplaint.status = lastLog.afterStatus;
    }
    
    return fixedComplaint;
  });
}
