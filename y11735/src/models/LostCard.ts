import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface LostCardAttributes {
  id?: number;
  cardNo: string;
  studentId: string;
  lostDate: Date;
  status: 'pending' | 'confirmed' | 'resolved';
  reportedBy?: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class LostCard extends Model<LostCardAttributes> implements LostCardAttributes {
  public id!: number;
  public cardNo!: string;
  public studentId!: string;
  public lostDate!: Date;
  public status!: 'pending' | 'confirmed' | 'resolved';
  public reportedBy?: string;
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

LostCard.init(
  {
    cardNo: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    lostDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'resolved'),
      allowNull: false,
      defaultValue: 'pending'
    },
    reportedBy: {
      type: DataTypes.STRING(100)
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '数据来源：挂失系统'
    }
  },
  {
    sequelize,
    modelName: 'LostCard',
    tableName: 'lost_cards'
  }
);

export default LostCard;
