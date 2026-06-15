export type ComplaintStatus = 'pending' | 'processing' | 'for_publication' | 'publicized';
export type MergeStatus = 'none' | 'merged' | 'duplicate' | 'same_street';

export interface Attachment {
  id: string;
  complaintId: string;
  name: string;
  fileHash: string;
  size: number;
  uploadTime: string;
  isDuplicate: boolean;
}

export interface MeetingNote {
  id: string;
  complaintId: string;
  meetingTime: string;
  attendees: string;
  content: string;
  impactDescription: string;
  operator: string;
  createdAt: string;
}

export interface HistoryLog {
  id: string;
  complaintId: string;
  action: string;
  beforeStatus?: ComplaintStatus;
  afterStatus?: ComplaintStatus;
  reason?: string;
  nextStep?: string;
  operator: string;
  timestamp: string;
}

export interface Complaint {
  id: string;
  street: string;
  complainant: string;
  complaintTime: string;
  description: string;
  status: ComplaintStatus;
  mergeStatus: MergeStatus;
  mergedFrom: string[];
  sameStreetGroup?: string;
  attachments: Attachment[];
  meetingNotes: MeetingNote[];
  historyLogs: HistoryLog[];
  createdAt: string;
  updatedAt: string;
}

export interface ComplaintStore {
  complaints: Complaint[];
  selectedComplaintId: string | null;
  searchKeyword: string;
  statusFilter: ComplaintStatus | 'all';
  isLoading: boolean;
  consistencyIssues: string[];
  fetchComplaints: () => void;
  addComplaint: (complaint: Omit<Complaint, 'id' | 'createdAt' | 'updatedAt' | 'attachments' | 'meetingNotes' | 'historyLogs'>) => { success: boolean; duplicate?: Complaint; sameStreet?: Complaint[] };
  updateComplaint: (id: string, updates: Partial<Complaint>) => void;
  deleteComplaint: (id: string) => void;
  addMeetingNote: (complaintId: string, note: Omit<MeetingNote, 'id' | 'createdAt'>) => void;
  addHistoryLog: (complaintId: string, log: Omit<HistoryLog, 'id'>) => void;
  changeStatus: (complaintId: string, newStatus: ComplaintStatus, reason: string, nextStep?: string) => void;
  mergeComplaints: (targetId: string, sourceIds: string[], reason: string) => void;
  markSameStreet: (complaintIds: string[], groupId: string) => void;
  checkDuplicate: (street: string, description: string) => Complaint | null;
  checkSameStreet: (street: string) => Complaint[];
  addAttachment: (complaintId: string, file: File) => Promise<{ success: boolean; isDuplicate: boolean; attachment?: Attachment }>;
  generateMarkdownReport: () => string;
  validateConsistency: () => { valid: boolean; issues: string[] };
  setSearchKeyword: (keyword: string) => void;
  setStatusFilter: (status: ComplaintStatus | 'all') => void;
  setSelectedComplaintId: (id: string | null) => void;
  resetToDefaults: () => void;
}
