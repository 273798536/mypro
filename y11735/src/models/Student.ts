import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface StudentAttributes {
  id?: number;
  studentId: string;
  name: string;
  department: string;
  grade: string;
  className: string;
  phone?: string;
  bankCard?: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Student extends Model<StudentAttributes> implements StudentAttributes {
  public id!: number;
  public studentId!: string;
  public name!: string;
  public department!: string;
  public grade!: string;
  public className!: string;
  public phone?: string;
  public bankCard?: string;
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Student.init(
  {
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    department: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    grade: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    className: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    phone: {
      type: DataTypes.STRING(20)
    },
    bankCard: {
      type: DataTypes.STRING(50)
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '数据来源：学生档案系统'
    }
  },
  {
    sequelize,
    modelName: 'Student',
    tableName: 'students'
  }
);

export default Student;
