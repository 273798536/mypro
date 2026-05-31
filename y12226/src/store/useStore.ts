import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { DonationRecord, ProjectBudget, ExpenseReceipt, PurposeLock, ConflictLog, ExportRecord } from '../types';
import { donationRecords, projectBudgets, expenseReceipts, conflictLogs } from '../data/mockData';

interface AppState {
  donations: DonationRecord[];
  budgets: ProjectBudget[];
  receipts: ExpenseReceipt[];
  locks: PurposeLock[];
  conflicts: ConflictLog[];

  setDonations: (donations: DonationRecord[]) => void;
  addDonations: (donations: DonationRecord[]) => void;
  updateDonation: (id: string, updates: Partial<DonationRecord>) => void;

  setBudgets: (budgets: ProjectBudget[]) => void;
  addBudgets: (budgets: ProjectBudget[]) => void;
  updateBudget: (id: string, updates: Partial<ProjectBudget>) => void;

  setReceipts: (receipts: ExpenseReceipt[]) => void;
  addReceipts: (receipts: ExpenseReceipt[]) => void;
  updateReceipt: (id: string, updates: Partial<ExpenseReceipt>) => void;

  addLock: (lock: PurposeLock) => void;
  removeLock: (donationId: string) => void;

  addConflict: (conflict: ConflictLog) => void;
  resolveConflict: (id: string, resolution: string) => void;

  detectConflicts: () => void;
  lockPurpose: (donationId: string, purpose: string, source: 'donation' | 'budget' | 'manual', lockedBy: string) => void;

  getExportRecords: () => ExportRecord[];
  validateCaliber: () => { valid: boolean; differences: string[] };
  resetToMock: () => void;
}

const getDaysDiff = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const generateId = (prefix: string, existingIds: string[]): string => {
  const maxNum = existingIds
    .filter(id => id.startsWith(prefix))
    .map(id => {
      const match = id.match(/-(\d+)$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .reduce((max, num) => Math.max(max, num), 0);
  return `${prefix}${String(maxNum + 1).padStart(3, '0')}`;
};

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      donations: donationRecords,
      budgets: projectBudgets,
      receipts: expenseReceipts,
      locks: [],
      conflicts: conflictLogs,

      setDonations: (donations) => set({ donations }),
      addDonations: (newDonations) => set((state) => ({
        donations: [...state.donations, ...newDonations]
      })),
      updateDonation: (id, updates) => set((state) => ({
        donations: state.donations.map(d =>
          d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
        )
      })),

      setBudgets: (budgets) => set({ budgets }),
      addBudgets: (newBudgets) => set((state) => ({
        budgets: [...state.budgets, ...newBudgets]
      })),
      updateBudget: (id, updates) => set((state) => ({
        budgets: state.budgets.map(b =>
          b.id === id ? { ...b, ...updates } : b
        )
      })),

      setReceipts: (receipts) => set({ receipts }),
      addReceipts: (newReceipts) => set((state) => ({
        receipts: [...state.receipts, ...newReceipts]
      })),
      updateReceipt: (id, updates) => set((state) => ({
        receipts: state.receipts.map(r =>
          r.id === id ? { ...r, ...updates } : r
        )
      })),

      addLock: (lock) => set((state) => ({
        locks: [...state.locks, lock]
      })),
      removeLock: (donationId) => set((state) => ({
        locks: state.locks.filter(l => l.donationId !== donationId)
      })),

      addConflict: (conflict) => set((state) => ({
        conflicts: [...state.conflicts, conflict]
      })),
      resolveConflict: (id, resolution) => set((state) => ({
        conflicts: state.conflicts.map(c =>
          c.id === id
            ? { ...c, resolution, resolvedAt: new Date().toISOString() }
            : c
        )
      })),

      detectConflicts: () => {
        const { donations, budgets, receipts, conflicts } = get();
        const newConflicts: ConflictLog[] = [];
        let nextOrderIndex = Math.max(...conflicts.map(c => c.orderIndex), 0) + 1;

        const conflictKey = (donationId: string, conflictType: string, description: string) =>
          `${donationId}-${conflictType}-${description.slice(0, 50)}`;

        const existingKeys = new Set(
          conflicts.map(c => conflictKey(c.donationId, c.conflictType, c.description))
        );

        donations.forEach(donation => {
          const budget = budgets.find(b => b.projectId === donation.projectId);

          if (budget && donation.designatedPurpose !== budget.purpose) {
            const key = conflictKey(
              donation.id,
              'purpose_mismatch',
              `${donation.designatedPurpose}-${budget.purpose}`
            );
            if (!existingKeys.has(key)) {
              newConflicts.push({
                id: generateId('CF-', [...conflicts.map(c => c.id), ...newConflicts.map(c => c.id)]),
                donationId: donation.id,
                conflictType: 'purpose_mismatch',
                description: `捐赠人${donation.donorName}指定用途为"${donation.designatedPurpose}"，但关联项目"${budget.projectName}"预算用途记录为"${budget.purpose}"，两者不一致`,
                detectedAt: new Date().toISOString(),
                severity: 'high',
                resolution: '',
                resolvedAt: '',
                orderIndex: nextOrderIndex++
              });
            }
          }

          const donationReceipts = receipts.filter(r => r.donationId === donation.id);
          const seen = new Map<string, number>();
          donationReceipts.forEach(receipt => {
            const key = `${receipt.amount}-${receipt.receiptDate}`;
            const count = seen.get(key) || 0;
            seen.set(key, count + 1);
          });

          seen.forEach((count, key) => {
            if (count > 1) {
              const conflictDescKey = conflictKey(donation.id, 'receipt_duplicate', key);
              if (!existingKeys.has(conflictDescKey)) {
                newConflicts.push({
                  id: generateId('CF-', [...conflicts.map(c => c.id), ...newConflicts.map(c => c.id)]),
                  donationId: donation.id,
                  conflictType: 'receipt_duplicate',
                  description: `检测到重复上传的报销凭证，金额和日期完全一致，疑似重复提交`,
                  detectedAt: new Date().toISOString(),
                  severity: 'medium',
                  resolution: '',
                  resolvedAt: '',
                  orderIndex: nextOrderIndex++
                });
              }
            }
          });

          donationReceipts.forEach(receipt => {
            const daysDiff = getDaysDiff(donation.donationDate, receipt.receiptDate);
            if (daysDiff > 30) {
              const key = conflictKey(
                donation.id,
                'refund_delayed',
                `${daysDiff}-${receipt.id}`
              );
              if (!existingKeys.has(key)) {
                newConflicts.push({
                  id: generateId('CF-', [...conflicts.map(c => c.id), ...newConflicts.map(c => c.id)]),
                  donationId: donation.id,
                  conflictType: 'refund_delayed',
                  description: `捐赠人${donation.donorName}款项自${donation.donationDate}到账至今已超过${daysDiff}天，票据日期${receipt.receiptDate}晚到，需尽快处理`,
                  detectedAt: new Date().toISOString(),
                  severity: 'low',
                  resolution: '',
                  resolvedAt: '',
                  orderIndex: nextOrderIndex++
                });
              }
            }
          });
        });

        if (newConflicts.length > 0) {
          const conflictDonationIds = new Set(newConflicts.map(c => c.donationId));
          set((state) => ({
            conflicts: [...state.conflicts, ...newConflicts],
            donations: state.donations.map(d =>
              conflictDonationIds.has(d.id)
                ? { ...d, status: 'conflicted', updatedAt: new Date().toISOString() }
                : d
            )
          }));
        }
      },

      lockPurpose: (donationId, purpose, source, lockedBy) => {
        const lock: PurposeLock = {
          id: generateId('LK-', get().locks.map(l => l.id)),
          donationId,
          lockedPurpose: purpose,
          lockedBy,
          lockedAt: new Date().toISOString(),
          source
        };

        set((state) => ({
          locks: [...state.locks.filter(l => l.donationId !== donationId), lock],
          donations: state.donations.map(d =>
            d.id === donationId
              ? { ...d, status: 'locked', updatedAt: new Date().toISOString() }
              : d
          ),
          conflicts: state.conflicts.map(c =>
            c.donationId === donationId && !c.resolvedAt
              ? { ...c, resolution: '用途已锁定', resolvedAt: new Date().toISOString() }
              : c
          )
        }));
      },

      getExportRecords: () => {
        const { donations, budgets, receipts, locks, conflicts } = get();
        const lockedDonations = donations.filter(d => d.status === 'locked');

        return lockedDonations.map(donation => {
          const lock = locks.find(l => l.donationId === donation.id);
          const budget = budgets.find(b => b.projectId === donation.projectId);
          const donationReceipts = receipts.filter(r => r.donationId === donation.id);
          const donationConflicts = conflicts.filter(c => c.donationId === donation.id);

          return {
            donationId: donation.id,
            donorName: donation.donorName,
            amount: donation.amount,
            designatedPurpose: donation.designatedPurpose,
            lockedPurpose: lock?.lockedPurpose || '',
            projectId: donation.projectId,
            projectName: budget?.projectName || '',
            budgetPurpose: budget?.purpose || '',
            receiptCount: donationReceipts.length,
            receiptTotal: donationReceipts.reduce((sum, r) => sum + r.amount, 0),
            conflictCount: donationConflicts.length,
            lockSource: lock?.source || '',
            lockDate: lock?.lockedAt || ''
          };
        });
      },

      validateCaliber: () => {
        const { donations, locks } = get();
        const exportRecords = get().getExportRecords();
        const differences: string[] = [];

        const lockedDonations = donations.filter(d => d.status === 'locked');

        if (lockedDonations.length !== exportRecords.length) {
          differences.push(
            `记录数量不一致：锁定捐赠记录${lockedDonations.length}条，导出清单${exportRecords.length}条`
          );
        }

        lockedDonations.forEach(donation => {
          const lock = locks.find(l => l.donationId === donation.id);
          const exportRecord = exportRecords.find(e => e.donationId === donation.id);

          if (!exportRecord) {
            differences.push(`捐赠记录${donation.id}（${donation.donorName}）已锁定但未出现在导出清单中`);
            return;
          }

          if (lock && exportRecord.lockedPurpose !== lock.lockedPurpose) {
            differences.push(
              `用途口径不一致：捐赠${donation.id}锁定用途为"${lock.lockedPurpose}"，导出用途为"${exportRecord.lockedPurpose}"`
            );
          }

          if (exportRecord.lockedPurpose && exportRecord.lockedPurpose !== donation.designatedPurpose) {
            if (!lock || !['donation', 'budget', 'manual'].includes(lock.source)) {
              differences.push(
                `用途变更无来源：捐赠${donation.id}用途从"${donation.designatedPurpose}"变更为"${exportRecord.lockedPurpose}"，缺少锁定来源标记`
              );
            }
          }
        });

        exportRecords.forEach(record => {
          const lock = locks.find(l => l.donationId === record.donationId);
          if (!lock) {
            differences.push(`导出记录${record.donationId}（${record.donorName}）缺少对应的用途锁定记录`);
          }
        });

        return {
          valid: differences.length === 0,
          differences
        };
      },

      resetToMock: () => set({
        donations: donationRecords,
        budgets: projectBudgets,
        receipts: expenseReceipts,
        locks: [],
        conflicts: conflictLogs
      })
    }),
    {
      name: 'donation-app-storage'
    }
  )
);
