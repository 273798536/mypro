import "reflect-metadata";
import { DataSource } from "typeorm";
import * as path from "path";
import { Review } from "./entity/Review";
import { CadLayer } from "./entity/CadLayer";
import { Material } from "./entity/Material";
import { Collision } from "./entity/Collision";
import { Remark } from "./entity/Remark";
import { ReviewHistory } from "./entity/ReviewHistory";
import { ViewConfig } from "./entity/ViewConfig";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: path.resolve(__dirname, "../data/app.db"),
  synchronize: true,
  logging: false,
  entities: [Review, CadLayer, Material, Collision, Remark, ReviewHistory, ViewConfig],
  migrations: [],
  subscribers: [],
});
