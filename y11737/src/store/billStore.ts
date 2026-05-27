import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as XLSX from 'xlsx';
import type { Bill, FilterParams, AuditLog, RiskItem } from '@/types';
import { MOCK_BILLS, LATEST_RATE_VERSION, DISCOUNT_RATES } from '@/data/mockData';
import { assessAllRisks } from '@/services/riskService';
import { calculateDiscountInterest } from '@/services/calculationService';
import dayjs from 'dayjs';

interface BillStore {
  bills: Bill[];
  currentBill: Bill | null;
  filters: FilterParams;
  selectedIds: string[];
  discountRates: typeof DISCOUNT_RATES;
  
  loadBills: () => void;
  setCurrentBill: (id: string | null) => void;
  setFilters: (filters: Partial<FilterParams>) => void;
  resetFilters: () => void;
  updateBill: (id: string, updates: Partial<Bill>, operator: string, reason: string) => void;
  updateBillStatus: (id: string, status: Bill['status'], operator: string, reason: string) => void;
  updateEndorsement: (billId: string, endorsementId: string, updates: Partial<Bill['endorsements'][0]>, operator: string, reason: string) => void;
  recalculateBill: (id: string, operator: string) => void;
  resolveRisk: (billId: string, riskIndex: number, operator: string) => void;
  setSelectedIds: (ids: string[]) => void;
  exportBills: (ids: string[]) => void;
  exportAllBills: () => void;
  importBills: (file: File) => Promise<void>;
  resetToMockData: () => void;
  getFilteredBills: () => Bill[];
}

const STORAGE_KEY = 'supply_chain_bills_v1';

function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

function initializeBillsWithRisks(bills: Bill[]): Bill[] {
  return bills.map(bill => ({
    ...bill,
    risks: assessAllRisks(bill, LATEST_RATE_VERSION),
  }));
}

export const useBillStore = create<BillStore>()(
  persist(
    (set, get) => ({
      bills: initializeBillsWithRisks(MOCK_BILLS),
      currentBill: null,
      filters: {},
      selectedIds: [],
      discountRates: DISCOUNT_RATES,
      
      loadBills: () => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const data = JSON.parse(stored);
            if (data.state?.bills) {
              set({ bills: data.state.bills });
            }
          } catch (e) {
            console.error('Failed to load bills:', e);
          }
        }
      },
      
      setCurrentBill: (id) => {
        if (id === null) {
          set({ currentBill: null });
        } else {
          const bill = get().bills.find(b => b.id === id);
          set({ currentBill: bill || null });
        }
      },
      
      setFilters: (filters) => {
        set(state => ({ filters: { ...state.filters, ...filters } }));
      },
      
      resetFilters: () => {
        set({ filters: {} });
      },
      
      updateBill: (id, updates, operator, reason) => {
        set(state => {
          const bills = state.bills.map(bill => {
            if (bill.id !== id) return bill;
            
            const auditLogs: AuditLog[] = [...bill.auditLogs];
            
            Object.entries(updates).forEach(([field, value]) => {
              const fieldLabels: Record<string, string> = {
                billNumber: '票据号码',
                amount: '票面金额',
                issueDate: '出票日期',
                dueDate: '到期日',
                applicant: '申请人',
                discountRate: '贴现率',
                discountRateVersion: '贴现率版本',
                status: '审核状态',
              };
              
              auditLogs.push({
                id: generateId(),
                field,
                fieldLabel: fieldLabels[field] || field,
                oldValue: String(bill[field as keyof Bill] ?? ''),
                newValue: String(value ?? ''),
                operator,
                timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                reason,
              });
            });
            
            const updatedBill = {
              ...bill,
              ...updates,
              updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              auditLogs,
              status: 'modified' as const,
            };
            
            updatedBill.risks = assessAllRisks(updatedBill, LATEST_RATE_VERSION);
            
            if (updates.amount || updates.discountRate || updates.dueDate) {
              updatedBill.calculation = calculateDiscountInterest(
                updatedBill.amount,
                updatedBill.discountRate,
                dayjs().format('YYYY-MM-DD'),
                updatedBill.dueDate,
                updatedBill.discountRateVersion
              );
            }
            
            return updatedBill;
          });
          
          const currentBill = bills.find(b => b.id === id) || null;
          
          return { bills, currentBill: state.currentBill?.id === id ? currentBill : state.currentBill };
        });
      },
      
      updateBillStatus: (id, status, operator, reason) => {
        get().updateBill(id, { status }, operator, reason);
      },
      
      updateEndorsement: (billId, endorsementId, updates, operator, reason) => {
        set(state => {
          const bills = state.bills.map(bill => {
            if (bill.id !== billId) return bill;
            
            const endorsements = bill.endorsements.map(ed => {
              if (ed.id !== endorsementId) return ed;
              return { ...ed, ...updates };
            });
            
            const updatedBill = {
              ...bill,
              endorsements,
              updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              auditLogs: [
                ...bill.auditLogs,
                {
                  id: generateId(),
                  field: 'endorsements',
                  fieldLabel: '背书记录',
                  oldValue: `修改第${endorsements.find(e => e.id === endorsementId)?.sequence}手背书信息`,
                  newValue: '已修正',
                  operator,
                  timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  reason,
                },
              ],
              status: 'modified' as const,
            };
            
            updatedBill.risks = assessAllRisks(updatedBill, LATEST_RATE_VERSION);
            
            return updatedBill;
          });
          
          const currentBill = bills.find(b => b.id === billId) || null;
          
          return { bills, currentBill: state.currentBill?.id === billId ? currentBill : state.currentBill };
        });
      },
      
      recalculateBill: (id, operator) => {
        set(state => {
          const bills = state.bills.map(bill => {
            if (bill.id !== id) return bill;
            
            const newCalculation = calculateDiscountInterest(
              bill.amount,
              bill.discountRate,
              dayjs().format('YYYY-MM-DD'),
              bill.dueDate,
              bill.discountRateVersion
            );
            
            const updatedBill = {
              ...bill,
              calculation: newCalculation,
              updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              auditLogs: [
                ...bill.auditLogs,
                {
                  id: generateId(),
                  field: 'calculation',
                  fieldLabel: '利息计算',
                  oldValue: `贴现利息: ${bill.calculation.discountAmount}`,
                  newValue: `贴现利息: ${newCalculation.discountAmount}`,
                  operator,
                  timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  reason: '重新计算贴现利息',
                },
              ],
              status: 'modified' as const,
            };
            
            updatedBill.risks = assessAllRisks(updatedBill, LATEST_RATE_VERSION);
            
            return updatedBill;
          });
          
          const currentBill = bills.find(b => b.id === id) || null;
          
          return { bills, currentBill: state.currentBill?.id === id ? currentBill : state.currentBill };
        });
      },
      
      resolveRisk: (billId, riskIndex, operator) => {
        set(state => {
          const bills = state.bills.map(bill => {
            if (bill.id !== billId) return bill;
            
            const risks = [...bill.risks];
            if (risks[riskIndex]) {
              risks[riskIndex] = { ...risks[riskIndex], resolved: true };
            }
            
            return {
              ...bill,
              risks,
              updatedAt: dayjs().format('YYYY-MM-DD HH:mm:ss'),
              auditLogs: [
                ...bill.auditLogs,
                {
                  id: generateId(),
                  field: 'risks',
                  fieldLabel: '风险处理',
                  oldValue: risks[riskIndex]?.message || '',
                  newValue: '已标记为已解决',
                  operator,
                  timestamp: dayjs().format('YYYY-MM-DD HH:mm:ss'),
                  reason: '风险已核实处理',
                },
              ],
            };
          });
          
          const currentBill = bills.find(b => b.id === billId) || null;
          
          return { bills, currentBill: state.currentBill?.id === billId ? currentBill : state.currentBill };
        });
      },
      
      setSelectedIds: (ids) => {
        set({ selectedIds: ids });
      },
      
      exportBills: (ids) => {
        const bills = get().bills.filter(b => ids.includes(b.id));
        exportToExcel(bills);
      },
      
      exportAllBills: () => {
        const bills = get().getFilteredBills();
        exportToExcel(bills);
      },
      
      importBills: async (file) => {
        const text = await file.text();
        try {
          const data = JSON.parse(text);
          if (Array.isArray(data)) {
            const bills = initializeBillsWithRisks(data);
            set({ bills });
          }
        } catch (e) {
          console.error('Failed to import bills:', e);
          throw new Error('导入失败，请检查文件格式');
        }
      },
      
      resetToMockData: () => {
        set({ bills: initializeBillsWithRisks(MOCK_BILLS), currentBill: null, selectedIds: [] });
      },
      
      getFilteredBills: () => {
        const { bills, filters } = get();
        
        return bills.filter(bill => {
          if (filters.billNumber && !bill.billNumber.includes(filters.billNumber)) {
            return false;
          }
          if (filters.applicant && !bill.applicant.includes(filters.applicant)) {
            return false;
          }
          if (filters.status && bill.status !== filters.status) {
            return false;
          }
          if (filters.riskLevel) {
            const hasRisk = bill.risks.some(r => r.level === filters.riskLevel && !r.resolved);
            if (!hasRisk) return false;
          }
          if (filters.dueDateStart && dayjs(bill.dueDate).isBefore(dayjs(filters.dueDateStart))) {
            return false;
          }
          if (filters.dueDateEnd && dayjs(bill.dueDate).isAfter(dayjs(filters.dueDateEnd))) {
            return false;
          }
          return true;
        });
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);

function exportToExcel(bills: Bill[]) {
  const data = bills.map(bill => {
    const unresolvedRisks = bill.risks.filter(r => !r.resolved);
    const highRiskCount = unresolvedRisks.filter(r => r.level === 'high').length;
    const mediumRiskCount = unresolvedRisks.filter(r => r.level === 'medium').length;
    
    return {
      '票据号码': bill.billNumber,
      '票面金额': bill.amount,
      '出票日期': bill.issueDate,
      '到期日': bill.dueDate,
      '申请人': bill.applicant,
      '贴现率(%)': bill.discountRate,
      '贴现率版本': bill.discountRateVersion,
      '审核状态': {
        pending: '待审核',
        approved: '已通过',
        rejected: '已驳回',
        modified: '已修正',
      }[bill.status],
      '数据来源': bill.source,
      '计息天数': bill.calculation.days,
      '贴现利息': bill.calculation.discountAmount,
      '实付金额': bill.calculation.actualAmount,
      '高风险数量': highRiskCount,
      '中风险数量': mediumRiskCount,
      '风险描述': unresolvedRisks.map(r => r.message).join('; '),
      '背书手数': bill.endorsements.length,
      '创建时间': bill.createdAt,
      '更新时间': bill.updatedAt,
    };
  });
  
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '票据清单');
  
  ws['!cols'] = [
    { wch: 20 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 25 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
    { wch: 10 },
    { wch: 20 },
    { wch: 20 },
  ];
  
  XLSX.writeFile(wb, `票据贴现清单_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`);
}
