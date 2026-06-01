import { create } from 'zustand';
import { License, ManualEdit } from '@/types';
import { initialLicenses } from '@/mock/initialData';

interface LicenseState {
  licenses: License[];
  selectedLicense: License | null;
  setSelectedLicense: (license: License | null) => void;
  addLicense: (license: License) => void;
  updateLicense: (id: string, license: Partial<License>) => void;
  deleteLicense: (id: string) => void;
  getLicenseById: (id: string) => License | undefined;
  addManualEdit: (licenseId: string, edit: ManualEdit) => void;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
  licenses: initialLicenses,
  selectedLicense: null,
  setSelectedLicense: (license) => set({ selectedLicense: license }),
  addLicense: (license) =>
    set((state) => ({ licenses: [...state.licenses, license] })),
  updateLicense: (id, license) =>
    set((state) => ({
      licenses: state.licenses.map((l) =>
        l.id === id ? { ...l, ...license, updatedAt: new Date().toISOString() } : l
      ),
    })),
  deleteLicense: (id) =>
    set((state) => ({
      licenses: state.licenses.filter((l) => l.id !== id),
    })),
  getLicenseById: (id) => get().licenses.find((l) => l.id === id),
  addManualEdit: (licenseId, edit) =>
    set((state) => ({
      licenses: state.licenses.map((l) =>
        l.id === licenseId
          ? { ...l, manualEdits: [...l.manualEdits, edit] }
          : l
      ),
    })),
}));
