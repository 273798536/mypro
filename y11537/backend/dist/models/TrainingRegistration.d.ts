import { Model, Optional } from 'sequelize';
import { DataSource } from './types';
interface TrainingRegistrationAttributes {
    id: number;
    registrationNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    trainingLocation: string;
    trainer: string;
    source: DataSource;
    sourceFile?: string;
    batchNo?: string;
    remark?: string;
    createdBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
interface TrainingRegistrationCreationAttributes extends Optional<TrainingRegistrationAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class TrainingRegistration extends Model<TrainingRegistrationAttributes, TrainingRegistrationCreationAttributes> implements TrainingRegistrationAttributes {
    id: number;
    registrationNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    trainingLocation: string;
    trainer: string;
    source: DataSource;
    sourceFile?: string;
    batchNo?: string;
    remark?: string;
    createdBy?: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default TrainingRegistration;
