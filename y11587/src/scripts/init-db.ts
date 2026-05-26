import "reflect-metadata";
import { AppDataSource } from "../data-source";
import * as fs from "fs";
import * as path from "path";

async function initDatabase() {
  console.log("=== 法务合同履约重试补偿队列系统 - 数据库初始化 ===");

  const dataDir = path.join(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log("✓ 创建数据目录: data/");
  }

  // 删除旧数据库文件
  const dbPath = path.join(dataDir, "legal_contract.db");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log("✓ 清除旧数据库文件");
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log("✓ 创建上传目录: uploads/");
  }

  const exportsDir = path.join(process.cwd(), "exports");
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
    console.log("✓ 创建导出目录: exports/");
  }

  console.log("\n正在初始化数据库...");
  await AppDataSource.initialize();
  console.log("✓ 数据库连接成功");

  console.log("\n=== 数据库初始化完成 ===");
  console.log("\n数据库文件: data/legal_contract.db");
  console.log("\n可执行以下命令继续:");
  console.log("  npm run seed-data      - 导入样例数据");
  console.log("  npm run dev            - 启动开发服务器");

  await AppDataSource.destroy();
}

initDatabase().catch((error) => {
  console.error("数据库初始化失败:", error);
  process.exit(1);
});
