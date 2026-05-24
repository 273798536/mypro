import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import { RetryCategory, Operator } from '../types';

interface DeadLetterAttributes {
  id: string;
  ticketId: string;
  batchId: string;
  failedAt: Date;
  lastError: string;
  errorStack?: string;
  retryCount: number;
  retryCategory: RetryCategory;
  canBeRecovered: boolean;
  recoverySuggestion?: string;
  isRecovered: boolean;
  recoveredAt?: Date;
  recoveredBy?: Operator;
  recoveryNotes?: string;
  originalMessage: Record<string, unknown>;
}

interface DeadLetterCreationAttributes
  extends Optional<DeadLetterAttributes, 'id' | 'failedAt' | 'isRecovered'> {}

class DeadLetterModel
  extends Model<DeadLetterAttributes, DeadLetterCreationAttributes>
  implements DeadLetterAttributes
{
  public id!: string;
  public ticketId!: string;
  public batchId!: string;
  public failedAt!: Date;
  public lastError!: string;
  public errorStack?: string;
  public retryCount!: number;
  public retryCategory!: RetryCategory;
  public canBeRecovered!: boolean;
  public recoverySuggestion?: string;
  public isRecovered!: boolean;
  public recoveredAt?: Date;
  public recoveredBy?: Operator;
  public recoveryNotes?: string;
  public originalMessage!: Record<string, unknown>;
}

DeadLetterModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      index: true,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true,
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      index: true,
    },
    lastError: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    retryCategory: {
      type: DataTypes.ENUM(...Object.values(RetryCategory)),
      allowNull: false,
      index: true,
    },
    canBeRecovered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    recoverySuggestion: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isRecovered: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      index: true,
    },
    recoveredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    recoveredBy: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    recoveryNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    originalMessage: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    sequelize,
    tableName: 'dead_letters',
    indexes: [
      { fields: ['isRecovered', 'retryCategory'] },
      { fields: ['batchId', 'failedAt'] },
    ],
  }
);

export default DeadLetterModel;
