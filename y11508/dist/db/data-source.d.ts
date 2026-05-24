import 'reflect-metadata';
import { DataSource } from 'typeorm';
export declare const AppDataSource: DataSource;
export declare function initializeDatabase(): Promise<void>;
