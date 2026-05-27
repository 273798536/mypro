import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export interface SubsidyRuleAttributes {
  id?: number;
  ruleCode: string;
  ruleName: string;
  subsidyType: string;
  isRefundable: boolean;
  description?: string;
  source: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class SubsidyRule extends Model<SubsidyRuleAttributes> implements SubsidyRuleAttributes {
  public id!: number;
  public ruleCode!: string;
  public ruleName!: string;
  public subsidyType!: string;
  public isRefundable!: boolean;
  public description?: string;
  public source!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

SubsidyRule.init(
  {
    ruleCode: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    ruleName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    subsidyType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '补贴类型：助学金/奖学金/生活补贴等'
    },
    isRefundable: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: '是否可退'
    },
    description: {
      type: DataTypes.TEXT
    },
    source: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: '数据来源：学生资助管理系统'
    }
  },
  {
    sequelize,
    modelName: 'SubsidyRule',
    tableName: 'subsidy_rules'
  }
);

export default SubsidyRule;
