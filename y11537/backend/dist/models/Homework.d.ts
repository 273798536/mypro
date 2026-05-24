import { Model, Optional } from 'sequelize';
import { DataSource } from './types';
interface HomeworkAttributes {
    id: number;
    homeworkNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    submitTime: Date;
    homeworkTitle: string;
    homeworkContent?: string;
    score?: number;
    grade?: string;
    source: DataSource;
    sourceFile?: string;
    remark?: string;
    createdBy?: number;
    createdAt?: Date;
    updatedAt?: Date;
}
interface HomeworkCreationAttributes extends Optional<HomeworkAttributes, 'id' | 'createdAt' | 'updatedAt'> {
}
declare class Homework extends Model<HomeworkAttributes, HomeworkCreationAttributes> implements HomeworkAttributes {
    id: number;
    homeworkNo: string;
    employeeId: string;
    employeeName: string;
    department: string;
    trainingId: string;
    trainingName: string;
    trainingDate: Date;
    submitTime: Date;
    homeworkTitle: string;
    homeworkContent?: string;
    score?: number;
    grade?: string;
    source: DataSource;
    sourceFile?: string;
    remark?: string;
    createdBy?: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}
export default Homework;
