import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface AuditLogAttributes {
  id?: number;
  logId: string;
  operationType: string;
  module: string;
  batchNo?: string;
  recordNo?: string;
  studentId?: string;
  operator: string;
  beforeData?: string;
  afterData?: string;
  changeReason?: string;
  ipAddress?: string;
  createdAt?: Date;
}

class AuditLog extends Model<AuditLogAttributes> implements AuditLogAttributes {
  public id!: number;
  public logId!: string;
  public operationType!: string;
  public module!: string;
  public batchNo?: string;
  public recordNo?: string;
  public studentId?: string;
  public operator!: string;
  public beforeData?: string;
  public afterData?: string;
  public changeReason?: string;
  public ipAddress?: string;
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    logId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    operationType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '操作类型：create/update/delete/import/export/review'
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '模块：batch/record/student/card'
    },
    batchNo: {
      type: DataTypes.STRING(50)
    },
    recordNo: {
      type: DataTypes.STRING(50)
    },
    studentId: {
      type: DataTypes.STRING(50)
    },
    operator: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    beforeData: {
      type: DataTypes.TEXT,
      comment: '修改前数据（JSON）'
    },
    afterData: {
      type: DataTypes.TEXT,
      comment: '修改后数据（JSON）'
    },
    changeReason: {
      type: DataTypes.STRING(500),
      comment: '修改原因'
    },
    ipAddress: {
      type: DataTypes.STRING(50)
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    updatedAt: false
  }
);

export default AuditLog;
