const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database/db');

router.post('/', async (req, res) => {
    try {
        const { task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, remark } = req.body;
        if (!task_no || !annotator_id || !task_type || !quantity || !unit_price || !task_date) {
            return res.status(400).json({ error: '缺少必填字段' });
        }
        const result = await runQuery(
            'INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, remark) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [task_no, annotator_id, task_type, quantity, unit_price, batch_no || '', task_date, remark || '']
        );
        res.status(201).json({ id: result.lastID, task_no });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { annotator_id, status, start_date, end_date, batch_no } = req.query;
        let sql = `
            SELECT t.*, a.name as annotator_name, a.employee_id 
            FROM tasks t 
            LEFT JOIN annotators a ON t.annotator_id = a.id 
            WHERE 1=1
        `;
        let params = [];
        if (annotator_id) {
            sql += ' AND t.annotator_id = ?';
            params.push(annotator_id);
        }
        if (status) {
            sql += ' AND t.status = ?';
            params.push(status);
        }
        if (start_date) {
            sql += ' AND t.task_date >= ?';
            params.push(start_date);
        }
        if (end_date) {
            sql += ' AND t.task_date <= ?';
            params.push(end_date);
        }
        if (batch_no) {
            sql += ' AND t.batch_no = ?';
            params.push(batch_no);
        }
        sql += ' ORDER BY t.task_date DESC';
        const tasks = await allQuery(sql, params);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const task = await getQuery(`
            SELECT t.*, a.name as annotator_name, a.employee_id 
            FROM tasks t 
            LEFT JOIN annotators a ON t.annotator_id = a.id 
            WHERE t.id = ?
        `, [req.params.id]);
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { status, remark } = req.body;
        await runQuery(
            'UPDATE tasks SET status = COALESCE(?, status), remark = COALESCE(?, remark) WHERE id = ?',
            [status, remark, req.params.id]
        );
        const task = await getQuery('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
