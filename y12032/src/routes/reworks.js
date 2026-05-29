const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database/db');

router.post('/', async (req, res) => {
    try {
        const { task_id, rework_no, reason, rework_count, handler_id, original_result, corrected_result } = req.body;
        if (!task_id || !rework_no || !reason || !rework_count) {
            return res.status(400).json({ error: '缺少必填字段' });
        }
        const result = await runQuery(
            'INSERT INTO reworks (task_id, rework_no, reason, rework_count, handler_id, original_result, corrected_result) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [task_id, rework_no, reason, rework_count, handler_id || null, original_result || '', corrected_result || '']
        );
        await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['reworking', task_id]);
        res.status(201).json({ id: result.lastID, rework_no, task_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { task_id, status, handler_id } = req.query;
        let sql = `
            SELECT r.*, t.task_no, t.quantity, t.task_type, 
                   a.name as annotator_name, h.name as handler_name
            FROM reworks r 
            LEFT JOIN tasks t ON r.task_id = t.id 
            LEFT JOIN annotators a ON t.annotator_id = a.id 
            LEFT JOIN annotators h ON r.handler_id = h.id 
            WHERE 1=1
        `;
        let params = [];
        if (task_id) {
            sql += ' AND r.task_id = ?';
            params.push(task_id);
        }
        if (status) {
            sql += ' AND r.status = ?';
            params.push(status);
        }
        if (handler_id) {
            sql += ' AND r.handler_id = ?';
            params.push(handler_id);
        }
        sql += ' ORDER BY r.created_at DESC';
        const reworks = await allQuery(sql, params);
        res.json(reworks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/task/:task_id/changes', async (req, res) => {
    try {
        const reworks = await allQuery(`
            SELECT r.id, r.rework_no, r.reason, r.rework_count, 
                   r.original_result, r.corrected_result, r.status,
                   r.created_at, h.name as handler_name
            FROM reworks r 
            LEFT JOIN annotators h ON r.handler_id = h.id 
            WHERE r.task_id = ?
            ORDER BY r.created_at ASC
        `, [req.params.task_id]);
        
        const changes = reworks.map((rw, idx) => ({
            rework_no: rw.rework_no,
            sequence: idx + 1,
            reason: rw.reason,
            rework_count: rw.rework_count,
            changed_from: rw.original_result,
            changed_to: rw.corrected_result,
            handler: rw.handler_name,
            status: rw.status,
            created_at: rw.created_at
        }));
        
        res.json({ task_id: req.params.task_id, total_changes: changes.length, changes });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/complete', async (req, res) => {
    try {
        const { corrected_result, remark } = req.body;
        const rework = await getQuery('SELECT * FROM reworks WHERE id = ?', [req.params.id]);
        if (!rework) {
            return res.status(404).json({ error: '返工单不存在' });
        }
        
        await runQuery(
            'UPDATE reworks SET status = ?, corrected_result = COALESCE(?, corrected_result) WHERE id = ?',
            ['completed', corrected_result, req.params.id]
        );
        
        await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['rework_completed', rework.task_id]);
        
        const updated = await getQuery('SELECT * FROM reworks WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
