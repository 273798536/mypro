"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRun = createRun;
exports.updateRunStats = updateRunStats;
exports.getRuns = getRuns;
exports.getRun = getRun;
exports.deleteRun = deleteRun;
const db_1 = require("../db");
function createRun(filename) {
    const now = new Date().toISOString();
    const runName = `评估运行_${new Date().toISOString().slice(0, 10)}_${Date.now()}`;
    const stmt = db_1.db.prepare('INSERT INTO runs (run_name, import_time, filename, total_records, anomaly_count, status) VALUES (?, ?, ?, 0, 0, ?)');
    const result = stmt.run(runName, now, filename, 'processing');
    return getRun(result.lastInsertRowid);
}
function updateRunStats(runId) {
    const total = db_1.db
        .prepare('SELECT COUNT(*) as cnt FROM report_records WHERE run_id = ?')
        .get(runId);
    const anomaly = db_1.db
        .prepare(`SELECT COUNT(DISTINCT a.record_id) as cnt FROM anomalies a
       JOIN report_records r ON a.record_id = r.id
       WHERE r.run_id = ? AND a.status != 'resolved'`)
        .get(runId);
    db_1.db.prepare('UPDATE runs SET total_records = ?, anomaly_count = ?, status = ? WHERE id = ?').run(total.cnt, anomaly.cnt, 'completed', runId);
}
function getRuns() {
    return db_1.db.prepare('SELECT * FROM runs ORDER BY import_time DESC').all();
}
function getRun(id) {
    return db_1.db.prepare('SELECT * FROM runs WHERE id = ?').get(id);
}
function deleteRun(id) {
    db_1.db.prepare('DELETE FROM runs WHERE id = ?').run(id);
}
