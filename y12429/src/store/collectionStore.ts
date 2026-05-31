import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  CollectionRecord,
  FilterOptions,
  ChangeLog,
  Milestone,
  LicenseContract,
  MilestoneStatus,
} from '../types';
import {
  mockCollectionRecords,
  mockChangeLogs,
  mockContracts,
  mockMilestones,
} from '../data/mockData';

interface CollectionState {
  collectionRecords: CollectionRecord[];
  changeLogs: ChangeLog[];
  contracts: LicenseContract[];
  milestones: Milestone[];
  selectedRecord: CollectionRecord | null;
  filterOptions: FilterOptions;
  isLoading: boolean;
  error: string | null;
  
  setSelectedRecord: (record: CollectionRecord | null) => void;
  setFilterOptions: (options: Partial<FilterOptions>) => void;
  getFilteredRecords: () => CollectionRecord[];
  
  confirmRecord: (recordId: string, confirmedBy: string) => void;
  updateRecordStatus: (recordId: string, status: MilestoneStatus, remark?: string) => void;
  updateContract: (contractId: string, updates: Partial<LicenseContract>, changedBy: string, changeReason: string) => void;
  updateMilestone: (milestoneId: string, updates: Partial<Milestone>, changedBy: string, changeReason: string) => void;
  
  getChangeLogsForRecord: (recordId: string, recordType: 'contract' | 'milestone' | 'invoice' | 'supplement') => ChangeLog[];
  exportRecords: (recordIds?: string[]) => string;
}

export const useCollectionStore = create<CollectionState>()(
  devtools((set, get) => ({
    collectionRecords: mockCollectionRecords,
    changeLogs: mockChangeLogs,
    contracts: mockContracts,
    milestones: mockMilestones,
    selectedRecord: null,
    filterOptions: {},
    isLoading: false,
    error: null,

    setSelectedRecord: (record) => set({ selectedRecord: record }),

    setFilterOptions: (options) =>
      set((state) => ({
        filterOptions: { ...state.filterOptions, ...options },
      })),

    getFilteredRecords: () => {
      const { collectionRecords, filterOptions } = get();
      return collectionRecords.filter((record) => {
        if (filterOptions.contractNo && !record.contract.contractNo.includes(filterOptions.contractNo)) {
          return false;
        }
        if (filterOptions.licensee && !record.contract.licensee.includes(filterOptions.licensee)) {
          return false;
        }
        if (filterOptions.status?.length && !filterOptions.status.includes(record.status)) {
          return false;
        }
        if (filterOptions.recordType?.length && !filterOptions.recordType.includes(record.recordType)) {
          return false;
        }
        if (filterOptions.hasEvidenceMissing !== undefined && record.hasEvidenceMissing !== filterOptions.hasEvidenceMissing) {
          return false;
        }
        if (filterOptions.hasSalesSupplement !== undefined && record.hasSalesSupplement !== filterOptions.hasSalesSupplement) {
          return false;
        }
        if (filterOptions.hasInvoiceReversed !== undefined && record.hasInvoiceReversed !== filterOptions.hasInvoiceReversed) {
          return false;
        }
        return true;
      });
    },

    confirmRecord: (recordId, confirmedBy) => {
      const now = new Date().toISOString();
      set((state) => ({
        collectionRecords: state.collectionRecords.map((record) =>
          record.id === recordId
            ? {
                ...record,
                status: 'completed',
                confirmedBy,
                confirmedAt: now,
                updatedAt: now,
              }
            : record
        ),
        changeLogs: [
          ...state.changeLogs,
          {
            id: `changelog_${Date.now()}`,
            recordId,
            recordType: 'milestone',
            fieldName: 'status',
            oldValue: recordId ? get().collectionRecords.find(r => r.id === recordId)?.status || '' : '',
            newValue: 'completed',
            changedBy: confirmedBy,
            changedAt: now,
            changeReason: '财务确认收款完成',
          },
        ],
      }));
    },

    updateRecordStatus: (recordId, status, remark) => {
      const now = new Date().toISOString();
      const oldRecord = get().collectionRecords.find(r => r.id === recordId);
      
      set((state) => ({
        collectionRecords: state.collectionRecords.map((record) =>
          record.id === recordId
            ? {
                ...record,
                status,
                milestone: {
                  ...record.milestone,
                  status,
                  verificationRemark: remark || record.milestone.verificationRemark,
                },
                updatedAt: now,
              }
            : record
        ),
        changeLogs: [
          ...state.changeLogs,
          {
            id: `changelog_${Date.now()}`,
            recordId,
            recordType: 'milestone',
            fieldName: 'status',
            oldValue: oldRecord?.status || '',
            newValue: status,
            changedBy: '当前用户',
            changedAt: now,
            changeReason: remark || '状态更新',
          },
        ],
      }));
    },

    updateContract: (contractId, updates, changedBy, changeReason) => {
      const now = new Date().toISOString();
      const oldContract = get().contracts.find(c => c.id === contractId);
      
      const newChangeLogs: ChangeLog[] = [];
      Object.entries(updates).forEach(([key, value]) => {
        if (oldContract && oldContract[key as keyof LicenseContract] !== value) {
          newChangeLogs.push({
            id: `changelog_${Date.now()}_${key}`,
            recordId: contractId,
            recordType: 'contract',
            fieldName: key,
            oldValue: String(oldContract[key as keyof LicenseContract] || ''),
            newValue: String(value || ''),
            changedBy,
            changedAt: now,
            changeReason,
          });
        }
      });

      set((state) => ({
        contracts: state.contracts.map((contract) =>
          contract.id === contractId
            ? { ...contract, ...updates, updatedAt: now }
            : contract
        ),
        collectionRecords: state.collectionRecords.map((record) =>
          record.contractId === contractId
            ? {
                ...record,
                contract: { ...record.contract, ...updates, updatedAt: now },
                updatedAt: now,
              }
            : record
        ),
        changeLogs: [...state.changeLogs, ...newChangeLogs],
      }));
    },

    updateMilestone: (milestoneId, updates, changedBy, changeReason) => {
      const now = new Date().toISOString();
      const oldMilestone = get().milestones.find(m => m.id === milestoneId);
      
      const newChangeLogs: ChangeLog[] = [];
      Object.entries(updates).forEach(([key, value]) => {
        if (oldMilestone && oldMilestone[key as keyof Milestone] !== value) {
          newChangeLogs.push({
            id: `changelog_${Date.now()}_${key}`,
            recordId: milestoneId,
            recordType: 'milestone',
            fieldName: key,
            oldValue: String(oldMilestone[key as keyof Milestone] || ''),
            newValue: String(value || ''),
            changedBy,
            changedAt: now,
            changeReason,
          });
        }
      });

      set((state) => ({
        milestones: state.milestones.map((milestone) =>
          milestone.id === milestoneId
            ? { ...milestone, ...updates, updatedAt: now }
            : milestone
        ),
        collectionRecords: state.collectionRecords.map((record) =>
          record.milestoneId === milestoneId
            ? {
                ...record,
                milestone: { ...record.milestone, ...updates, updatedAt: now },
                updatedAt: now,
              }
            : record
        ),
        changeLogs: [...state.changeLogs, ...newChangeLogs],
      }));
    },

    getChangeLogsForRecord: (recordId, recordType) => {
      return get().changeLogs.filter(
        (log) => log.recordId === recordId && log.recordType === recordType
      );
    },

    exportRecords: (recordIds) => {
      const { collectionRecords, changeLogs } = get();
      const recordsToExport = recordIds
        ? collectionRecords.filter((r) => recordIds.includes(r.id))
        : collectionRecords;

      const exportData = {
        exportDate: new Date().toISOString(),
        exportedBy: '当前用户',
        records: recordsToExport.map((record) => ({
          contract: {
            contractNo: record.contract.contractNo,
            contractName: record.contract.contractName,
            licensee: record.contract.licensee,
            contractDate: record.contract.contractDate,
            totalAmount: record.contract.totalAmount,
          },
          milestone: {
            milestoneNo: record.milestone.milestoneNo,
            description: record.milestone.description,
            dueDate: record.milestone.dueDate,
            amount: record.milestone.amount,
            completionDate: record.milestone.completionDate,
            status: record.milestone.status,
            verificationRemark: record.milestone.verificationRemark,
          },
          collection: {
            recordType: record.recordType,
            plannedAmount: record.plannedAmount,
            actualAmount: record.actualAmount,
            difference: record.difference,
            differenceReason: record.differenceReason,
            status: record.status,
            hasEvidenceMissing: record.hasEvidenceMissing,
            missingEvidenceTypes: record.missingEvidenceTypes,
            hasSalesSupplement: record.hasSalesSupplement,
            hasInvoiceReversed: record.hasInvoiceReversed,
            confirmedBy: record.confirmedBy,
            confirmedAt: record.confirmedAt,
          },
          invoices: record.invoices.map((inv) => ({
            invoiceNo: inv.invoiceNo,
            invoiceDate: inv.invoiceDate,
            totalAmount: inv.totalAmount,
            status: inv.status,
            reverseReason: inv.reverseReason,
          })),
          supplements: record.supplements.map((sup) => ({
            reportDate: sup.reportDate,
            reportedBy: sup.reportedBy,
            department: sup.department,
            supplementReason: sup.supplementReason,
            supplementaryAmount: sup.supplementaryAmount,
            approvalStatus: sup.approvalStatus,
            approvalRemark: sup.approvalRemark,
          })),
          verificationRecords: record.verificationRecords.map((ver) => ({
            verifier: ver.verifier,
            verificationDate: ver.verificationDate,
            result: ver.result,
            remark: ver.remark,
            discrepancies: ver.discrepancies.map((d) => ({
              field: d.field,
              expected: d.expected,
              actual: d.actual,
              description: d.description,
              resolution: d.resolution,
            })),
          })),
          changeHistory: changeLogs
            .filter(
              (log) =>
                log.recordId === record.contractId ||
                log.recordId === record.milestoneId ||
                record.invoices.some((inv) => inv.id === log.recordId)
            )
            .map((log) => ({
              recordType: log.recordType,
              fieldName: log.fieldName,
              oldValue: log.oldValue,
              newValue: log.newValue,
              changedBy: log.changedBy,
              changedAt: log.changedAt,
              changeReason: log.changeReason,
            })),
        })),
      };

      return JSON.stringify(exportData, null, 2);
    },
  }))
);
