const { db } = require('../config/database');

class TraceService {
  static async addTrace(queueId, action, { fromStatus, toStatus, operator, remark, errorMessage, traceData } = {}) {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO status_traces (queue_id, from_status, to_status, action, operator, remark, error_message, trace_data)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [queueId, fromStatus || null, toStatus || null, action, operator || null, remark || null, errorMessage || null, traceData ? JSON.stringify(traceData) : null],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  static async getTracesByQueueId(queueId) {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM status_traces WHERE queue_id = ? ORDER BY created_at DESC`,
        [queueId],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows.map(row => ({
            ...row,
            trace_data: row.trace_data ? JSON.parse(row.trace_data) : null
          })));
        }
      );
    });
  }
}

module.exports = TraceService;
