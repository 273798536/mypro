import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Project,
  BudgetPlan,
  Expense,
  RevenueForecast,
  Milestone,
  Owner,
  BurnDataPoint,
  Revision
} from '../types';
import { mockProject, mockOwners } from '../data/mockProject';
import { mockBudgetPlans } from '../data/mockBudget';
import { mockExpenses } from '../data/mockExpenses';
import { mockRevenues } from '../data/mockRevenues';
import { mockMilestones } from '../data/mockMilestones';

interface ProjectState {
  project: Project | null;
  budgetPlans: BudgetPlan[];
  expenses: Expense[];
  revenues: RevenueForecast[];
  milestones: Milestone[];
  owners: Owner[];
  burnDataPoints: BurnDataPoint[];
  isLoaded: boolean;
  loadData: () => void;
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt'>) => void;
  updateRevenue: (id: string, updates: Partial<RevenueForecast>) => void;
  addRevision: (itemType: 'expense' | 'revenue', itemId: string, revision: Omit<Revision, 'id' | 'timestamp'>) => void;
  generateBurnData: () => void;
  resetToDefaults: () => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      project: null,
      budgetPlans: [],
      expenses: [],
      revenues: [],
      milestones: [],
      owners: [],
      burnDataPoints: [],
      isLoaded: false,

      loadData: () => {
        set({
          project: mockProject,
          budgetPlans: mockBudgetPlans,
          expenses: mockExpenses,
          revenues: mockRevenues,
          milestones: mockMilestones,
          owners: mockOwners,
          isLoaded: true
        });
        get().generateBurnData();
      },

      addExpense: (expense) => {
        const newExpense: Expense = {
          ...expense,
          id: `exp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          revisionHistory: []
        };
        set((state) => ({
          expenses: [...state.expenses, newExpense]
        }));
        get().generateBurnData();
      },

      updateRevenue: (id, updates) => {
        set((state) => ({
          revenues: state.revenues.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          )
        }));
        get().generateBurnData();
      },

      addRevision: (itemType, itemId, revision) => {
        const newRevision: Revision = {
          ...revision,
          id: `rev-${Date.now()}`,
          timestamp: new Date().toISOString()
        };

        if (itemType === 'expense') {
          set((state) => ({
            expenses: state.expenses.map((e) =>
              e.id === itemId
                ? { ...e, revisionHistory: [...e.revisionHistory, newRevision] }
                : e
            )
          }));
        } else {
          set((state) => ({
            revenues: state.revenues.map((r) =>
              r.id === itemId
                ? { ...r, revisionHistory: [...r.revisionHistory, newRevision] }
                : r
            )
          }));
        }
      },

      generateBurnData: () => {
        const { project, budgetPlans, expenses, revenues } = get();
        if (!project) return;

        const startDate = new Date(project.startDate);
        const endDate = new Date(project.endDate);
        const totalDays = Math.ceil(
          (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysPerPoint = Math.ceil(totalDays / 52);

        const burnPoints: BurnDataPoint[] = [];
        let cumulativeBudget = 0;
        let cumulativeSpent = 0;
        let cumulativeRevenue = 0;

        for (let i = 0; i < 52; i++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + i * daysPerPoint);
          const dateStr = currentDate.toISOString().split('T')[0];
          const timestamp = currentDate.getTime();

          const weekBudget = budgetPlans
            .filter((b) => {
              const bDate = new Date(b.date);
              return (
                bDate >= new Date(startDate.getTime() + i * daysPerPoint * 86400000) &&
                bDate < new Date(startDate.getTime() + (i + 1) * daysPerPoint * 86400000)
              );
            })
            .reduce((sum, b) => sum + b.plannedBudget, 0);

          const weekSpent = expenses
            .filter((e) => {
              const eDate = new Date(e.date);
              return (
                eDate >= new Date(startDate.getTime() + i * daysPerPoint * 86400000) &&
                eDate < new Date(startDate.getTime() + (i + 1) * daysPerPoint * 86400000)
              );
            })
            .reduce((sum, e) => sum + e.amount, 0);

          const weekRevenue = revenues
            .filter((r) => {
              const rDate = new Date(r.date);
              return (
                rDate >= new Date(startDate.getTime() + i * daysPerPoint * 86400000) &&
                rDate < new Date(startDate.getTime() + (i + 1) * daysPerPoint * 86400000)
              );
            })
            .reduce((sum, r) => sum + (r.actualAmount || r.forecastAmount), 0);

          cumulativeBudget += weekBudget;
          cumulativeSpent += weekSpent;
          cumulativeRevenue += weekRevenue;

          burnPoints.push({
            date: dateStr,
            timestamp,
            budget: weekBudget,
            actualSpent: weekSpent,
            forecastRevenue: weekRevenue,
            cumulativeBudget,
            cumulativeSpent,
            cumulativeRevenue,
            risks: []
          });
        }

        set({ burnDataPoints: burnPoints });
      },

      resetToDefaults: () => {
        set({
          project: mockProject,
          budgetPlans: mockBudgetPlans,
          expenses: mockExpenses,
          revenues: mockRevenues,
          milestones: mockMilestones,
          owners: mockOwners,
          isLoaded: true
        });
        get().generateBurnData();
      }
    }),
    {
      name: 'project-storage',
      partialize: (state) => ({
        expenses: state.expenses,
        revenues: state.revenues,
        milestones: state.milestones
      })
    }
  )
);
