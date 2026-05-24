import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { AuditAction, QueueStatus, RetryCategory, DataSource } from './types';

interface AuditLogAttributes {
  id: number;
  logNo: string;
  action: AuditAction;
  source: DataSource;
  recordType: string;
  recordId?: number;
  recordNo?: string;
  queueId?: number;
  queueNo?: string;
  oldStatus?: QueueStatus;
  newStatus?: QueueStatus;
  retryCategory?: RetryCategory;
  beforeData?: any;
  afterData?: any;
  changeReason?: string;
  operatorId?: number;
  operatorName?: string;
  operatorRole?: string;
  ipAddress?: string;
  userAgent?: string;
  remark?: string;
  createdAt?: Date;
}

interface AuditLogCreationAttributes extends Optional<AuditLogAttributes, 'id' | 'createdAt'> {}

class AuditLog extends Model<AuditLogAttributes, AuditLogCreationAttributes> implements AuditLogAttributes {
  public id!: number;
  public logNo!: string;
  public action!: AuditAction;
  public source!: DataSource;
  public recordType!: string;
  public recordId?: number;
  public recordNo?: string;
  public queueId?: number;
  public queueNo?: string;
  public oldStatus?: QueueStatus;
  public newStatus?: QueueStatus;
  public retryCategory?: RetryCategory;
  public beforeData?: any;
  public afterData?: any;
  public changeReason?: string;
  public operatorId?: number;
  public operatorName?: string;
  public operatorRole?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public remark?: string;
  public readonly createdAt!: Date;
}

AuditLog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    logNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'log_no'
    },
    action: {
      type: DataTypes.ENUM(...Object.values(AuditAction)),
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    recordType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'record_type'
    },
    recordId: {
      type: DataTypes.INTEGER,
      field: 'record_id'
    },
    recordNo: {
      type: DataTypes.STRING(50),
      field: 'record_no'
    },
    queueId: {
      type: DataTypes.INTEGER,
      field: 'queue_id'
    },
    queueNo: {
      type: DataTypes.STRING(50),
      field: 'queue_no'
    },
    oldStatus: {
      type: DataTypes.ENUM(...Object.values(QueueStatus)),
      field: 'old_status'
    },
    newStatus: {
      type: DataTypes.ENUM(...Object.values(QueueStatus)),
      field: 'new_status'
    },
    retryCategory: {
      type: DataTypes.ENUM(...Object.values(RetryCategory)),
      field: 'retry_category'
    },
    beforeData: {
      type: DataTypes.JSONB,
      field: 'before_data'
    },
    afterData: {
      type: DataTypes.JSONB,
      field: 'after_data'
    },
    changeReason: {
      type: DataTypes.TEXT,
      field: 'change_reason'
    },
    operatorId: {
      type: DataTypes.INTEGER,
      field: 'operator_id'
    },
    operatorName: {
      type: DataTypes.STRING(50),
      field: 'operator_name'
    },
    operatorRole: {
      type: DataTypes.STRING(50),
      field: 'operator_role'
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      field: 'ip_address'
    },
    userAgent: {
      type: DataTypes.STRING(500),
      field: 'user_agent'
    },
    remark: {
      type: DataTypes.TEXT
    }
  },
  {
    sequelize,
    modelName: 'AuditLog',
    tableName: 'audit_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['log_no'], unique: true },
      { fields: ['action'] },
      { fields: ['source'] },
      { fields: ['record_type', 'record_id'] },
      { fields: ['queue_id'] },
      { fields: ['operator_id'] },
      { fields: ['created_at'] }
    ]
  }
);

export default AuditLog;
