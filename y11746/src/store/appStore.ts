import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Donation, Project, PhysicalGoods, Refund, Invoice, ExceptionRecord, AuditLog, DataSource, InvoiceStatus } from '../types';
import { getSampleDataset } from '../data/sampleData';
import { detectAllExceptions } from '../utils/exceptionDetector';
import { updateDonationProject, updatePhysicalValue, reverseInvoice } from '../utils/verificationEngine';

interface AppState {
  donations: Donation[];
  projects: Project[];
  physicalGoods: PhysicalGoods[];
  refunds: Refund[];
  invoices: Invoice[];
  exceptions: ExceptionRecord[];
  auditLogs: AuditLog[];
  isDataLoaded: boolean;
  loadSampleData: () => void;
  clearData: () => void;
  importData: (source: DataSource, data: any[]) => void;
  updateDonation: (id: string, updates: Partial<Donation>) => void;
  fixProjectMismatch: (donationId: string, newProjectId: string, newProjectName: string) => void;
  fixPhysicalValue: (donationId: string, newValue: number) => void;
  fixRefundReversal: (donationId: string) => void;
  resolveException: (exceptionId: string) => void;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'operatedAt'>) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 10);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      donations: [],
      projects: [],
      physicalGoods: [],
      refunds: [],
      invoices: [],
      exceptions: [],
      auditLogs: [],
      isDataLoaded: false,

      loadSampleData: () => {
        const dataset = getSampleDataset();
        const exceptions = detectAllExceptions(
          dataset.donations,
          dataset.projects,
          dataset.physicalGoods,
          dataset.refunds,
          dataset.invoices
        );
        set({
          ...dataset,
          exceptions,
          isDataLoaded: true,
        });
      },

      clearData: () => {
        set({
          donations: [],
          projects: [],
          physicalGoods: [],
          refunds: [],
          invoices: [],
          exceptions: [],
          auditLogs: [],
          isDataLoaded: false,
        });
      },

      importData: (source: DataSource, data: any[]) => {
        const state = get();
        let newExceptions = [...state.exceptions];

        if (source === 'donation_flow') {
          const donations = data as Donation[];
          newExceptions = detectAllExceptions(
            donations,
            state.projects,
            state.physicalGoods,
            state.refunds,
            state.invoices
          );
          set({ donations, exceptions: newExceptions, isDataLoaded: true });
        } else if (source === 'project_tag') {
          const projects = data as Project[];
          newExceptions = detectAllExceptions(
            state.donations,
            projects,
            state.physicalGoods,
            state.refunds,
            state.invoices
          );
          set({ projects, exceptions: newExceptions, isDataLoaded: true });
        } else if (source === 'physical_valuation') {
          const physicalGoods = data as PhysicalGoods[];
          newExceptions = detectAllExceptions(
            state.donations,
            state.projects,
            physicalGoods,
            state.refunds,
            state.invoices
          );
          set({ physicalGoods, exceptions: newExceptions, isDataLoaded: true });
        } else if (source === 'refund_record') {
          const refunds = data as Refund[];
          newExceptions = detectAllExceptions(
            state.donations,
            state.projects,
            state.physicalGoods,
            refunds,
            state.invoices
          );
          set({ refunds, exceptions: newExceptions, isDataLoaded: true });
        } else if (source === 'invoice_number') {
          const invoices = data as Invoice[];
          newExceptions = detectAllExceptions(
            state.donations,
            state.projects,
            state.physicalGoods,
            state.refunds,
            invoices
          );
          set({ invoices, exceptions: newExceptions, isDataLoaded: true });
        }
      },

      updateDonation: (id: string, updates: Partial<Donation>) => {
        const state = get();
        const donation = state.donations.find(d => d.id === id);
        if (!donation) return;

        const updatedDonations = state.donations.map(d =>
          d.id === id ? { ...d, ...updates } : d
        );

        set({ donations: updatedDonations });
      },

      fixProjectMismatch: (donationId: string, newProjectId: string, newProjectName: string) => {
        const state = get();
        const donation = state.donations.find(d => d.id === donationId);
        if (!donation) return;

        const oldProject = donation.projectName || donation.projectId;

        const updatedDonation = updateDonationProject(donation, newProjectId, newProjectName);
        const updatedDonations = state.donations.map(d =>
          d.id === donationId ? updatedDonation : d
        );

        const updatedExceptions = state.exceptions.map(e =>
          e.recordId === donationId && e.type === 'project_mismatch'
            ? { ...e, resolved: true }
            : e
        );

        set({
          donations: updatedDonations,
          exceptions: updatedExceptions,
        });

        get().addAuditLog({
          recordType: 'donation',
          recordId: donationId,
          fieldName: 'projectId',
          oldValue: oldProject,
          newValue: `${newProjectName} (${newProjectId})`,
          operator: '财务管理员',
          source: donation.source,
        });
      },

      fixPhysicalValue: (donationId: string, newValue: number) => {
        const state = get();
        const donation = state.donations.find(d => d.id === donationId);
        if (!donation) return;

        const oldValue = donation.amount;

        const updatedDonation = updatePhysicalValue(donation, newValue);
        const updatedDonations = state.donations.map(d =>
          d.id === donationId ? updatedDonation : d
        );

        const updatedPhysicals = state.physicalGoods.map(p =>
          p.donationId === donationId
            ? { ...p, estimatedValue: newValue, valueMissing: false, valuationMethod: '人工补录' }
            : p
        );

        const updatedExceptions = state.exceptions.map(e =>
          e.recordType === 'physical' && state.physicalGoods.find(p => p.id === e.recordId)?.donationId === donationId
            ? { ...e, resolved: true }
            : e
        );

        set({
          donations: updatedDonations,
          physicalGoods: updatedPhysicals,
          exceptions: updatedExceptions,
        });

        get().addAuditLog({
          recordType: 'donation',
          recordId: donationId,
          fieldName: 'amount',
          oldValue: oldValue.toString(),
          newValue: newValue.toString(),
          operator: '财务管理员',
          source: donation.source,
        });
      },

      fixRefundReversal: (donationId: string) => {
        const state = get();
        const donation = state.donations.find(d => d.id === donationId);
        if (!donation) return;

        const oldStatus = donation.invoiceStatus;

        const updatedDonation = reverseInvoice(donation);
        const updatedDonations = state.donations.map(d =>
          d.id === donationId ? updatedDonation : d
        );

        const updatedInvoices = state.invoices.map(i =>
          i.donationId === donationId
            ? { ...i, status: 'reversed' as InvoiceStatus, reversed: true }
            : i
        );

        const updatedRefunds = state.refunds.map(r =>
          r.donationId === donationId
            ? { ...r, invoiceReversed: true }
            : r
        );

        const updatedExceptions = state.exceptions.map(e =>
          e.recordType === 'refund' && state.refunds.find(r => r.id === e.recordId)?.donationId === donationId
            ? { ...e, resolved: true }
            : e
        );

        set({
          donations: updatedDonations,
          invoices: updatedInvoices,
          refunds: updatedRefunds,
          exceptions: updatedExceptions,
        });

        get().addAuditLog({
          recordType: 'invoice',
          recordId: donation.invoiceId || donationId,
          fieldName: 'status',
          oldValue: oldStatus,
          newValue: 'reversed',
          operator: '财务管理员',
          source: donation.source,
        });
      },

      resolveException: (exceptionId: string) => {
        const state = get();
        set({
          exceptions: state.exceptions.map(e =>
            e.id === exceptionId ? { ...e, resolved: true } : e
          ),
        });
      },

      addAuditLog: (log: Omit<AuditLog, 'id' | 'operatedAt'>) => {
        const state = get();
        const newLog: AuditLog = {
          ...log,
          id: generateId(),
          operatedAt: new Date().toISOString(),
        };
        set({ auditLogs: [newLog, ...state.auditLogs] });
      },
    }),
    {
      name: 'charity-invoice-store',
    }
  )
);
