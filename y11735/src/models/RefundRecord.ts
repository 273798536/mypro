import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface RefundRecordAttributes {
  id?: number;
  recordNo: string;
  batchNo: string;
  studentId: string;
  name?: string;
  cardNo: string;
  originalBalance: number;
  selfRechargeRefund: number;
  subsidyRefund: number;
  nonRefundableAmount: number;
  actualRefundAmount: number;
  status: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed';
  statusReason?: string;
  warnings?: string;
  operator?: string;
  reviewDate?: Date;
  bankCard?: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class RefundRecord extends Model<RefundRecordAttributes> implements RefundRecordAttributes {
  public id!: number;
  public recordNo!: string;
  public batchNo!: string;
  public studentId!: string;
  public name?: string;
  public cardNo!: string;
  public originalBalance!: number;
  public selfRechargeRefund!: number;
  public subsidyRefund!: number;
  public nonRefundableAmount!: number;
  public actualRefundAmount!: number;
  public status!: 'pending' | 'approved' | 'rejected' | 'processed' | 'failed';
  public statusReason?: string;
  public warnings?: string;
  public operator?: string;
  public reviewDate?: Date;
  public bankCard?: string;
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

RefundRecord.init(
  {
    recordNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    batchNo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100)
    },
    cardNo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    originalBalance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    },
    selfRechargeRefund: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '自充退款'
    },
    subsidyRefund: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '补贴退款'
    },
    nonRefundableAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '不可退金额'
    },
    actualRefundAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '实际退款金额'
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processed', 'failed'),
      allowNull: false,
      defaultValue: 'pending'
    },
    statusReason: {
      type: DataTypes.STRING(500),
      comment: '状态原因'
    },
    warnings: {
      type: DataTypes.TEXT,
      comment: '警告信息（JSON格式）'
    },
    operator: {
      type: DataTypes.STRING(100)
    },
    reviewDate: {
      type: DataTypes.DATE
    },
    bankCard: {
      type: DataTypes.STRING(50)
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '导入',
      comment: '数据来源'
    }
  },
  {
    sequelize,
    modelName: 'RefundRecord',
    tableName: 'refund_records'
  }
);

export default RefundRecord;
