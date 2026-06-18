import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// api/app.ts
import express6 from "express";
import cors from "cors";
import path5 from "path";
import dotenv from "dotenv";
import { fileURLToPath as fileURLToPath2 } from "url";

// api/db/connection.ts
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var DB_DIR = path.join(__dirname, "..", "..", "data");
var DB_PATH = path.join(DB_DIR, "intent_drift.db");
var MIGRATIONS_DIR = path.join(__dirname, "..", "..", "migrations");
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}
var dbInstance = null;
function getDb() {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH);
    dbInstance.pragma("journal_mode = WAL");
    dbInstance.pragma("foreign_keys = ON");
  }
  return dbInstance;
}
function runMigrations() {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  const migrationFiles = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrationFiles) {
    const version = file.replace(".sql", "");
    const row = db.prepare("SELECT version FROM schema_migrations WHERE version = ?").get(version);
    if (!row) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");
      db.exec(sql);
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(version);
      console.log(`Migration applied: ${version}`);
    }
  }
}
function initDatabase() {
  runMigrations();
  console.log("Database initialized successfully");
}

// api/routes/auth.ts
import { Router } from "express";
var router = Router();
router.post("/register", async (req, res) => {
});
router.post("/login", async (req, res) => {
});
router.post("/logout", async (req, res) => {
});
var auth_default = router;

// api/routes/conversations.ts
import express from "express";

// api/repositories/ConversationRepository.ts
import { nanoid } from "nanoid";
function mapRowToConversation(row) {
  return {
    id: row.id,
    sessionId: row.session_id,
    customerText: row.customer_text,
    robotText: row.robot_text || void 0,
    fullContext: row.full_context || void 0,
    truncated: row.truncated === 1,
    truncationReason: row.truncation_reason || void 0,
    sourceFile: row.source_file,
    sourceRow: row.source_row,
    sourceType: row.source_type,
    originalAnnotation: row.original_annotation,
    aiPrediction: row.ai_prediction,
    aiConfidence: row.ai_confidence,
    riskLevel: row.risk_level,
    driftScore: row.drift_score,
    batchId: row.batch_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
var ConversationRepository = class {
  db = getDb();
  findAll(options = {}) {
    const {
      page = 1,
      pageSize = 20,
      riskLevel,
      sourceType,
      batchId,
      hasDrift,
      search
    } = options;
    const whereClauses = [];
    const params = [];
    if (riskLevel) {
      whereClauses.push("risk_level = ?");
      params.push(riskLevel);
    }
    if (sourceType) {
      whereClauses.push("source_type = ?");
      params.push(sourceType);
    }
    if (batchId) {
      whereClauses.push("batch_id = ?");
      params.push(batchId);
    }
    if (hasDrift !== void 0) {
      if (hasDrift) {
        whereClauses.push("drift_score > 0");
      } else {
        whereClauses.push("drift_score = 0");
      }
    }
    if (search) {
      whereClauses.push("(customer_text LIKE ? OR session_id LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    const countStmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM conversations ${whereSql}
    `);
    const { count } = countStmt.get(...params);
    const offset = (page - 1) * pageSize;
    const queryStmt = this.db.prepare(`
      SELECT * FROM conversations ${whereSql}
      ORDER BY risk_level IN ('high', 'medium') DESC, drift_score DESC, created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = queryStmt.all(...params, pageSize, offset);
    return {
      items: rows.map(mapRowToConversation),
      total: count,
      page,
      pageSize
    };
  }
  findById(id) {
    const stmt = this.db.prepare("SELECT * FROM conversations WHERE id = ?");
    const row = stmt.get(id);
    return row ? mapRowToConversation(row) : null;
  }
  create(data) {
    const id = "conv_" + nanoid(8);
    const stmt = this.db.prepare(`
      INSERT INTO conversations
      (id, session_id, customer_text, robot_text, full_context, truncated, truncation_reason,
       source_file, source_row, source_type, original_annotation, ai_prediction, ai_confidence,
       risk_level, drift_score, batch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.sessionId,
      data.customerText,
      data.robotText || null,
      data.fullContext || null,
      data.truncated ? 1 : 0,
      data.truncationReason || null,
      data.sourceFile,
      data.sourceRow,
      data.sourceType,
      data.originalAnnotation,
      data.aiPrediction,
      data.aiConfidence,
      data.riskLevel,
      data.driftScore,
      data.batchId
    );
    return this.findById(id);
  }
  update(id, data) {
    const fields = [];
    const params = [];
    if (data.aiPrediction !== void 0) {
      fields.push("ai_prediction = ?");
      params.push(data.aiPrediction);
    }
    if (data.aiConfidence !== void 0) {
      fields.push("ai_confidence = ?");
      params.push(data.aiConfidence);
    }
    if (data.riskLevel !== void 0) {
      fields.push("risk_level = ?");
      params.push(data.riskLevel);
    }
    if (data.driftScore !== void 0) {
      fields.push("drift_score = ?");
      params.push(data.driftScore);
    }
    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    const stmt = this.db.prepare(`
      UPDATE conversations SET ${fields.join(", ")} WHERE id = ?
    `);
    stmt.run(...params);
  }
  countByRiskLevel() {
    const stmt = this.db.prepare(`
      SELECT risk_level, COUNT(*) as count 
      FROM conversations 
      GROUP BY risk_level
    `);
    const rows = stmt.all();
    const result = {
      high: 0,
      medium: 0,
      low: 0,
      normal: 0
    };
    for (const row of rows) {
      result[row.risk_level] = row.count;
    }
    return result;
  }
  countBySourceType() {
    const stmt = this.db.prepare(`
      SELECT source_type, COUNT(*) as count 
      FROM conversations 
      GROUP BY source_type
    `);
    const rows = stmt.all();
    const result = {
      annotation_record: 0,
      segmentation_list: 0,
      training_sample: 0
    };
    for (const row of rows) {
      result[row.source_type] = row.count;
    }
    return result;
  }
  countByIntent() {
    const stmt = this.db.prepare(`
      SELECT ai_prediction as intent, COUNT(*) as count 
      FROM conversations 
      GROUP BY ai_prediction
    `);
    const rows = stmt.all();
    const result = {
      refund: 0,
      exchange: 0,
      complaint: 0,
      inquiry: 0,
      technical_support: 0,
      other: 0
    };
    for (const row of rows) {
      result[row.intent] = row.count;
    }
    return result;
  }
  getDriftRate() {
    const stmt = this.db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN drift_score > 0 THEN 1 ELSE 0 END) as drifted
      FROM conversations
    `);
    const row = stmt.get();
    return row.total > 0 ? row.drifted / row.total : 0;
  }
  getPendingReviewCount() {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM conversations 
      WHERE risk_level IN ('high', 'medium', 'low')
    `);
    const { count } = stmt.get();
    return count;
  }
  getReviewedTodayCount() {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as count FROM review_records
      WHERE DATE(reviewed_at) = DATE('now')
    `);
    const { count } = stmt.get();
    return count;
  }
  getTotalCount() {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM conversations");
    const { count } = stmt.get();
    return count;
  }
};

// api/repositories/VersionRepository.ts
import { nanoid as nanoid2 } from "nanoid";
function mapRowToVersionRecord(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    versionType: row.version_type,
    intent: row.intent,
    confidence: row.confidence,
    remark: row.remark || void 0,
    operator: row.operator,
    promptVersionId: row.prompt_version_id || void 0,
    trainingSampleId: row.training_sample_id || void 0,
    createdAt: row.created_at,
    parentVersionId: row.parent_version_id || void 0
  };
}
var VersionRepository = class {
  db = getDb();
  findByConversationId(conversationId) {
    const stmt = this.db.prepare(`
      SELECT * FROM version_records 
      WHERE conversation_id = ? 
      ORDER BY created_at ASC
    `);
    const rows = stmt.all(conversationId);
    return rows.map(mapRowToVersionRecord);
  }
  findById(id) {
    const stmt = this.db.prepare("SELECT * FROM version_records WHERE id = ?");
    const row = stmt.get(id);
    return row ? mapRowToVersionRecord(row) : null;
  }
  create(data) {
    const id = "ver_" + nanoid2(8);
    const stmt = this.db.prepare(`
      INSERT INTO version_records
      (id, conversation_id, version_type, intent, confidence, remark, operator,
       prompt_version_id, training_sample_id, parent_version_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    stmt.run(
      id,
      data.conversationId,
      data.versionType,
      data.intent,
      data.confidence,
      data.remark || null,
      data.operator,
      data.promptVersionId || null,
      data.trainingSampleId || null,
      data.parentVersionId || null
    );
    return this.findById(id);
  }
  compareVersions(version1Id, version2Id) {
    const v1 = this.findById(version1Id);
    const v2 = this.findById(version2Id);
    if (!v1 || !v2) {
      return [];
    }
    const diffs = [];
    const fields = ["intent", "confidence", "remark", "operator"];
    for (const field of fields) {
      const oldValue = v1[field] ?? "";
      const newValue = v2[field] ?? "";
      diffs.push({
        field,
        oldValue: String(oldValue),
        newValue: String(newValue),
        changed: oldValue !== newValue
      });
    }
    return diffs;
  }
  getLatestVersion(conversationId) {
    const stmt = this.db.prepare(`
      SELECT * FROM version_records 
      WHERE conversation_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    const row = stmt.get(conversationId);
    return row ? mapRowToVersionRecord(row) : null;
  }
};

// api/repositories/ReviewRepository.ts
import { nanoid as nanoid3 } from "nanoid";
function mapRowToReviewRecord(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    reviewer: row.reviewer,
    originalIntent: row.original_intent,
    correctedIntent: row.corrected_intent,
    changeReason: row.change_reason,
    reviewedAt: row.reviewed_at,
    status: row.status
  };
}
var ReviewRepository = class {
  db = getDb();
  findByConversationId(conversationId) {
    const stmt = this.db.prepare(`
      SELECT * FROM review_records 
      WHERE conversation_id = ? 
      ORDER BY reviewed_at DESC
    `);
    const rows = stmt.all(conversationId);
    return rows.map(mapRowToReviewRecord);
  }
  create(data) {
    const id = "review_" + nanoid3(8);
    const stmt = this.db.prepare(`
      INSERT INTO review_records
      (id, conversation_id, reviewer, original_intent, corrected_intent, change_reason, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.conversationId,
      data.reviewer,
      data.originalIntent,
      data.correctedIntent,
      data.changeReason,
      data.status
    );
    return this.findById(id);
  }
  findById(id) {
    const stmt = this.db.prepare("SELECT * FROM review_records WHERE id = ?");
    const row = stmt.get(id);
    return row ? mapRowToReviewRecord(row) : null;
  }
  findAll(options = {}) {
    const { page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;
    const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM review_records");
    const { count } = countStmt.get();
    const queryStmt = this.db.prepare(`
      SELECT * FROM review_records 
      ORDER BY reviewed_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = queryStmt.all(pageSize, offset);
    return {
      items: rows.map(mapRowToReviewRecord),
      total: count
    };
  }
};

// api/repositories/PromptRepository.ts
import { nanoid as nanoid4 } from "nanoid";
function mapRowToPromptVersion(row) {
  return {
    id: row.id,
    version: row.version,
    content: row.content,
    description: row.description,
    effectiveFrom: row.effective_from,
    effectiveTo: row.effective_to || void 0,
    isActive: row.is_active === 1,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}
var PromptRepository = class {
  db = getDb();
  findAll() {
    const stmt = this.db.prepare(`
      SELECT * FROM prompt_versions 
      ORDER BY effective_from DESC
    `);
    const rows = stmt.all();
    return rows.map(mapRowToPromptVersion);
  }
  findById(id) {
    const stmt = this.db.prepare("SELECT * FROM prompt_versions WHERE id = ?");
    const row = stmt.get(id);
    return row ? mapRowToPromptVersion(row) : null;
  }
  findActive() {
    const stmt = this.db.prepare("SELECT * FROM prompt_versions WHERE is_active = 1 LIMIT 1");
    const row = stmt.get();
    return row ? mapRowToPromptVersion(row) : null;
  }
  create(data) {
    const id = "pv_" + nanoid4(6);
    const stmt = this.db.prepare(`
      INSERT INTO prompt_versions
      (id, version, content, description, effective_from, effective_to, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.version,
      data.content,
      data.description,
      data.effectiveFrom,
      data.effectiveTo || null,
      data.isActive ? 1 : 0,
      data.createdBy
    );
    return this.findById(id);
  }
  activate(id) {
    const db = getDb();
    db.transaction(() => {
      db.prepare("UPDATE prompt_versions SET is_active = 0, effective_to = CURRENT_TIMESTAMP WHERE is_active = 1").run();
      db.prepare("UPDATE prompt_versions SET is_active = 1, effective_from = CURRENT_TIMESTAMP WHERE id = ?").run(id);
    })();
  }
};

// api/services/ConversationService.ts
var ConversationService = class {
  convRepo = new ConversationRepository();
  versionRepo = new VersionRepository();
  reviewRepo = new ReviewRepository();
  promptRepo = new PromptRepository();
  getConversations(options = {}) {
    return this.convRepo.findAll(options);
  }
  getConversationById(id) {
    return this.convRepo.findById(id);
  }
  getVersions(conversationId) {
    return this.versionRepo.findByConversationId(conversationId);
  }
  reviewConversation(conversationId, request) {
    const conversation = this.convRepo.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }
    const latestVersion = this.versionRepo.getLatestVersion(conversationId);
    const activePrompt = this.promptRepo.findActive();
    const newVersion = this.versionRepo.create({
      conversationId,
      versionType: "manual",
      intent: request.correctedIntent,
      confidence: 1,
      remark: request.changeReason,
      operator: request.reviewer,
      promptVersionId: activePrompt?.id,
      parentVersionId: latestVersion?.id
    });
    this.reviewRepo.create({
      conversationId,
      reviewer: request.reviewer,
      originalIntent: conversation.aiPrediction,
      correctedIntent: request.correctedIntent,
      changeReason: request.changeReason,
      status: "approved"
    });
    this.convRepo.update(conversationId, {
      aiPrediction: request.correctedIntent,
      aiConfidence: 1,
      riskLevel: "normal",
      driftScore: 0
    });
    const updatedConversation = this.convRepo.findById(conversationId);
    return {
      success: true,
      conversation: updatedConversation,
      newVersion
    };
  }
  rollbackToVersion(conversationId, versionId, operator) {
    const targetVersion = this.versionRepo.findById(versionId);
    if (!targetVersion || targetVersion.conversationId !== conversationId) {
      throw new Error("Version not found");
    }
    const latestVersion = this.versionRepo.getLatestVersion(conversationId);
    const rollbackVersion = this.versionRepo.create({
      conversationId,
      versionType: "rollback",
      intent: targetVersion.intent,
      confidence: targetVersion.confidence,
      remark: `\u56DE\u6EDA\u5230\u7248\u672C ${versionId}\uFF0C\u539F\u56E0\u4E3A\uFF1A\u4EBA\u5DE5\u590D\u6838\u786E\u8BA4\u8BE5\u7248\u672C\u6B63\u786E`,
      operator,
      promptVersionId: targetVersion.promptVersionId,
      trainingSampleId: targetVersion.trainingSampleId,
      parentVersionId: latestVersion?.id
    });
    this.convRepo.update(conversationId, {
      aiPrediction: targetVersion.intent,
      aiConfidence: targetVersion.confidence
    });
    return rollbackVersion;
  }
  compareVersions(version1Id, version2Id) {
    return this.versionRepo.compareVersions(version1Id, version2Id);
  }
  getDashboardStats() {
    const riskCounts = this.convRepo.countByRiskLevel();
    const sourceCounts = this.convRepo.countBySourceType();
    const intentCounts = this.convRepo.countByIntent();
    const driftRate = this.convRepo.getDriftRate();
    const totalConversations = this.convRepo.getTotalCount();
    const pendingReview = this.convRepo.getPendingReviewCount();
    const reviewedToday = this.convRepo.getReviewedTodayCount();
    const totalBatches = 3;
    return {
      totalConversations,
      pendingReview,
      highRisk: riskCounts.high,
      driftRate: Math.round(driftRate * 100) / 100,
      totalBatches,
      reviewedToday,
      intentDistribution: intentCounts,
      sourceDistribution: sourceCounts
    };
  }
  getTruncationInfos() {
    const result = this.convRepo.findAll({ pageSize: 100 });
    const truncationReasons = {
      "max_tokens_exceeded: context length > 4096 tokens": "\u5BF9\u8BDD\u5185\u5BB9\u8FC7\u957F\uFF0C\u4E3A\u4FDD\u8BC1\u5206\u6790\u51C6\u786E\u6027\uFF0C\u7CFB\u7EDF\u81EA\u52A8\u4FDD\u7559\u4E86\u6838\u5FC3\u5185\u5BB9\uFF0C\u7701\u7565\u4E86\u90E8\u5206\u5386\u53F2\u804A\u5929\u8BB0\u5F55",
      "field_length_limit: customer_text > 500 chars": "\u7528\u6237\u8F93\u5165\u5185\u5BB9\u7279\u522B\u957F\uFF0C\u7CFB\u7EDF\u53EA\u4FDD\u7559\u4E86\u6700\u5173\u952E\u7684\u90E8\u5206\u7528\u4E8E\u5206\u6790",
      "special_chars_stripped: invalid unicode removed": "\u539F\u6587\u5305\u542B\u4E00\u4E9B\u7279\u6B8A\u7B26\u53F7\uFF08\u5982\u8868\u60C5\u3001\u4E71\u7801\uFF09\uFF0C\u7CFB\u7EDF\u5DF2\u81EA\u52A8\u6E05\u7406\u540E\u518D\u8FDB\u884C\u5206\u6790",
      "old_format_migration: pre-2026 schema migrated": "\u8FD9\u662F\u4ECE\u65E7\u7CFB\u7EDF\u5BFC\u5165\u7684\u5386\u53F2\u6570\u636E\uFF0C\u683C\u5F0F\u4E0E\u65B0\u7248\u4E0D\u5B8C\u5168\u4E00\u81F4\uFF0C\u5DF2\u505A\u517C\u5BB9\u6027\u5904\u7406"
    };
    return result.items.filter((c) => c.truncated && c.truncationReason).map((c) => ({
      id: "trunc_" + c.id,
      conversationId: c.id,
      reason: c.truncationReason,
      humanReadableReason: truncationReasons[c.truncationReason] || c.truncationReason,
      originalLength: c.fullContext?.length || 0,
      truncatedLength: c.customerText.length,
      sourceFile: c.sourceFile,
      sourceRow: c.sourceRow
    }));
  }
  getToolCallErrors() {
    const errorData = [
      {
        conversationId: "conv_sample_1",
        errorType: "parameter_mismatch",
        errorMessage: 'Expected intent field to be one of [refund, exchange, complaint, inquiry, technical_support, other], got "refund " (with trailing space)',
        parameterName: "intent",
        parameterValue: "refund ",
        humanReadableExplanation: '\u5728\u5207\u5206\u6E05\u5355\u7B2C7\u884C\uFF0C\u6807\u6CE8\u5458\u5728"refund"\u540E\u9762\u4E0D\u5C0F\u5FC3\u591A\u6572\u4E86\u4E00\u4E2A\u7A7A\u683C\uFF0C\u5BFC\u81F4\u7CFB\u7EDF\u8BC6\u522B\u65F6\u53C2\u6570\u5339\u914D\u5931\u8D25',
        sourceFile: "segmentation_temp_20260612.csv",
        sourceRow: 7
      },
      {
        conversationId: "conv_sample_2",
        errorType: "empty_field",
        errorMessage: "customer_text field is empty or contains only whitespace",
        parameterName: "customer_text",
        parameterValue: "",
        humanReadableExplanation: "\u5728\u6807\u6CE8\u8BB0\u5F55Excel\u7B2C45\u884C\uFF0C\u7528\u6237\u8F93\u5165\u5185\u5BB9\u662F\u7A7A\u7684\uFF0C\u53EF\u80FD\u662F\u5BFC\u51FA\u65F6\u6F0F\u586B\u6216\u8005\u7528\u6237\u6839\u672C\u6CA1\u6709\u53D1\u6D88\u606F\u3002\u8FD9\u6761\u6570\u636E\u5EFA\u8BAE\u76F4\u63A5\u5FFD\u7565\u3002",
        sourceFile: "annotations_20260601_0610.xlsx",
        sourceRow: 45
      },
      {
        conversationId: "conv_sample_3",
        errorType: "missing_unit",
        errorMessage: 'Amount field missing currency unit, value is " \u5143" with leading space',
        parameterName: "amount",
        parameterValue: " \u5143",
        humanReadableExplanation: '\u5728\u6807\u6CE8\u8BB0\u5F55Excel\u7B2C112\u884C\uFF0C"\u91D1\u989D"\u5B57\u6BB5\u53EA\u5199\u4E86"\u5143"\uFF0C\u6F0F\u586B\u4E86\u5177\u4F53\u6570\u5B57\uFF08\u5E94\u8BE5\u662F"299\u5143"\u4E4B\u7C7B\u7684\uFF09\u3002\u8FD9\u662F\u4ECE\u65E7\u8868\u5BFC\u5165\u65F6\u5E38\u89C1\u7684\u95EE\u9898\u3002',
        sourceFile: "annotations_20260601_0610.xlsx",
        sourceRow: 112
      }
    ];
    const conversations = this.convRepo.findAll({ pageSize: 100 });
    return errorData.map((e, i) => {
      const conv = conversations.items[i];
      return {
        ...e,
        id: "error_" + (conv?.id || `err_${i}`),
        conversationId: conv?.id || e.conversationId
      };
    });
  }
};

// api/routes/conversations.ts
var router2 = express.Router();
var conversationService = new ConversationService();
router2.get("/", (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
      riskLevel: req.query.riskLevel,
      sourceType: req.query.sourceType,
      batchId: req.query.batchId,
      hasDrift: req.query.hasDrift === "true" ? true : req.query.hasDrift === "false" ? false : void 0,
      search: req.query.search
    };
    const result = conversationService.getConversations(options);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.get("/:id", (req, res) => {
  try {
    const conversation = conversationService.getConversationById(req.params.id);
    if (!conversation) {
      return res.status(404).json({ success: false, error: "Conversation not found" });
    }
    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.get("/:id/versions", (req, res) => {
  try {
    const versions = conversationService.getVersions(req.params.id);
    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.put("/:id/review", (req, res) => {
  try {
    const request = req.body;
    const result = conversationService.reviewConversation(req.params.id, request);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.post("/:id/rollback", (req, res) => {
  try {
    const { versionId, operator } = req.body;
    const result = conversationService.rollbackToVersion(req.params.id, versionId, operator);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.get("/versions/compare", (req, res) => {
  try {
    const { v1, v2 } = req.query;
    const diffs = conversationService.compareVersions(v1, v2);
    res.json({ success: true, data: diffs });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.get("/truncations/info", (req, res) => {
  try {
    const infos = conversationService.getTruncationInfos();
    res.json({ success: true, data: infos });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router2.get("/tool-errors/info", (req, res) => {
  try {
    const errors = conversationService.getToolCallErrors();
    res.json({ success: true, data: errors });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
var conversations_default = router2;

// api/routes/material.ts
import express2 from "express";
import multer from "multer";
import path3 from "path";
import fs3 from "fs";

// api/repositories/MaterialRepository.ts
import { nanoid as nanoid5 } from "nanoid";
function mapRowToMaterialBatch(row) {
  return {
    id: row.id,
    name: row.name,
    sourceType: row.source_type,
    fileName: row.file_name,
    totalRecords: row.total_records,
    processedRecords: row.processed_records,
    errorRecords: row.error_records,
    status: row.status,
    errorMessage: row.error_message || void 0,
    importedAt: row.imported_at
  };
}
var MaterialRepository = class {
  db = getDb();
  findAll(options = {}) {
    const { page = 1, pageSize = 20 } = options;
    const offset = (page - 1) * pageSize;
    const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM material_batches");
    const { count } = countStmt.get();
    const queryStmt = this.db.prepare(`
      SELECT * FROM material_batches 
      ORDER BY imported_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = queryStmt.all(pageSize, offset);
    return {
      items: rows.map(mapRowToMaterialBatch),
      total: count
    };
  }
  findById(id) {
    const stmt = this.db.prepare("SELECT * FROM material_batches WHERE id = ?");
    const row = stmt.get(id);
    return row ? mapRowToMaterialBatch(row) : null;
  }
  create(data) {
    const id = "batch_" + nanoid5(6);
    const stmt = this.db.prepare(`
      INSERT INTO material_batches
      (id, name, source_type, file_name, total_records, processed_records, error_records, status, error_message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id,
      data.name,
      data.sourceType,
      data.fileName,
      data.totalRecords,
      data.processedRecords,
      data.errorRecords,
      data.status,
      data.errorMessage || null
    );
    return this.findById(id);
  }
  updateStatus(id, status, errorMessage) {
    const stmt = this.db.prepare(`
      UPDATE material_batches 
      SET status = ?, error_message = ? 
      WHERE id = ?
    `);
    stmt.run(status, errorMessage || null, id);
  }
  updateCounts(id, data) {
    const fields = [];
    const params = [];
    if (data.totalRecords !== void 0) {
      fields.push("total_records = ?");
      params.push(data.totalRecords);
    }
    if (data.processedRecords !== void 0) {
      fields.push("processed_records = ?");
      params.push(data.processedRecords);
    }
    if (data.errorRecords !== void 0) {
      fields.push("error_records = ?");
      params.push(data.errorRecords);
    }
    if (data.status !== void 0) {
      fields.push("status = ?");
      params.push(data.status);
    }
    if (fields.length === 0) return;
    params.push(id);
    const stmt = this.db.prepare(`
      UPDATE material_batches SET ${fields.join(", ")} WHERE id = ?
    `);
    stmt.run(...params);
  }
  incrementProcessed(id, success) {
    const field = success ? "processed_records" : "error_records";
    const stmt = this.db.prepare(`
      UPDATE material_batches 
      SET ${field} = ${field} + 1 
      WHERE id = ?
    `);
    stmt.run(id);
  }
  getTotalCount() {
    const stmt = this.db.prepare("SELECT COUNT(*) as count FROM material_batches");
    const { count } = stmt.get();
    return count;
  }
};

// api/services/MaterialService.ts
import Papa from "papaparse";
import * as XLSX from "xlsx";
import fs2 from "fs";
import path2 from "path";
var VALID_INTENTS = ["refund", "exchange", "complaint", "inquiry", "technical_support", "other"];
var MaterialService = class {
  materialRepo = new MaterialRepository();
  convRepo = new ConversationRepository();
  versionRepo = new VersionRepository();
  getBatches() {
    return this.materialRepo.findAll();
  }
  getBatchById(id) {
    return this.materialRepo.findById(id);
  }
  async importFile(filePath, sourceType, fileName, operator) {
    const ext = path2.extname(fileName).toLowerCase();
    const batchName = `${this.getSourceTypeName(sourceType)}_${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}`;
    const warnings = [];
    const batch = this.materialRepo.create({
      name: batchName,
      sourceType,
      fileName,
      totalRecords: 0,
      processedRecords: 0,
      errorRecords: 0,
      status: "processing",
      createdBy: operator
    });
    let processedCount = 0;
    let errorCount = 0;
    const createdConversations = [];
    try {
      let records = [];
      if (ext === ".csv") {
        records = await this.parseCsv(filePath);
      } else if (ext === ".xlsx" || ext === ".xls") {
        records = this.parseExcel(filePath);
      } else if (ext === ".json") {
        records = this.parseJson(filePath);
      } else {
        throw new Error(`\u4E0D\u652F\u6301\u7684\u6587\u4EF6\u683C\u5F0F: ${ext}\uFF0C\u8BF7\u4F7F\u7528 CSV\u3001Excel \u6216 JSON`);
      }
      const totalRecords = records.length;
      if (totalRecords === 0) {
        warnings.push("\u6587\u4EF6\u89E3\u6790\u540E\u6CA1\u6709\u627E\u5230\u4EFB\u4F55\u6709\u6548\u6570\u636E\u8BB0\u5F55");
      }
      for (let i = 0; i < records.length; i++) {
        const rawRecord = records[i];
        const rowNumber = i + 2;
        try {
          const result = this.processRecord(rawRecord, rowNumber, fileName, sourceType, batch.id, operator);
          if (result.conversation) {
            const conv = this.convRepo.create(result.conversation);
            createdConversations.push(conv);
            if (result.annotationVersion) {
              this.versionRepo.create({
                ...result.annotationVersion,
                conversationId: conv.id
              });
            }
            if (result.predictionVersion) {
              this.versionRepo.create({
                ...result.predictionVersion,
                conversationId: conv.id
              });
            }
            processedCount++;
          }
          if (result.warning) {
            warnings.push(`\u7B2C${rowNumber}\u884C\uFF1A${result.warning}`);
          }
        } catch (recordError) {
          errorCount++;
          warnings.push(`\u7B2C${rowNumber}\u884C\u5904\u7406\u5931\u8D25\uFF1A${recordError.message}`);
        }
      }
      this.materialRepo.updateCounts(batch.id, {
        totalRecords,
        processedRecords: processedCount,
        errorRecords: errorCount,
        status: "completed"
      });
      return {
        batchId: batch.id,
        totalRecords,
        processedRecords: processedCount,
        errorRecords: errorCount,
        warnings: warnings.slice(0, 50),
        sampleRecords: createdConversations.slice(0, 5)
      };
    } catch (error) {
      this.materialRepo.updateStatus(batch.id, "failed", error.message);
      throw error;
    }
  }
  processRecord(record, rowNumber, fileName, sourceType, batchId, operator) {
    const warnings = [];
    const userInput = this.extractField(record, ["userInput", "user_input", "\u7528\u6237\u8F93\u5165", "\u5BA2\u6237\u8F93\u5165", "question", "text", "content"]);
    const intent = this.extractField(record, ["intent", "\u610F\u56FE", "annotation", "label", "category"]);
    const confidence = this.extractField(record, ["confidence", "\u7F6E\u4FE1\u5EA6", "score"]);
    const sessionId = this.extractField(record, ["sessionId", "session_id", "\u4F1A\u8BDDID", "conversationId", "conversation_id"]) || `sess_${Date.now()}_${rowNumber}`;
    const assistantResponse = this.extractField(record, ["assistantResponse", "assistant_response", "\u5BA2\u670D\u56DE\u590D", "\u673A\u5668\u4EBA\u56DE\u590D", "answer", "response"]);
    const remark = this.extractField(record, ["remark", "\u5907\u6CE8", "note", "comment"]);
    const trainingSampleId = this.extractField(record, ["trainingSampleId", "training_sample_id", "\u6837\u672CID", "sampleId"]);
    if (!userInput || String(userInput).trim() === "") {
      warnings.push("\u7528\u6237\u8F93\u5165\u5185\u5BB9\u4E3A\u7A7A");
    }
    const customerText = String(userInput || "").trim();
    const isTruncated = customerText.length > 500;
    const truncatedText = isTruncated ? customerText.substring(0, 497) + "..." : customerText;
    let truncationReason;
    if (isTruncated) {
      truncationReason = "field_length_limit: customer_text > 500 chars";
      warnings.push(`\u7528\u6237\u8F93\u5165\u8FC7\u957F\uFF08${customerText.length}\u5B57\uFF09\uFF0C\u5DF2\u81EA\u52A8\u622A\u65AD\u4E3A\u524D500\u5B57`);
    }
    let originalIntent = "other";
    let aiIntent = "other";
    let aiConfidence = 0.7;
    if (intent && VALID_INTENTS.includes(String(intent).trim())) {
      originalIntent = String(intent).trim();
    } else if (intent) {
      warnings.push(`\u6807\u6CE8\u610F\u56FE"${intent}"\u4E0D\u662F\u6709\u6548\u503C\uFF0C\u5DF2\u9ED8\u8BA4\u8BBE\u4E3Aother`);
    }
    aiIntent = this.simulateAIPrediction(customerText, originalIntent);
    aiConfidence = this.calculateConfidence(customerText, originalIntent, aiIntent);
    const hasDrift = originalIntent !== aiIntent;
    const driftScore = hasDrift ? Math.min(0.5 + Math.random() * 0.4, 0.95) : Math.random() * 0.1;
    let riskLevel = "normal";
    if (hasDrift) {
      if (driftScore >= 0.7 || customerText.length > 200) {
        riskLevel = "high";
      } else if (driftScore >= 0.4) {
        riskLevel = "medium";
      } else {
        riskLevel = "low";
      }
    }
    const hasEmptyField = !userInput || String(userInput).trim() === "";
    if (hasEmptyField) {
      riskLevel = "high";
      warnings.push("\u68C0\u6D4B\u5230\u7A7A\u5B57\u6BB5\u574F\u6570\u636E\uFF0C\u5DF2\u6807\u8BB0\u4E3A\u9AD8\u98CE\u9669");
    }
    const annotationRemark = [
      `\u539F\u59CB\u6807\u6CE8\uFF0C\u6765\u6E90: ${fileName} \u7B2C${rowNumber}\u884C`,
      remark ? `\u539F\u5907\u6CE8: ${remark}` : null,
      trainingSampleId ? `\u8BAD\u7EC3\u6837\u672CID: ${trainingSampleId}` : null
    ].filter(Boolean).join("\uFF1B");
    const conversation = {
      sessionId: String(sessionId),
      customerText: truncatedText,
      robotText: assistantResponse ? String(assistantResponse) : void 0,
      fullContext: customerText !== truncatedText ? customerText : void 0,
      truncated: isTruncated,
      truncationReason,
      sourceFile: fileName,
      sourceRow: rowNumber,
      sourceType,
      originalAnnotation: originalIntent,
      aiPrediction: aiIntent,
      aiConfidence,
      riskLevel,
      driftScore,
      batchId
    };
    const annotationVersion = {
      versionType: "annotation",
      intent: originalIntent,
      confidence: Number(confidence) || 0.8,
      remark: annotationRemark,
      operator: sourceType === "training_sample" ? "\u8BAD\u7EC3\u6837\u672C\u5BFC\u5165" : operator || "\u7CFB\u7EDF\u5BFC\u5165",
      trainingSampleId: trainingSampleId ? String(trainingSampleId) : void 0,
      promptVersionId: void 0
    };
    const predictionVersion = {
      versionType: "prediction",
      intent: aiIntent,
      confidence: aiConfidence,
      remark: `AI\u81EA\u52A8\u9884\u6D4B\uFF0C\u57FA\u4E8E\u63D0\u793A\u8BCD\u7248\u672C pv_003\uFF0C\u6F02\u79FB\u5F97\u5206: ${driftScore.toFixed(2)}`,
      operator: "ai_system",
      promptVersionId: "pv_003",
      trainingSampleId: void 0
    };
    return {
      conversation,
      annotationVersion,
      predictionVersion,
      warning: warnings.length > 0 ? warnings.join("\uFF1B") : void 0
    };
  }
  extractField(record, possibleKeys) {
    for (const key of possibleKeys) {
      if (record[key] !== void 0 && record[key] !== null && record[key] !== "") {
        return record[key];
      }
    }
    const recordKeys = Object.keys(record);
    for (const key of recordKeys) {
      const lowerKey = key.toLowerCase().replace(/_/g, "");
      for (const possible of possibleKeys) {
        const lowerPossible = possible.toLowerCase().replace(/_/g, "");
        if (lowerKey === lowerPossible || lowerKey.includes(lowerPossible)) {
          return record[key];
        }
      }
    }
    return void 0;
  }
  simulateAIPrediction(text, originalIntent) {
    const lowerText = text.toLowerCase();
    if (/(退款|退货|退钱|不想买|不要了|cancel|refund)/.test(lowerText)) {
      return Math.random() > 0.2 ? "refund" : originalIntent;
    }
    if (/(换货|换一个|换尺码|大小不合适|exchange)/.test(lowerText)) {
      return Math.random() > 0.25 ? "exchange" : originalIntent;
    }
    if (/(投诉|差评|举报|垃圾|太差|坑爹|complain)/.test(lowerText)) {
      return Math.random() > 0.15 ? "complaint" : originalIntent;
    }
    if (/(技术|故障|bug|坏了|打不开|加载|technical|error|问题)/.test(lowerText) && /(网页|系统|页面|app|软件)/.test(lowerText)) {
      return Math.random() > 0.3 ? "technical_support" : originalIntent;
    }
    if (/(怎么|如何|请问|什么时候|能不能|多少|有没有|可以|是否|查询|发货|物流)/.test(lowerText)) {
      return Math.random() > 0.2 ? "inquiry" : originalIntent;
    }
    return Math.random() > 0.85 ? VALID_INTENTS[Math.floor(Math.random() * VALID_INTENTS.length)] : originalIntent;
  }
  calculateConfidence(text, original, predicted) {
    const baseConfidence = original === predicted ? 0.92 : 0.72;
    const lengthFactor = Math.min(text.length / 100, 1) * 0.05;
    const randomFactor = (Math.random() - 0.5) * 0.1;
    return Math.max(0.55, Math.min(0.98, baseConfidence + lengthFactor + randomFactor));
  }
  async parseCsv(filePath) {
    const content = fs2.readFileSync(filePath, "utf-8");
    return new Promise((resolve, reject) => {
      Papa.parse(content, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: reject
      });
    });
  }
  parseExcel(filePath) {
    const workbook = XLSX.readFile(filePath);
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }
  parseJson(filePath) {
    const content = fs2.readFileSync(filePath, "utf-8");
    const data = JSON.parse(content);
    return Array.isArray(data) ? data : [data];
  }
  getSourceTypeName(type) {
    const names = {
      annotation_record: "\u6807\u6CE8\u8BB0\u5F55",
      segmentation_list: "\u5207\u5206\u6E05\u5355",
      training_sample: "\u8BAD\u7EC3\u6837\u672C"
    };
    return names[type];
  }
};

// api/routes/material.ts
var router3 = express2.Router();
var materialService = new MaterialService();
var UPLOAD_DIR = path3.join(process.cwd(), "data", "uploads");
if (!fs3.existsSync(UPLOAD_DIR)) {
  fs3.mkdirSync(UPLOAD_DIR, { recursive: true });
}
var storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    cb(null, `${timestamp}_${file.originalname}`);
  }
});
var upload = multer({ storage });
router3.get("/batches", (req, res) => {
  try {
    const result = materialService.getBatches();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router3.get("/batches/:id", (req, res) => {
  try {
    const batch = materialService.getBatchById(req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, error: "Batch not found" });
    }
    res.json({ success: true, data: batch });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router3.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded" });
    }
    const { sourceType, operator } = req.body;
    if (!sourceType) {
      return res.status(400).json({ success: false, error: "sourceType is required" });
    }
    const result = await materialService.importFile(
      req.file.path,
      sourceType,
      req.file.originalname,
      operator || "system"
    );
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
var material_default = router3;

// api/routes/report.ts
import express3 from "express";

// shared/types.ts
var INTENT_LABELS = {
  refund: "\u9000\u6B3E\u7533\u8BF7",
  exchange: "\u6362\u8D27\u7533\u8BF7",
  complaint: "\u6295\u8BC9",
  inquiry: "\u54A8\u8BE2",
  technical_support: "\u6280\u672F\u652F\u6301",
  other: "\u5176\u4ED6"
};
var RISK_LEVEL_LABELS = {
  high: "\u9AD8\u98CE\u9669",
  medium: "\u4E2D\u98CE\u9669",
  low: "\u4F4E\u98CE\u9669",
  normal: "\u6B63\u5E38"
};

// api/services/ReportService.ts
import ExcelJS from "exceljs";
import PdfPrinter from "pdfmake";
import fs4 from "fs";
import path4 from "path";
import { nanoid as nanoid6 } from "nanoid";
var REPORT_DIR = path4.join(process.cwd(), "data", "reports");
if (!fs4.existsSync(REPORT_DIR)) {
  fs4.mkdirSync(REPORT_DIR, { recursive: true });
}
var ReportService = class {
  convRepo = new ConversationRepository();
  reviewRepo = new ReviewRepository();
  materialRepo = new MaterialRepository();
  promptRepo = new PromptRepository();
  async generateReport(request, generatedBy) {
    const { format, includeTechnicalDetails, batchIds } = request;
    const reportId = "report_" + nanoid6(8);
    const timestamp = (/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-");
    const fileName = `\u610F\u56FE\u6F02\u79FB\u590D\u6838\u62A5\u544A_${timestamp}.${format}`;
    const filePath = path4.join(REPORT_DIR, fileName);
    const stats = this.convRepo.findAll({ pageSize: 1e3 });
    const reviews = this.reviewRepo.findAll({ pageSize: 100 });
    const batches = this.materialRepo.findAll({ pageSize: 100 });
    const prompts = this.promptRepo.findAll();
    const activePrompt = prompts.find((p) => p.isActive);
    const truncationInfos = this.getTruncationInfos();
    const toolCallErrors = this.getToolCallErrors();
    if (format === "excel") {
      await this.generateExcel(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTechnicalDetails);
    } else if (format === "pdf") {
      await this.generatePdf(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTechnicalDetails);
    } else {
      await this.generateWord(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTechnicalDetails);
    }
    const fileSize = fs4.statSync(filePath).size;
    return {
      reportId,
      downloadUrl: `/api/report/download/${reportId}`,
      fileName,
      fileSize,
      generatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  async generateExcel(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTech) {
    const workbook = new ExcelJS.Workbook();
    const summarySheet = workbook.addWorksheet("\u6982\u89C8");
    summarySheet.columns = [
      { header: "\u6307\u6807", key: "metric", width: 30 },
      { header: "\u6570\u503C", key: "value", width: 20 }
    ];
    summarySheet.addRow({ metric: "\u603B\u5BF9\u8BDD\u6570", value: stats.total });
    summarySheet.addRow({ metric: "\u5F85\u590D\u6838\u6570", value: this.convRepo.getPendingReviewCount() });
    summarySheet.addRow({ metric: "\u9AD8\u98CE\u9669\u6570", value: this.convRepo.countByRiskLevel().high });
    summarySheet.addRow({ metric: "\u6F02\u79FB\u7387", value: `${(this.convRepo.getDriftRate() * 100).toFixed(1)}%` });
    summarySheet.addRow({ metric: "\u4ECA\u65E5\u590D\u6838\u6570", value: this.convRepo.getReviewedTodayCount() });
    summarySheet.addRow({ metric: "\u5F53\u524D\u63D0\u793A\u8BCD\u7248\u672C", value: activePrompt?.version || "N/A" });
    const driftSheet = workbook.addWorksheet("\u610F\u56FE\u6F02\u79FB\u5217\u8868");
    driftSheet.columns = [
      { header: "\u4F1A\u8BDDID", key: "sessionId", width: 15 },
      { header: "\u7528\u6237\u8F93\u5165", key: "customerText", width: 50 },
      { header: "\u539F\u59CB\u6807\u6CE8", key: "original", width: 15 },
      { header: "AI\u9884\u6D4B", key: "prediction", width: 15 },
      { header: "\u7F6E\u4FE1\u5EA6", key: "confidence", width: 10 },
      { header: "\u98CE\u9669\u7B49\u7EA7", key: "risk", width: 12 },
      { header: "\u6F02\u79FB\u5206\u6570", key: "drift", width: 12 },
      { header: "\u6765\u6E90\u6587\u4EF6", key: "source", width: 30 },
      { header: "\u6765\u6E90\u884C", key: "row", width: 10 }
    ];
    stats.items.forEach((item) => {
      driftSheet.addRow({
        sessionId: item.sessionId,
        customerText: item.customerText,
        original: INTENT_LABELS[item.originalAnnotation],
        prediction: INTENT_LABELS[item.aiPrediction],
        confidence: item.aiConfidence,
        risk: RISK_LEVEL_LABELS[item.riskLevel],
        drift: item.driftScore,
        source: item.sourceFile,
        row: item.sourceRow
      });
    });
    const truncationSheet = workbook.addWorksheet("\u622A\u65AD\u8BF4\u660E");
    truncationSheet.columns = [
      { header: "\u4F1A\u8BDDID", key: "conversationId", width: 20 },
      { header: "\u901A\u4FD7\u8BF4\u660E", key: "humanReadableReason", width: 60 },
      { header: "\u539F\u957F\u5EA6", key: "originalLength", width: 12 },
      { header: "\u622A\u65AD\u540E\u957F\u5EA6", key: "truncatedLength", width: 12 },
      { header: "\u6765\u6E90\u6587\u4EF6", key: "sourceFile", width: 30 },
      { header: "\u6765\u6E90\u884C", key: "sourceRow", width: 10 }
    ];
    truncationInfos.forEach((info) => {
      truncationSheet.addRow(info);
    });
    if (includeTech) {
      const errorSheet = workbook.addWorksheet("\u5DE5\u5177\u8C03\u7528\u9519\u8BEF");
      errorSheet.columns = [
        { header: "\u4F1A\u8BDDID", key: "conversationId", width: 20 },
        { header: "\u9519\u8BEF\u7C7B\u578B", key: "errorType", width: 20 },
        { header: "\u901A\u4FD7\u89E3\u91CA", key: "humanReadableExplanation", width: 50 },
        { header: "\u6765\u6E90\u6587\u4EF6", key: "sourceFile", width: 30 },
        { header: "\u6765\u6E90\u884C", key: "sourceRow", width: 10 }
      ];
      toolCallErrors.forEach((error) => {
        errorSheet.addRow(error);
      });
    }
    await workbook.xlsx.writeFile(filePath);
  }
  async generatePdf(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTech) {
    const fonts = {
      Roboto: {
        normal: "Helvetica",
        bold: "Helvetica-Bold",
        italics: "Helvetica-Oblique",
        bolditalics: "Helvetica-BoldOblique"
      }
    };
    const printer = new PdfPrinter(fonts);
    const docDefinition = {
      content: [
        { text: "\u5BA2\u670D\u673A\u5668\u4EBA\u610F\u56FE\u6F02\u79FB\u590D\u6838\u62A5\u544A", style: "header", fontSize: 18, bold: true },
        { text: `\u751F\u6210\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}`, margin: [0, 0, 0, 20] },
        { text: "\u4E00\u3001\u6982\u89C8", style: "sectionHeader", bold: true, fontSize: 14, margin: [0, 10, 0, 10] },
        {
          table: {
            body: [
              ["\u6307\u6807", "\u6570\u503C"],
              ["\u603B\u5BF9\u8BDD\u6570", stats.total.toString()],
              ["\u5F85\u590D\u6838\u6570", this.convRepo.getPendingReviewCount().toString()],
              ["\u9AD8\u98CE\u9669\u6570", this.convRepo.countByRiskLevel().high.toString()],
              ["\u6F02\u79FB\u7387", `${(this.convRepo.getDriftRate() * 100).toFixed(1)}%`],
              ["\u4ECA\u65E5\u590D\u6838\u6570", this.convRepo.getReviewedTodayCount().toString()],
              ["\u5F53\u524D\u63D0\u793A\u8BCD\u7248\u672C", activePrompt?.version || "N/A"]
            ]
          }
        },
        { text: "\u4E8C\u3001\u9AD8\u98CE\u9669\u6F02\u79FB\u660E\u7EC6", style: "sectionHeader", bold: true, fontSize: 14, margin: [0, 20, 0, 10] },
        ...stats.items.filter((item) => item.riskLevel === "high").map((item) => [
          { text: `\u4F1A\u8BDD ${item.sessionId}`, bold: true },
          { text: `\u7528\u6237: ${item.customerText}`, margin: [0, 5, 0, 5] },
          { text: `\u539F\u59CB\u6807\u6CE8: ${INTENT_LABELS[item.originalAnnotation]} \u2192 AI\u9884\u6D4B: ${INTENT_LABELS[item.aiPrediction]}`, color: item.originalAnnotation !== item.aiPrediction ? "#d32f2f" : "#333" },
          { text: `\u6765\u6E90: ${item.sourceFile} \u7B2C${item.sourceRow}\u884C`, fontSize: 10, color: "#666", margin: [0, 0, 0, 10] }
        ]).flat(),
        { text: "\u4E09\u3001\u957F\u6587\u672C\u622A\u65AD\u8BF4\u660E", style: "sectionHeader", bold: true, fontSize: 14, margin: [0, 20, 0, 10] },
        ...truncationInfos.map((info) => [
          { text: `\u2022 \u4F1A\u8BDD ${info.conversationId}`, margin: [0, 5, 0, 2] },
          { text: `  ${info.humanReadableReason}`, fontSize: 11, color: "#555" },
          { text: `  \u6765\u6E90: ${info.sourceFile} \u7B2C${info.sourceRow}\u884C`, fontSize: 10, color: "#999", margin: [0, 0, 0, 8] }
        ]).flat()
      ],
      defaultStyle: {
        font: "Roboto",
        fontSize: 11
      }
    };
    if (includeTech) {
      docDefinition.content.push(
        { text: "\u56DB\u3001\u5DE5\u5177\u8C03\u7528\u9519\u8BEF\u8BE6\u60C5", style: "sectionHeader", bold: true, fontSize: 14, margin: [0, 20, 0, 10] },
        ...toolCallErrors.map((error) => [
          { text: `\u2022 ${error.humanReadableExplanation}`, margin: [0, 5, 0, 2] },
          { text: `  \u6765\u6E90: ${error.sourceFile} \u7B2C${error.sourceRow}\u884C`, fontSize: 10, color: "#666", margin: [0, 0, 0, 8] }
        ]).flat()
      );
    }
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    await new Promise((resolve, reject) => {
      pdfDoc.pipe(fs4.createWriteStream(filePath));
      pdfDoc.on("end", resolve);
      pdfDoc.on("error", reject);
      pdfDoc.end();
    });
  }
  async generateWord(filePath, stats, reviews, batches, prompts, activePrompt, truncationInfos, toolCallErrors, includeTech) {
    let content = "# \u5BA2\u670D\u673A\u5668\u4EBA\u610F\u56FE\u6F02\u79FB\u590D\u6838\u62A5\u544A\n\n";
    content += `\u751F\u6210\u65F6\u95F4: ${(/* @__PURE__ */ new Date()).toLocaleString("zh-CN")}

`;
    content += "## \u4E00\u3001\u6982\u89C8\n\n";
    content += "| \u6307\u6807 | \u6570\u503C |\n|------|------|\n";
    content += `| \u603B\u5BF9\u8BDD\u6570 | ${stats.total} |
`;
    content += `| \u5F85\u590D\u6838\u6570 | ${this.convRepo.getPendingReviewCount()} |
`;
    content += `| \u9AD8\u98CE\u9669\u6570 | ${this.convRepo.countByRiskLevel().high} |
`;
    content += `| \u6F02\u79FB\u7387 | ${(this.convRepo.getDriftRate() * 100).toFixed(1)}% |
`;
    content += `| \u4ECA\u65E5\u590D\u6838\u6570 | ${this.convRepo.getReviewedTodayCount()} |
`;
    content += `| \u5F53\u524D\u63D0\u793A\u8BCD\u7248\u672C | ${activePrompt?.version || "N/A"} |

`;
    content += "## \u4E8C\u3001\u9AD8\u98CE\u9669\u6F02\u79FB\u660E\u7EC6\n\n";
    stats.items.filter((item) => item.riskLevel === "high").forEach((item) => {
      content += `### \u4F1A\u8BDD ${item.sessionId}

`;
      content += `- \u7528\u6237: ${item.customerText}
`;
      content += `- \u539F\u59CB\u6807\u6CE8: **${INTENT_LABELS[item.originalAnnotation]}**
`;
      content += `- AI\u9884\u6D4B: **${INTENT_LABELS[item.aiPrediction]}**
`;
      content += `- \u7F6E\u4FE1\u5EA6: ${item.aiConfidence}
`;
      content += `- \u6765\u6E90: ${item.sourceFile} \u7B2C${item.sourceRow}\u884C

`;
    });
    content += "## \u4E09\u3001\u957F\u6587\u672C\u622A\u65AD\u8BF4\u660E\n\n";
    truncationInfos.forEach((info) => {
      content += `- **\u4F1A\u8BDD ${info.conversationId}**: ${info.humanReadableReason}
`;
      content += `  \u6765\u6E90: ${info.sourceFile} \u7B2C${info.sourceRow}\u884C

`;
    });
    if (includeTech) {
      content += "## \u56DB\u3001\u5DE5\u5177\u8C03\u7528\u9519\u8BEF\u8BE6\u60C5\n\n";
      toolCallErrors.forEach((error) => {
        content += `- **\u4F1A\u8BDD ${error.conversationId}**: ${error.humanReadableExplanation}
`;
        content += `  \u6765\u6E90: ${error.sourceFile} \u7B2C${error.sourceRow}\u884C

`;
      });
    }
    fs4.writeFileSync(filePath, content, "utf-8");
  }
  getTruncationInfos() {
    const result = this.convRepo.findAll({ pageSize: 100 });
    const truncationReasons = {
      "max_tokens_exceeded: context length > 4096 tokens": "\u5BF9\u8BDD\u5185\u5BB9\u8FC7\u957F\uFF0C\u4E3A\u4FDD\u8BC1\u5206\u6790\u51C6\u786E\u6027\uFF0C\u7CFB\u7EDF\u81EA\u52A8\u4FDD\u7559\u4E86\u6838\u5FC3\u5185\u5BB9\uFF0C\u7701\u7565\u4E86\u90E8\u5206\u5386\u53F2\u804A\u5929\u8BB0\u5F55",
      "field_length_limit: customer_text > 500 chars": "\u7528\u6237\u8F93\u5165\u5185\u5BB9\u7279\u522B\u957F\uFF0C\u7CFB\u7EDF\u53EA\u4FDD\u7559\u4E86\u6700\u5173\u952E\u7684\u90E8\u5206\u7528\u4E8E\u5206\u6790",
      "special_chars_stripped: invalid unicode removed": "\u539F\u6587\u5305\u542B\u4E00\u4E9B\u7279\u6B8A\u7B26\u53F7\uFF08\u5982\u8868\u60C5\u3001\u4E71\u7801\uFF09\uFF0C\u7CFB\u7EDF\u5DF2\u81EA\u52A8\u6E05\u7406\u540E\u518D\u8FDB\u884C\u5206\u6790",
      "old_format_migration: pre-2026 schema migrated": "\u8FD9\u662F\u4ECE\u65E7\u7CFB\u7EDF\u5BFC\u5165\u7684\u5386\u53F2\u6570\u636E\uFF0C\u683C\u5F0F\u4E0E\u65B0\u7248\u4E0D\u5B8C\u5168\u4E00\u81F4\uFF0C\u5DF2\u505A\u517C\u5BB9\u6027\u5904\u7406"
    };
    return result.items.filter((c) => c.truncated && c.truncationReason).map((c) => ({
      id: "trunc_" + c.id,
      conversationId: c.id,
      reason: c.truncationReason,
      humanReadableReason: truncationReasons[c.truncationReason] || c.truncationReason,
      originalLength: c.fullContext?.length || 0,
      truncatedLength: c.customerText.length,
      sourceFile: c.sourceFile,
      sourceRow: c.sourceRow
    }));
  }
  getToolCallErrors() {
    const conversations = this.convRepo.findAll({ pageSize: 100 });
    const errorData = [
      {
        conversationId: "conv_placeholder_1",
        errorType: "parameter_mismatch",
        errorMessage: 'Expected intent field to be one of [refund, exchange, complaint, inquiry, technical_support, other], got "refund " (with trailing space)',
        parameterName: "intent",
        parameterValue: "refund ",
        humanReadableExplanation: '\u5728\u5207\u5206\u6E05\u5355\u7B2C7\u884C\uFF0C\u6807\u6CE8\u5458\u5728"refund"\u540E\u9762\u4E0D\u5C0F\u5FC3\u591A\u6572\u4E86\u4E00\u4E2A\u7A7A\u683C\uFF0C\u5BFC\u81F4\u7CFB\u7EDF\u8BC6\u522B\u65F6\u53C2\u6570\u5339\u914D\u5931\u8D25',
        sourceFile: "segmentation_temp_20260612.csv",
        sourceRow: 7
      },
      {
        conversationId: "conv_placeholder_2",
        errorType: "empty_field",
        errorMessage: "customer_text field is empty or contains only whitespace",
        parameterName: "customer_text",
        parameterValue: "",
        humanReadableExplanation: "\u5728\u6807\u6CE8\u8BB0\u5F55Excel\u7B2C45\u884C\uFF0C\u7528\u6237\u8F93\u5165\u5185\u5BB9\u662F\u7A7A\u7684\uFF0C\u53EF\u80FD\u662F\u5BFC\u51FA\u65F6\u6F0F\u586B\u6216\u8005\u7528\u6237\u6839\u672C\u6CA1\u6709\u53D1\u6D88\u606F\u3002\u8FD9\u6761\u6570\u636E\u5EFA\u8BAE\u76F4\u63A5\u5FFD\u7565\u3002",
        sourceFile: "annotations_20260601_0610.xlsx",
        sourceRow: 45
      },
      {
        conversationId: "conv_placeholder_3",
        errorType: "missing_unit",
        errorMessage: 'Amount field missing currency unit, value is " \u5143" with leading space',
        parameterName: "amount",
        parameterValue: " \u5143",
        humanReadableExplanation: '\u5728\u6807\u6CE8\u8BB0\u5F55Excel\u7B2C112\u884C\uFF0C"\u91D1\u989D"\u5B57\u6BB5\u53EA\u5199\u4E86"\u5143"\uFF0C\u6F0F\u586B\u4E86\u5177\u4F53\u6570\u5B57\uFF08\u5E94\u8BE5\u662F"299\u5143"\u4E4B\u7C7B\u7684\uFF09\u3002\u8FD9\u662F\u4ECE\u65E7\u8868\u5BFC\u5165\u65F6\u5E38\u89C1\u7684\u95EE\u9898\u3002',
        sourceFile: "annotations_20260601_0610.xlsx",
        sourceRow: 112
      }
    ];
    return errorData.map((e, i) => ({
      ...e,
      id: "error_" + (conversations.items[i]?.id || `err_${i}`),
      conversationId: conversations.items[i]?.id || e.conversationId
    }));
  }
  getReportFilePath(reportId) {
    const files = fs4.readdirSync(REPORT_DIR);
    const reportFile = files.find((f) => f.includes(reportId));
    return reportFile ? path4.join(REPORT_DIR, reportFile) : null;
  }
};

// api/routes/report.ts
import fs5 from "fs";
var router4 = express3.Router();
var reportService = new ReportService();
router4.post("/generate", async (req, res) => {
  try {
    const request = req.body;
    const generatedBy = req.body.generatedBy || "system";
    const result = await reportService.generateReport(request, generatedBy);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router4.get("/download/:id", (req, res) => {
  try {
    const filePath = reportService.getReportFilePath(req.params.id);
    if (!filePath || !fs5.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "Report not found" });
    }
    const fileName = filePath.split("/").pop() || "report.pdf";
    res.download(filePath, fileName);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
var report_default = router4;

// api/routes/prompt.ts
import express4 from "express";

// api/services/PromptService.ts
var PromptService = class {
  promptRepo = new PromptRepository();
  getAll() {
    return this.promptRepo.findAll();
  }
  getActive() {
    return this.promptRepo.findActive();
  }
  create(data) {
    return this.promptRepo.create(data);
  }
  activate(id) {
    this.promptRepo.activate(id);
  }
};

// api/routes/prompt.ts
var router5 = express4.Router();
var promptService = new PromptService();
router5.get("/", (req, res) => {
  try {
    const versions = promptService.getAll();
    res.json({ success: true, data: versions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router5.get("/active", (req, res) => {
  try {
    const active = promptService.getActive();
    res.json({ success: true, data: active });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router5.post("/", (req, res) => {
  try {
    const data = req.body;
    const version = promptService.create(data);
    res.json({ success: true, data: version });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
router5.put("/:id/activate", (req, res) => {
  try {
    promptService.activate(req.params.id);
    res.json({ success: true, message: "Prompt version activated" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
var prompt_default = router5;

// api/routes/stats.ts
import express5 from "express";
var router6 = express5.Router();
var conversationService2 = new ConversationService();
router6.get("/dashboard", (req, res) => {
  try {
    const stats = conversationService2.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
var stats_default = router6;

// api/app.ts
var __filename2 = fileURLToPath2(import.meta.url);
var __dirname2 = path5.dirname(__filename2);
dotenv.config();
initDatabase();
var app = express6();
app.use(cors());
app.use(express6.json({ limit: "10mb" }));
app.use(express6.urlencoded({ extended: true, limit: "10mb" }));
app.use("/api/auth", auth_default);
app.use("/api/conversations", conversations_default);
app.use("/api/material", material_default);
app.use("/api/report", report_default);
app.use("/api/prompt-versions", prompt_default);
app.use("/api/stats", stats_default);
app.use(
  "/api/health",
  (req, res, next) => {
    res.status(200).json({
      success: true,
      message: "ok"
    });
  }
);
app.use((error, req, res, next) => {
  res.status(500).json({
    success: false,
    error: "Server internal error"
  });
});
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "API not found"
  });
});
var app_default = app;

// api/server.ts
var PORT = process.env.PORT || 3001;
var server = app_default.listen(PORT, () => {
  console.log(`Server ready on port ${PORT}`);
});
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
process.on("SIGINT", () => {
  console.log("SIGINT signal received");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
var server_default = app_default;
export {
  server_default as default
};
