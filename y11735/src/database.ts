import { Sequelize } from 'sequelize';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './campus-card-refund.db',
  logging: false
});

export default sequelize;
