import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import {
  TicketStatus,
  IdempotencyMode,
  RetryCategory,
  TicketData,
  Operator,
  CompensationTicket,
} from '../types';

interface CompensationTicketAttributes extends CompensationTicket {}

interface CompensationTicketCreationAttributes
  extends Optional<
    CompensationTicketAttributes,
    | 'id'
    | 'retryCount'
    | 'maxRetries'
    | 'isFrozen'
    | 'createdAt'
    | 'updatedAt'
    | 'idempotencyMode'
  > {}

class CompensationTicketModel
  extends Model<CompensationTicketAttributes, CompensationTicketCreationAttributes>
  implements CompensationTicketAttributes
{
  public id!: string;
  public batchId!: string;
  public ticketNo!: string;
  public status!: TicketStatus;
  public data!: TicketData;
  public retryCount!: number;
  public maxRetries!: number;
  public lastRetryAt?: Date;
  public nextRetryAt?: Date;
  public retryCategory?: RetryCategory;
  public isFrozen!: boolean;
  public frozenAt?: Date;
  public frozenBy?: Operator;
  public frozenReason?: string;
  public manualOverride?: boolean;
  public overrideBy?: Operator;
  public overrideReason?: string;
  public compensatedAt?: Date;
  public closedAt?: Date;
  public idempotencyKey!: string;
  public idempotencyMode!: IdempotencyMode;
  public createdAt!: Date;
  public updatedAt!: Date;
  public submittedBy!: Operator;
}

CompensationTicketModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    ticketNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.ENUM(...Object.values(TicketStatus)),
      allowNull: false,
      defaultValue: TicketStatus.PENDING,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    retryCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    maxRetries: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    },
    lastRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    retryCategory: {
      type: DataTypes.ENUM(...Object.values(RetryCategory)),
      allowNull: true,
    },
    isFrozen: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    frozenAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    frozenBy: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    frozenReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    manualOverride: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    overrideBy: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    overrideReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    compensatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    idempotencyKey: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    idempotencyMode: {
      type: DataTypes.ENUM(...Object.values(IdempotencyMode)),
      allowNull: false,
      defaultValue: IdempotencyMode.IGNORE,
    },
    submittedBy: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'compensation_tickets',
    indexes: [
      { fields: ['batchId', 'status'] },
      { fields: ['status', 'nextRetryAt'] },
      { fields: ['idempotencyKey', 'idempotencyMode'] },
    ],
  }
);

export default CompensationTicketModel;
