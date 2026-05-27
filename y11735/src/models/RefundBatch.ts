import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface RefundBatchAttributes {
  id?: number;
  batchNo: string;
  batchName: string;
  totalCount: number;
  totalAmount: number;
  status: 'draft' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  operator?: string;
  reviewer?: string;
  reviewDate?: Date;
  remarks?: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class RefundBatch extends Model<RefundBatchAttributes> implements RefundBatchAttributes {
  public id!: number;
  public batchNo!: string;
  public batchName!: string;
  public totalCount!: number;
  public totalAmount!: number;
  public status!: 'draft' | 'reviewing' | 'approved' | 'rejected' | 'completed';
  public operator?: string;
  public reviewer?: string;
  public reviewDate?: Date;
  public remarks?: string;
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RefundBatch.init(
  {
    batchNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    batchName: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    totalCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('draft', 'reviewing', 'approved', 'rejected', 'completed'),
      allowNull: false,
      defaultValue: 'draft'
    },
    operator: {
      type: DataTypes.STRING(100)
    },
    reviewer: {
      type: DataTypes.STRING(100)
    },
    reviewDate: {
      type: DataTypes.DATE
    },
    remarks: {
      type: DataTypes.TEXT
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '退款清单导入',
      comment: '数据来源'
    }
  },
  {
    sequelize,
    modelName: 'RefundBatch',
    tableName: 'refund_batches'
  }
);

export default RefundBatch;
