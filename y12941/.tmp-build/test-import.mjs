import { createRequire } from 'module'; const require = createRequire(import.meta.url);

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

// api/repositories/MaterialRepository.ts
import { nanoid } from "nanoid";
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
    const id = "batch_" + nanoid(6);
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

// api/repositories/ConversationRepository.ts
import { nanoid as nanoid2 } from "nanoid";
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
    const id = "conv_" + nanoid2(8);
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
import { nanoid as nanoid3 } from "nanoid";
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
    const id = "ver_" + nanoid3(8);
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

// test-import.ts
import fs3 from "fs";
import path3 from "path";
var testCsvContent = `sessionId,userInput,intent,confidence,remark
S001,\u6211\u7684\u5546\u54C1\u60F3\u9000\u8D27\u600E\u4E48\u529E,refund,0.95,\u6D4B\u8BD5\u9000\u6B3E\u573A\u666F
S002,\u8BF7\u95EE\u4F60\u4EEC\u5E97\u7684\u8425\u4E1A\u65F6\u95F4\u662F\u51E0\u70B9\u5230\u51E0\u70B9,inquiry,0.90,\u6D4B\u8BD5\u54A8\u8BE2\u573A\u666F
S003,\u8FD9\u4E2A\u4EA7\u54C1\u8D28\u91CF\u592A\u5DEE\u4E86\uFF0C\u6211\u8981\u7ED9\u5DEE\u8BC4,complaint,0.88,\u6D4B\u8BD5\u6295\u8BC9\u573A\u666F
S004,\u4E1C\u897F\u592A\u5927\u4E86\u60F3\u6362\u4E2A\u5C0F\u7801,exchange,0.92,\u6D4B\u8BD5\u6362\u8D27\u573A\u666F
S005,\u6211\u8FD9\u4E2A\u8F6F\u4EF6\u600E\u4E48\u4E00\u76F4\u52A0\u8F7D\u4E0D\u51FA\u6765,technical_support,0.85,\u6D4B\u8BD5\u6280\u672F\u652F\u6301\u573A\u666F
S006,,other,0.70,\u7A7A\u7528\u6237\u8F93\u5165\u574F\u6570\u636E
S007,\u8FD9\u662F\u4E00\u6BB5\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u975E\u5E38\u957F\u7684\u5185\u5BB9,inquiry,0.90,\u8D85\u957F\u6587\u672C\u6D4B\u8BD5
`;
async function test() {
  console.log("=== MaterialService \u5BFC\u5165\u94FE\u8DEF\u6D4B\u8BD5 ===\n");
  const db = getDb();
  console.log("[OK] \u6570\u636E\u5E93\u8FDE\u63A5\u6210\u529F");
  const beforeConversations = db.prepare("SELECT COUNT(*) as count FROM conversations").get().count;
  const beforeVersions = db.prepare("SELECT COUNT(*) as count FROM version_records").get().count;
  const beforeBatches = db.prepare("SELECT COUNT(*) as count FROM material_batches").get().count;
  console.log(`\u5BFC\u5165\u524D conversations: ${beforeConversations}, version_records: ${beforeVersions}, batches: ${beforeBatches}`);
  const testFilePath = path3.join(process.cwd(), "data", "test_import_" + Date.now() + ".csv");
  fs3.writeFileSync(testFilePath, testCsvContent, "utf-8");
  console.log(`[OK] \u6D4B\u8BD5 CSV \u6587\u4EF6\u521B\u5EFA: ${path3.basename(testFilePath)}`);
  const service = new MaterialService();
  try {
    const result = await service.importFile(
      testFilePath,
      "annotation_record",
      "test_data.csv",
      "test_operator"
    );
    console.log("\n=== \u5BFC\u5165\u7ED3\u679C ===");
    console.log(`batchId: ${result.batchId}`);
    console.log(`totalRecords: ${result.totalRecords}`);
    console.log(`processedRecords: ${result.processedRecords}`);
    console.log(`errorRecords: ${result.errorRecords}`);
    console.log(`warnings: ${result.warnings.length} \u6761`);
    if (result.warnings.length > 0) {
      result.warnings.slice(0, 3).forEach((w) => console.log(`  \u26A0\uFE0F  ${w}`));
    }
    console.log(`sampleRecords: ${result.sampleRecords.length} \u6761`);
    const afterConversations = db.prepare("SELECT COUNT(*) as count FROM conversations").get().count;
    const afterVersions = db.prepare("SELECT COUNT(*) as count FROM version_records").get().count;
    const afterBatches = db.prepare("SELECT COUNT(*) as count FROM material_batches").get().count;
    console.log(`
\u5BFC\u5165\u540E conversations: ${afterConversations} (+${afterConversations - beforeConversations})`);
    console.log(`\u5BFC\u5165\u540E version_records: ${afterVersions} (+${afterVersions - beforeVersions})`);
    console.log(`\u5BFC\u5165\u540E material_batches: ${afterBatches} (+${afterBatches - beforeBatches})`);
    const batch = db.prepare("SELECT * FROM material_batches WHERE id = ?").get(result.batchId);
    console.log(`
=== \u6279\u6B21\u9A8C\u8BC1 ===`);
    console.log(`\u6279\u6B21\u72B6\u6001: ${batch.status}`);
    console.log(`\u603B\u8BB0\u5F55: ${batch.total_records}`);
    console.log(`\u5DF2\u5904\u7406: ${batch.processed_records}`);
    console.log(`\u9519\u8BEF: ${batch.error_records}`);
    console.log(`status='completed': ${batch.status === "completed" ? "\u2705 \u6B63\u786E" : "\u274C \u9519\u8BEF"}`);
    const convInBatch = db.prepare("SELECT COUNT(*) as count FROM conversations WHERE batch_id = ?").get(result.batchId).count;
    console.log(`conversations.batch_id = ${result.batchId} \u7684\u8BB0\u5F55\u6570: ${convInBatch}`);
    const versionsInBatch = db.prepare(`
      SELECT COUNT(*) as count FROM version_records 
      WHERE conversation_id IN (SELECT id FROM conversations WHERE batch_id = ?)
    `).get(result.batchId).count;
    console.log(`\u5173\u8054 version_records \u6570: ${versionsInBatch}`);
    const sampleConv = db.prepare(`
      SELECT c.*, 
        (SELECT COUNT(*) FROM version_records vr WHERE vr.conversation_id = c.id) as version_count
      FROM conversations c 
      WHERE c.batch_id = ? 
      LIMIT 1
    `).get(result.batchId);
    if (sampleConv) {
      console.log(`
=== \u5355\u6761\u5BF9\u8BDD\u8BE6\u60C5\u9A8C\u8BC1 ===`);
      console.log(`id: ${sampleConv.id}`);
      console.log(`sessionId: ${sampleConv.session_id}`);
      console.log(`customerText(\u524D20\u5B57): ${String(sampleConv.customer_text).slice(0, 20)}...`);
      console.log(`originalAnnotation: ${sampleConv.original_annotation}`);
      console.log(`aiPrediction: ${sampleConv.ai_prediction}`);
      console.log(`riskLevel: ${sampleConv.risk_level}`);
      console.log(`driftScore: ${sampleConv.drift_score.toFixed(2)}`);
      console.log(`truncated: ${sampleConv.truncated === 1}`);
      console.log(`version_count: ${sampleConv.version_count}`);
      const versions = db.prepare(`
        SELECT version_type, intent, confidence, operator, remark 
        FROM version_records 
        WHERE conversation_id = ? 
        ORDER BY created_at ASC
      `).all(sampleConv.id);
      console.log(`
\u7248\u672C\u5386\u53F2 (${versions.length} \u6761):`);
      versions.forEach((v, i) => {
        console.log(`  [${i + 1}] ${v.version_type} -> intent=${v.intent}, conf=${v.confidence.toFixed(2)}, op=${v.operator}`);
        if (v.remark) {
          console.log(`        remark: ${String(v.remark).slice(0, 50)}...`);
        }
      });
    }
    console.log("\n=== \u574F\u6570\u636E\u9A8C\u8BC1 ===");
    const badConvs = db.prepare(`
      SELECT id, customer_text, risk_level, drift_score, truncated 
      FROM conversations 
      WHERE batch_id = ? 
        AND (customer_text = '' OR customer_text IS NULL OR risk_level = 'high')
    `).all(result.batchId);
    console.log(`\u6807\u8BB0\u4E3A high \u98CE\u9669\u6216\u7A7A\u5B57\u6BB5\u7684\u8BB0\u5F55: ${badConvs.length} \u6761`);
    badConvs.forEach((c) => {
      console.log(`  ${c.id}: risk=${c.risk_level}, text_empty=${!c.customer_text}, truncated=${c.truncated === 1}`);
    });
    console.log("\n=== \u6700\u7EC8\u7ED3\u8BBA ===");
    const allPassed = batch.status === "completed" && batch.total_records === 7 && batch.processed_records > 0 && afterConversations > beforeConversations && afterVersions > beforeVersions && convInBatch === batch.processed_records;
    console.log(allPassed ? "\u2705 \u6240\u6709\u68C0\u67E5\u70B9\u901A\u8FC7\uFF01\u5BFC\u5165\u2192\u590D\u6838\u94FE\u8DEF\u5DF2\u6253\u901A\u3002" : "\u274C \u5B58\u5728\u672A\u901A\u8FC7\u7684\u68C0\u67E5\u70B9");
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error("\u6D4B\u8BD5\u5931\u8D25:", error);
    process.exit(1);
  } finally {
    if (fs3.existsSync(testFilePath)) fs3.unlinkSync(testFilePath);
  }
}
test();
