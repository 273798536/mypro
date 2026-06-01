import { create } from 'zustand';
import { RiskAlert } from '@/types';
import { detectRisks } from '@/utils/riskDetector';
import { useSampleStore } from './useSampleStore';
import { useTrackStore } from './useTrackStore';
import { useLicenseStore } from './useLicenseStore';

interface AlertState {
  alerts: RiskAlert[];
  detectAllRisks: () => void;
  dismissAlert: (id: string) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: [],
  detectAllRisks: () => {
    const samples = useSampleStore.getState().samples;
    const tracks = useTrackStore.getState().tracks;
    const licenses = useLicenseStore.getState().licenses;
    set({ alerts: detectRisks(samples, tracks, licenses) });
  },
  dismissAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),
}));
