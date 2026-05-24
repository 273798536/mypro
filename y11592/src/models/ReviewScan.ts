import { DataTypes, Model } from 'sequelize';
import sequelize from '../database/connection';

class ReviewScan extends Model {
  public id!: string;
  public scanNo!: string;
  public waveNo!: string;
  public warehouseCode!: string;
  public orderNo!: string;
  public skuCode!: string;
  public scannedQty!: number;
  public scannerId?: string;
  public scannerName?: string;
  public scanTime!: Date;
  public isAnomaly!: boolean;
  public anomalyType?: string;
  public extra?: Record<string, any>;
  public batchId?: string;
  public isDeleted!: boolean;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ReviewScan.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    scanNo: {
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
      allowNull: false,
    },
    skuCode: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    scannedQty: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    scannerId: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    scannerName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    scanTime: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    isAnomaly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    anomalyType: {
      type: DataTypes.STRING(100),
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
    tableName: 'review_scans',
    indexes: [
      { fields: ['scanNo', 'warehouseCode'], unique: true },
      { fields: ['waveNo'] },
      { fields: ['orderNo'] },
      { fields: ['isAnomaly'] },
      { fields: ['batchId'] },
      { fields: ['createdAt'] },
    ],
  }
);

export default ReviewScan;
