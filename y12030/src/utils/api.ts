import type {
  VestingSummary,
  VestingDetail,
  Employee,
  VestingPlan,
  Exercise,
  CorrectionHistory,
  CorrectionRequest,
  ExerciseRequest,
  ExerciseApproval,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  getVestingSummaries: (): Promise<VestingSummary[]> =>
    request<VestingSummary[]>('/employees'),

  getEmployee: (id: string): Promise<Employee> =>
    request<Employee>(`/employees/${id}`),

  getVestingDetail: (employeeId: string): Promise<VestingDetail> =>
    request<VestingDetail>(`/vesting/${employeeId}`),

  correctVesting: (
    employeeId: string,
    data: CorrectionRequest,
  ): Promise<{ detail: VestingDetail; correction: CorrectionHistory }> =>
    request<{ detail: VestingDetail; correction: CorrectionHistory }>(
      `/vesting/${employeeId}/correct`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),

  getPlans: (): Promise<VestingPlan[]> => request<VestingPlan[]>('/plans'),

  getPlan: (id: string): Promise<VestingPlan> =>
    request<VestingPlan>(`/plans/${id}`),

  getExercises: (): Promise<Exercise[]> =>
    request<Exercise[]>('/exercises'),

  createExercise: (data: ExerciseRequest): Promise<Exercise> =>
    request<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveExercise: (
    id: string,
    data: ExerciseApproval,
  ): Promise<Exercise> =>
    request<Exercise>(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getHistory: (): Promise<CorrectionHistory[]> =>
    request<CorrectionHistory[]>('/history'),

  downloadCSV: (): void => {
    window.open(`${API_BASE}/export/csv`, '_blank');
  },

  downloadEmployeeCSV: (employeeId: string): void => {
    window.open(`${API_BASE}/export/csv/${employeeId}`, '_blank');
  },
};
