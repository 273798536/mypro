import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Employee, Station, SchedulePlan, OverflowRecord, Assignment } from '@/types';
import { mockEmployees, mockStations, mockPlans, mockOverflowRecords } from '@/data/mockData';

interface AppState {
  employees: Employee[];
  stations: Station[];
  plans: SchedulePlan[];
  overflowRecords: OverflowRecord[];
  currentPlanId: string | null;
  filters: {
    department: string;
    status: string;
    search: string;
  };

  setEmployees: (employees: Employee[]) => void;
  addEmployee: (employee: Employee) => void;
  updateEmployee: (id: string, employee: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;

  setStations: (stations: Station[]) => void;
  addStation: (station: Station) => void;
  updateStation: (id: string, station: Partial<Station>) => void;
  deleteStation: (id: string) => void;

  addPlan: (plan: SchedulePlan) => void;
  updatePlan: (id: string, plan: Partial<SchedulePlan>) => void;
  setCurrentPlanId: (id: string | null) => void;

  addOverflowRecord: (record: OverflowRecord) => void;
  resolveOverflow: (id: string) => void;

  setFilters: (filters: Partial<AppState['filters']>) => void;

  getFilteredEmployees: () => Employee[];
  getAssignmentsByPlanId: (planId: string) => Assignment[];
  getStationEmployeeCount: (stationId: string, planId: string) => number;
  getFilteredAssignments: (planId: string) => Assignment[];
  getFilteredChartData: (planId: string) => { name: string; assigned: number; capacity: number; isOverflow: boolean }[];
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      employees: mockEmployees,
      stations: mockStations,
      plans: mockPlans,
      overflowRecords: mockOverflowRecords,
      currentPlanId: mockPlans.length > 0 ? mockPlans[0].id : null,
      filters: {
        department: '',
        status: '',
        search: '',
      },

      setEmployees: (employees) => set({ employees }),
      addEmployee: (employee) => set((state) => ({ employees: [...state.employees, employee] })),
      updateEmployee: (id, employee) => set((state) => ({
        employees: state.employees.map((e) => e.id === id ? { ...e, ...employee, updatedAt: new Date().toISOString() } : e),
      })),
      deleteEmployee: (id) => set((state) => ({
        employees: state.employees.filter((e) => e.id !== id),
      })),

      setStations: (stations) => set({ stations }),
      addStation: (station) => set((state) => ({ stations: [...state.stations, station] })),
      updateStation: (id, station) => set((state) => ({
        stations: state.stations.map((s) => s.id === id ? { ...s, ...station } : s),
      })),
      deleteStation: (id) => set((state) => ({
        stations: state.stations.filter((s) => s.id !== id),
      })),

      addPlan: (plan) => set((state) => ({ plans: [...state.plans, plan] })),
      updatePlan: (id, plan) => set((state) => ({
        plans: state.plans.map((p) => p.id === id ? { ...p, ...plan } : p),
      })),
      setCurrentPlanId: (id) => set({ currentPlanId: id }),

      addOverflowRecord: (record) => set((state) => ({
        overflowRecords: [...state.overflowRecords, record],
      })),
      resolveOverflow: (id) => set((state) => ({
        overflowRecords: state.overflowRecords.map((r) => r.id === id ? { ...r, isResolved: true } : r),
      })),

      setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),

      getFilteredEmployees: () => {
        const { employees, filters } = get();
        return employees.filter((e) => {
          if (filters.department && e.department !== filters.department) return false;
          if (filters.status && e.status !== filters.status) return false;
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            return (
              e.name.toLowerCase().includes(searchLower) ||
              e.address.toLowerCase().includes(searchLower) ||
              e.department.toLowerCase().includes(searchLower)
            );
          }
          return true;
        });
      },

      getAssignmentsByPlanId: (planId) => {
        const plan = get().plans.find((p) => p.id === planId);
        return plan?.assignments || [];
      },

      getStationEmployeeCount: (stationId, planId) => {
        const assignments = get().getAssignmentsByPlanId(planId);
        return assignments.filter((a) => a.stationId === stationId).length;
      },

      getFilteredAssignments: (planId) => {
        const allAssignments = get().getAssignmentsByPlanId(planId);
        const { filters, employees } = get();

        if (!filters.department && !filters.status && !filters.search) {
          return allAssignments;
        }

        const filteredEmpIds = new Set(
          employees
            .filter((e) => {
              if (filters.department && e.department !== filters.department) return false;
              if (filters.status && e.status !== filters.status) return false;
              if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                return (
                  e.name.toLowerCase().includes(searchLower) ||
                  e.address.toLowerCase().includes(searchLower) ||
                  e.department.toLowerCase().includes(searchLower)
                );
              }
              return true;
            })
            .map((e) => e.id)
        );

        return allAssignments.filter((a) => filteredEmpIds.has(a.employeeId));
      },

      getFilteredChartData: (planId) => {
        const { stations, filters, employees } = get();
        const allAssignments = get().getAssignmentsByPlanId(planId);

        let filteredAssignments = allAssignments;
        if (filters.department || filters.status || filters.search) {
          const filteredEmpIds = new Set(
            employees
              .filter((e) => {
                if (filters.department && e.department !== filters.department) return false;
                if (filters.status && e.status !== filters.status) return false;
                if (filters.search) {
                  const searchLower = filters.search.toLowerCase();
                  return (
                    e.name.toLowerCase().includes(searchLower) ||
                    e.address.toLowerCase().includes(searchLower) ||
                    e.department.toLowerCase().includes(searchLower)
                  );
                }
                return true;
              })
              .map((e) => e.id)
          );
          filteredAssignments = allAssignments.filter((a) => filteredEmpIds.has(a.employeeId));
        }

        return stations
          .filter(s => s.status !== 'closed')
          .map(station => {
            const assigned = filteredAssignments.filter(a => a.stationId === station.id).length;
            return {
              name: station.name,
              assigned,
              capacity: station.capacity,
              isOverflow: assigned > station.capacity,
            };
          });
      },
    }),
    {
      name: 'bus-scheduling-storage',
    }
  )
);
