import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';
import { DataSourceType, IdempotencyStrategy } from '../types';

class DeadLetterQueue extends Model {
  public id!: string;
  public originalRetryQueueId!: string;
  public sourceType!: DataSourceType;
  public sourceId!: string;
  public sourceData!: Record<string, any>;
  public attemptCount!: number;
  public maxAttempts!: number;
  public lastError?: string;
  public errorStack?: string;
  public deadLetterReason!: string;
  public idempotencyKey!: string;
  public idempotencyStrategy!: IdempotencyStrategy;
  public submittedBy!: string;
  public submittedAt!: Date;
  public resolvedBy?: string;
  public resolvedAt?: Date;
  public resolution?: string;
  public batchId?: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

DeadLetterQueue.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    originalRetryQueueId: {
      type: DataTypes.UUID,
      allowNull: false,
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
    lastError: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    deadLetterReason: {
      type: DataTypes.STRING(255),
      allowNull: false,
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
    },
    submittedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    resolvedBy: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resolution: {
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
    tableName: 'dead_letter_queue',
    indexes: [
      { fields: ['idempotencyKey'], unique: true },
      { fields: ['sourceType', 'sourceId'] },
      { fields: ['resolvedAt'] },
      { fields: ['batchId'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default DeadLetterQueue;
