import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { DataSourceType, RetryStatus, IdempotencyStrategy } from '../types';

class RetryQueue extends Model {
  public id!: string;
  public sourceType!: DataSourceType;
  public sourceId!: string;
  public sourceData!: Record<string, any>;
  public status!: RetryStatus;
  public attemptCount!: number;
  public maxAttempts!: number;
  public nextAttemptAt?: Date;
  public lastAttemptAt?: Date;
  public lastError?: string;
  public errorStack?: string;
  public frozenBy?: string;
  public frozenAt?: Date;
  public frozenReason?: string;
  public manualDecisionBy?: string;
  public manualDecisionAt?: Date;
  public manualDecisionNote?: string;
  public idempotencyKey!: string;
  public idempotencyStrategy!: IdempotencyStrategy;
  public submittedBy!: string;
  public submittedAt!: Date;
  public batchId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RetryQueue.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    sourceType: {
      type: DataTypes.ENUM(
        DataSourceType.WAVE_ORDER,
        DataSourceType.PICKING_DIFFERENCE,
        DataSourceType.REVIEW_SCAN,
        DataSourceType.SUPERVISOR_NOTE,
        DataSourceType.STOCK_SPLIT
      ),
      allowNull: false,
    },
    sourceId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sourceData: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        RetryStatus.PENDING,
        RetryStatus.PROCESSING,
        RetryStatus.SUCCESS,
        RetryStatus.FAILED,
        RetryStatus.MANUAL,
        RetryStatus.CANCELLED,
        RetryStatus.FROZEN,
        RetryStatus.DEAD_LETTER
      ),
      allowNull: false,
      defaultValue: RetryStatus.PENDING,
    },
    attemptCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    maxAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
    },
    nextAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastAttemptAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    frozenBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    frozenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    frozenReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    manualDecisionBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    manualDecisionAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    manualDecisionNote: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    idempotencyStrategy: {
      type: DataTypes.ENUM(
        IdempotencyStrategy.IGNORE,
        IdempotencyStrategy.OVERWRITE,
        IdempotencyStrategy.APPEND
      ),
      allowNull: false,
      defaultValue: IdempotencyStrategy.IGNORE,
    },
    submittedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'retry_queue',
    indexes: [
      { fields: ['idempotencyKey'], unique: true },
      { fields: ['status'] },
      { fields: ['sourceType', 'sourceId'] },
      { fields: ['nextAttemptAt'] },
      { fields: ['batchId'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default RetryQueue;
