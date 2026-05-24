import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { join } from 'path';

export const databaseConfig: TypeOrmModuleOptions & DataSourceOptions = {
  type: 'sqlite',
  database: join(process.cwd(), 'data', 'spare-part.db'),
  entities: [join(__dirname, '..', 'entities', '*.entity{.ts,.js}')],
  synchronize: true,
  logging: false,
};
