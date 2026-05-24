import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { QueueStatus, RetryCategory, DataSource, SigninType } from './types';

interface CompensationQueueAttributes {
  id: number;
  queueNo: string;
  source: DataSource;
  sourceRecordId?: number;
  sourceRecordNo?: string;
  signinType: SigninType;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  signinTime?: Date;
  status: QueueStatus;
  retryCategory: RetryCategory;
  retryCount: number;
  maxRetryCount: number;
  lastRetryTime?: Date;
  nextRetryTime?: Date;
  errorMessage?: string;
  errorStack?: string;
  originalData?: any;
  correctedData?: any;
  isProxy: boolean;
  proxyEmployeeId?: string;
  proxyEmployeeName?: string;
  handledBy?: number;
  handledAt?: Date;
  handleRemark?: string;
  compensatedRecordId?: number;
  closedBy?: number;
  closedAt?: Date;
  closeReason?: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface CompensationQueueCreationAttributes extends Optional<CompensationQueueAttributes, 'id' | 'createdAt' | 'updatedAt' | 'retryCount' | 'isProxy' | 'maxRetryCount'> {}

class CompensationQueue extends Model<CompensationQueueAttributes, CompensationQueueCreationAttributes> implements CompensationQueueAttributes {
  public id!: number;
  public queueNo!: string;
  public source!: DataSource;
  public sourceRecordId?: number;
  public sourceRecordNo?: string;
  public signinType!: SigninType;
  public employeeId!: string;
  public employeeName!: string;
  public department!: string;
  public trainingId!: string;
  public trainingName!: string;
  public trainingDate!: Date;
  public signinTime?: Date;
  public status!: QueueStatus;
  public retryCategory!: RetryCategory;
  public retryCount!: number;
  public maxRetryCount!: number;
  public lastRetryTime?: Date;
  public nextRetryTime?: Date;
  public errorMessage?: string;
  public errorStack?: string;
  public originalData?: any;
  public correctedData?: any;
  public isProxy!: boolean;
  public proxyEmployeeId?: string;
  public proxyEmployeeName?: string;
  public handledBy?: number;
  public handledAt?: Date;
  public handleRemark?: string;
  public compensatedRecordId?: number;
  public closedBy?: number;
  public closedAt?: Date;
  public closeReason?: string;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

CompensationQueue.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    queueNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'queue_no'
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    sourceRecordId: {
      type: DataTypes.INTEGER,
      field: 'source_record_id'
    },
    sourceRecordNo: {
      type: DataTypes.STRING(50),
      field: 'source_record_no'
    },
    signinType: {
      type: DataTypes.ENUM(...Object.values(SigninType)),
      allowNull: false,
      field: 'signin_type'
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
    signinTime: {
      type: DataTypes.DATE,
      field: 'signin_time'
    },
    status: {
      type: DataTypes.ENUM(...Object.values(QueueStatus)),
      allowNull: false,
      defaultValue: QueueStatus.PENDING
    },
    retryCategory: {
      type: DataTypes.ENUM(...Object.values(RetryCategory)),
      allowNull: false,
      field: 'retry_category'
    },
    retryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'retry_count'
    },
    maxRetryCount: {
      type: DataTypes.INTEGER,
      defaultValue: 5,
      field: 'max_retry_count'
    },
    lastRetryTime: {
      type: DataTypes.DATE,
      field: 'last_retry_time'
    },
    nextRetryTime: {
      type: DataTypes.DATE,
      field: 'next_retry_time'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      field: 'error_message'
    },
    errorStack: {
      type: DataTypes.TEXT,
      field: 'error_stack'
    },
    originalData: {
      type: DataTypes.JSONB,
      field: 'original_data'
    },
    correctedData: {
      type: DataTypes.JSONB,
      field: 'corrected_data'
    },
    isProxy: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_proxy'
    },
    proxyEmployeeId: {
      type: DataTypes.STRING(50),
      field: 'proxy_employee_id'
    },
    proxyEmployeeName: {
      type: DataTypes.STRING(50),
      field: 'proxy_employee_name'
    },
    handledBy: {
      type: DataTypes.INTEGER,
      field: 'handled_by'
    },
    handledAt: {
      type: DataTypes.DATE,
      field: 'handled_at'
    },
    handleRemark: {
      type: DataTypes.TEXT,
      field: 'handle_remark'
    },
    compensatedRecordId: {
      type: DataTypes.INTEGER,
      field: 'compensated_record_id'
    },
    closedBy: {
      type: DataTypes.INTEGER,
      field: 'closed_by'
    },
    closedAt: {
      type: DataTypes.DATE,
      field: 'closed_at'
    },
    closeReason: {
      type: DataTypes.TEXT,
      field: 'close_reason'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    }
  },
  {
    sequelize,
    modelName: 'CompensationQueue',
    tableName: 'compensation_queue',
    timestamps: true,
    indexes: [
      { fields: ['queue_no'], unique: true },
      { fields: ['status'] },
      { fields: ['retry_category'] },
      { fields: ['employee_id', 'training_id', 'training_date'] },
      { fields: ['training_id'] },
      { fields: ['training_date'] },
      { fields: ['department'] },
      { fields: ['source'] },
      { fields: ['next_retry_time'] },
      { fields: ['created_at'] }
    ]
  }
);

export default CompensationQueue;
