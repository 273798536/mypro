import { create } from 'zustand';
import type { PermissionItem } from '@/types';
import { auditService } from '@/services/auditService';

interface AuditState {
  permissions: PermissionItem[];
  roles: string[];
  resources: string[];
  loading: boolean;

  fetchPermissions: (params?: { roleName?: string; resource?: string; keyword?: string }) => void;
  fetchByGapId: (gapId: string) => PermissionItem[];
  fetchRolesAndResources: () => void;
  addPermission: (permission: Omit<PermissionItem, 'id' | 'grantedAt'>) => PermissionItem;
  resetToMock: () => void;
}

export const useAuditStore = create<AuditState>((set, get) => ({
  permissions: [],
  roles: [],
  resources: [],
  loading: false,

  fetchPermissions: (params) => {
    const permissions = auditService.list(params);
    set({ permissions });
  },

  fetchByGapId: (gapId: string) => {
    const permissions = auditService.listByGapId(gapId);
    return permissions;
  },

  fetchRolesAndResources: () => {
    const roles = auditService.getRoles();
    const resources = auditService.getResources();
    set({ roles, resources });
  },

  addPermission: (permission) => {
    const newPerm = auditService.add(permission);
    get().fetchPermissions();
    get().fetchRolesAndResources();
    return newPerm;
  },

  resetToMock: () => {
    auditService.resetToMock();
    get().fetchPermissions();
    get().fetchRolesAndResources();
  },
}));
