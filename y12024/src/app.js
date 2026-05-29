const express = require("express");
const { getDb, migrate, seed } = require("./db");

const app = express();
app.use(express.json());

migrate();
seed();

const commissionRouter = require("./routes/commission");
app.use("/api/commission", commissionRouter);

app.get("/api/health", (req, res) => {
  const db = getDb();
  const leaderCount = db.prepare("SELECT COUNT(*) AS cnt FROM leaders").get().cnt;
  const orderCount = db.prepare("SELECT COUNT(*) AS cnt FROM orders").get().cnt;
  const sheetCount = db.prepare("SELECT COUNT(*) AS cnt FROM commission_sheets").get().cnt;
  res.json({ status: "ok", leaders: leaderCount, orders: orderCount, sheets: sheetCount });
});

app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: err.message });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`佣金服务已启动: http://localhost:${PORT}`);
  console.log(`API 基础路径: http://localhost:${PORT}/api/commission`);
});

module.exports = app;
