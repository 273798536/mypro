import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../db';
import { DataSource } from './types';

interface HomeworkAttributes {
  id: number;
  homeworkNo: string;
  employeeId: string;
  employeeName: string;
  department: string;
  trainingId: string;
  trainingName: string;
  trainingDate: Date;
  submitTime: Date;
  homeworkTitle: string;
  homeworkContent?: string;
  score?: number;
  grade?: string;
  source: DataSource;
  sourceFile?: string;
  remark?: string;
  createdBy?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

interface HomeworkCreationAttributes extends Optional<HomeworkAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Homework extends Model<HomeworkAttributes, HomeworkCreationAttributes> implements HomeworkAttributes {
  public id!: number;
  public homeworkNo!: string;
  public employeeId!: string;
  public employeeName!: string;
  public department!: string;
  public trainingId!: string;
  public trainingName!: string;
  public trainingDate!: Date;
  public submitTime!: Date;
  public homeworkTitle!: string;
  public homeworkContent?: string;
  public score?: number;
  public grade?: string;
  public source!: DataSource;
  public sourceFile?: string;
  public remark?: string;
  public createdBy?: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Homework.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    homeworkNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'homework_no'
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
    submitTime: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'submit_time'
    },
    homeworkTitle: {
      type: DataTypes.STRING(200),
      allowNull: false,
      field: 'homework_title'
    },
    homeworkContent: {
      type: DataTypes.TEXT,
      field: 'homework_content'
    },
    score: {
      type: DataTypes.DECIMAL(5, 2)
    },
    grade: {
      type: DataTypes.STRING(20)
    },
    source: {
      type: DataTypes.ENUM(...Object.values(DataSource)),
      allowNull: false
    },
    sourceFile: {
      type: DataTypes.STRING(255),
      field: 'source_file'
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
    modelName: 'Homework',
    tableName: 'homeworks',
    timestamps: true,
    indexes: [
      { fields: ['homework_no'], unique: true },
      { fields: ['employee_id'] },
      { fields: ['training_id'] },
      { fields: ['training_date'] },
      { fields: ['department'] },
      { fields: ['source'] }
    ]
  }
);

export default Homework;
