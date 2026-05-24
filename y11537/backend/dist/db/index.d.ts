import { Sequelize } from 'sequelize';
declare const sequelize: Sequelize;
export declare const testConnection: () => Promise<boolean>;
export default sequelize;
