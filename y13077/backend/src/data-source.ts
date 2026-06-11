import "reflect-metadata";
import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./data/app.db",
  synchronize: true,
  logging: false,
  entities: [__dirname + "/entity/**/*.ts"],
  migrations: [],
  subscribers: [],
});
