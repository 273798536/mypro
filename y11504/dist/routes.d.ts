import { Router } from 'express';
import { DataSource } from 'typeorm';
export declare const createRoutes: (dataSource: DataSource) => Router;
