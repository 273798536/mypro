const { v4: uuid } = require("uuid");
const { getDb } = require("../db");
const {
  computePosterior,
  checkUnitStatus,
  detectJump,
  classifyTrigger,
  generateJumpExplanation,
} = require("../bayesian");

const router = require("express").Router();

router.post("/", (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: "title 必填" });
  const db = getDb();
  const id = uuid();
  db.prepare(
    "INSERT INTO sessions (id, title) VALUES (?, ?)"
  ).run(id, title);
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
  const batches = db.prepare("SELECT * FROM material_batches WHERE session_id = ? ORDER BY batch_order").all(req.params.id);
  const judgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);
  const history = db.prepare("SELECT * FROM judgment_history WHERE session_id = ? ORDER BY created_at").all(req.params.id);
  const reports = db.prepare("SELECT * FROM jump_reports WHERE session_id = ? ORDER BY created_at").all(req.params.id);
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

  const existingBatches = db.prepare("SELECT * FROM material_batches WHERE session_id = ? ORDER BY batch_order").all(req.params.id);
  const batchOrder = existingBatches.length;
  const batchId = uuid();
  const unitMissing = (!unit_info || Object.keys(unit_info).length === 0) ? 1 : 0;
  const existingUnitInfo = existingBatches.length > 0
    ? JSON.parse(existingBatches[existingBatches.length - 1].unit_info)
    : {};
  const mergedUnitInfo = { ...existingUnitInfo, ...(unit_info || {}) };

  const unitCheck = checkUnitStatus(existingUnitInfo, unit_info || {});
  const unitStatus = unitCheck.status;

  db.prepare(
    `INSERT INTO material_batches (id, session_id, batch_order, source_label, material_type, raw_data, unit_info, unit_missing)
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

  const existingJudgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);

  const isSupplement = material_type === "supplement" || material_type === "normal_record";
  const priorValue = existingJudgment ? existingJudgment.posterior_value : 0.5;
  const likelihoodVal = likelihood != null ? likelihood : 0.6;
  const evidenceVal = evidence != null ? evidence : 1.0;
  const newPosterior = computePosterior(priorValue, likelihoodVal, evidenceVal);
  const threshold = existingJudgment ? existingJudgment.threshold_used : 0.95;

  const jumpResult = existingJudgment
    ? detectJump(existingJudgment.posterior_value, newPosterior, threshold)
    : null;

  let triggerType = "manual";
  if (jumpResult && jumpResult.isJump) {
    triggerType = classifyTrigger(
      jumpResult.deltaPct,
      unitStatus,
      isSupplement
    );
  } else if (isSupplement) {
    triggerType = "normal_record";
  }

  const conclusion = `后验概率=${newPosterior.toFixed(4)}`;
  const confidence = Math.min(newPosterior, 1 - Math.abs(newPosterior - priorValue));

  let newJudgmentStatus = "active";
  let judgmentId;

  if (unitStatus === "missing") {
    newJudgmentStatus = "suspended";
  } else if (unitStatus === "suspect") {
    newJudgmentStatus = "suspended";
  } else if (existingJudgment && existingJudgment.status === "confirmed" && isSupplement) {
    newJudgmentStatus = "active";
  }

  if (existingJudgment) {
    judgmentId = existingJudgment.id;
    const changeType = unitStatus === "missing" ? "suspend"
      : unitStatus === "suspect" ? "suspend"
      : "update";

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

    db.prepare(
      `INSERT INTO judgment_history
        (id, judgment_id, session_id, change_type, old_conclusion, new_conclusion,
         old_confidence, new_confidence, old_posterior, new_posterior,
         reason, source_batch_id, trigger_type, operator)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuid(), judgmentId, req.params.id, changeType,
      existingJudgment.conclusion, conclusion,
      existingJudgment.confidence, confidence,
      existingJudgment.posterior_value, newPosterior,
      unitStatus !== "ok" ? `单位问题: ${unitCheck.detail}` : "补充材料更新",
      batchId, triggerType, "system"
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

    db.prepare(
      `INSERT INTO judgment_history
        (id, judgment_id, session_id, change_type, old_conclusion, new_conclusion,
         old_confidence, new_confidence, old_posterior, new_posterior,
         reason, source_batch_id, trigger_type, operator)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuid(), judgmentId, req.params.id, "initial",
      "", conclusion, null, confidence, null, newPosterior,
      unitStatus !== "ok" ? `单位问题: ${unitCheck.detail}` : "初始判断",
      batchId, triggerType, "system"
    );
  }

  if (jumpResult && jumpResult.isJump) {
    const explanation = generateJumpExplanation(triggerType, jumpResult.deltaPct, unitCheck.detail);
    db.prepare(
      `INSERT INTO jump_reports
        (id, session_id, judgment_id, previous_posterior, current_posterior,
         delta, delta_pct, trigger_type, explanation)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      uuid(), req.params.id, judgmentId,
      existingJudgment ? existingJudgment.posterior_value : 0,
      newPosterior, jumpResult.delta, jumpResult.deltaPct,
      triggerType, explanation
    );
  }

  db.prepare("UPDATE sessions SET updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  const result = db.prepare("SELECT * FROM judgments WHERE id = ?").get(judgmentId);
  const historyEntry = db.prepare(
    "SELECT * FROM judgment_history WHERE judgment_id = ? ORDER BY created_at DESC LIMIT 1"
  ).get(judgmentId);
  const jumpReport = jumpResult && jumpResult.isJump
    ? db.prepare("SELECT * FROM jump_reports WHERE session_id = ? ORDER BY created_at DESC LIMIT 1").get(req.params.id)
    : null;

  res.status(201).json({
    judgment: result,
    history_entry: historyEntry,
    jump_report: jumpReport,
    unit_check: unitCheck,
    batch: db.prepare("SELECT * FROM material_batches WHERE id = ?").get(batchId),
  });
});

router.post("/:id/confirm", (req, res) => {
  const { operator, note } = req.body;
  if (!operator) return res.status(400).json({ error: "operator 必填（确认人）" });

  const db = getDb();
  const judgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);
  if (!judgment) return res.status(404).json({ error: "判断不存在" });

  const oldStatus = judgment.status;
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
  res.json({ judgment: updated, previous_status: oldStatus });
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

  const batches = db.prepare("SELECT * FROM material_batches WHERE session_id = ? ORDER BY batch_order").all(req.params.id);
  const judgment = db.prepare("SELECT * FROM judgments WHERE session_id = ?").get(req.params.id);
  const history = db.prepare("SELECT * FROM judgment_history WHERE session_id = ? ORDER BY created_at").all(req.params.id);
  const reports = db.prepare("SELECT * FROM jump_reports WHERE session_id = ? ORDER BY created_at DESC").all(req.params.id);

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
      entry.delta_pct = prevPosterior === 0 ? 0 : (delta / Math.abs(prevPosterior)) * 100;
    }
    prevPosterior = h.new_posterior;
    changes.push(entry);
  }

  const summary = {
    session_id: session.id,
    title: session.title,
    current_judgment: judgment ? {
      conclusion: judgment.conclusion,
      confidence: judgment.confidence,
      unit_status: judgment.unit_status,
      status: judgment.status,
      posterior: judgment.posterior_value,
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
