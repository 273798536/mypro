import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import { Operator } from '../types';

interface AuditLogAttributes {
  id: string;
  ticketId?: string;
  batchId?: string;
  action: string;
  fieldName?: string;
  oldValue?: string;
  newValue?: string;
  operator: Operator;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  metadata?: Record<string, unknown>;
}

interface AuditLogCreationAttributes
  extends Optional<AuditLogAttributes, 'id' | 'timestamp'> {}

class AuditLogModel
  extends Model<AuditLogAttributes, AuditLogCreationAttributes>
  implements AuditLogAttributes
{
  public id!: string;
  public ticketId?: string;
  public batchId?: string;
  public action!: string;
  public fieldName?: string;
  public oldValue?: string;
  public newValue?: string;
  public operator!: Operator;
  public timestamp!: Date;
  public ipAddress?: string;
  public userAgent?: string;
  public requestId?: string;
  public metadata?: Record<string, unknown>;
}

AuditLogModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: true,
      index: true,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: true,
      index: true,
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
      index: true,
    },
    fieldName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    oldValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    newValue: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    operator: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    ipAddress: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    requestId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'audit_logs',
    indexes: [
      { fields: ['ticketId', 'timestamp'] },
      { fields: ['action', 'timestamp'] },
      { fields: ['operator.id'] },
    ],
  }
);

export default AuditLogModel;
