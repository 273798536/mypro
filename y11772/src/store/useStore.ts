import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { CashFlowItem, RiskFlag, AuditEntry } from "@/types"
import { MOCK_CASH_FLOW_ITEMS, DEPARTMENTS, CURRENCIES } from "@/data/mockData"
import { detectRisks } from "@/utils/riskDetection"
import { convertCurrency } from "@/utils/currency"

interface CashFlowState {
  items: CashFlowItem[]
  riskFlags: RiskFlag[]
  selectedCurrency: string
  selectedDepartments: string[]
  selectedItemIds: string[]
  hoveredItemId: string | null
  detailPanelOpen: boolean
  lastExportTimestamp: string | null
  auditLog: AuditEntry[]

  setSelectedCurrency: (currency: string) => void
  setSelectedDepartments: (departments: string[]) => void
  toggleDepartment: (deptId: string) => void
  setSelectedItemIds: (ids: string[]) => void
  setHoveredItemId: (id: string | null) => void
  setDetailPanelOpen: (open: boolean) => void
  recordExport: () => void
  applyCorrection: (itemId: string, field: string, oldValue: string | number | null, newValue: string | number | null, reason: string, operator: string) => void

  getFilteredItems: () => CashFlowItem[]
  getConvertedItems: () => CashFlowItem[]
  getRiskFlagsForItem: (itemId: string) => RiskFlag[]
  getRisksByType: () => Record<string, RiskFlag[]>
}

export const useStore = create<CashFlowState>()(
  persist(
    (set, get) => ({
      items: MOCK_CASH_FLOW_ITEMS,
      riskFlags: detectRisks(MOCK_CASH_FLOW_ITEMS),
      selectedCurrency: "CNY",
      selectedDepartments: DEPARTMENTS.map((d) => d.id),
      selectedItemIds: [],
      hoveredItemId: null,
      detailPanelOpen: false,
      lastExportTimestamp: null,
      auditLog: [],

      setSelectedCurrency: (currency) => set({ selectedCurrency: currency }),

      setSelectedDepartments: (departments) => set({ selectedDepartments: departments }),

      toggleDepartment: (deptId) =>
        set((state) => {
          const current = state.selectedDepartments
          const next = current.includes(deptId)
            ? current.filter((d) => d !== deptId)
            : [...current, deptId]
          return { selectedDepartments: next }
        }),

      setSelectedItemIds: (ids) => set({ selectedItemIds: ids, detailPanelOpen: ids.length > 0 }),

      setHoveredItemId: (id) => set({ hoveredItemId: id }),

      setDetailPanelOpen: (open) => set({ detailPanelOpen: open }),

      recordExport: () => set({ lastExportTimestamp: new Date().toISOString() }),

      applyCorrection: (itemId, field, oldValue, newValue, reason, operator) =>
        set((state) => {
          const entry: AuditEntry = {
            id: `audit-${Date.now()}`,
            itemId,
            timestamp: new Date().toISOString(),
            field,
            oldValue,
            newValue,
            reason,
            operator,
          }
          const updatedItems = state.items.map((item) => {
            if (item.id !== itemId) return item
            const updated = { ...item, auditTrail: [...item.auditTrail, entry] }
            if (field === "amount") updated.amount = Number(newValue) || item.amount
            if (field === "dueDate") updated.dueDate = String(newValue)
            if (field === "confidence") updated.confidence = Number(newValue) || item.confidence
            return updated
          })
          return {
            items: updatedItems,
            riskFlags: detectRisks(updatedItems),
            auditLog: [entry, ...state.auditLog],
          }
        }),

      getFilteredItems: () => {
        const { items, selectedDepartments } = get()
        return items.filter((item) => selectedDepartments.includes(item.department))
      },

      getConvertedItems: () => {
        const { getFilteredItems, selectedCurrency } = get()
        const filtered = getFilteredItems()
        return filtered.map((item) => {
          if (item.currency === selectedCurrency) return item
          const converted = convertCurrency(item.amount, item.currency, selectedCurrency)
          return {
            ...item,
            amount: converted ?? item.amount,
            currency: selectedCurrency,
            isCurrencyConverted: true,
          }
        })
      },

      getRiskFlagsForItem: (itemId) => {
        const { riskFlags } = get()
        return riskFlags.filter((f) => f.itemId === itemId)
      },

      getRisksByType: () => {
        const { riskFlags } = get()
        const grouped: Record<string, RiskFlag[]> = {
          date_misalignment: [],
          currency_unconverted: [],
          low_confidence: [],
        }
        riskFlags.forEach((f) => {
          if (!grouped[f.type]) grouped[f.type] = []
          grouped[f.type].push(f)
        })
        return grouped
      },
    }),
    {
      name: "cashflow-ridge-storage",
      partialize: (state) => ({
        items: state.items,
        auditLog: state.auditLog,
        selectedCurrency: state.selectedCurrency,
        selectedDepartments: state.selectedDepartments,
        lastExportTimestamp: state.lastExportTimestamp,
      }),
    }
  )
)
