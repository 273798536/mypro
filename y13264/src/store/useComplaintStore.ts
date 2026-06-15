import { create } from 'zustand';
import { Complaint, ComplaintStatus, ComplaintStore, MeetingNote, HistoryLog, Attachment } from '../utils/types';
import { mockComplaints } from '../utils/mockData';
import { calculateSimilarity } from '../utils/similarity';
import { calculateFileHash } from '../utils/hash';
import { generateMarkdownReport } from '../utils/markdown';
import { saveToStorage, loadFromStorage, clearStorage } from '../utils/storage';
import { validateAllComplaintsConsistency } from '../utils/consistency';
import { DUPLICATE_TIME_WINDOW_HOURS, SIMILARITY_THRESHOLD, DEFAULT_OPERATOR } from '../utils/constants';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(date: Date): string {
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).replace(/\//g, '-');
}

export const useComplaintStore = create<ComplaintStore>((set, get) => ({
  complaints: [],
  selectedComplaintId: null,
  searchKeyword: '',
  statusFilter: 'all',
  isLoading: false,
  consistencyIssues: [],

  fetchComplaints: () => {
    set({ isLoading: true });
    const stored = loadFromStorage();
    if (stored && stored.length > 0) {
      const validation = validateAllComplaintsConsistency(stored);
      set({ complaints: stored, consistencyIssues: validation.issues, isLoading: false });
    } else {
      const validation = validateAllComplaintsConsistency(mockComplaints);
      saveToStorage(mockComplaints);
      set({ complaints: mockComplaints, consistencyIssues: validation.issues, isLoading: false });
    }
  },

  addComplaint: (complaintData) => {
    const { complaints, checkDuplicate, checkSameStreet } = get();
    
    const duplicate = checkDuplicate(complaintData.street, complaintData.description);
    if (duplicate) {
      return { success: false, duplicate };
    }
    
    const sameStreet = checkSameStreet(complaintData.street);
    
    const now = new Date();
    const newComplaint: Complaint = {
      ...complaintData,
      id: generateId(),
      attachments: [],
      meetingNotes: [],
      historyLogs: [],
      createdAt: formatDate(now),
      updatedAt: formatDate(now),
    };
    
    newComplaint.historyLogs.push({
      id: generateId(),
      complaintId: newComplaint.id,
      action: '创建投诉',
      afterStatus: newComplaint.status,
      operator: DEFAULT_OPERATOR,
      timestamp: formatDate(now),
    });
    
    const updatedComplaints = [...complaints, newComplaint];
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
    
    return { success: true, sameStreet: sameStreet.length > 0 ? sameStreet : undefined };
  },

  updateComplaint: (id, updates) => {
    const { complaints } = get();
    const updatedComplaints = complaints.map(c => 
      c.id === id ? { ...c, ...updates, updatedAt: formatDate(new Date()) } : c
    );
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  deleteComplaint: (id) => {
    const { complaints } = get();
    const updatedComplaints = complaints.filter(c => c.id !== id);
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  addMeetingNote: (complaintId, noteData) => {
    const { complaints, addHistoryLog } = get();
    const now = new Date();
    
    const newNote: MeetingNote = {
      ...noteData,
      id: generateId(),
      createdAt: formatDate(now),
    };
    
    const updatedComplaints = complaints.map(c => {
      if (c.id === complaintId) {
        return {
          ...c,
          meetingNotes: [...c.meetingNotes, newNote],
          updatedAt: formatDate(now),
        };
      }
      return c;
    });
    
    addHistoryLog(complaintId, {
      complaintId,
      action: '补录会议纪要',
      reason: `补录会议纪要: ${noteData.content.substring(0, 30)}...`,
      operator: noteData.operator,
      timestamp: formatDate(now),
    });
    
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  addHistoryLog: (complaintId, logData) => {
    const { complaints } = get();
    const newLog: HistoryLog = {
      ...logData,
      id: generateId(),
    };
    
    const updatedComplaints = complaints.map(c => {
      if (c.id === complaintId) {
        return {
          ...c,
          historyLogs: [...c.historyLogs, newLog],
          updatedAt: formatDate(new Date()),
        };
      }
      return c;
    });
    
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  changeStatus: (complaintId, newStatus, reason, nextStep) => {
    const { complaints, addHistoryLog } = get();
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return;
    
    const now = new Date();
    
    addHistoryLog(complaintId, {
      complaintId,
      action: '状态变更',
      beforeStatus: complaint.status,
      afterStatus: newStatus,
      reason,
      nextStep,
      operator: DEFAULT_OPERATOR,
      timestamp: formatDate(now),
    });
    
    const updatedComplaints = complaints.map(c => {
      if (c.id === complaintId) {
        return { ...c, status: newStatus, updatedAt: formatDate(now) };
      }
      return c;
    });
    
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  mergeComplaints: (targetId, sourceIds, reason) => {
    const { complaints, addHistoryLog } = get();
    const now = new Date();
    
    const target = complaints.find(c => c.id === targetId);
    const sources = complaints.filter(c => sourceIds.includes(c.id));
    
    if (!target || sources.length === 0) return;
    
    const mergedDescription = sources.reduce(
      (desc, s) => desc + '\n\n' + `【${s.id} ${s.complainant}】${s.description}`,
      target.description
    );
    
    const mergedAttachments = [
      ...target.attachments,
      ...sources.flatMap(s => s.attachments)
    ];
    
    const mergedMeetingNotes = [
      ...target.meetingNotes,
      ...sources.flatMap(s => s.meetingNotes)
    ];
    
    const mergedHistoryLogs = [
      ...target.historyLogs,
      ...sources.flatMap(s => s.historyLogs)
    ];
    
    addHistoryLog(targetId, {
      complaintId: targetId,
      action: '归并记录',
      reason: `${reason}，归并了 ${sourceIds.length} 条记录: ${sourceIds.join(', ')}`,
      operator: DEFAULT_OPERATOR,
      timestamp: formatDate(now),
    });
    
    const updatedComplaints = complaints.map(c => {
      if (c.id === targetId) {
        return {
          ...c,
          description: mergedDescription,
          attachments: mergedAttachments,
          meetingNotes: mergedMeetingNotes,
          historyLogs: [...mergedHistoryLogs, {
            id: generateId(),
            complaintId: targetId,
            action: '归并记录',
            reason: `${reason}，归并了 ${sourceIds.length} 条记录`,
            operator: DEFAULT_OPERATOR,
            timestamp: formatDate(now),
          }],
          mergeStatus: 'merged' as const,
          mergedFrom: [...c.mergedFrom, ...sourceIds],
          updatedAt: formatDate(now),
        };
      }
      if (sourceIds.includes(c.id)) {
        return { ...c, mergeStatus: 'merged' as const, updatedAt: formatDate(now) };
      }
      return c;
    });
    
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  markSameStreet: (complaintIds, groupId) => {
    const { complaints } = get();
    const updatedComplaints = complaints.map(c => {
      if (complaintIds.includes(c.id)) {
        return { ...c, mergeStatus: 'same_street' as const, sameStreetGroup: groupId, updatedAt: formatDate(new Date()) };
      }
      return c;
    });
    saveToStorage(updatedComplaints);
    set({ complaints: updatedComplaints });
  },

  checkDuplicate: (street, description) => {
    const { complaints } = get();
    const now = new Date();
    const timeWindow = DUPLICATE_TIME_WINDOW_HOURS * 60 * 60 * 1000;
    
    return complaints.find(c => {
      const complaintDate = new Date(c.complaintTime).getTime();
      const timeDiff = now.getTime() - complaintDate;
      
      if (timeDiff > timeWindow) return false;
      if (c.street !== street) return false;
      
      const similarity = calculateSimilarity(c.description, description);
      return similarity >= SIMILARITY_THRESHOLD;
    }) || null;
  },

  checkSameStreet: (street) => {
    const { complaints } = get();
    return complaints.filter(c => c.street === street && c.mergeStatus !== 'merged');
  },

  addAttachment: async (complaintId, file) => {
    const { complaints } = get();
    const complaint = complaints.find(c => c.id === complaintId);
    if (!complaint) return { success: false, isDuplicate: false };
    
    const fileHash = await calculateFileHash(file);
    
    const isDuplicate = complaint.attachments.some(a => a.fileHash === fileHash);
    
    const newAttachment: Attachment = {
      id: generateId(),
      complaintId,
      name: file.name,
      fileHash,
      size: file.size,
      uploadTime: formatDate(new Date()),
      isDuplicate,
    };
    
    if (!isDuplicate) {
      const updatedComplaints = complaints.map(c => {
        if (c.id === complaintId) {
          return {
            ...c,
            attachments: [...c.attachments, newAttachment],
            updatedAt: formatDate(new Date()),
          };
        }
        return c;
      });
      saveToStorage(updatedComplaints);
      set({ complaints: updatedComplaints });
    }
    
    return { success: true, isDuplicate, attachment: newAttachment };
  },

  generateMarkdownReport: () => {
    const { complaints } = get();
    return generateMarkdownReport(complaints);
  },

  validateConsistency: () => {
    const { complaints } = get();
    const result = validateAllComplaintsConsistency(complaints);
    set({ consistencyIssues: result.issues });
    return result;
  },

  setSearchKeyword: (keyword) => set({ searchKeyword: keyword }),
  setStatusFilter: (status) => set({ statusFilter: status }),
  setSelectedComplaintId: (id) => set({ selectedComplaintId: id }),

  resetToDefaults: () => {
    clearStorage();
    const validation = validateAllComplaintsConsistency(mockComplaints);
    saveToStorage(mockComplaints);
    set({ 
      complaints: mockComplaints, 
      consistencyIssues: validation.issues,
      searchKeyword: '',
      statusFilter: 'all',
      selectedComplaintId: null,
    });
  },
}));
