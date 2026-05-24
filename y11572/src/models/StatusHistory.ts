import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import { TicketStatus, Operator } from '../types';

interface StatusHistoryAttributes {
  id: string;
  ticketId: string;
  fromStatus: TicketStatus;
  toStatus: TicketStatus;
  changedAt: Date;
  operator: Operator;
  reason: string;
  metadata?: Record<string, unknown>;
}

interface StatusHistoryCreationAttributes
  extends Optional<StatusHistoryAttributes, 'id' | 'changedAt'> {}

class StatusHistoryModel
  extends Model<StatusHistoryAttributes, StatusHistoryCreationAttributes>
  implements StatusHistoryAttributes
{
  public id!: string;
  public ticketId!: string;
  public fromStatus!: TicketStatus;
  public toStatus!: TicketStatus;
  public changedAt!: Date;
  public operator!: Operator;
  public reason!: string;
  public metadata?: Record<string, unknown>;
}

StatusHistoryModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    ticketId: {
      type: DataTypes.UUID,
      allowNull: false,
      index: true,
      references: {
        model: 'compensation_tickets',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    fromStatus: {
      type: DataTypes.ENUM(...Object.values(TicketStatus)),
      allowNull: false,
    },
    toStatus: {
      type: DataTypes.ENUM(...Object.values(TicketStatus)),
      allowNull: false,
      index: true,
    },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    operator: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    reason: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'status_history',
    indexes: [
      { fields: ['ticketId', 'changedAt'] },
      { fields: ['toStatus', 'changedAt'] },
    ],
  }
);

export default StatusHistoryModel;
