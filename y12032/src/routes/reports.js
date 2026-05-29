const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { allQuery } = require('../database/db');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

router.get('/salary/:month', async (req, res) => {
    try {
        const { month } = req.params;
        const { format = 'json' } = req.query;
        
        const summaries = await allQuery(`
            SELECT s.*, a.name, a.employee_id, a.department
            FROM salary_summaries s
            LEFT JOIN annotators a ON s.annotator_id = a.id
            WHERE s.month = ?
            ORDER BY a.employee_id
        `, [month]);
        
        if (format === 'csv') {
            const exportDir = path.join(__dirname, '../../exports');
            if (!fs.existsSync(exportDir)) {
                fs.mkdirSync(exportDir, { recursive: true });
            }
            
            const filePath = path.join(exportDir, `salary_report_${month}.csv`);
            const csvWriter = createCsvWriter({
                path: filePath,
                header: [
                    { id: 'employee_id', title: '工号' },
                    { id: 'name', title: '姓名' },
                    { id: 'department', title: '部门' },
                    { id: 'base_salary', title: '基本工资' },
                    { id: 'piece_salary', title: '计件工资' },
                    { id: 'total_penalty', title: '扣罚总额' },
                    { id: 'total_subsidy', title: '补贴总额' },
                    { id: 'final_salary', title: '实发工资' },
                    { id: 'task_count', title: '任务数' },
                    { id: 'total_quantity', title: '总件数' }
                ]
            });
            
            await csvWriter.writeRecords(summaries);
            
            res.download(filePath, `salary_report_${month}.csv`);
        } else {
            res.json({
                month,
                total_count: summaries.length,
                total_final_salary: summaries.reduce((sum, s) => sum + s.final_salary, 0),
                data: summaries
            });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/quality/:month', async (req, res) => {
    try {
        const { month } = req.params;
        
        const data = await allQuery(`
            SELECT 
                a.id,
                a.name,
                a.employee_id,
                COUNT(DISTINCT t.id) as total_tasks,
                SUM(t.quantity) as total_quantity,
                SUM(i.pass_count) as total_pass,
                SUM(i.fail_count) as total_fail,
                CASE WHEN SUM(i.pass_count + i.fail_count) > 0 
                     THEN ROUND(SUM(i.pass_count) * 100.0 / SUM(i.pass_count + i.fail_count), 2)
                     ELSE 100.0 END as accuracy
            FROM annotators a
            LEFT JOIN tasks t ON a.id = t.annotator_id 
                AND strftime('%Y-%m', t.task_date) = ?
            LEFT JOIN inspections i ON t.id = i.task_id
            WHERE a.status = 'active'
            GROUP BY a.id
            ORDER BY accuracy DESC
        `, [month]);
        
        res.json({
            month,
            total_annotators: data.length,
            overall_accuracy: data.length > 0 
                ? (data.reduce((sum, d) => sum + (d.accuracy || 0), 0) / data.length).toFixed(2)
                : 0,
            data
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
