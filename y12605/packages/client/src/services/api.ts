import axios from 'axios';
import { 
  ReviewTask, TaskListItem, Annotation, ReviewNote, ScoreSheet, 
  Conclusion, ValidationError, ExportOptions, ReviewLevel,
  HistoryRecord, ApiResponse 
} from '@puzzle/shared';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export interface TaskDetailResponse {
  task: ReviewTask & { canUndo: boolean; canRedo: boolean; usability: string };
  validationErrors: ValidationError[];
}

export const taskApi = {
  getTasks: async (): Promise<TaskListItem[]> => {
    const res = await api.get<ApiResponse<TaskListItem[]>>('/tasks');
    return res.data.data || [];
  },

  getLevels: async (): Promise<ReviewLevel[]> => {
    const res = await api.get<ApiResponse<ReviewLevel[]>>('/tasks/levels');
    return res.data.data || [];
  },

  getTask: async (id: string): Promise<TaskDetailResponse> => {
    const res = await api.get<ApiResponse<ReviewTask & { canUndo: boolean; canRedo: boolean; usability: string }>>(`/tasks/${id}`);
    return {
      task: res.data.data!,
      validationErrors: res.data.validationErrors || []
    };
  },

  getTaskHistory: async (id: string): Promise<HistoryRecord[]> => {
    const res = await api.get<ApiResponse<HistoryRecord[]>>(`/tasks/${id}/history`);
    return res.data.data || [];
  },

  createTask: async (data: { title: string; description?: string; levelId?: string }): Promise<ReviewTask> => {
    const res = await api.post<ApiResponse<ReviewTask>>('/tasks', data);
    return res.data.data!;
  },

  addAnnotation: async (taskId: string, data: Partial<Annotation>): Promise<{ task: ReviewTask; newAnnotation: Annotation; validationErrors?: ValidationError[] }> => {
    const res = await api.post<ApiResponse<{ task: ReviewTask; newAnnotation: Annotation }>>(`/tasks/${taskId}/annotations`, data);
    return {
      task: res.data.data!.task,
      newAnnotation: res.data.data!.newAnnotation,
      validationErrors: res.data.validationErrors
    };
  },

  updateAnnotation: async (taskId: string, annotationId: string, data: Partial<Annotation>): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/annotations/${annotationId}`, data);
    return res.data.data!;
  },

  deleteAnnotation: async (taskId: string, annotationId: string): Promise<ReviewTask> => {
    const res = await api.delete<ApiResponse<ReviewTask>>(`/tasks/${taskId}/annotations/${annotationId}`);
    return res.data.data!;
  },

  updateLayer: async (taskId: string, layerId: string, data: Partial<{ visible: boolean; locked: boolean; opacity: number }>): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/layers/${layerId}`, data);
    return res.data.data!;
  },

  addNote: async (taskId: string, data: { content: string; affectsScoreSheet?: boolean; affectsConclusion?: boolean }): Promise<ReviewTask> => {
    const res = await api.post<ApiResponse<ReviewTask>>(`/tasks/${taskId}/notes`, data);
    return res.data.data!;
  },

  updateNote: async (taskId: string, noteId: string, data: Partial<ReviewNote>): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/notes/${noteId}`, data);
    return res.data.data!;
  },

  updateScore: async (taskId: string, data: { items: ScoreSheet['items'] }): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/score`, data);
    return res.data.data!;
  },

  syncScore: async (taskId: string): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/score/sync`);
    return res.data.data!;
  },

  updateConclusion: async (taskId: string, data: Partial<Conclusion>): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/conclusion`, data);
    return res.data.data!;
  },

  syncConclusion: async (taskId: string): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/conclusion/sync`);
    return res.data.data!;
  },

  undo: async (taskId: string): Promise<TaskDetailResponse> => {
    const res = await api.post<ApiResponse<ReviewTask & { canUndo: boolean; canRedo: boolean; usability: string }>>(`/tasks/${taskId}/undo`);
    return {
      task: res.data.data!,
      validationErrors: res.data.validationErrors || []
    };
  },

  redo: async (taskId: string): Promise<TaskDetailResponse> => {
    const res = await api.post<ApiResponse<ReviewTask & { canUndo: boolean; canRedo: boolean; usability: string }>>(`/tasks/${taskId}/redo`);
    return {
      task: res.data.data!,
      validationErrors: res.data.validationErrors || []
    };
  },

  reopen: async (taskId: string): Promise<ReviewTask> => {
    const res = await api.post<ApiResponse<ReviewTask>>(`/tasks/${taskId}/reopen`);
    return res.data.data!;
  },

  complete: async (taskId: string): Promise<ReviewTask> => {
    const res = await api.post<ApiResponse<ReviewTask>>(`/tasks/${taskId}/complete`);
    return res.data.data!;
  },

  updateLevel: async (taskId: string, levelId: string): Promise<ReviewTask> => {
    const res = await api.put<ApiResponse<ReviewTask>>(`/tasks/${taskId}/level`, { levelId });
    return res.data.data!;
  },

  exportTask: async (taskId: string, options: ExportOptions): Promise<void> => {
    const res = await api.post(`/tasks/${taskId}/export`, options, {
      responseType: 'blob'
    });
    
    const disposition = res.headers['content-disposition'];
    let filename = 'export';
    if (disposition) {
      const match = disposition.match(/filename="(.+)"/);
      if (match) filename = match[1];
    }
    
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  validateTask: async (taskId: string): Promise<{ isValid: boolean; usability: string; validationErrors: ValidationError[] }> => {
    const res = await api.get<ApiResponse<{ isValid: boolean; usability: string }>>(`/tasks/${taskId}/validate`);
    return {
      isValid: res.data.data?.isValid || false,
      usability: res.data.data?.usability || 'needs_trainer_review',
      validationErrors: res.data.validationErrors || []
    };
  }
};

export default api;
