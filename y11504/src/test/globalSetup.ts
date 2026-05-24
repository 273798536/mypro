import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';

const dataSource = new DataSource({
  type: 'sqlite',
  database: ':memory:',
  synchronize: true,
  logging: false,
  entities: [path.join(__dirname, '..', 'entities', '*.{ts,js}')],
});

module.exports = async () => {
  await dataSource.initialize();
  (global as any).__DATA_SOURCE__ = dataSource;
};
