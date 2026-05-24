import 'reflect-metadata';
import { DataSource } from 'typeorm';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'sqlite',
  database: process.env.DB_PATH || './data/kb-compensation.db',
  synchronize: true,
  logging: false,
  entities: [path.join(__dirname, '../entities/*.{ts,js}')],
  migrations: [],
  subscribers: []
});
