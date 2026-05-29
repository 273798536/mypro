const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database/db');

router.post('/', async (req, res) => {
    try {
        const { task_id, inspector, pass_count, fail_count, status, inspection_date, remark } = req.body;
        if (!task_id || !inspector) {
            return res.status(400).json({ error: '任务ID和质检员为必填项' });
        }
        const accuracy = (pass_count + fail_count) > 0 ? (pass_count / (pass_count + fail_count)) : 0;
        const result = await runQuery(
            'INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [task_id, inspector, pass_count || 0, fail_count || 0, accuracy, status || 'pending', inspection_date || new Date().toISOString().split('T')[0], remark || '']
        );
        
        if (status === 'passed') {
            await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['passed', task_id]);
        } else if (status === 'failed') {
            await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['need_rework', task_id]);
        }
        
        res.status(201).json({ id: result.lastID, task_id, accuracy });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { task_id, status, inspector } = req.query;
        let sql = `
            SELECT i.*, t.task_no, a.name as annotator_name 
            FROM inspections i 
            LEFT JOIN tasks t ON i.task_id = t.id 
            LEFT JOIN annotators a ON t.annotator_id = a.id 
            WHERE 1=1
        `;
        let params = [];
        if (task_id) {
            sql += ' AND i.task_id = ?';
            params.push(task_id);
        }
        if (status) {
            sql += ' AND i.status = ?';
            params.push(status);
        }
        if (inspector) {
            sql += ' AND i.inspector = ?';
            params.push(inspector);
        }
        sql += ' ORDER BY i.created_at DESC';
        const inspections = await allQuery(sql, params);
        res.json(inspections);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/pending', async (req, res) => {
    try {
        const pendingInspections = await allQuery(`
            SELECT i.*, t.task_no, t.quantity, t.task_type, t.task_date, a.name as annotator_name, a.employee_id
            FROM inspections i 
            LEFT JOIN tasks t ON i.task_id = t.id 
            LEFT JOIN annotators a ON t.annotator_id = a.id 
            WHERE i.status = 'pending'
            ORDER BY i.created_at DESC
        `);
        res.json(pendingInspections);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id/confirm', async (req, res) => {
    try {
        const { status } = req.body;
        const inspection = await getQuery('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
        if (!inspection) {
            return res.status(404).json({ error: '质检记录不存在' });
        }
        
        await runQuery('UPDATE inspections SET status = ? WHERE id = ?', [status, req.params.id]);
        
        if (status === 'confirmed_pass') {
            await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['confirmed', inspection.task_id]);
        } else if (status === 'confirmed_fail') {
            await runQuery('UPDATE tasks SET status = ? WHERE id = ?', ['rework_required', inspection.task_id]);
        }
        
        const updated = await getQuery('SELECT * FROM inspections WHERE id = ?', [req.params.id]);
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
