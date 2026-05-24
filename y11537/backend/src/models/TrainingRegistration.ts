import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { DataSource } from './types';

interface TrainingRegistrationAttributes {
  id: number;
  registrationNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  trainingLocation: string;
  trainer: string;
  source: DataSource;
  sourceFile?: string;
  batchNo?: string;
  remark?: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TrainingRegistrationCreationAttributes extends Optional<TrainingRegistrationAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class TrainingRegistration extends Model<TrainingRegistrationAttributes, TrainingRegistrationCreationAttributes> implements TrainingRegistrationAttributes {
  public id!: number;
  public registrationNo!: string;
  public employeeId!: string;
  public employeeName!: string;
  public department!: string;
  public trainingId!: string;
  public trainingName!: string;
  public trainingDate!: Date;
  public trainingLocation!: string;
  public trainer!: string;
  public source!: DataSource;
  public sourceFile?: string;
  public batchNo?: string;
  public remark?: string;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

TrainingRegistration.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    registrationNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'registration_no'
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
    trainingLocation: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'training_location'
    },
    trainer: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    sourceFile: {
      type: DataTypes.STRING(255),
      field: 'source_file'
    },
    batchNo: {
      type: DataTypes.STRING(50),
      field: 'batch_no'
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
    modelName: 'TrainingRegistration',
    tableName: 'training_registrations',
    timestamps: true,
    indexes: [
      { fields: ['registration_no'], unique: true },
      { fields: ['employee_id'] },
      { fields: ['training_id'] },
      { fields: ['training_date'] },
      { fields: ['department'] },
      { fields: ['source'] }
    ]
  }
);

export default TrainingRegistration;
