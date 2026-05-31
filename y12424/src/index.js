const express = require("express");
const { getDb } = require("./db");

const app = express();
app.use(express.json());

const contractsRouter = require("./routes/contracts");
const ordersRouter = require("./routes/orders");
const settlementsRouter = require("./routes/settlements");
const disputesRouter = require("./routes/disputes");

app.use("/api/contracts", contractsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/settlements", settlementsRouter);
app.use("/api/disputes", disputesRouter);

app.get("/api/health", (req, res) => {
  const db = getDb();
  const stats = {
    contracts: db.prepare("SELECT COUNT(*) AS cnt FROM contracts").get().cnt,
    orders: db.prepare("SELECT COUNT(*) AS cnt FROM orders").get().cnt,
    settlements: db.prepare("SELECT COUNT(*) AS cnt FROM settlements").get().cnt,
    disputes: db.prepare("SELECT COUNT(*) AS cnt FROM disputes").get().cnt,
  };
  res.json({ status: "ok", stats });
});

app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "内部错误" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`短租平台房东结算服务已启动 → http://localhost:${PORT}`);
  console.log(`接口根路径: /api/contracts  /api/orders  /api/settlements  /api/disputes`);
});
