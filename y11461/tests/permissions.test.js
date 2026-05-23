"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../src/types");
const permissions_1 = require("../src/utils/permissions");
describe('Permissions', () => {
    describe('Role Names', () => {
        it('should return correct Chinese role names', () => {
            expect((0, permissions_1.getRoleName)(types_1.UserRole.DATA_ENTRY)).toBe('录入员');
            expect((0, permissions_1.getRoleName)(types_1.UserRole.REVIEWER)).toBe('复核员');
            expect((0, permissions_1.getRoleName)(types_1.UserRole.SUPERVISOR)).toBe('主管');
            expect((0, permissions_1.getRoleName)(types_1.UserRole.READ_ONLY)).toBe('只读查看');
        });
    });
    describe('Action Permissions', () => {
        it('data_entry should have import permission', () => {
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.DATA_ENTRY, 'import')).toBe(true);
        });
        it('data_entry should NOT have init permission', () => {
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.DATA_ENTRY, 'init')).toBe(false);
        });
        it('reviewer should have reject permission', () => {
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.REVIEWER, 'reject')).toBe(true);
        });
        it('reviewer should NOT have fix permission', () => {
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.REVIEWER, 'fix')).toBe(false);
        });
        it('supervisor should have all permissions', () => {
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.SUPERVISOR, 'init')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.SUPERVISOR, 'import')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.SUPERVISOR, 'check')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.SUPERVISOR, 'fix')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.SUPERVISOR, 'approve')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.SUPERVISOR, 'export')).toBe(true);
        });
        it('read_only should only have report and history permission', () => {
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.READ_ONLY, 'report')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.READ_ONLY, 'history')).toBe(true);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.READ_ONLY, 'import')).toBe(false);
            expect((0, permissions_1.canPerformAction)(types_1.UserRole.READ_ONLY, 'export')).toBe(false);
        });
        it('assertPermission should throw for unauthorized action', () => {
            expect(() => {
                (0, permissions_1.assertPermission)(types_1.UserRole.READ_ONLY, 'import');
            }).toThrow('权限不足');
        });
        it('assertPermission should not throw for authorized action', () => {
            expect(() => {
                (0, permissions_1.assertPermission)(types_1.UserRole.SUPERVISOR, 'import');
            }).not.toThrow();
        });
    });
    describe('Field Permissions', () => {
        it('read_only should NOT see rawData', () => {
            expect((0, permissions_1.canViewField)(types_1.UserRole.READ_ONLY, 'rawData')).toBe(false);
        });
        it('supervisor should see rawData', () => {
            expect((0, permissions_1.canViewField)(types_1.UserRole.SUPERVISOR, 'rawData')).toBe(true);
        });
        it('data_entry should edit batchNumber', () => {
            expect((0, permissions_1.canEditField)(types_1.UserRole.DATA_ENTRY, 'batchNumber')).toBe(true);
        });
        it('reviewer should NOT edit batchNumber', () => {
            expect((0, permissions_1.canEditField)(types_1.UserRole.REVIEWER, 'batchNumber')).toBe(false);
        });
        it('reviewer should edit status', () => {
            expect((0, permissions_1.canEditField)(types_1.UserRole.REVIEWER, 'status')).toBe(true);
        });
        it('read_only should NOT edit anything', () => {
            expect((0, permissions_1.canEditField)(types_1.UserRole.READ_ONLY, 'batchNumber')).toBe(false);
            expect((0, permissions_1.canEditField)(types_1.UserRole.READ_ONLY, 'status')).toBe(false);
        });
    });
});
//# sourceMappingURL=permissions.test.js.map