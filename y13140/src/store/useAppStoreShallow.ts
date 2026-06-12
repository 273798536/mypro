import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/store';

export function useAppStoreShallow<T>(selector: (state: ReturnType<typeof useAppStore.getState>) => T): T {
  return useAppStore(useShallow(selector));
}
