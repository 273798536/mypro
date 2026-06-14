const { v4: uuid } = require("uuid");
const { getDb } = require("../db");
const {
  validateAndComputePosterior,
  checkUnitStatus,
  detectJump,
  classifyTrigger,
  generateJumpExplanation,
  EPSILON,
} = require("../bayesian");

const router = require("express").Router();

router.post("/", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title 必填" });
  const db = getDb();
  const id = uuid();
  db.prepare("INSERT INTO sessions (id, title) VALUES (?, ?)").run(id, title);
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(id);
  res.status(201).json(session);
});

router.get("/", (req, res) => {
  const db = getDb();
  const sessions = db.prepare("SELECT * FROM sessions ORDER BY created_at DESC").all();
  res.json(sessions);
});

router.get("/:id", (req, res) => {
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "会话不存在" });
  const batches = db.prepare(
    "SELECT * FROM material_batches WHERE session_id = ? ORDER BY batch_order"
  ).all(req.params.id);
  const judgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);
  const history = db.prepare(
    "SELECT * FROM judgment_history WHERE session_id = ? ORDER BY created_at"
  ).all(req.params.id);
  const reports = db.prepare(
    "SELECT * FROM jump_reports WHERE session_id = ? ORDER BY created_at"
  ).all(req.params.id);
  res.json({ session, batches, judgment, history, reports });
});

router.delete("/:id", (req, res) => {
  const db = getDb();
  const del = db.prepare("DELETE FROM sessions WHERE id = ?").run(req.params.id);
  if (del.changes === 0) return res.status(404).json({ error: "会话不存在" });
  res.json({ success: true });
});

router.post("/:id/materials", (req, res) => {
  const { source_label, material_type, raw_data, unit_info, likelihood, evidence } = req.body;
  if (!source_label) return res.status(400).json({ error: "source_label 必填" });

  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "会话不存在" });

  const existingBatches = db.prepare(
    "SELECT * FROM material_batches WHERE session_id = ? ORDER BY batch_order"
  ).all(req.params.id);
  const batchOrder = existingBatches.length;
  const existingJudgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(
    req.params.id
  );

  const existingUnitInfo = existingBatches.length > 0
    ? JSON.parse(existingBatches[existingBatches.length - 1].unit_info)
    : {};
  const unitCheck = checkUnitStatus(existingUnitInfo, unit_info || {});
  const unitStatus = unitCheck.status;
  const unitHasIssue = unitStatus !== "ok";

  const isSupplement = material_type === "supplement" || material_type === "normal_record";
  const priorValue = existingJudgment ? existingJudgment.posterior_value : 0.5;
  const likelihoodVal = likelihood != null ? likelihood : 0.6;
  const evidenceVal = evidence != null ? evidence : 1.0;

  const {
    validation,
    posterior: newPosterior,
  } = validateAndComputePosterior(priorValue, likelihoodVal, evidenceVal);

  if (!validation.ok) {
    return res.status(422).json({
      error: "参数校验失败",
      details: validation.errors,
      hint: "后验概率必须在 [0, 1] 范围内，请检查 likelihood 与 evidence 组合",
    });
  }

  if (unitHasIssue) {
    return res.status(422).json({
      error: "单位校验失败，材料已拒绝入库",
      details: unitCheck.detail,
      unit_status: unitStatus,
      hint:
        unitStatus === "missing"
          ? "请补充单位信息（如 长度:cm、温度:°C）后再提交"
          : "请修正冲突的单位（与已有批次保持一致）",
    });
  }

  const batchId = uuid();
  const unitMissing = (!unit_info || Object.keys(unit_info).length === 0) ? 1 : 0;
  const mergedUnitInfo = { ...existingUnitInfo, ...(unit_info || {}) };

  db.prepare(
    `INSERT INTO material_batches
      (id, session_id, batch_order, source_label, material_type, raw_data, unit_info, unit_missing)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    batchId,
    req.params.id,
    batchOrder,
    source_label,
    material_type || "supplement",
    JSON.stringify(raw_data || {}),
    JSON.stringify(mergedUnitInfo),
    unitMissing
  );

  const threshold = existingJudgment ? existingJudgment.threshold_used : 0.95;

  const jumpResult = existingJudgment
    ? detectJump(existingJudgment.posterior_value, newPosterior, threshold)
    : null;

  const changeType = existingJudgment ? "update" : "initial";
  const deltaPct = jumpResult ? jumpResult.deltaPct : 0;
  const triggerType = existingJudgment
    ? classifyTrigger(deltaPct, unitStatus, isSupplement, changeType)
    : (isSupplement ? "normal_record" : "manual");

  const conclusion = `后验概率=${newPosterior.toFixed(4)}`;
  const confidence = Math.min(
    Math.max(newPosterior, 0),
    Math.max(1 - Math.abs(newPosterior - priorValue), 0)
  );

  let newJudgmentStatus = "active";
  if (existingJudgment && existingJudgment.status === "confirmed" && isSupplement) {
    newJudgmentStatus = "active";
  }

  let judgmentId;
  let oldPosteriorStored = null;
  let oldConclusionStored = "";
  let oldConfidenceStored = null;

  if (existingJudgment) {
    judgmentId = existingJudgment.id;
    oldPosteriorStored = existingJudgment.posterior_value;
    oldConclusionStored = existingJudgment.conclusion;
    oldConfidenceStored = existingJudgment.confidence;

    db.prepare(
      `UPDATE judgments SET
        conclusion = ?, confidence = ?, unit_status = ?, status = ?,
        source_batch_id = ?, posterior_value = ?, threshold_used = ?,
        confirmed_by = NULL, confirmed_at = NULL
      WHERE id = ?`
    ).run(
      conclusion, confidence, unitStatus, newJudgmentStatus,
      batchId, newPosterior, threshold, judgmentId
    );
  } else {
    judgmentId = uuid();
    db.prepare(
      `INSERT INTO judgments
        (id, session_id, conclusion, confidence, unit_status, status,
         source_batch_id, prior_type, prior_value, posterior_value, threshold_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      judgmentId, req.params.id, conclusion, confidence, unitStatus, newJudgmentStatus,
      batchId, "non_informative", priorValue, newPosterior, threshold
    );
  }

  const historyId = uuid();
  db.prepare(
    `INSERT INTO judgment_history
      (id, judgment_id, session_id, change_type, old_conclusion, new_conclusion,
       old_confidence, new_confidence, old_posterior, new_posterior,
       reason, source_batch_id, trigger_type, operator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    historyId, judgmentId, req.params.id, changeType,
    oldConclusionStored, conclusion,
    oldConfidenceStored, confidence,
    oldPosteriorStored, newPosterior,
    existingJudgment ? "补充材料更新" : "初始判断",
    batchId, triggerType, "system"
  );

  let jumpReport = null;
  if (jumpResult && jumpResult.isJump) {
    const explanation = generateJumpExplanation(triggerType, jumpResult.deltaPct, unitCheck.detail);
    const reportId = uuid();
    db.prepare(
      `INSERT INTO jump_reports
        (id, session_id, judgment_id, previous_posterior, current_posterior,
         delta, delta_pct, trigger_type, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      reportId, req.params.id, judgmentId,
      existingJudgment ? existingJudgment.posterior_value : 0,
      newPosterior, jumpResult.delta, jumpResult.deltaPct,
      triggerType, explanation
    );
    jumpReport = db.prepare("SELECT * FROM jump_reports WHERE id = ?").get(reportId);
  }

  db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  const judgmentResult = db.prepare("SELECT * FROM judgments WHERE id = ?").get(judgmentId);
  const historyEntry = db.prepare(
    "SELECT * FROM judgment_history WHERE id = ?"
  ).get(historyId);
  const batchResult = db.prepare("SELECT * FROM material_batches WHERE id = ?").get(batchId);

  res.status(201).json({
    success: true,
    judgment: judgmentResult,
    history_entry: historyEntry,
    jump_report: jumpReport,
    unit_check: unitCheck,
    batch: batchResult,
    delta: jumpResult ? {
      delta: jumpResult.delta,
      delta_pct: jumpResult.deltaPct,
      is_jump: jumpResult.isJump,
    } : null,
  });
});

router.post("/:id/confirm", (req, res) => {
  const { operator, note } = req.body;
  if (!operator) return res.status(400).json({ error: "operator 必填（确认人）" });

  const db = getDb();
  const judgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);
  if (!judgment) return res.status(404).json({ error: "判断不存在" });

  const oldStatus = judgment.status;
  if (oldStatus === "confirmed") {
    return res.status(409).json({
      error: "该判断已经处于 confirmed 状态，无需重复确认",
      judgment,
    });
  }

  db.prepare(
    `UPDATE judgments SET status = 'confirmed', confirmed_by = ?, confirmed_at = datetime('now') WHERE id = ?`
  ).run(operator, judgment.id);

  db.prepare(
    `INSERT INTO judgment_history
      (id, judgment_id, session_id, change_type, old_conclusion, new_conclusion,
       old_confidence, new_confidence, old_posterior, new_posterior,
       reason, source_batch_id, trigger_type, operator)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    uuid(), judgment.id, req.params.id, "confirm",
    judgment.conclusion, judgment.conclusion,
    judgment.confidence, judgment.confidence,
    judgment.posterior_value, judgment.posterior_value,
    note || `人工确认(由${operator}操作)`, judgment.source_batch_id, "manual", operator
  );

  db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  const updated = db.prepare("SELECT * FROM judgments WHERE id = ?").get(judgment.id);
  res.json({ success: true, judgment: updated, previous_status: oldStatus });
});

router.get("/:id/history", (req, res) => {
  const db = getDb();
  const history = db.prepare(
    "SELECT * FROM judgment_history WHERE session_id = ? ORDER BY created_at"
  ).all(req.params.id);
  res.json(history);
});

router.get("/:id/reports", (req, res) => {
  const db = getDb();
  const reports = db.prepare(
    "SELECT * FROM jump_reports WHERE session_id = ? ORDER BY created_at DESC"
  ).all(req.params.id);
  res.json(reports);
});

router.get("/:id/summary", (req, res) => {
  const db = getDb();
  const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(req.params.id);
  if (!session) return res.status(404).json({ error: "会话不存在" });

  const batches = db.prepare(
    "SELECT * FROM material_batches WHERE session_id = ? ORDER BY batch_order"
  ).all(req.params.id);
  const judgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);
  const history = db.prepare(
    "SELECT * FROM judgment_history WHERE session_id = ? ORDER BY created_at"
  ).all(req.params.id);
  const reports = db.prepare(
    "SELECT * FROM jump_reports WHERE session_id = ? ORDER BY created_at DESC"
  ).all(req.params.id);

  const changes = [];
  let prevPosterior = null;
  for (const h of history) {
    const entry = {
      at: h.created_at,
      type: h.change_type,
      operator: h.operator,
      trigger: h.trigger_type,
      posterior: h.new_posterior,
      reason: h.reason,
    };
    if (prevPosterior !== null && h.new_posterior !== null) {
      const delta = Math.abs(h.new_posterior - prevPosterior);
      entry.delta_pct = prevPosterior < EPSILON ? 0 : (delta / Math.abs(prevPosterior)) * 100;
    }
    if (h.old_posterior !== null && h.new_posterior !== null) {
      const rawDelta = Math.abs(h.new_posterior - h.old_posterior);
      entry.raw_delta_pct = h.old_posterior < EPSILON ? 0 : (rawDelta / Math.abs(h.old_posterior)) * 100;
    }
    prevPosterior = h.new_posterior;
    changes.push(entry);
  }

  const summary = {
    session_id: session.id,
    title: session.title,
    current_judgment: judgment ? {
      conclusion: judgment.status === "suspended" ? "（单位挂起，无有效结论）" : judgment.conclusion,
      confidence: judgment.status === "suspended" ? null : judgment.confidence,
      unit_status: judgment.unit_status,
      status: judgment.status,
      posterior: judgment.status === "suspended" ? null : judgment.posterior_value,
      confirmed_by: judgment.confirmed_by,
      confirmed_at: judgment.confirmed_at,
    } : null,
    batch_count: batches.length,
    latest_unit_info: batches.length > 0 ? JSON.parse(batches[batches.length - 1].unit_info) : {},
    has_unit_issue: judgment ? judgment.unit_status !== "ok" : false,
    is_suspended: judgment ? judgment.status === "suspended" : false,
    jump_count: reports.length,
    latest_jump: reports.length > 0 ? {
      trigger: reports[0].trigger_type,
      explanation: reports[0].explanation,
      delta_pct: reports[0].delta_pct,
      at: reports[0].created_at,
    } : null,
    changes,
  };

  res.json(summary);
});

module.exports = router;
