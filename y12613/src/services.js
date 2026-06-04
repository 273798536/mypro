const db = require('./db');
const crypto = require('crypto');

function generateImportHash(record) {
  const content = `${record.batch_no}|${record.image_id}|${record.anomaly_type}|${record.coordinate_x}|${record.coordinate_y}`;
  return crypto.createHash('md5').update(content).digest('hex');
}

function checkDuplicate(record) {
  return new Promise((resolve, reject) => {
    const hash = generateImportHash(record);
    db.get(
      `SELECT id, batch_no, image_id, anomaly_type, status FROM annotation_records 
       WHERE import_hash = ? OR (batch_no = ? AND image_id = ? AND anomaly_type = ? AND coordinate_x = ? AND coordinate_y = ?)`,
      [hash, record.batch_no, record.image_id, record.anomaly_type, record.coordinate_x, record.coordinate_y],
      (err, row) => {
        if (err) reject(err);
        resolve(row ? { exists: true, existingRecord: row } : { exists: false });
      }
    );
  });
}

async function importAnnotation(record, operator = 'system') {
  const duplicateCheck = await checkDuplicate(record);
  
  if (duplicateCheck.exists) {
    return {
      success: false,
      duplicate: true,
      existingId: duplicateCheck.existingRecord.id,
      message: `重复标注：批次${record.batch_no}-图片${record.image_id}的${record.anomaly_type}标注已存在`
    };
  }

  return new Promise((resolve, reject) => {
    const importHash = generateImportHash(record);
    const processLog = JSON.stringify([{
      action: 'import',
      operator,
      time: new Date().toISOString(),
      detail: '初始导入'
    }]);

    db.run(
      `INSERT INTO annotation_records 
       (batch_no, image_id, anomaly_type, anomaly_desc, coordinate_x, coordinate_y, 
        zoom_level, pan_offset_x, pan_offset_y, operator, operate_time, 
        source_file, process_log, import_hash, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        record.batch_no, record.image_id, record.anomaly_type, record.anomaly_desc,
        record.coordinate_x, record.coordinate_y, record.zoom_level,
        record.pan_offset_x, record.pan_offset_y, record.operator || operator,
        record.operate_time || new Date().toISOString(),
        record.source_file || 'unknown', processLog, importHash
      ],
      function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            resolve({
              success: false,
              duplicate: true,
              message: '唯一约束冲突：该标注已存在'
            });
          } else {
            reject(err);
          }
        } else {
          logProcess(this.lastID, 'import', operator, null, JSON.stringify(record));
          resolve({ success: true, id: this.lastID, duplicate: false });
        }
      }
    );
  });
}

function logProcess(annotationId, action, operator, oldValue, newValue) {
  db.run(
    `INSERT INTO process_logs (annotation_id, action, operator, old_value, new_value)
     VALUES (?, ?, ?, ?, ?)`,
    [annotationId, action, operator, oldValue, newValue]
  );
}

function supplementAnnotation(recordId, updates, operator) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM annotation_records WHERE id = ?`, [recordId], (err, oldRecord) => {
      if (err) return reject(err);
      if (!oldRecord) return resolve({ success: false, message: '记录不存在' });

      const setClauses = [];
      const values = [];
      
      Object.keys(updates).forEach(key => {
        if (['anomaly_desc', 'zoom_level', 'pan_offset_x', 'pan_offset_y', 'operator', 'status'].includes(key)) {
          setClauses.push(`${key} = ?`);
          values.push(updates[key]);
        }
      });
      
      setClauses.push('updated_at = CURRENT_TIMESTAMP');
      values.push(recordId);

      db.run(
        `UPDATE annotation_records SET ${setClauses.join(', ')} WHERE id = ?`,
        values,
        function(err) {
          if (err) reject(err);
          else {
            logProcess(recordId, 'supplement', operator, 
              JSON.stringify({ status: oldRecord.status, anomaly_desc: oldRecord.anomaly_desc }),
              JSON.stringify(updates));
            resolve({ success: true, changes: this.changes });
          }
        }
      );
    });
  });
}

function getAnnotationWithTrace(id) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM annotation_records WHERE id = ?`, [id], (err, annotation) => {
      if (err) return reject(err);
      if (!annotation) return resolve(null);

      db.all(`SELECT * FROM process_logs WHERE annotation_id = ? ORDER BY operate_time`, [id], (err, logs) => {
        if (err) return reject(err);
        
        db.get(`SELECT * FROM review_results WHERE annotation_id = ? ORDER BY created_at DESC LIMIT 1`, [id], (err, review) => {
          if (err) return reject(err);
          
          const traceChain = buildTraceChain(annotation, logs, review);
          resolve({
            annotation,
            processLogs: logs,
            latestReview: review,
            traceability_chain: traceChain
          });
        });
      });
    });
  });
}

function buildTraceChain(annotation, logs, review) {
  const chain = [];
  
  chain.push({
    step: 1,
    type: 'source',
    title: '原始来源',
    time: annotation.operate_time || annotation.created_at,
    operator: annotation.operator,
    detail: `来源文件: ${annotation.source_file}`,
    data: {
      batch_no: annotation.batch_no,
      image_id: annotation.image_id,
      coordinate: { x: annotation.coordinate_x, y: annotation.coordinate_y }
    }
  });

  logs.forEach((log, idx) => {
    chain.push({
      step: idx + 2,
      type: 'process',
      title: getActionTitle(log.action),
      time: log.operate_time,
      operator: log.operator,
      detail: log.action === 'supplement' ? '补录更新' : 
              log.action === 'review' ? '复核操作' : '导入操作',
      data: {
        old_value: log.old_value ? JSON.parse(log.old_value) : null,
        new_value: log.new_value ? JSON.parse(log.new_value) : null
      }
    });
  });

  if (review) {
    chain.push({
      step: chain.length + 1,
      type: 'result',
      title: '复核结论',
      time: review.review_time,
      operator: review.reviewer,
      detail: `结果: ${review.review_result}, 评分: ${review.score}`,
      data: {
        review_result: review.review_result,
        score: review.score,
        comment: review.review_comment
      }
    });
  }

  return chain;
}

function getActionTitle(action) {
  const titles = {
    'import': '数据导入',
    'supplement': '补录更新',
    'review': '复核操作',
    'export': '数据导出'
  };
  return titles[action] || action;
}

function submitReview(reviewData, reviewer) {
  return new Promise((resolve, reject) => {
    db.get(`SELECT * FROM annotation_records WHERE id = ?`, [reviewData.annotation_id], (err, annotation) => {
      if (err) return reject(err);
      if (!annotation) return resolve({ success: false, message: '标注记录不存在' });

      const traceabilityChain = JSON.stringify(buildTraceChain(annotation, [], reviewData));

      db.run(
        `INSERT INTO review_results 
         (annotation_id, reviewer, review_result, review_comment, score, review_time, 
          zoom_verify_passed, pan_verify_passed, traceability_chain)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reviewData.annotation_id, reviewer, reviewData.review_result,
          reviewData.review_comment, reviewData.score,
          new Date().toISOString(),
          reviewData.zoom_verify_passed ? 1 : 0,
          reviewData.pan_verify_passed ? 1 : 0,
          traceabilityChain
        ],
        function(err) {
          if (err) reject(err);
          else {
            db.run(
              `UPDATE annotation_records SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [reviewData.review_result, reviewData.annotation_id]
            );
            logProcess(reviewData.annotation_id, 'review', reviewer, null, JSON.stringify(reviewData));
            resolve({ success: true, id: this.lastID });
          }
        }
      );
    });
  });
}

function getReviewSummary() {
  return new Promise((resolve, reject) => {
    db.all(
      `SELECT 
         ar.batch_no,
         COUNT(*) as total_count,
         SUM(CASE WHEN ar.status = 'pass' THEN 1 ELSE 0 END) as pass_count,
         SUM(CASE WHEN ar.status = 'fail' THEN 1 ELSE 0 END) as fail_count,
         SUM(CASE WHEN ar.status = 'pending' THEN 1 ELSE 0 END) as pending_count,
         AVG(rr.score) as avg_score
       FROM annotation_records ar
       LEFT JOIN review_results rr ON ar.id = rr.annotation_id
       GROUP BY ar.batch_no
       ORDER BY ar.batch_no`,
      [],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

function getAnnotationList(filters = {}) {
  return new Promise((resolve, reject) => {
    let whereClauses = [];
    let values = [];

    if (filters.batch_no) {
      whereClauses.push('ar.batch_no = ?');
      values.push(filters.batch_no);
    }
    if (filters.status) {
      whereClauses.push('ar.status = ?');
      values.push(filters.status);
    }
    if (filters.anomaly_type) {
      whereClauses.push('ar.anomaly_type = ?');
      values.push(filters.anomaly_type);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    db.all(
      `SELECT ar.*, rr.review_result, rr.score, rr.review_time, rr.zoom_verify_passed, rr.pan_verify_passed
       FROM annotation_records ar
       LEFT JOIN review_results rr ON ar.id = rr.annotation_id
       ${whereSql}
       ORDER BY ar.batch_no, ar.image_id, ar.created_at DESC`,
      values,
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = {
  generateImportHash,
  checkDuplicate,
  importAnnotation,
  supplementAnnotation,
  getAnnotationWithTrace,
  submitReview,
  getReviewSummary,
  getAnnotationList,
  logProcess
};
