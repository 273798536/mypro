import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';
import Student from './Student';

export interface CardAttributes {
  id?: number;
  cardNo: string;
  studentId: string;
  balance: number;
  selfRecharge: number;
  subsidyAmount: number;
  status: 'active' | 'inactive' | 'lost' | 'cancelled';
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class Card extends Model<CardAttributes> implements CardAttributes {
  public id!: number;
  public cardNo!: string;
  public studentId!: string;
  public balance!: number;
  public selfRecharge!: number;
  public subsidyAmount!: number;
  public status!: 'active' | 'inactive' | 'lost' | 'cancelled';
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Card.init(
  {
    cardNo: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    studentId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      references: {
        model: Student,
        key: 'studentId'
      }
    },
    balance: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '总余额'
    },
    selfRecharge: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '自充金额'
    },
    subsidyAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      comment: '补贴金额'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'lost', 'cancelled'),
      allowNull: false,
      defaultValue: 'active'
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '数据来源：一卡通系统'
    }
  },
  {
    sequelize,
    modelName: 'Card',
    tableName: 'cards'
  }
);

export default Card;
