const { getDb } = require('./db');
const { v4: uuidv4 } = require('uuid');

function detectSensitiveWords(content, rules) {
  const hits = [];
  for (const rule of rules) {
    if (rule.is_active !== 1) continue;
    try {
      const pattern = new RegExp(rule.rule_pattern, 'i');
      if (pattern.test(content)) {
        hits.push({
          rule_id: rule.id,
          rule_name: rule.rule_name,
          rule_type: rule.rule_type
        });
      }
    } catch (e) {
      console.error(`规则 ${rule.rule_name} 正则错误:`, e.message);
    }
  }
  return hits;
}

function determineAutoResult(sampleType, hits) {
  const hasHits = hits.length > 0;
  if (sampleType === 'bad') {
    return hasHits ? 'block' : 'pass';
  } else if (sampleType === 'normal') {
    return hasHits ? 'block' : 'pass';
  } else {
    return hasHits ? 'block' : 'pass';
  }
}

function importBatch(batchData) {
  const db = getDb();
  const { batch_id, batch_name, description, source, samples } = batchData;

  const existingBatch = db.prepare('SELECT * FROM sample_batches WHERE batch_id = ?').get(batch_id);
  
  const tx = db.transaction(() => {
    if (existingBatch) {
      db.prepare(`
        UPDATE sample_batches 
        SET batch_name = ?, description = ?, source = ?, updated_at = CURRENT_TIMESTAMP
        WHERE batch_id = ?
      `).run(batch_name, description, source, batch_id);
    } else {
      db.prepare(`
        INSERT INTO sample_batches (batch_id, batch_name, description, source)
        VALUES (?, ?, ?, ?)
      `).run(batch_id, batch_name, description, source);
    }

    const rules = db.prepare('SELECT * FROM sensitive_rules').all();
    const insertSample = db.prepare(`
      INSERT OR IGNORE INTO test_samples 
      (sample_id, batch_id, content, sample_type, expected_result, auto_result, auto_hit_rules, final_result, is_confirmed, note)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    const updateSample = db.prepare(`
      UPDATE test_samples 
      SET content = ?, sample_type = ?, expected_result = ?, auto_result = ?, auto_hit_rules = ?, note = ?, updated_at = CURRENT_TIMESTAMP
      WHERE sample_id = ? AND is_confirmed = 0
    `);
    const getExisting = db.prepare('SELECT * FROM test_samples WHERE sample_id = ?');

    const stats = { inserted: 0, updated: 0, skipped: 0, total: samples.length };

    for (const sample of samples) {
      const sampleId = sample.sample_id || `${batch_id}-${uuidv4().slice(0, 8)}`;
      const hits = detectSensitiveWords(sample.content, rules);
      const autoResult = determineAutoResult(sample.sample_type, hits);
      const hitRulesStr = hits.length > 0 ? JSON.stringify(hits) : null;

      const existing = getExisting.get(sampleId);
      
      if (!existing) {
        insertSample.run(
          sampleId,
          batch_id,
          sample.content,
          sample.sample_type,
          sample.expected_result,
          autoResult,
          hitRulesStr,
          autoResult,
          sample.note || ''
        );
        stats.inserted++;
      } else if (existing.is_confirmed === 0) {
        updateSample.run(
          sample.content,
          sample.sample_type,
          sample.expected_result,
          autoResult,
          hitRulesStr,
          sample.note || '',
          sampleId
        );
        stats.updated++;
      } else {
        stats.skipped++;
      }
    }

    return stats;
  });

  return tx();
}

function runRegressionForBatch(batchId) {
  const db = getDb();
  const rules = db.prepare('SELECT * FROM sensitive_rules').all();
  const samples = db.prepare('SELECT * FROM test_samples WHERE batch_id = ?').all(batchId);

  const tx = db.transaction(() => {
    const updateStmt = db.prepare(`
      UPDATE test_samples 
      SET auto_result = ?, auto_hit_rules = ?, final_result = CASE WHEN is_confirmed = 1 THEN final_result ELSE ? END, updated_at = CURRENT_TIMESTAMP
      WHERE sample_id = ?
    `);

    for (const sample of samples) {
      const hits = detectSensitiveWords(sample.content, rules);
      const autoResult = determineAutoResult(sample.sample_type, hits);
      const hitRulesStr = hits.length > 0 ? JSON.stringify(hits) : null;
      updateStmt.run(autoResult, hitRulesStr, autoResult, sample.sample_id);
    }

    return samples.length;
  });

  return tx();
}

function correctSample(sampleId, newResult, reason, operator = 'manual') {
  const db = getDb();
  const sample = db.prepare('SELECT * FROM test_samples WHERE sample_id = ?').get(sampleId);
  
  if (!sample) {
    throw new Error('样本不存在');
  }

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE test_samples 
      SET final_result = ?, is_confirmed = 1, updated_at = CURRENT_TIMESTAMP
      WHERE sample_id = ?
    `).run(newResult, sampleId);

    db.prepare(`
      INSERT INTO correction_history (sample_id, old_result, new_result, reason, operator)
      VALUES (?, ?, ?, ?, ?)
    `).run(sampleId, sample.final_result, newResult, reason, operator);

    return db.prepare('SELECT * FROM correction_history WHERE sample_id = ? ORDER BY corrected_at DESC LIMIT 1').get(sampleId);
  });

  return tx();
}

function getSampleCorrectionHistory(sampleId) {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM correction_history 
    WHERE sample_id = ? 
    ORDER BY corrected_at DESC
  `).all(sampleId);
}

function getBatchSummary(batchId) {
  const db = getDb();
  const samples = db.prepare('SELECT * FROM test_samples WHERE batch_id = ?').all(batchId);
  
  const summary = {
    total: samples.length,
    by_type: { normal: 0, boundary: 0, bad: 0 },
    by_result: { pass: 0, block: 0 },
    confirmed: 0,
    unconfirmed: 0,
    pass_rate: 0,
    details: []
  };

  for (const s of samples) {
    summary.by_type[s.sample_type] = (summary.by_type[s.sample_type] || 0) + 1;
    if (s.final_result) {
      summary.by_result[s.final_result] = (summary.by_result[s.final_result] || 0) + 1;
    }
    if (s.is_confirmed === 1) {
      summary.confirmed++;
    } else {
      summary.unconfirmed++;
    }

    const hitRules = s.auto_hit_rules ? JSON.parse(s.auto_hit_rules) : [];
    summary.details.push({
      sample_id: s.sample_id,
      sample_type: s.sample_type,
      content: s.content,
      expected_result: s.expected_result,
      auto_result: s.auto_result,
      final_result: s.final_result,
      is_confirmed: s.is_confirmed === 1,
      hit_rules: hitRules,
      note: s.note
    });
  }

  const decided = summary.by_result.pass + summary.by_result.block;
  summary.pass_rate = decided > 0 ? Math.round((summary.by_result.pass / decided) * 100) : 0;

  return summary;
}

module.exports = {
  detectSensitiveWords,
  importBatch,
  runRegressionForBatch,
  correctSample,
  getSampleCorrectionHistory,
  getBatchSummary
};
