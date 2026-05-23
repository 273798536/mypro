import { UserRole } from '../src/types';
import {
  canPerformAction,
  canViewField,
  canEditField,
  getRoleName,
  assertPermission
} from '../src/utils/permissions';

describe('Permissions', () => {
  describe('Role Names', () => {
    it('should return correct Chinese role names', () => {
      expect(getRoleName(UserRole.DATA_ENTRY)).toBe('录入员');
      expect(getRoleName(UserRole.REVIEWER)).toBe('复核员');
      expect(getRoleName(UserRole.SUPERVISOR)).toBe('主管');
      expect(getRoleName(UserRole.READ_ONLY)).toBe('只读查看');
    });
  });

  describe('Action Permissions', () => {
    it('data_entry should have import permission', () => {
      expect(canPerformAction(UserRole.DATA_ENTRY, 'import')).toBe(true);
    });

    it('data_entry should NOT have init permission', () => {
      expect(canPerformAction(UserRole.DATA_ENTRY, 'init')).toBe(false);
    });

    it('reviewer should have reject permission', () => {
      expect(canPerformAction(UserRole.REVIEWER, 'reject')).toBe(true);
    });

    it('reviewer should NOT have fix permission', () => {
      expect(canPerformAction(UserRole.REVIEWER, 'fix')).toBe(false);
    });

    it('supervisor should have all permissions', () => {
      expect(canPerformAction(UserRole.SUPERVISOR, 'init')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'import')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'check')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'fix')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'approve')).toBe(true);
      expect(canPerformAction(UserRole.SUPERVISOR, 'export')).toBe(true);
    });

    it('read_only should only have report and history permission', () => {
      expect(canPerformAction(UserRole.READ_ONLY, 'report')).toBe(true);
      expect(canPerformAction(UserRole.READ_ONLY, 'history')).toBe(true);
      expect(canPerformAction(UserRole.READ_ONLY, 'import')).toBe(false);
      expect(canPerformAction(UserRole.READ_ONLY, 'export')).toBe(false);
    });

    it('assertPermission should throw for unauthorized action', () => {
      expect(() => {
        assertPermission(UserRole.READ_ONLY, 'import');
      }).toThrow('权限不足');
    });

    it('assertPermission should not throw for authorized action', () => {
      expect(() => {
        assertPermission(UserRole.SUPERVISOR, 'import');
      }).not.toThrow();
    });
  });

  describe('Field Permissions', () => {
    it('read_only should NOT see rawData', () => {
      expect(canViewField(UserRole.READ_ONLY, 'rawData')).toBe(false);
    });

    it('supervisor should see rawData', () => {
      expect(canViewField(UserRole.SUPERVISOR, 'rawData')).toBe(true);
    });

    it('data_entry should edit batchNumber', () => {
      expect(canEditField(UserRole.DATA_ENTRY, 'batchNumber')).toBe(true);
    });

    it('reviewer should NOT edit batchNumber', () => {
      expect(canEditField(UserRole.REVIEWER, 'batchNumber')).toBe(false);
    });

    it('reviewer should edit status', () => {
      expect(canEditField(UserRole.REVIEWER, 'status')).toBe(true);
    });

    it('read_only should NOT edit anything', () => {
      expect(canEditField(UserRole.READ_ONLY, 'batchNumber')).toBe(false);
      expect(canEditField(UserRole.READ_ONLY, 'status')).toBe(false);
    });
  });
});
