const { db } = require('../config/database');
const { QUEUE_STATUS, STATUS_LABELS } = require('../constants/status');

class DashboardService {
  static async getOverview() {
    const stats = await new Promise((resolve, reject) => {
      db.all(
        `SELECT status, COUNT(*) as count 
         FROM material_queue 
         GROUP BY status`,
        [],
        (err, rows) => {
          if (err) reject(err);
          else {
            const result = {};
            Object.values(QUEUE_STATUS).forEach(status => {
              result[status] = { count: 0, label: STATUS_LABELS[status] };
            });
            rows.forEach(row => {
              if (result[row.status]) {
                result[row.status].count = row.count;
              }
            });
            resolve(result);
          }
        }
      );
    });

    const total = Object.values(stats).reduce((sum, s) => sum + s.count, 0);

    return {
      total,
      stats,
      summary: {
        pending: stats[QUEUE_STATUS.PENDING]?.count || 0,
        processing: stats[QUEUE_STATUS.PROCESSING]?.count || 0,
        waitingRetry: stats[QUEUE_STATUS.WAITING_RETRY]?.count || 0,
        waitingManual: stats[QUEUE_STATUS.WAITING_MANUAL]?.count || 0,
        failedPermanent: stats[QUEUE_STATUS.FAILED_PERMANENT]?.count || 0,
        manualHandling: stats[QUEUE_STATUS.MANUAL_HANDLING]?.count || 0,
        compensated: stats[QUEUE_STATUS.COMPENSATED]?.count || 0,
        closed: stats[QUEUE_STATUS.CLOSED]?.count || 0
      }
    };
  }

  static async getRetryableClassification() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           material_type,
           department,
           COUNT(*) as count,
           MAX(retry_count) as max_retry_count
         FROM material_queue 
         WHERE status = ?
         GROUP BY material_type, department
         ORDER BY count DESC`,
        [QUEUE_STATUS.WAITING_RETRY],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static async getDeadLetterAnalysis() {
    const failedItems = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           id,
           queue_no,
           batch_no,
           material_type,
           last_error,
           retry_count,
           created_at,
           updated_at
         FROM material_queue 
         WHERE status = ?
         ORDER BY updated_at DESC`,
        [QUEUE_STATUS.FAILED_PERMANENT],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    const errorPatterns = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           last_error,
           COUNT(*) as count
         FROM material_queue 
         WHERE status = ? AND last_error IS NOT NULL
         GROUP BY last_error
         ORDER BY count DESC
         LIMIT 10`,
        [QUEUE_STATUS.FAILED_PERMANENT],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return {
      totalDeadLetters: failedItems.length,
      failedItems,
      errorPatterns
    };
  }

  static async getRecoveryProgress() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const todayStats = await new Promise((resolve, reject) => {
      db.get(
        `SELECT 
           COUNT(*) as total_processed,
           SUM(CASE WHEN status IN (?, ?) THEN 1 ELSE 0 END) as success_count
         FROM material_queue 
         WHERE DATE(updated_at) = ?`,
        [QUEUE_STATUS.COMPENSATED, QUEUE_STATUS.CLOSED, todayStr],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    const pendingRecovery = await new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           m.id,
           m.queue_no,
           m.batch_no,
           m.material_type,
           m.status,
           m.retry_count,
           m.next_retry_at,
           i.source_file,
           i.source_type
         FROM material_queue m
         LEFT JOIN import_records i ON m.import_id = i.id
         WHERE m.status IN (?, ?)
         ORDER BY 
           CASE m.status 
             WHEN ? THEN 1 
             WHEN ? THEN 2 
             ELSE 3 
           END,
           m.next_retry_at ASC`,
        [QUEUE_STATUS.WAITING_RETRY, QUEUE_STATUS.WAITING_MANUAL, QUEUE_STATUS.WAITING_RETRY, QUEUE_STATUS.WAITING_MANUAL],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    return {
      todayProcessed: todayStats.total_processed || 0,
      todaySuccess: todayStats.success_count || 0,
      pendingRecoveryCount: pendingRecovery.length,
      pendingRecoveryList: pendingRecovery
    };
  }

  static async getImportHistory(days = 7) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    const dateStr = date.toISOString().split('T')[0];

    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           DATE(imported_at) as import_date,
           source_type,
           COUNT(*) as import_count,
           SUM(total_rows) as total_rows,
           SUM(success_rows) as success_rows,
           SUM(failed_rows) as failed_rows
         FROM import_records
         WHERE imported_at >= ?
         GROUP BY DATE(imported_at), source_type
         ORDER BY import_date DESC`,
        [dateStr],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static async getDepartmentDistribution() {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT 
           department,
           COUNT(*) as total,
           SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as pending,
           SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as waiting_retry,
           SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as waiting_manual,
           SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as failed
         FROM material_queue
         WHERE department IS NOT NULL
         GROUP BY department
         ORDER BY total DESC`,
        [QUEUE_STATUS.PENDING, QUEUE_STATUS.WAITING_RETRY, QUEUE_STATUS.WAITING_MANUAL, QUEUE_STATUS.FAILED_PERMANENT],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }

  static async getDirectorDashboard() {
    const [overview, retryableClassification, deadLetterAnalysis, recoveryProgress, departmentDistribution] = await Promise.all([
      this.getOverview(),
      this.getRetryableClassification(),
      this.getDeadLetterAnalysis(),
      this.getRecoveryProgress(),
      this.getDepartmentDistribution()
    ]);

    return {
      overview,
      retryableClassification: {
        title: '可重试分类',
        description: '按材料类型和科室分类的等待重试点位',
        data: retryableClassification
      },
      deadLetterProcessing: {
        title: '死信处理',
        description: '永久失败的队列项及错误模式分析',
        ...deadLetterAnalysis
      },
      recoveryFollowUp: {
        title: '恢复后续跑',
        description: '今日处理进度和待恢复队列',
        ...recoveryProgress
      },
      departmentDistribution: {
        title: '科室分布',
        data: departmentDistribution
      }
    };
  }
}

module.exports = DashboardService;
