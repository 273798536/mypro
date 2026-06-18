import { createRequire } from 'module'; const require = createRequire(import.meta.url);

// scripts/seed-sample-data.ts
import { nanoid } from "nanoid";

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

// scripts/seed-sample-data.ts
function generateTruncationReason(technicalReason) {
  const reasonMap = {
    "max_tokens_exceeded": {
      technical: "max_tokens_exceeded: context length > 4096 tokens",
      human: "\u5BF9\u8BDD\u5185\u5BB9\u8FC7\u957F\uFF0C\u4E3A\u4FDD\u8BC1\u5206\u6790\u51C6\u786E\u6027\uFF0C\u7CFB\u7EDF\u81EA\u52A8\u4FDD\u7559\u4E86\u6838\u5FC3\u5185\u5BB9\uFF0C\u7701\u7565\u4E86\u90E8\u5206\u5386\u53F2\u804A\u5929\u8BB0\u5F55"
    },
    "field_length_limit": {
      technical: "field_length_limit: customer_text > 500 chars",
      human: "\u7528\u6237\u8F93\u5165\u5185\u5BB9\u7279\u522B\u957F\uFF0C\u7CFB\u7EDF\u53EA\u4FDD\u7559\u4E86\u6700\u5173\u952E\u7684\u90E8\u5206\u7528\u4E8E\u5206\u6790"
    },
    "special_chars_stripped": {
      technical: "special_chars_stripped: invalid unicode removed",
      human: "\u539F\u6587\u5305\u542B\u4E00\u4E9B\u7279\u6B8A\u7B26\u53F7\uFF08\u5982\u8868\u60C5\u3001\u4E71\u7801\uFF09\uFF0C\u7CFB\u7EDF\u5DF2\u81EA\u52A8\u6E05\u7406\u540E\u518D\u8FDB\u884C\u5206\u6790"
    },
    "old_format_migration": {
      technical: "old_format_migration: pre-2026 schema migrated",
      human: "\u8FD9\u662F\u4ECE\u65E7\u7CFB\u7EDF\u5BFC\u5165\u7684\u5386\u53F2\u6570\u636E\uFF0C\u683C\u5F0F\u4E0E\u65B0\u7248\u4E0D\u5B8C\u5168\u4E00\u81F4\uFF0C\u5DF2\u505A\u517C\u5BB9\u6027\u5904\u7406"
    }
  };
  return reasonMap[technicalReason] || { technical: technicalReason, human: technicalReason };
}
function calculateDriftScore(original, predicted) {
  if (original === predicted) return 0;
  const semanticDistance = {
    "refund-exchange": 0.3,
    "exchange-refund": 0.3,
    "complaint-refund": 0.5,
    "refund-complaint": 0.5,
    "complaint-other": 0.7,
    "other-complaint": 0.7,
    "inquiry-technical_support": 0.4,
    "technical_support-inquiry": 0.4
  };
  const key = `${original}-${predicted}`;
  return semanticDistance[key] || 0.8;
}
function calculateRiskLevel(driftScore, confidence) {
  if (driftScore >= 0.7 && confidence < 0.8) return "high";
  if (driftScore >= 0.5) return "medium";
  if (driftScore > 0) return "low";
  return "normal";
}
function seedConversations() {
  const db = getDb();
  const truncationReason1 = generateTruncationReason("max_tokens_exceeded");
  const truncationReason2 = generateTruncationReason("old_format_migration");
  const truncationReason3 = generateTruncationReason("field_length_limit");
  const samples = [
    {
      sessionId: "S007",
      customerText: "\u5E2E\u6211\u67E5\u4E00\u4E0B\u8BA2\u5355\u4EC0\u4E48\u65F6\u5019\u53D1\u8D27",
      robotText: "\u60A8\u597D\uFF0C\u8BF7\u63D0\u4F9B\u8BA2\u5355\u53F7",
      originalAnnotation: "refund",
      aiPrediction: "inquiry",
      aiConfidence: 0.92,
      driftScore: 0.8,
      riskLevel: "high",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 7,
      sourceType: "segmentation_list",
      batchId: "batch_002",
      hasManualCorrection: true,
      manualCorrection: {
        from: "refund",
        to: "inquiry",
        reason: "\u539F\u6807\u6CE8\u9519\u8BEF\uFF0C\u7528\u6237\u53EA\u662F\u8BE2\u95EE\u53D1\u8D27\u65F6\u95F4\uFF0C\u6CA1\u6709\u9000\u6B3E\u610F\u56FE\u3002\u5907\u6CE8\u91CC\u4E5F\u660E\u786E\u6807\u6CE8\u4E86\u5E94\u8BE5\u662Finquiry",
        operator: "\u590D\u6838\u5458_\u5468\u4E3B\u7BA1"
      },
      toolCallError: {
        errorType: "parameter_mismatch",
        errorMessage: 'Expected intent field to be one of [refund, exchange, complaint, inquiry, technical_support, other], got "refund " (with trailing space)',
        parameterName: "intent",
        parameterValue: "refund ",
        humanReadableExplanation: '\u5728\u5207\u5206\u6E05\u5355\u7B2C7\u884C\uFF0C\u6807\u6CE8\u5458\u5728"refund"\u540E\u9762\u4E0D\u5C0F\u5FC3\u591A\u6572\u4E86\u4E00\u4E2A\u7A7A\u683C\uFF0C\u5BFC\u81F4\u7CFB\u7EDF\u8BC6\u522B\u65F6\u53C2\u6570\u5339\u914D\u5931\u8D25'
      }
    },
    {
      sessionId: "S008",
      customerText: "\u6211\u8981\u9000\u6B3E\u9000\u6B3E\u9000\u6B3E\uFF01\u592A\u751F\u6C14\u4E86",
      robotText: "\u975E\u5E38\u7406\u89E3\u60A8\u7684\u5FC3\u60C5\uFF0C\u8BF7\u5148\u51B7\u9759\u4E00\u4E0B",
      originalAnnotation: "other",
      aiPrediction: "refund",
      aiConfidence: 0.98,
      driftScore: 0.8,
      riskLevel: "high",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 8,
      sourceType: "segmentation_list",
      batchId: "batch_002",
      hasManualCorrection: true,
      manualCorrection: {
        from: "other",
        to: "refund",
        reason: "\u539F\u6807\u6CE8\u9519\u8BEF\uFF0C\u7528\u6237\u8FDE\u7EED\u4E09\u6B21\u8BF4\u9000\u6B3E\uFF0C\u660E\u663E\u662F\u9000\u6B3E\u610F\u56FE\u3002other\u6807\u6CE8\u660E\u663E\u4E0D\u5408\u7406",
        operator: "\u590D\u6838\u5458_\u5468\u4E3B\u7BA1"
      }
    },
    {
      sessionId: "S018",
      customerText: "\u9000\u6B3E\u7533\u8BF7\u63D0\u4EA4\u4E86\u4EC0\u4E48\u65F6\u5019\u80FD\u5904\u7406",
      robotText: "\u9000\u6B3E\u7533\u8BF7\u4E00\u822C1-3\u4E2A\u5DE5\u4F5C\u65E5\u5904\u7406\u5B8C\u6210",
      originalAnnotation: "inquiry",
      aiPrediction: "refund",
      aiConfidence: 0.88,
      driftScore: 0.8,
      riskLevel: "high",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 18,
      sourceType: "segmentation_list",
      batchId: "batch_002"
    },
    {
      sessionId: "T002",
      customerText: "\u8BF7\u95EE\u8FD9\u4E2A\u5546\u54C1\u652F\u63017\u5929\u65E0\u7406\u7531\u9000\u6362\u5417\uFF1F",
      robotText: "\u662F\u7684\uFF0C\u652F\u63017\u5929\u65E0\u7406\u7531\u9000\u6362\u8D27",
      originalAnnotation: "inquiry",
      aiPrediction: "exchange",
      aiConfidence: 0.78,
      driftScore: 0.8,
      riskLevel: "high",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 2,
      sourceType: "training_sample",
      batchId: "batch_003",
      truncated: true,
      truncationReason: truncationReason1.technical,
      fullContext: "\u7528\u6237\uFF1A\u8BF7\u95EE\u8FD9\u4E2A\u5546\u54C1\u652F\u63017\u5929\u65E0\u7406\u7531\u9000\u6362\u5417\uFF1F\n\u5BA2\u670D\uFF1A\u662F\u7684\uFF0C\u652F\u63017\u5929\u65E0\u7406\u7531\u9000\u6362\u8D27\n\u7528\u6237\uFF1A\u90A3\u5982\u679C\u6211\u4E70\u4E86\u4E4B\u540E\u4E0D\u559C\u6B22\u53EF\u4EE5\u9000\u5417\uFF1F\n\u5BA2\u670D\uFF1A\u53EF\u4EE5\u7684\uFF0C\u53EA\u8981\u5546\u54C1\u4E0D\u5F71\u54CD\u4E8C\u6B21\u9500\u552E\n\u7528\u6237\uFF1A\u9000\u8D27\u8FD0\u8D39\u8C01\u51FA\uFF1F\n\u5BA2\u670D\uFF1A\u975E\u8D28\u91CF\u95EE\u9898\u7684\u8BDD\u9700\u8981\u60A8\u627F\u62C5\u8FD0\u8D39\u54E6\n\u7528\u6237\uFF1A\u597D\u7684\uFF0C\u6211\u77E5\u9053\u4E86\uFF0C\u8C22\u8C22\n\u5BA2\u670D\uFF1A\u4E0D\u5BA2\u6C14\uFF0C\u8FD8\u6709\u5176\u4ED6\u95EE\u9898\u5417\uFF1F\n\u7528\u6237\uFF1A\u6CA1\u6709\u4E86\n\u5BA2\u670D\uFF1A\u597D\u7684\uFF0C\u795D\u60A8\u8D2D\u7269\u6109\u5FEB~",
      promptVersionId: "pv_002"
    },
    {
      sessionId: "T003",
      customerText: "\u53D1\u8D27\u592A\u6162\u4E86\uFF0C\u7B49\u4E86\u4E94\u5929\u8FD8\u6CA1\u5230\uFF0C\u4EC0\u4E48\u670D\u52A1\u6001\u5EA6\uFF01",
      robotText: "\u975E\u5E38\u62B1\u6B49\u8BA9\u60A8\u4E45\u7B49\u4E86\uFF0C\u6211\u5E2E\u60A8\u50AC\u4FC3\u5FEB\u9012",
      originalAnnotation: "complaint",
      aiPrediction: "refund",
      aiConfidence: 0.85,
      driftScore: 0.5,
      riskLevel: "medium",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 3,
      sourceType: "training_sample",
      batchId: "batch_003",
      trainingSampleId: "TS-2026-0512-003",
      promptVersionId: "pv_003"
    },
    {
      sessionId: "T006",
      customerText: "\u7B97\u4E86\uFF0C\u5C31\u8FD9\u6837\u5427\uFF0C\u4EE5\u540E\u4E0D\u4E70\u4E86",
      robotText: "\u975E\u5E38\u62B1\u6B49\u7ED9\u60A8\u5E26\u6765\u4E0D\u597D\u7684\u4F53\u9A8C\uFF0C\u6B22\u8FCE\u60A8\u518D\u6B21\u5149\u4E34",
      originalAnnotation: "other",
      aiPrediction: "complaint",
      aiConfidence: 0.82,
      driftScore: 0.7,
      riskLevel: "medium",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 6,
      sourceType: "training_sample",
      batchId: "batch_003",
      promptVersionId: "pv_003"
    },
    {
      sessionId: "S001",
      customerText: "\u4F60\u4EEC\u8FD9\u4E2A\u5546\u54C1\u8D28\u91CF\u4E5F\u592A\u5DEE\u4E86\u5427\uFF0C\u521A\u7528\u4E09\u5929\u5C31\u574F\u4E86\uFF01",
      robotText: "\u975E\u5E38\u62B1\u6B49\u7ED9\u60A8\u5E26\u6765\u4E0D\u597D\u7684\u4F53\u9A8C\uFF0C\u8BF7\u95EE\u5177\u4F53\u662F\u4EC0\u4E48\u95EE\u9898\u5462\uFF1F",
      originalAnnotation: "complaint",
      aiPrediction: "complaint",
      aiConfidence: 0.96,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 1,
      sourceType: "segmentation_list",
      batchId: "batch_002"
    },
    {
      sessionId: "S002",
      customerText: "\u6211\u60F3\u7533\u8BF7\u9000\u8D27\u9000\u6B3E",
      robotText: "\u597D\u7684\uFF0C\u8BF7\u544A\u77E5\u60A8\u7684\u8BA2\u5355\u53F7",
      originalAnnotation: "refund",
      aiPrediction: "refund",
      aiConfidence: 0.99,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 2,
      sourceType: "segmentation_list",
      batchId: "batch_002"
    },
    {
      sessionId: "S003",
      customerText: "\u8FD9\u4E2A\u5C3A\u7801\u4E0D\u592A\u5408\u9002\uFF0C\u80FD\u4E0D\u80FD\u6362\u4E00\u4E2A\uFF1F",
      robotText: "\u53EF\u4EE5\u7684\uFF0C\u6362\u8D27\u9700\u8981\u60A8\u5BC4\u56DE\u539F\u5546\u54C1",
      originalAnnotation: "exchange",
      aiPrediction: "exchange",
      aiConfidence: 0.97,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 3,
      sourceType: "segmentation_list",
      batchId: "batch_002"
    },
    {
      sessionId: "S006",
      customerText: "\u8FD9\u4EC0\u4E48\u5783\u573E\u4E1C\u897F\uFF0C\u518D\u4E5F\u4E0D\u4E70\u4E86\uFF01",
      robotText: "\u975E\u5E38\u62B1\u6B49\u8BA9\u60A8\u5931\u671B\u4E86\uFF0C\u8BF7\u95EE\u662F\u54EA\u91CC\u4E0D\u6EE1\u610F\u5462\uFF1F",
      originalAnnotation: "complaint",
      aiPrediction: "complaint",
      aiConfidence: 0.95,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 6,
      sourceType: "segmentation_list",
      batchId: "batch_002",
      truncated: true,
      truncationReason: truncationReason2.technical,
      fullContext: "\u3010\u65E7\u7CFB\u7EDF\u5BFC\u5165\u6570\u636E\u3011\n\u65F6\u95F4\uFF1A2026-05-28 14:32:18\n\u7528\u6237ID\uFF1AU123456\n\u3010START\u3011\n\u7528\u6237\uFF1A\u8FD9\u4EC0\u4E48\u5783\u573E\u4E1C\u897F\uFF0C\u518D\u4E5F\u4E0D\u4E70\u4E86\uFF01\n\u5BA2\u670D\uFF1A\u975E\u5E38\u62B1\u6B49\u8BA9\u60A8\u5931\u671B\u4E86\uFF0C\u8BF7\u95EE\u662F\u54EA\u91CC\u4E0D\u6EE1\u610F\u5462\uFF1F\n\u7528\u6237\uFF1A\u81EA\u5DF1\u770B\uFF01\u8D28\u91CF\u5DEE\u6210\u8FD9\u6837\u8FD8\u597D\u610F\u601D\u5356\uFF1F\n\u5BA2\u670D\uFF1A\u975E\u5E38\u62B1\u6B49\uFF0C\u80FD\u5177\u4F53\u63CF\u8FF0\u4E00\u4E0B\u95EE\u9898\u5417\uFF1F\n\u7528\u6237\uFF1A[\u56FE\u7247]\n\u5BA2\u670D\uFF1A\u6536\u5230\u56FE\u7247\uFF0C\u786E\u5B9E\u6709\u8D28\u91CF\u95EE\u9898\uFF0C\u6211\u4EEC\u53EF\u4EE5\u4E3A\u60A8\u529E\u7406\u9000\u6362\u8D27\n\u7528\u6237\uFF1A\u4E0D\u7528\u4E86\uFF0C\u4EE5\u540E\u518D\u4E5F\u4E0D\u6765\u4E86\n\u3010END\u3011\n\u65E7\u7CFB\u7EDF\u6807\u6CE8\uFF1A\u6295\u8BC9\n\u5907\u6CE8\uFF1A\u7528\u6237\u60C5\u7EEA\u6FC0\u52A8\uFF0C\u5DF2\u767B\u8BB0\u6295\u8BC9\u8BB0\u5F55"
    },
    {
      sessionId: "S015",
      customerText: "\u4F60\u4EEC\u8FD9\u5BA2\u670D\u4E5F\u592A\u6162\u4E86\u5427 \u7B49\u4E86\u534A\u5C0F\u65F6",
      robotText: "\u975E\u5E38\u62B1\u6B49\u8BA9\u60A8\u4E45\u7B49\u4E86\uFF0C\u73B0\u5728\u4E3A\u60A8\u5904\u7406",
      originalAnnotation: "complaint",
      aiPrediction: "other",
      aiConfidence: 0.72,
      driftScore: 0.7,
      riskLevel: "medium",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 15,
      sourceType: "segmentation_list",
      batchId: "batch_002"
    },
    {
      sessionId: "S020",
      customerText: "500\u5757\u94B1\u7684\u4E1C\u897F\u5C31\u8FD9\u4E2A\u8D28\u91CF\uFF1F\u771F\u7684\u670D\u4E86",
      robotText: "\u975E\u5E38\u62B1\u6B49\uFF0C\u6211\u4EEC\u7684\u4EA7\u54C1\u8BA9\u60A8\u5931\u671B\u4E86",
      originalAnnotation: "complaint",
      aiPrediction: "refund",
      aiConfidence: 0.86,
      driftScore: 0.5,
      riskLevel: "medium",
      sourceFile: "segmentation_temp_20260612.csv",
      sourceRow: 20,
      sourceType: "segmentation_list",
      batchId: "batch_002"
    },
    {
      sessionId: "T001",
      customerText: "\u5546\u54C1\u8D28\u91CF\u6709\u95EE\u9898\uFF0C\u8981\u6C42\u5168\u989D\u9000\u6B3E\uFF01",
      robotText: "\u975E\u5E38\u62B1\u6B49\uFF0C\u6211\u4EEC\u4F1A\u5C3D\u5FEB\u4E3A\u60A8\u5904\u7406\u9000\u6B3E",
      originalAnnotation: "refund",
      aiPrediction: "refund",
      aiConfidence: 0.98,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 1,
      sourceType: "training_sample",
      batchId: "batch_003",
      trainingSampleId: "TS-2026-0510-001"
    },
    {
      sessionId: "T005",
      customerText: "\u7F51\u9875\u4E00\u76F4\u52A0\u8F7D\u4E0D\u51FA\u6765\uFF0C\u4E00\u76F4\u8F6C\u5708\uFF0C\u6362\u4E86\u6D4F\u89C8\u5668\u4E5F\u4E0D\u884C",
      robotText: "\u8BF7\u5C1D\u8BD5\u6E05\u9664\u6D4F\u89C8\u5668\u7F13\u5B58\u6216\u8005\u4F7F\u7528\u65E0\u75D5\u6A21\u5F0F\u8BBF\u95EE",
      originalAnnotation: "technical_support",
      aiPrediction: "inquiry",
      aiConfidence: 0.76,
      driftScore: 0.4,
      riskLevel: "low",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 5,
      sourceType: "training_sample",
      batchId: "batch_003"
    },
    {
      sessionId: "T007",
      customerText: "\u6211\u4E70\u7684\u624B\u673A\u5C4F\u5E55\u6709\u5212\u75D5\uFF0C\u8981\u6C42\u9000\u6B3E\uFF01\uFF01\uFF01",
      robotText: "\u975E\u5E38\u62B1\u6B49\uFF0C\u8BF7\u95EE\u60A8\u662F\u5426\u5DF2\u7B7E\u6536\uFF1F\u53EF\u4EE5\u7533\u8BF7\u9000\u6362\u8D27",
      originalAnnotation: "refund",
      aiPrediction: "complaint",
      aiConfidence: 0.81,
      driftScore: 0.5,
      riskLevel: "medium",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 7,
      sourceType: "training_sample",
      batchId: "batch_003",
      trainingSampleId: "TS-2026-0516-007",
      promptVersionId: "pv_001"
    },
    {
      sessionId: "T010",
      customerText: "\u8FD9\u5DF2\u7ECF\u662F\u7B2C\u4E09\u6B21\u51FA\u95EE\u9898\u4E86\uFF01\u4F60\u4EEC\u5230\u5E95\u80FD\u4E0D\u80FD\u89E3\u51B3\uFF1F",
      robotText: "\u975E\u5E38\u62B1\u6B49\uFF0C\u8FD9\u6B21\u4E00\u5B9A\u5E2E\u60A8\u5F7B\u5E95\u89E3\u51B3\u95EE\u9898",
      originalAnnotation: "complaint",
      aiPrediction: "complaint",
      aiConfidence: 0.96,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "training_samples_with_remarks_202605.json",
      sourceRow: 10,
      sourceType: "training_sample",
      batchId: "batch_003",
      hasRollback: true
    },
    {
      sessionId: "BAD-001",
      customerText: "",
      robotText: "\u60A8\u597D\uFF0C\u8BF7\u95EE\u6709\u4EC0\u4E48\u53EF\u4EE5\u5E2E\u60A8\uFF1F",
      originalAnnotation: "other",
      aiPrediction: "inquiry",
      aiConfidence: 0.55,
      driftScore: 0.8,
      riskLevel: "high",
      sourceFile: "annotations_20260601_0610.xlsx",
      sourceRow: 45,
      sourceType: "annotation_record",
      batchId: "batch_001",
      toolCallError: {
        errorType: "empty_field",
        errorMessage: "customer_text field is empty or contains only whitespace",
        parameterName: "customer_text",
        parameterValue: "",
        humanReadableExplanation: "\u5728\u6807\u6CE8\u8BB0\u5F55Excel\u7B2C45\u884C\uFF0C\u7528\u6237\u8F93\u5165\u5185\u5BB9\u662F\u7A7A\u7684\uFF0C\u53EF\u80FD\u662F\u5BFC\u51FA\u65F6\u6F0F\u586B\u6216\u8005\u7528\u6237\u6839\u672C\u6CA1\u6709\u53D1\u6D88\u606F\u3002\u8FD9\u6761\u6570\u636E\u5EFA\u8BAE\u76F4\u63A5\u5FFD\u7565\u3002"
      }
    },
    {
      sessionId: "BAD-002",
      customerText: "\u60F3\u9000\u6B3E\u4E70\u4E86\u4E0D\u5408\u9002\u4F46\u662F\u5DF2\u7ECF\u8D85\u8FC77\u5929\u4E86\u600E\u4E48\u529E\u80FD\u901A\u878D\u4E00\u4E0B\u5417\u771F\u7684\u6CA1\u7A7F\u8FC7\u540A\u724C\u8FD8\u5728",
      robotText: "\u60A8\u7684\u60C5\u51B5\u6211\u5E2E\u60A8\u7279\u6B8A\u7533\u8BF7\u4E00\u4E0B\uFF0C\u8BF7\u7A0D\u7B49",
      originalAnnotation: "refund",
      aiPrediction: "refund",
      aiConfidence: 0.91,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "annotations_20260601_0610.xlsx",
      sourceRow: 78,
      sourceType: "annotation_record",
      batchId: "batch_001",
      truncated: true,
      truncationReason: truncationReason3.technical,
      fullContext: "\u60F3\u9000\u6B3E\u4E70\u4E86\u4E0D\u5408\u9002\u4F46\u662F\u5DF2\u7ECF\u8D85\u8FC77\u5929\u4E86\u600E\u4E48\u529E\u80FD\u901A\u878D\u4E00\u4E0B\u5417\u771F\u7684\u6CA1\u7A7F\u8FC7\u540A\u724C\u8FD8\u5728\u5305\u88C5\u76D2\u4E5F\u5B8C\u597D\u65E0\u635F\u5C31\u662F\u8BD5\u7A7F\u4E86\u4E00\u4E0B\u5C3A\u7801\u4E0D\u5408\u9002\u5E73\u65F6\u7A7FM\u7801\u8FD9\u4E2A\u7248\u578B\u504F\u5C0F\u5E94\u8BE5\u4E70L\u7801\u7684\u4F46\u662F\u5F53\u65F6\u6CA1\u770B\u6E05\u695A\u5C3A\u7801\u8868\u5C31\u76F4\u63A5\u4E0B\u5355\u4E86\u6536\u5230\u8D27\u8BD5\u7A7F\u53D1\u73B0\u5F88\u7D27\u7136\u540E\u5C31\u60F3\u6362\u4F46\u662F\u6362\u8D27\u53C8\u8981\u7B49\u597D\u51E0\u5929\u800C\u4E14\u6211\u6015\u6362\u4E86\u8FD8\u662F\u4E0D\u5408\u9002\u6240\u4EE5\u8FD8\u662F\u60F3\u76F4\u63A5\u9000\u6B3E\u7B97\u4E86\u867D\u7136\u77E5\u9053\u8D85\u8FC77\u5929\u4F46\u662F\u771F\u7684\u6CA1\u600E\u4E48\u7A7F\u540A\u724C\u90FD\u8FD8\u5728\u4E0A\u9762\u6302\u7740\u80FD\u4E0D\u80FD\u5E2E\u5FD9\u7279\u6B8A\u5904\u7406\u4E00\u4E0B\u8C22\u8C22\u4E86"
    },
    {
      sessionId: "BAD-003",
      customerText: "\u8BA2\u5355\u53F7: 20260615001 \u91D1\u989D: \u5143 \u6570\u91CF: 3",
      robotText: "\u597D\u7684\uFF0C\u6211\u5E2E\u60A8\u67E5\u8BE2\u4E00\u4E0B\u8FD9\u4E2A\u8BA2\u5355",
      originalAnnotation: "inquiry",
      aiPrediction: "inquiry",
      aiConfidence: 0.88,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "annotations_20260601_0610.xlsx",
      sourceRow: 112,
      sourceType: "annotation_record",
      batchId: "batch_001",
      toolCallError: {
        errorType: "missing_unit",
        errorMessage: 'Amount field missing currency unit, value is " \u5143" with leading space',
        parameterName: "amount",
        parameterValue: " \u5143",
        humanReadableExplanation: '\u5728\u6807\u6CE8\u8BB0\u5F55Excel\u7B2C112\u884C\uFF0C"\u91D1\u989D"\u5B57\u6BB5\u53EA\u5199\u4E86"\u5143"\uFF0C\u6F0F\u586B\u4E86\u5177\u4F53\u6570\u5B57\uFF08\u5E94\u8BE5\u662F"299\u5143"\u4E4B\u7C7B\u7684\uFF09\u3002\u8FD9\u662F\u4ECE\u65E7\u8868\u5BFC\u5165\u65F6\u5E38\u89C1\u7684\u95EE\u9898\u3002'
      }
    },
    {
      sessionId: "BAD-004",
      customerText: "\u4F60\u4EEC\u7684\u4E1C\u897F\u592A\u5DEE\u4E86\uFF01[\u5DF2\u5220\u9664\u654F\u611F\u8BCD]\u5BA2\u670D\u4E5F\u4E0D\u89E3\u51B3\u95EE\u9898\uFF01",
      robotText: "\u975E\u5E38\u62B1\u6B49\u7ED9\u60A8\u5E26\u6765\u4E0D\u597D\u7684\u4F53\u9A8C",
      originalAnnotation: "complaint",
      aiPrediction: "complaint",
      aiConfidence: 0.94,
      driftScore: 0,
      riskLevel: "normal",
      sourceFile: "annotations_20260601_0610.xlsx",
      sourceRow: 134,
      sourceType: "annotation_record",
      batchId: "batch_001",
      truncated: true,
      truncationReason: generateTruncationReason("special_chars_stripped").technical
    }
  ];
  const insertConv = db.prepare(`
    INSERT OR REPLACE INTO conversations 
    (id, session_id, customer_text, robot_text, full_context, truncated, truncation_reason, 
     source_file, source_row, source_type, original_annotation, ai_prediction, 
     ai_confidence, risk_level, drift_score, batch_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);
  const insertVersion = db.prepare(`
    INSERT OR REPLACE INTO version_records
    (id, conversation_id, version_type, intent, confidence, remark, operator, 
     prompt_version_id, training_sample_id, created_at, parent_version_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
  `);
  const insertReview = db.prepare(`
    INSERT OR REPLACE INTO review_records
    (id, conversation_id, reviewer, original_intent, corrected_intent, change_reason, reviewed_at, status)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, 'approved')
  `);
  for (const sample of samples) {
    const convId = "conv_" + nanoid(8);
    const driftScore = sample.driftScore || calculateDriftScore(sample.originalAnnotation, sample.aiPrediction);
    const riskLevel = sample.riskLevel || calculateRiskLevel(driftScore, sample.aiConfidence);
    insertConv.run(
      convId,
      sample.sessionId,
      sample.customerText,
      sample.robotText,
      sample.fullContext,
      sample.truncated ? 1 : 0,
      sample.truncationReason,
      sample.sourceFile,
      sample.sourceRow,
      sample.sourceType,
      sample.originalAnnotation,
      sample.aiPrediction,
      sample.aiConfidence,
      riskLevel,
      driftScore,
      sample.batchId
    );
    const annotationVersionId = "ver_" + nanoid(8);
    insertVersion.run(
      annotationVersionId,
      convId,
      "annotation",
      sample.originalAnnotation,
      1,
      `\u539F\u59CB\u6807\u6CE8\uFF0C\u6765\u6E90: ${sample.sourceFile} \u7B2C${sample.sourceRow}\u884C`,
      sample.manualCorrection?.operator || "system",
      null,
      sample.trainingSampleId || null,
      null
    );
    const predictionVersionId = "ver_" + nanoid(8);
    insertVersion.run(
      predictionVersionId,
      convId,
      "prediction",
      sample.aiPrediction,
      sample.aiConfidence,
      `AI\u9884\u6D4B\uFF0C\u4F7F\u7528\u63D0\u793A\u8BCD\u7248\u672C: ${sample.promptVersionId || "pv_003"}`,
      "ai_system",
      sample.promptVersionId || null,
      sample.trainingSampleId || null,
      annotationVersionId
    );
    if (sample.hasManualCorrection && sample.manualCorrection) {
      const manualVersionId = "ver_" + nanoid(8);
      insertVersion.run(
        manualVersionId,
        convId,
        "manual",
        sample.manualCorrection.to,
        1,
        sample.manualCorrection.reason,
        sample.manualCorrection.operator,
        sample.promptVersionId || null,
        sample.trainingSampleId || null,
        predictionVersionId
      );
      insertReview.run(
        "review_" + nanoid(8),
        convId,
        sample.manualCorrection.operator,
        sample.manualCorrection.from,
        sample.manualCorrection.to,
        sample.manualCorrection.reason
      );
      if (sample.hasRollback) {
        const rollbackVersionId = "ver_" + nanoid(8);
        insertVersion.run(
          rollbackVersionId,
          convId,
          "rollback",
          sample.originalAnnotation,
          1,
          "\u56DE\u6EDA\u5230\u539F\u59CB\u6807\u6CE8\u7248\u672C\uFF0C\u590D\u6838\u540E\u8BA4\u4E3A\u539F\u59CB\u6807\u6CE8\u662F\u6B63\u786E\u7684",
          "\u590D\u6838\u5458_\u674E\u7EC4\u957F",
          null,
          null,
          manualVersionId
        );
      }
    }
  }
  console.log(`Seeded ${samples.length} sample conversations with version history`);
}
function main() {
  console.log("Seeding sample data...");
  initDatabase();
  seedConversations();
  console.log("Sample data seeding complete!");
}
main();
