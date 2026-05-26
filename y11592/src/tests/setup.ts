import { initModels } from '../models';
import sequelize from '../database/connection';

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  await initModels();
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

beforeEach(async () => {
  const models = sequelize.models;
  for (const model of Object.values(models)) {
    await model.destroy({ where: {}, truncate: true });
  }
});
