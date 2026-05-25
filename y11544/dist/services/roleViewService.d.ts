import { Database } from '../database';
import { UserRole } from '../types';
export declare class RoleViewService {
    private db;
    constructor(db?: Database);
    getRoleDashboard(role: UserRole): Promise<any>;
    private getBaseStats;
    private getOperatorView;
    private getReviewerView;
    private getManagerView;
    private getAuditorView;
    private getAdminView;
    getMaterialForRole(materialId: string, role: UserRole): Promise<any>;
}
export declare const roleViewService: RoleViewService;
