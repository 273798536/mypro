import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  FundHolding,
  IndustryClassification,
  RiskBudget,
  ConstraintCheckResult,
  AuditRecord,
  Report,
  Portfolio,
  RiskScore,
} from '@/types'
import { INDUSTRIES, SAMPLE_PORTFOLIOS, generateId } from '@/data/samples'
import { runConstraintChecks } from '@/utils/constraintCheck'
import { calculateRiskScore } from '@/utils/riskCalculation'

interface PortfolioState {
  portfolio: Portfolio
  holdings: FundHolding[]
  riskBudget: RiskBudget
  industries: IndustryClassification[]
  constraintChecks: ConstraintCheckResult[]
  auditRecords: AuditRecord[]
  reports: Report[]
  currentRiskScore: RiskScore | null
}

interface PortfolioActions {
  loadSample: (sampleId: string) => void
  updateHolding: (id: string, updates: Partial<FundHolding>, reason?: string) => void
  addHolding: (holding: Omit<FundHolding, 'id' | 'portfolioId'>) => void
  removeHolding: (id: string, reason?: string) => void
  updateRiskBudget: (updates: Partial<RiskBudget>, reason?: string) => void
  runChecks: () => ConstraintCheckResult
  addAuditRecord: (record: Omit<AuditRecord, 'id' | 'createdAt'>) => void
  generateReport: () => Report
  reset: () => void
}

const initialPortfolio: Portfolio = {
  id: generateId(),
  name: '新建组合',
  description: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const initialRiskBudget: RiskBudget = {
  id: generateId(),
  portfolioId: initialPortfolio.id,
  volatilityLimit: 15,
  drawdownLimit: 10,
  industryConcentration: 25,
}

const initialState: PortfolioState = {
  portfolio: initialPortfolio,
  holdings: [],
  riskBudget: initialRiskBudget,
  industries: INDUSTRIES,
  constraintChecks: [],
  auditRecords: [],
  reports: [],
  currentRiskScore: null,
}

export const usePortfolioStore = create<PortfolioState & PortfolioActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      loadSample: (sampleId: string) => {
        const sample = SAMPLE_PORTFOLIOS.find((s) => s.id === sampleId)
        if (!sample) return

        const newPortfolioId = generateId()
        const newPortfolio: Portfolio = {
          id: newPortfolioId,
          name: sample.name,
          description: sample.description,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        const newHoldings: FundHolding[] = sample.holdings.map((h) => ({
          ...h,
          id: generateId(),
          portfolioId: newPortfolioId,
        }))

        const newRiskBudget: RiskBudget = {
          ...sample.riskBudget,
          id: generateId(),
          portfolioId: newPortfolioId,
        }

        set({
          portfolio: newPortfolio,
          holdings: newHoldings,
          riskBudget: newRiskBudget,
          constraintChecks: [],
          auditRecords: [],
          reports: [],
          currentRiskScore: null,
        })

        get().addAuditRecord({
          portfolioId: newPortfolioId,
          operation: '导入样例',
          field: '组合',
          oldValue: '',
          newValue: sample.name,
          reason: '从样例库导入',
          constraintCheckId: '',
        })
      },

      updateHolding: (id: string, updates: Partial<FundHolding>, reason = '手动编辑') => {
        const { holdings, addAuditRecord } = get()
        const holding = holdings.find((h) => h.id === id)
        if (!holding) return

        const updatedHoldings = holdings.map((h) =>
          h.id === id ? { ...h, ...updates } : h
        )

        set({ holdings: updatedHoldings })

        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = String(holding[key as keyof FundHolding] ?? '')
          if (oldValue !== String(value)) {
            addAuditRecord({
              portfolioId: holding.portfolioId,
              operation: '编辑持仓',
              field: key,
              oldValue,
              newValue: String(value),
              reason,
              constraintCheckId: '',
            })
          }
        })
      },

      addHolding: (holding: Omit<FundHolding, 'id' | 'portfolioId'>) => {
        const { portfolio, addAuditRecord } = get()
        const newHolding: FundHolding = {
          ...holding,
          id: generateId(),
          portfolioId: portfolio.id,
        }

        set((state) => ({ holdings: [...state.holdings, newHolding] }))

        addAuditRecord({
          portfolioId: portfolio.id,
          operation: '新增持仓',
          field: '持仓',
          oldValue: '',
          newValue: `${holding.fundName} (${holding.weight}%)`,
          reason: '手动添加',
          constraintCheckId: '',
        })
      },

      removeHolding: (id: string, reason = '手动删除') => {
        const { holdings, addAuditRecord, portfolio } = get()
        const holding = holdings.find((h) => h.id === id)
        if (!holding) return

        set((state) => ({
          holdings: state.holdings.filter((h) => h.id !== id),
        }))

        addAuditRecord({
          portfolioId: portfolio.id,
          operation: '删除持仓',
          field: '持仓',
          oldValue: `${holding.fundName} (${holding.weight}%)`,
          newValue: '',
          reason,
          constraintCheckId: '',
        })
      },

      updateRiskBudget: (updates: Partial<RiskBudget>, reason = '手动调整') => {
        const { riskBudget, addAuditRecord, portfolio } = get()

        Object.entries(updates).forEach(([key, value]) => {
          const oldValue = String(riskBudget[key as keyof RiskBudget] ?? '')
          if (oldValue !== String(value)) {
            addAuditRecord({
              portfolioId: portfolio.id,
              operation: '调整风险预算',
              field: key,
              oldValue,
              newValue: String(value),
              reason,
              constraintCheckId: '',
            })
          }
        })

        set({ riskBudget: { ...riskBudget, ...updates } })
      },

      runChecks: () => {
        const { holdings, industries, riskBudget, addAuditRecord, portfolio } = get()
        const result = runConstraintChecks(holdings, industries, riskBudget)
        const riskScore = calculateRiskScore(holdings, industries, riskBudget)

        set((state) => ({
          constraintChecks: [...state.constraintChecks, result],
          currentRiskScore: riskScore,
        }))

        addAuditRecord({
          portfolioId: portfolio.id,
          operation: '约束检查',
          field: '检查结果',
          oldValue: '',
          newValue: result.weightCheck.passed && result.industryCheck.passed && result.prohibitedCheck.passed ? '通过' : '未通过',
          reason: '运行约束检查',
          constraintCheckId: result.id,
        })

        return result
      },

      addAuditRecord: (record: Omit<AuditRecord, 'id' | 'createdAt'>) => {
        const newRecord: AuditRecord = {
          ...record,
          id: generateId(),
          createdAt: new Date().toISOString(),
        }
        set((state) => ({
          auditRecords: [newRecord, ...state.auditRecords],
        }))
      },

      generateReport: () => {
        const { portfolio, holdings, riskBudget, constraintChecks, currentRiskScore } = get()
        const report: Report = {
          id: generateId(),
          portfolioId: portfolio.id,
          version: `v${get().reports.length + 1}`,
          generatedAt: new Date().toISOString(),
          constraintChecks,
          riskScore: currentRiskScore || calculateRiskScore(holdings, INDUSTRIES, riskBudget),
          holdings,
          riskBudget,
        }

        set((state) => ({ reports: [...state.reports, report] }))
        return report
      },

      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'portfolio-risk-budget-storage',
    }
  )
)
