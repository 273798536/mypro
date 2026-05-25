import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import { RetryCategory } from '../types';

interface RetryRecordAttributes {
  id: string;
  ticketId: string;
  attempt: number;
  attemptedAt: Date;
  category: RetryCategory;
  errorMessage: string;
  errorStack?: string;
  nextRetryAt?: Date;
  executedBy: string;
  success: boolean;
  responseData?: Record<string, unknown>;
}

interface RetryRecordCreationAttributes
  extends Optional<RetryRecordAttributes, 'id' | 'attemptedAt'> {}

class RetryRecordModel
  extends Model<RetryRecordAttributes, RetryRecordCreationAttributes>
  implements RetryRecordAttributes
{
  public id!: string;
  public ticketId!: string;
  public attempt!: number;
  public attemptedAt!: Date;
  public category!: RetryCategory;
  public errorMessage!: string;
  public errorStack?: string;
  public nextRetryAt?: Date;
  public executedBy!: string;
  public success!: boolean;
  public responseData?: Record<string, unknown>;
}

RetryRecordModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'compensation_tickets',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    attempt: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    attemptedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    category: {
      type: DataTypes.ENUM(...Object.values(RetryCategory)),
      allowNull: false,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    nextRetryAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    executedBy: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    success: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    responseData: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'retry_records',
    indexes: [
      { fields: ['ticketId', 'attempt'] },
      { fields: ['category', 'success'] },
    ],
  }
);

export default RetryRecordModel;
