import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

class PickingDifference extends Model {
  public id!: string;
  public differenceNo!: string;
  public waveNo!: string;
  public warehouseCode!: string;
  public orderNo?: string;
  public skuCode!: string;
  public expectedQty!: number;
  public actualQty!: number;
  public differenceQty!: number;
  public differenceType!: string;
  public differenceReason?: string;
  public handlerId?: string;
  public handlerName?: string;
  public isResolved!: boolean;
  public resolution?: string;
  public extra?: Record<string, any>;
  public batchId?: string;
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

PickingDifference.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    differenceNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    waveNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    warehouseCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    orderNo: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    skuCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    expectedQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    actualQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    differenceQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    differenceType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    differenceReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    handlerId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    handlerName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    resolution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    extra: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    batchId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    isDeleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    tableName: 'picking_differences',
    indexes: [
      { fields: ['differenceNo', 'warehouseCode'], unique: true },
      { fields: ['waveNo'] },
      { fields: ['isResolved'] },
      { fields: ['batchId'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default PickingDifference;
