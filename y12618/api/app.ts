import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { initDb, seedData } from "./db.js";
import levelRoutes from "./routes/levels.js";
import violationRoutes from "./routes/violations.js";
import historyRoutes from "./routes/history.js";
import exportRoutes from "./routes/export.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

initDb();

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

app.use("/api/levels", levelRoutes);
app.use("/api/violations", violationRoutes);
app.use("/api/history", historyRoutes);
app.use("/api/export", exportRoutes);

app.post("/api/seed", (_req: Request, res: Response) => {
  seedData();
  res.json({ success: true, message: "种子数据已初始化" });
});

app.use(
  "/api/health",
  (req: Request, res: Response, next: NextFunction): void => {
    res.status(200).json({
      success: true,
      message: "ok",
    });
  }
);

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    code: "INTERNAL_ERROR",
    message: "服务器内部错误",
    actionableHint: "请稍后重试，或联系管理员",
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    code: "NOT_FOUND",
    message: "API端点不存在",
    actionableHint: "请检查请求路径是否正确",
  });
});

export default app;
