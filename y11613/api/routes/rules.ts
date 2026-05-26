import { Router } from 'express';
import { getDatabase } from '../database/init.js';
import { generateId } from '../utils/index.js';

const router = Router();

router.get('/', (req, res) => {
  const db = getDatabase();
  try {
    const rules = db.prepare(`
      SELECT * FROM bonus_rules 
      ORDER BY is_active DESC, created_at DESC
    `).all();
    res.json(rules.map(r => ({
      ...r,
      tiers: JSON.parse(r.tiers)
    })));
  } finally {
    db.close();
  }
});

router.get('/active', (req, res) => {
  const db = getDatabase();
  try {
    const rule = db.prepare(`
      SELECT * FROM bonus_rules 
      WHERE is_active = 1 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get();
    if (rule) {
      rule.tiers = JSON.parse(rule.tiers);
    }
    res.json(rule || null);
  } finally {
    db.close();
  }
});

router.post('/', (req, res) => {
  const db = getDatabase();
  try {
    const { name, tiers, priority, effectiveFrom, effectiveTo, createdBy } = req.body;

    const maxVersion = db.prepare(`
      SELECT MAX(version) as max_version FROM bonus_rules
    `).get() as { max_version: number };
    const version = (maxVersion?.max_version || 0) + 1;

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare('UPDATE bonus_rules SET is_active = 0').run();

      const ruleId = generateId('rule');
      db.prepare(`
        INSERT INTO bonus_rules (id, version, name, tiers, priority, effective_from, effective_to, is_active, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
      `).run(
        ruleId,
        version,
        name,
        JSON.stringify(tiers),
        priority || 'bonus_first',
        effectiveFrom,
        effectiveTo || null,
        createdBy
      );

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'create_rule', 'rules', createdBy, JSON.stringify({
        ruleId,
        version,
        name,
        tiers,
        priority
      }));

      db.prepare('COMMIT').run();

      const rule = db.prepare('SELECT * FROM bonus_rules WHERE id = ?').get(ruleId);
      rule.tiers = JSON.parse(rule.tiers);
      res.status(201).json(rule);
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

router.patch('/:id/activate', (req, res) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const { operator } = req.body;

    const rule = db.prepare('SELECT * FROM bonus_rules WHERE id = ?').get(id);
    if (!rule) {
      return res.status(404).json({ error: '规则不存在' });
    }

    db.prepare('BEGIN TRANSACTION').run();

    try {
      db.prepare('UPDATE bonus_rules SET is_active = 0').run();
      db.prepare('UPDATE bonus_rules SET is_active = 1 WHERE id = ?').run(id);

      db.prepare(`
        INSERT INTO audit_logs (id, action, module, operator, details)
        VALUES (?, ?, ?, ?, ?)
      `).run(generateId('audit'), 'activate_rule', 'rules', operator, JSON.stringify({
        ruleId: id,
        name: rule.name
      }));

      db.prepare('COMMIT').run();

      const updated = db.prepare('SELECT * FROM bonus_rules WHERE id = ?').get(id);
      updated.tiers = JSON.parse(updated.tiers);
      res.json(updated);
    } catch (e) {
      db.prepare('ROLLBACK').run();
      throw e;
    }
  } finally {
    db.close();
  }
});

export default router;
