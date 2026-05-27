import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface GraduationStatusAttributes {
  id?: number;
  studentId: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  checkDate?: Date;
  checker?: string;
  remarks?: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class GraduationStatus extends Model<GraduationStatusAttributes> implements GraduationStatusAttributes {
  public id!: number;
  public studentId!: string;
  public status!: 'pending' | 'approved' | 'rejected' | 'completed';
  public checkDate?: Date;
  public checker?: string;
  public remarks?: string;
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

GraduationStatus.init(
  {
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
      allowNull: false,
      defaultValue: 'pending',
      comment: '离校状态：待确认/已通过/已拒绝/已完成'
    },
    checkDate: {
      type: DataTypes.DATE
    },
    checker: {
      type: DataTypes.STRING(100)
    },
    remarks: {
      type: DataTypes.TEXT
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '数据来源：离校系统'
    }
  },
  {
    sequelize,
    modelName: 'GraduationStatus',
    tableName: 'graduation_statuses'
  }
);

export default GraduationStatus;
