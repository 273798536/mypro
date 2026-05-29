const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database/db');

router.post('/', async (req, res) => {
    try {
        const { name, employee_id, department, base_price } = req.body;
        if (!name || !employee_id) {
            return res.status(400).json({ error: '姓名和工号为必填项' });
        }
        const result = await runQuery(
            'INSERT INTO annotators (name, employee_id, department, base_price) VALUES (?, ?, ?, ?)',
            [name, employee_id, department || '', base_price || 0]
        );
        res.status(201).json({ id: result.lastID, name, employee_id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/', async (req, res) => {
    try {
        const { status, department } = req.query;
        let sql = 'SELECT * FROM annotators WHERE 1=1';
        let params = [];
        if (status) {
            sql += ' AND status = ?';
            params.push(status);
        }
        if (department) {
            sql += ' AND department = ?';
            params.push(department);
        }
        const annotators = await allQuery(sql, params);
        res.json(annotators);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const annotator = await getQuery('SELECT * FROM annotators WHERE id = ?', [req.params.id]);
        if (!annotator) {
            return res.status(404).json({ error: '标注员不存在' });
        }
        res.json(annotator);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const { name, department, base_price, status } = req.body;
        await runQuery(
            'UPDATE annotators SET name = COALESCE(?, name), department = COALESCE(?, department), base_price = COALESCE(?, base_price), status = COALESCE(?, status) WHERE id = ?',
            [name, department, base_price, status, req.params.id]
        );
        const annotator = await getQuery('SELECT * FROM annotators WHERE id = ?', [req.params.id]);
        res.json(annotator);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
