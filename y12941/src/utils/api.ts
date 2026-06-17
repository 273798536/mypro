import type {
  Conversation,
  ConversationListResult,
  ConversationQueryOptions,
  VersionRecord,
  ReviewRequest,
  ReviewResponse,
  DashboardStats,
  MaterialBatch,
  PromptVersion,
  ReportRequest,
  ReportResponse,
  TruncationInfo,
  ToolCallError,
  VersionDiff
} from '../../shared/types';
import {
  adaptDashboardStats,
  adaptConversation,
  adaptConversationList,
  adaptTruncationInfo,
  adaptToolCallError,
  adaptVersionRecord,
  adaptMaterialBatch
} from './adapters';
import type {
  UIDashboardStats,
  UIConversation,
  UITruncationInfo,
  UIToolCallError,
  UIMaterialBatch
} from './adapters';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data;
}

export const conversationApi = {
  getConversations: async (options: ConversationQueryOptions = {}): Promise<ConversationListResult & { items: UIConversation[] }> => {
    const params = new URLSearchParams();
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const result = await request<ConversationListResult & { items: Conversation[] }>(`/conversations?${params.toString()}`);
    return {
      ...result,
      items: result.items.map(c => adaptConversation(c, []))
    };
  },

  getConversation: async (id: string): Promise<UIConversation> => {
    const conv = await request<Conversation>(`/conversations/${id}`);
    return adaptConversation(conv, []);
  },

  getVersions: async (conversationId: string): Promise<VersionRecord[]> => {
    const versions = await request<VersionRecord[]>(`/conversations/${conversationId}/versions`);
    return versions.map(v => adaptVersionRecord(v));
  },

  review: async (id: string, data: ReviewRequest): Promise<ReviewResponse & { conversation: UIConversation }> => {
    const result = await request<any>(`/conversations/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({
        correctedIntent: data.correctedIntent,
        changeReason: data.reviewRemark,
        reviewer: data.operator
      })
    });
    return {
      ...result,
      conversation: result.conversation ? adaptConversation(result.conversation, []) : null
    };
  },

  rollback: async (conversationId: string, versionId: string, operator: string): Promise<VersionRecord> => {
    const version = await request<VersionRecord>(`/conversations/${conversationId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ versionId, operator })
    });
    return adaptVersionRecord(version);
  },

  compareVersions: (v1: string, v2: string): Promise<VersionDiff[]> => {
    return request<VersionDiff[]>(`/conversations/versions/compare?v1=${v1}&v2=${v2}`);
  },

  getTruncationInfos: async (): Promise<UITruncationInfo[]> => {
    const infos = await request<TruncationInfo[]>('/conversations/truncations/info');
    return infos.map(i => adaptTruncationInfo(i));
  },

  getToolCallErrors: async (): Promise<UIToolCallError[]> => {
    const errors = await request<ToolCallError[]>('/conversations/tool-errors/info');
    return errors.map(e => adaptToolCallError(e));
  }
};

export const materialApi = {
  getBatches: async (): Promise<{ items: UIMaterialBatch[]; total: number }> => {
    const result = await request<{ items: MaterialBatch[]; total: number }>('/material/batches');
    return {
      items: result.items.map(b => adaptMaterialBatch(b)),
      total: result.total
    };
  },

  getBatch: async (id: string): Promise<UIMaterialBatch> => {
    const batch = await request<MaterialBatch>(`/material/batches/${id}`);
    return adaptMaterialBatch(batch);
  },

  importFile: (file: File, sourceType: string, operator: string): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sourceType', sourceType);
    formData.append('operator', operator);

    return fetch(`${API_BASE}/material/import`, {
      method: 'POST',
      body: formData
    }).then(res => res.json());
  }
};

export const reportApi = {
  generate: (data: ReportRequest & { generatedBy?: string }): Promise<ReportResponse> => {
    return request<ReportResponse>('/report/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  download: (reportId: string): string => {
    return `${API_BASE}/report/download/${reportId}`;
  }
};

export const promptApi = {
  getAll: (): Promise<PromptVersion[]> => {
    return request<PromptVersion[]>('/prompt-versions');
  },

  getActive: (): Promise<PromptVersion> => {
    return request<PromptVersion>('/prompt-versions/active');
  },

  create: (data: Omit<PromptVersion, 'id' | 'createdAt'>): Promise<PromptVersion> => {
    return request<PromptVersion>('/prompt-versions', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  activate: (id: string): Promise<void> => {
    return request<void>(`/prompt-versions/${id}/activate`, {
      method: 'PUT'
    });
  }
};

export const statsApi = {
  getDashboard: async (): Promise<UIDashboardStats> => {
    const [stats, conversations] = await Promise.all([
      request<DashboardStats>('/stats/dashboard'),
      request<{ items: Conversation[] }>('/conversations?pageSize=100').then(r => r.items)
    ]);
    return adaptDashboardStats(stats, conversations);
  }
};
