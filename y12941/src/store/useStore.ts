import { create } from 'zustand';
import type {
  VersionRecord,
  PromptVersion,
  RiskLevel,
  MaterialSource
} from '../../shared/types';
import { conversationApi, statsApi, materialApi, promptApi } from '../utils/api';
import type {
  UIDashboardStats,
  UIConversation,
  UITruncationInfo,
  UIToolCallError,
  UIMaterialBatch
} from '../utils/adapters';

interface ConversationListResult {
  items: UIConversation[];
  total: number;
  page: number;
  pageSize: number;
}

interface ReviewRequest {
  correctedIntent: string;
  reviewRemark: string;
  operator: string;
}

interface AppState {
  dashboardStats: UIDashboardStats | null;
  conversations: ConversationListResult | null;
  selectedConversation: UIConversation | null;
  versions: VersionRecord[];
  batches: UIMaterialBatch[];
  promptVersions: PromptVersion[];
  activePrompt: PromptVersion | null;
  truncationInfos: UITruncationInfo[];
  toolCallErrors: UIToolCallError[];
  
  filters: {
    riskLevel?: RiskLevel;
    sourceType?: MaterialSource;
    batchId?: string;
    hasDrift?: boolean;
    search?: string;
    page: number;
    pageSize: number;
  };
  
  loading: {
    dashboard: boolean;
    conversations: boolean;
    versions: boolean;
    report: boolean;
  };
  
  setFilters: (filters: Partial<AppState['filters']>) => void;
  fetchDashboard: () => Promise<void>;
  fetchConversations: () => Promise<void>;
  fetchVersions: (conversationId: string) => Promise<void>;
  fetchBatches: () => Promise<void>;
  fetchPromptVersions: () => Promise<void>;
  fetchTruncationInfos: () => Promise<void>;
  fetchToolCallErrors: () => Promise<void>;
  selectConversation: (conversation: UIConversation | null) => void;
  reviewConversation: (id: string, data: ReviewRequest) => Promise<any>;
  rollbackVersion: (conversationId: string, versionId: string, operator: string) => Promise<any>;
  generateReport: (data: any) => Promise<any>;
}

export const useStore = create<AppState>((set, get) => ({
  dashboardStats: null,
  conversations: null,
  selectedConversation: null,
  versions: [],
  batches: [],
  promptVersions: [],
  activePrompt: null,
  truncationInfos: [],
  toolCallErrors: [],
  
  filters: {
    page: 1,
    pageSize: 20
  },
  
  loading: {
    dashboard: false,
    conversations: false,
    versions: false,
    report: false
  },
  
  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters }
    }));
  },
  
  fetchDashboard: async () => {
    set({ loading: { ...get().loading, dashboard: true } });
    try {
      const stats = await statsApi.getDashboard();
      set({ dashboardStats: stats });
    } finally {
      set({ loading: { ...get().loading, dashboard: false } });
    }
  },
  
  fetchConversations: async () => {
    set({ loading: { ...get().loading, conversations: true } });
    try {
      const { filters } = get();
      const result = await conversationApi.getConversations(filters);
      set({ conversations: result });
    } finally {
      set({ loading: { ...get().loading, conversations: false } });
    }
  },
  
  fetchVersions: async (conversationId: string) => {
    set({ loading: { ...get().loading, versions: true } });
    try {
      const versions = await conversationApi.getVersions(conversationId);
      set({ versions });
    } finally {
      set({ loading: { ...get().loading, versions: false } });
    }
  },
  
  fetchBatches: async () => {
    const result = await materialApi.getBatches();
    set({ batches: result.items });
  },
  
  fetchPromptVersions: async () => {
    const versions = await promptApi.getAll();
    const active = versions.find(v => v.isActive) || null;
    set({ promptVersions: versions, activePrompt: active });
  },
  
  fetchTruncationInfos: async () => {
    const infos = await conversationApi.getTruncationInfos();
    set({ truncationInfos: infos });
  },
  
  fetchToolCallErrors: async () => {
    const errors = await conversationApi.getToolCallErrors();
    set({ toolCallErrors: errors });
  },
  
  selectConversation: (conversation) => {
    set({ selectedConversation: conversation });
    if (conversation) {
      get().fetchVersions(conversation.id);
    } else {
      set({ versions: [] });
    }
  },
  
  reviewConversation: async (id, data) => {
    const result = await conversationApi.review(id, data);
    await get().fetchConversations();
    await get().fetchDashboard();
    if (get().selectedConversation?.id === id) {
      set({ selectedConversation: result.conversation });
      await get().fetchVersions(id);
    }
    return result;
  },
  
  rollbackVersion: async (conversationId, versionId, operator) => {
    const result = await conversationApi.rollback(conversationId, versionId, operator);
    await get().fetchConversations();
    await get().fetchVersions(conversationId);
    return result;
  },
  
  generateReport: async (data) => {
    set({ loading: { ...get().loading, report: true } });
    try {
      const result = await (await import('../utils/api')).reportApi.generate(data);
      return result;
    } finally {
      set({ loading: { ...get().loading, report: false } });
    }
  }
}));
