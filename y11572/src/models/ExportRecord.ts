import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../database/connection';
import { Operator } from '../types';

interface ExportRecordAttributes {
  id: string;
  batchId?: string;
  exportType: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filters: Record<string, unknown>;
  fileName: string;
  filePath: string;
  recordCount: number;
  frozenUntil: Date;
  exportedBy: Operator;
  createdAt: Date;
  completedAt?: Date;
  errorMessage?: string;
  fileSize?: number;
}

interface ExportRecordCreationAttributes
  extends Optional<
    ExportRecordAttributes,
    'id' | 'createdAt' | 'recordCount' | 'status'
  > {}

class ExportRecordModel
  extends Model<ExportRecordAttributes, ExportRecordCreationAttributes>
  implements ExportRecordAttributes
{
  public id!: string;
  public batchId?: string;
  public exportType!: string;
  public status!: 'pending' | 'processing' | 'completed' | 'failed';
  public filters!: Record<string, unknown>;
  public fileName!: string;
  public filePath!: string;
  public recordCount!: number;
  public frozenUntil!: Date;
  public exportedBy!: Operator;
  public createdAt!: Date;
  public completedAt?: Date;
  public errorMessage?: string;
  public fileSize?: number;
}

ExportRecordModel.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    exportType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    filters: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    recordCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    frozenUntil: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    exportedBy: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fileSize: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: 'export_records',
    indexes: [
      { fields: ['status', 'createdAt'] },
      { fields: ['frozenUntil'] },
    ],
  }
);

export default ExportRecordModel;
