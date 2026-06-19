import type { PermissionItem } from '@/types';
import { storage, generateId } from '@/utils/storage';
import { getMockPermissions } from '@/mock/permissions';

const STORAGE_KEY = 'permissions';

const getAllPermissions = (): PermissionItem[] => {
  return storage.get<PermissionItem[]>(STORAGE_KEY, []);
};

const saveAllPermissions = (permissions: PermissionItem[]): void => {
  storage.set(STORAGE_KEY, permissions);
};

export const auditService = {
  list(params?: { roleName?: string; resource?: string; keyword?: string }): PermissionItem[] {
    let permissions = getAllPermissions();

    if (params?.roleName) {
      permissions = permissions.filter((p) => p.roleName.includes(params.roleName!));
    }
    if (params?.resource) {
      permissions = permissions.filter((p) => p.resource.includes(params.resource!));
    }
    if (params?.keyword) {
      const kw = params.keyword.toLowerCase();
      permissions = permissions.filter(
        (p) =>
          p.roleName.toLowerCase().includes(kw) ||
          p.permission.toLowerCase().includes(kw) ||
          p.resource.toLowerCase().includes(kw)
      );
    }

    return permissions.sort((a, b) =>
      a.roleName.localeCompare(b.roleName) || a.resource.localeCompare(b.resource)
    );
  },

  listByGapId(gapId: string): PermissionItem[] {
    const permissions = getAllPermissions();
    return permissions.filter((p) => p.gapId === gapId);
  },

  get(id: string): PermissionItem | null {
    const permissions = getAllPermissions();
    return permissions.find((p) => p.id === id) || null;
  },

  add(permission: Omit<PermissionItem, 'id' | 'grantedAt'>): PermissionItem {
    const permissions = getAllPermissions();
    const newPerm: PermissionItem = {
      ...permission,
      id: 'perm_' + generateId(),
      grantedAt: new Date().toISOString(),
    };

    permissions.push(newPerm);
    saveAllPermissions(permissions);

    return newPerm;
  },

  getRoles(): string[] {
    const permissions = getAllPermissions();
    return [...new Set(permissions.map((p) => p.roleName))].sort();
  },

  getResources(): string[] {
    const permissions = getAllPermissions();
    return [...new Set(permissions.map((p) => p.resource))].sort();
  },

  resetToMock(): void {
    saveAllPermissions(getMockPermissions());
  },
};
