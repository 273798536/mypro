const express = require('express');
const router = express.Router();
const { runQuery, getQuery, allQuery } = require('../database/db');

router.post('/penalties', async (req, res) => {
    try {
        const { annotator_id, task_id, amount, reason, penalty_date } = req.body;
        if (!annotator_id || !amount || !reason || !penalty_date) {
            return res.status(400).json({ error: '缺少必填字段' });
        }
        const result = await runQuery(
            'INSERT INTO penalties (annotator_id, task_id, amount, reason, penalty_date) VALUES (?, ?, ?, ?, ?)',
            [annotator_id, task_id || null, amount, reason, penalty_date]
        );
        res.status(201).json({ id: result.lastID, amount, reason });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/subsidies', async (req, res) => {
    try {
        const { annotator_id, amount, reason, subsidy_date } = req.body;
        if (!annotator_id || !amount || !reason || !subsidy_date) {
            return res.status(400).json({ error: '缺少必填字段' });
        }
        const result = await runQuery(
            'INSERT INTO subsidies (annotator_id, amount, reason, subsidy_date) VALUES (?, ?, ?, ?)',
            [annotator_id, amount, reason, subsidy_date]
        );
        res.status(201).json({ id: result.lastID, amount, reason });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.post('/calculate', async (req, res) => {
    try {
        const { month, annotator_id } = req.body;
        if (!month) {
            return res.status(400).json({ error: '月份为必填项，格式: YYYY-MM' });
        }
        
        const annotators = annotator_id 
            ? await allQuery('SELECT * FROM annotators WHERE id = ?', [annotator_id])
            : await allQuery('SELECT * FROM annotators WHERE status = ?', ['active']);
        
        const results = [];
        
        for (const annotator of annotators) {
            const tasks = await allQuery(`
                SELECT * FROM tasks 
                WHERE annotator_id = ? 
                AND strftime('%Y-%m', task_date) = ?
                AND status IN ('confirmed', 'rework_completed', 'passed')
            `, [annotator.id, month]);
            
            let piece_salary = 0;
            let total_quantity = 0;
            
            for (const task of tasks) {
                const inspection = await getQuery(`
                    SELECT pass_count FROM inspections 
                    WHERE task_id = ? AND status IN ('passed', 'confirmed_pass')
                    ORDER BY created_at DESC LIMIT 1
                `, [task.id]);
                
                const valid_count = inspection ? inspection.pass_count : task.quantity;
                piece_salary += valid_count * task.unit_price;
                total_quantity += valid_count;
            }
            
            const penalties = await allQuery(`
                SELECT SUM(amount) as total FROM penalties 
                WHERE annotator_id = ? AND strftime('%Y-%m', penalty_date) = ?
            `, [annotator.id, month]);
            
            const subsidies = await allQuery(`
                SELECT SUM(amount) as total FROM subsidies 
                WHERE annotator_id = ? AND strftime('%Y-%m', subsidy_date) = ?
            `, [annotator.id, month]);
            
            const total_penalty = penalties[0].total || 0;
            const total_subsidy = subsidies[0].total || 0;
            const final_salary = annotator.base_price + piece_salary - total_penalty + total_subsidy;
            
            await runQuery(`
                INSERT OR REPLACE INTO salary_summaries 
                (annotator_id, month, base_salary, piece_salary, total_penalty, total_subsidy, final_salary, task_count, total_quantity)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [annotator.id, month, annotator.base_price, piece_salary, total_penalty, total_subsidy, final_salary, tasks.length, total_quantity]);
            
            results.push({
                annotator_id: annotator.id,
                annotator_name: annotator.name,
                employee_id: annotator.employee_id,
                month,
                base_salary: annotator.base_price,
                piece_salary,
                total_penalty,
                total_subsidy,
                final_salary,
                task_count: tasks.length,
                total_quantity
            });
        }
        
        res.json({ success: true, count: results.length, data: results });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/summaries', async (req, res) => {
    try {
        const { month, annotator_id } = req.query;
        let sql = `
            SELECT s.*, a.name, a.employee_id, a.department
            FROM salary_summaries s
            LEFT JOIN annotators a ON s.annotator_id = a.id
            WHERE 1=1
        `;
        let params = [];
        if (month) {
            sql += ' AND s.month = ?';
            params.push(month);
        }
        if (annotator_id) {
            sql += ' AND s.annotator_id = ?';
            params.push(annotator_id);
        }
        sql += ' ORDER BY s.month DESC, a.employee_id';
        const summaries = await allQuery(sql, params);
        res.json(summaries);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/details/:annotator_id/:month', async (req, res) => {
    try {
        const { annotator_id, month } = req.params;
        
        const summary = await getQuery('SELECT * FROM salary_summaries WHERE annotator_id = ? AND month = ?', [annotator_id, month]);
        const tasks = await allQuery(`
            SELECT t.*, i.pass_count, i.status as inspection_status
            FROM tasks t
            LEFT JOIN inspections i ON t.id = i.task_id
            WHERE t.annotator_id = ? AND strftime('%Y-%m', t.task_date) = ?
            ORDER BY t.task_date
        `, [annotator_id, month]);
        const penalties = await allQuery("SELECT * FROM penalties WHERE annotator_id = ? AND strftime('%Y-%m', penalty_date) = ?", [annotator_id, month]);
        const subsidies = await allQuery("SELECT * FROM subsidies WHERE annotator_id = ? AND strftime('%Y-%m', subsidy_date) = ?", [annotator_id, month]);
        
        res.json({
            summary,
            tasks,
            penalties,
            subsidies
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
