import 'reflect-metadata';
import { AppDataSource } from './config/database';
declare const app: import("express-serve-static-core").Express;
declare const startServer: () => Promise<void>;
export { app, startServer, AppDataSource };
