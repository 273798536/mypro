const { Sequelize } = require('sequelize');
const path = require('path');
require('dotenv').config();

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_STORAGE || path.join(__dirname, '../../data/ledger.db'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  retry: {
    max: 3
  }
});

module.exports = sequelize;
