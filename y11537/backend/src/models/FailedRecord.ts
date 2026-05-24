import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { DataSource, RetryCategory } from './types';

interface FailedRecordAttributes {
  id: number;
  failureNo: string;
  source: DataSource;
  recordType: string;
  recordId?: number;
  recordNo?: string;
  queueId?: number;
  queueNo?: string;
  retryCategory: RetryCategory;
  errorCode?: string;
  errorMessage: string;
  errorDetail?: string;
  originalData?: any;
  validationErrors?: any;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: number;
  resolutionMethod?: string;
  resolutionRemark?: string;
  affectedReportFields?: string[];
  excludedFromReport: boolean;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface FailedRecordCreationAttributes extends Optional<FailedRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isResolved' | 'excludedFromReport'> {}

class FailedRecord extends Model<FailedRecordAttributes, FailedRecordCreationAttributes> implements FailedRecordAttributes {
  public id!: number;
  public failureNo!: string;
  public source!: DataSource;
  public recordType!: string;
  public recordId?: number;
  public recordNo?: string;
  public queueId?: number;
  public queueNo?: string;
  public retryCategory!: RetryCategory;
  public errorCode?: string;
  public errorMessage!: string;
  public errorDetail?: string;
  public originalData?: any;
  public validationErrors?: any;
  public isResolved!: boolean;
  public resolvedAt?: Date;
  public resolvedBy?: number;
  public resolutionMethod?: string;
  public resolutionRemark?: string;
  public affectedReportFields?: string[];
  public excludedFromReport!: boolean;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

FailedRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    failureNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'failure_no'
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    recordType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'record_type'
    },
    recordId: {
      type: DataTypes.INTEGER,
      field: 'record_id'
    },
    recordNo: {
      type: DataTypes.STRING(50),
      field: 'record_no'
    },
    queueId: {
      type: DataTypes.INTEGER,
      field: 'queue_id'
    },
    queueNo: {
      type: DataTypes.STRING(50),
      field: 'queue_no'
    },
    retryCategory: {
      type: DataTypes.ENUM(...Object.values(RetryCategory)),
      allowNull: false,
      field: 'retry_category'
    },
    errorCode: {
      type: DataTypes.STRING(50),
      field: 'error_code'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'error_message'
    },
    errorDetail: {
      type: DataTypes.TEXT,
      field: 'error_detail'
    },
    originalData: {
      type: DataTypes.JSONB,
      field: 'original_data'
    },
    validationErrors: {
      type: DataTypes.JSONB,
      field: 'validation_errors'
    },
    isResolved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_resolved'
    },
    resolvedAt: {
      type: DataTypes.DATE,
      field: 'resolved_at'
    },
    resolvedBy: {
      type: DataTypes.INTEGER,
      field: 'resolved_by'
    },
    resolutionMethod: {
      type: DataTypes.STRING(100),
      field: 'resolution_method'
    },
    resolutionRemark: {
      type: DataTypes.TEXT,
      field: 'resolution_remark'
    },
    affectedReportFields: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      field: 'affected_report_fields'
    },
    excludedFromReport: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'excluded_from_report'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    }
  },
  {
    sequelize,
    modelName: 'FailedRecord',
    tableName: 'failed_records',
    timestamps: true,
    indexes: [
      { fields: ['failure_no'], unique: true },
      { fields: ['source'] },
      { fields: ['retry_category'] },
      { fields: ['is_resolved'] },
      { fields: ['excluded_from_report'] },
      { fields: ['created_at'] }
    ]
  }
);

export default FailedRecord;
