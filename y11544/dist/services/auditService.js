"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditService = exports.AuditService = void 0;
const uuid_1 = require("uuid");
const database_1 = require("../database");
class AuditService {
    constructor(db) {
        this.db = db || (0, database_1.getDatabase)();
    }
    async addAuditRecord(request) {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        await this.db.run(`INSERT INTO audit_records (id, materialId, auditResult, auditComment, auditedBy, auditedAt)
       VALUES (?, ?, ?, ?, ?, ?)`, [id, request.materialId, request.auditResult, request.auditComment, request.auditedBy, now]);
        return this.db.get('SELECT * FROM audit_records WHERE id = ?', [id]);
    }
    async getAuditRecords(materialId) {
        return this.db.all('SELECT * FROM audit_records WHERE materialId = ? ORDER BY auditedAt DESC', [materialId]);
    }
    async addManagerComment(request) {
        const now = new Date().toISOString();
        const id = (0, uuid_1.v4)();
        await this.db.run(`INSERT INTO manager_comments (id, materialId, comment, evidence, commentedBy, commentedAt)
       VALUES (?, ?, ?, ?, ?, ?)`, [id, request.materialId, request.comment, request.evidence || null, request.commentedBy, now]);
        return this.db.get('SELECT * FROM manager_comments WHERE id = ?', [id]);
    }
    async getManagerComments(materialId) {
        return this.db.all('SELECT * FROM manager_comments WHERE materialId = ? ORDER BY commentedAt DESC', [materialId]);
    }
}
exports.AuditService = AuditService;
exports.auditService = new AuditService();
//# sourceMappingURL=auditService.js.map