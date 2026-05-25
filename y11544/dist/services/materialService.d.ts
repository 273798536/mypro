import { Database } from '../database';
import { Material, MaterialStatus, StatusChangeLog, CreateMaterialRequest, StatusChangeRequest } from '../types';
export declare class MaterialService {
    private db;
    constructor(db?: Database);
    createMaterial(request: CreateMaterialRequest, role?: string): Promise<Material>;
    getMaterial(materialId: string): Promise<Material | undefined>;
    getMaterialDetail(materialId: string): Promise<any>;
    changeStatus(request: StatusChangeRequest, role?: string): Promise<Material>;
    submitForReview(materialId: string, submittedBy: string): Promise<Material>;
    rejectMaterial(materialId: string, rejectedBy: string, reason: string): Promise<Material>;
    secondaryConfirm(materialId: string, confirmedBy: string): Promise<Material>;
    listMaterials(status?: MaterialStatus, page?: number, pageSize?: number): Promise<{
        items: Material[];
        total: number;
        page: number;
        pageSize: number;
    }>;
    getStatusHistory(materialId: string): Promise<StatusChangeLog[]>;
}
export declare const materialService: MaterialService;
