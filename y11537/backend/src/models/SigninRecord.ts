import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { DataSource, SigninType } from './types';

interface SigninRecordAttributes {
  id: number;
  signinNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  signinTime: Date;
  signinType: SigninType;
  source: DataSource;
  sourceFile?: string;
  qrcodeId?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  isProxy: boolean;
  proxyEmployeeId?: string;
  proxyEmployeeName?: string;
  isCompensated: boolean;
  compensationSource?: string;
  isValid: boolean;
  validationRemark?: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface SigninRecordCreationAttributes extends Optional<SigninRecordAttributes, 'id' | 'createdAt' | 'updatedAt' | 'isProxy' | 'isCompensated' | 'isValid'> {}

class SigninRecord extends Model<SigninRecordAttributes, SigninRecordCreationAttributes> implements SigninRecordAttributes {
  public id!: number;
  public signinNo!: string;
  public employeeId!: string;
  public employeeName!: string;
  public department!: string;
  public trainingId!: string;
  public trainingName!: string;
  public trainingDate!: Date;
  public signinTime!: Date;
  public signinType!: SigninType;
  public source!: DataSource;
  public sourceFile?: string;
  public qrcodeId?: string;
  public location?: string;
  public latitude?: number;
  public longitude?: number;
  public isProxy!: boolean;
  public proxyEmployeeId?: string;
  public proxyEmployeeName?: string;
  public isCompensated!: boolean;
  public compensationSource?: string;
  public isValid!: boolean;
  public validationRemark?: string;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SigninRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    signinNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'signin_no'
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
      allowNull: false,
      field: 'signin_time'
    },
    signinType: {
      type: DataTypes.ENUM(...Object.values(SigninType)),
      allowNull: false,
      field: 'signin_type'
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    sourceFile: {
      type: DataTypes.STRING(255),
      field: 'source_file'
    },
    qrcodeId: {
      type: DataTypes.STRING(100),
      field: 'qrcode_id'
    },
    location: {
      type: DataTypes.STRING(200)
    },
    latitude: {
      type: DataTypes.DECIMAL(10, 6)
    },
    longitude: {
      type: DataTypes.DECIMAL(10, 6)
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
    isCompensated: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_compensated'
    },
    compensationSource: {
      type: DataTypes.STRING(100),
      field: 'compensation_source'
    },
    isValid: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_valid'
    },
    validationRemark: {
      type: DataTypes.TEXT,
      field: 'validation_remark'
    },
    createdBy: {
      type: DataTypes.INTEGER,
      field: 'created_by'
    }
  },
  {
    sequelize,
    modelName: 'SigninRecord',
    tableName: 'signin_records',
    timestamps: true,
    indexes: [
      { fields: ['signin_no'], unique: true },
      { fields: ['employee_id', 'training_id', 'training_date'] },
      { fields: ['training_id'] },
      { fields: ['training_date'] },
      { fields: ['department'] },
      { fields: ['source'] },
      { fields: ['signin_type'] },
      { fields: ['is_valid'] },
      { fields: ['is_compensated'] }
    ]
  }
);

export default SigninRecord;
