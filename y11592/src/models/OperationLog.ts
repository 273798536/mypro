import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { DataSourceType, OperationType, RetryStatus } from '../types';

class OperationLog extends Model {
  public id!: string;
  public entityType!: DataSourceType | 'retry_queue' | 'dead_letter_queue';
  public entityId!: string;
  public operationType!: OperationType;
  public oldValues?: Record<string, any>;
  public newValues?: Record<string, any>;
  public changedFields?: string[] | string;
  public previousStatus?: RetryStatus;
  public newStatus?: RetryStatus;
  public operatorId!: string;
  public operatorName?: string;
  public remark?: string;
  public ipAddress?: string;
  public userAgent?: string;
  public batchId?: string;
  public readonly createdAt!: Date;
}

OperationLog.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    entityType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    entityId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    operationType: {
      type: DataTypes.ENUM(
        OperationType.SUBMIT,
        OperationType.UPDATE,
        OperationType.CANCEL,
        OperationType.RETRY,
        OperationType.MANUAL_DECISION,
        OperationType.FREEZE,
        OperationType.UNFREEZE,
        OperationType.EXPORT
      ),
      allowNull: false,
    },
    oldValues: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    newValues: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    changedFields: {
      type: DataTypes.TEXT,
      allowNull: true,
      get() {
        const raw = this.getDataValue('changedFields');
        if (!raw) return undefined;
        try {
          return JSON.parse(raw);
        } catch {
          return raw;
        }
      },
      set(val: string[] | string | undefined) {
        if (Array.isArray(val)) {
          this.setDataValue('changedFields', JSON.stringify(val));
        } else {
          this.setDataValue('changedFields', val as any);
        }
      },
    },
    previousStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    newStatus: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    operatorId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    operatorName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    remark: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'operation_logs',
    timestamps: true,
    updatedAt: false,
    indexes: [
      { fields: ['entityType', 'entityId'] },
      { fields: ['operationType'] },
      { fields: ['operatorId'] },
      { fields: ['batchId'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default OperationLog;
