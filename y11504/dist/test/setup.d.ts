import { DataSource } from 'typeorm';
declare global {
    var __DATA_SOURCE__: DataSource | undefined;
}
