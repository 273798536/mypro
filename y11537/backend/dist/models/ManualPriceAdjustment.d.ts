import { Model, Optional } from 'sequelize';
import { DataSource } from './types';
interface ManualPriceAdjustmentAttributes {
    id: number;
    adjustmentNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    originalPrice: number;
    adjustedPrice: number;
    adjustmentReason: string;
    effectiveDate: Date;
    source: DataSource;
    sourceFile?: string;
    approvedBy?: string;
    approvalTime?: Date;
    isApproved: boolean;
    remark?: string;
    createdBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
interface ManualPriceAdjustmentCreationAttributes extends Optional<ManualPriceAdjustmentAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isApproved'> {
}
declare class ManualPriceAdjustment extends Model<ManualPriceAdjustmentAttributes, ManualPriceAdjustmentCreationAttributes> implements ManualPriceAdjustmentAttributes {
    id: number;
    adjustmentNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    originalPrice: number;
    adjustedPrice: number;
    adjustmentReason: string;
    effectiveDate: Date;
    source: DataSource;
    sourceFile?: string;
    approvedBy?: string;
    approvalTime?: Date;
    isApproved: boolean;
    remark?: string;
    createdBy?: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default ManualPriceAdjustment;
