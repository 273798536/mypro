const express = require("express");
const cors = require("cors");
const { getDb } = require("./db");
const sessionsRouter = require("./routes/sessions");

const app = express();
const PORT = 3100;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use("/api/sessions", sessionsRouter);

app.get("/api/health", (req, res) => {
  getDb();
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`贝叶斯先验图表解释服务运行在 http://localhost:${PORT}`);
});
