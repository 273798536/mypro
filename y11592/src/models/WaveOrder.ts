import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

class WaveOrder extends Model {
  public id!: string;
  public waveNo!: string;
  public warehouseCode!: string;
  public waveType!: string;
  public pickerId?: string;
  public pickerName?: string;
  public totalOrders!: number;
  public totalSkus!: number;
  public totalQty!: number;
  public pickedQty?: number;
  public status!: string;
  public waveStartTime?: Date;
  public waveEndTime?: Date;
  public performanceData?: Record<string, any>;
  public inventoryData?: Record<string, any>;
  public extra?: Record<string, any>;
  public batchId?: string;
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

WaveOrder.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    waveNo: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    warehouseCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    waveType: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    pickerId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    pickerName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalSkus: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    totalQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    pickedQty: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    waveStartTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    waveEndTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    performanceData: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    inventoryData: {
      type: DataTypes.JSONB,
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
    tableName: 'wave_orders',
    indexes: [
      { fields: ['waveNo', 'warehouseCode'], unique: true },
      { fields: ['batchId'] },
      { fields: ['status'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default WaveOrder;
