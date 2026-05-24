import { Model, Optional } from 'sequelize';
import { DataSource, SigninType } from './types';
interface SigninRecordAttributes {
    id: number;
    signinNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    signinTime: Date;
    signinType: SigninType;
    source: DataSource;
    sourceFile?: string;
    qrcodeId?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    isProxy: boolean;
    proxyEmployeeId?: string;
    proxyEmployeeName?: string;
    isCompensated: boolean;
    compensationSource?: string;
    isValid: boolean;
    validationRemark?: string;
    createdBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
interface SigninRecordCreationAttributes extends Optional<SigninRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isProxy' | 'isCompensated' | 'isValid'> {
}
declare class SigninRecord extends Model<SigninRecordAttributes, SigninRecordCreationAttributes> implements SigninRecordAttributes {
    id: number;
    signinNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    signinTime: Date;
    signinType: SigninType;
    source: DataSource;
    sourceFile?: string;
    qrcodeId?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    isProxy: boolean;
    proxyEmployeeId?: string;
    proxyEmployeeName?: string;
    isCompensated: boolean;
    compensationSource?: string;
    isValid: boolean;
    validationRemark?: string;
    createdBy?: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default SigninRecord;
