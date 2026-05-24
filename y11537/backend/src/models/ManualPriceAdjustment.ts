import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { DataSource } from './types';

interface ManualPriceAdjustmentAttributes {
  id: number;
  adjustmentNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  originalPrice: number;
  adjustedPrice: number;
  adjustmentReason: string;
  effectiveDate: Date;
  source: DataSource;
  sourceFile?: string;
  approvedBy?: string;
  approvalTime?: Date;
  isApproved: boolean;
  remark?: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface ManualPriceAdjustmentCreationAttributes extends Optional<ManualPriceAdjustmentAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isApproved'> {}

class ManualPriceAdjustment extends Model<ManualPriceAdjustmentAttributes, ManualPriceAdjustmentCreationAttributes> implements ManualPriceAdjustmentAttributes {
  public id!: number;
  public adjustmentNo!: string;
  public employeeId!: string;
  public employeeName!: string;
  public department!: string;
  public trainingId!: string;
  public trainingName!: string;
  public trainingDate!: Date;
  public originalPrice!: number;
  public adjustedPrice!: number;
  public adjustmentReason!: string;
  public effectiveDate!: Date;
  public source!: DataSource;
  public sourceFile?: string;
  public approvedBy?: string;
  public approvalTime?: Date;
  public isApproved!: boolean;
  public remark?: string;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

ManualPriceAdjustment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    adjustmentNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'adjustment_no'
    },
    employeeId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'employee_id'
    },
    employeeName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'employee_name'
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    trainingId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'training_id'
    },
    trainingName: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'training_name'
    },
    trainingDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'training_date'
    },
    originalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'original_price'
    },
    adjustedPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: 'adjusted_price'
    },
    adjustmentReason: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'adjustment_reason'
    },
    effectiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'effective_date'
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    sourceFile: {
      type: DataTypes.STRING(255),
      field: 'source_file'
    },
    approvedBy: {
      type: DataTypes.STRING(50),
      field: 'approved_by'
    },
    approvalTime: {
      type: DataTypes.DATE,
      field: 'approval_time'
    },
    isApproved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_approved'
    },
    remark: {
      type: DataTypes.TEXT
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    }
  },
  {
    sequelize,
    modelName: 'ManualPriceAdjustment',
    tableName: 'manual_price_adjustments',
    timestamps: true,
    indexes: [
      { fields: ['adjustment_no'], unique: true },
      { fields: ['employee_id'] },
      { fields: ['training_id'] },
      { fields: ['training_date'] },
      { fields: ['department'] },
      { fields: ['source'] },
      { fields: ['is_approved'] }
    ]
  }
);

export default ManualPriceAdjustment;
