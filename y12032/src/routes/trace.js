const express = require('express');
const router = express.Router();
const { allQuery, getQuery } = require('../database/db');

router.get('/task/:task_no', async (req, res) => {
    try {
        const { task_no } = req.params;
        const task = await getQuery(`
            SELECT t.*, a.name as annotator_name, a.employee_id
            FROM tasks t
            LEFT JOIN annotators a ON t.annotator_id = a.id
            WHERE t.task_no = ?
        `, [task_no]);
        
        if (!task) {
            return res.status(404).json({ error: '任务不存在' });
        }
        
        const inspections = await allQuery(`
            SELECT * FROM inspections WHERE task_id = ? ORDER BY created_at ASC
        `, [task.id]);
        
        const reworks = await allQuery(`
            SELECT r.*, h.name as handler_name
            FROM reworks r
            LEFT JOIN annotators h ON r.handler_id = h.id
            WHERE r.task_id = ? ORDER BY created_at ASC
        `, [task.id]);
        
        const pendingBranches = [];
        if (inspections.some(i => i.status === 'pending')) {
            pendingBranches.push({
                type: 'inspection_pending',
                message: '质检结果待确认',
                next_step: '请联系质检组长确认质检结果',
                contact: inspections.find(i => i.status === 'pending')?.inspector
            });
        }
        
        if (reworks.some(r => r.status === 'pending')) {
            const pendingRework = reworks.find(r => r.status === 'pending');
            pendingBranches.push({
                type: 'rework_pending',
                message: '返工单待处理',
                next_step: '请联系标注员处理返工',
                contact: pendingRework.handler_name || pendingRework.handler_id
            });
        }
        
        const isCrossMonth = inspections.some(i => {
            const taskMonth = task.task_date.substring(0, 7);
            const inspectMonth = i.inspection_date?.substring(0, 7);
            return inspectMonth && taskMonth !== inspectMonth;
        });
        
        if (isCrossMonth) {
            pendingBranches.push({
                type: 'cross_month',
                message: '批次跨月',
                next_step: '请联系财务确认跨月结算规则',
                contact: '财务组'
            });
        }
        
        const hasRepeatRework = reworks.length > 1;
        if (hasRepeatRework) {
            pendingBranches.push({
                type: 'repeat_rework',
                message: `任务已返工 ${reworks.length} 次`,
                next_step: '请联系质检组长评估标注质量',
                contact: '质检组长'
            });
        }
        
        res.json({
            task,
            inspections,
            reworks,
            pending_branches: pendingBranches,
            trace_path: buildTracePath(task, inspections, reworks)
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function buildTracePath(task, inspections, reworks) {
    const path = [];
    path.push({
        step: 1,
        type: 'task_submit',
        time: task.created_at,
        operator: task.annotator_name,
        description: `提交任务 ${task.task_no}，数量 ${task.quantity}`
    });
    
    inspections.forEach((ins, idx) => {
        path.push({
            step: path.length + 1,
            type: 'inspection',
            time: ins.created_at,
            operator: ins.inspector,
            description: `质检：通过 ${ins.pass_count}，不通过 ${ins.fail_count}，准确率 ${(ins.accuracy * 100).toFixed(2)}%`,
            status: ins.status
        });
    });
    
    reworks.forEach((rw, idx) => {
        path.push({
            step: path.length + 1,
            type: 'rework',
            time: rw.created_at,
            operator: rw.handler_name || '系统',
            description: `返工单 ${rw.rework_no}：${rw.reason}，返工数量 ${rw.rework_count}`,
            status: rw.status
        });
    });
    
    return path;
}

router.get('/annotator/:employee_id/trace', async (req, res) => {
    try {
        const { employee_id } = req.params;
        const { month } = req.query;
        
        const annotator = await getQuery('SELECT * FROM annotators WHERE employee_id = ?', [employee_id]);
        if (!annotator) {
            return res.status(404).json({ error: '标注员不存在' });
        }
        
        let taskSql = `
            SELECT t.* FROM tasks t
            WHERE t.annotator_id = ?
        `;
        let params = [annotator.id];
        
        if (month) {
            taskSql += " AND strftime('%Y-%m', t.task_date) = ?";
            params.push(month);
        }
        taskSql += ' ORDER BY t.task_date DESC';
        
        const tasks = await allQuery(taskSql, params);
        
        const result = [];
        for (const task of tasks) {
            const inspections = await allQuery('SELECT * FROM inspections WHERE task_id = ? ORDER BY created_at DESC', [task.id]);
            const reworks = await allQuery('SELECT * FROM reworks WHERE task_id = ? ORDER BY created_at DESC', [task.id]);
            
            result.push({
                task_no: task.task_no,
                task_date: task.task_date,
                task_type: task.task_type,
                quantity: task.quantity,
                status: task.status,
                inspection_count: inspections.length,
                rework_count: reworks.length,
                has_quality_issue: reworks.length > 0 || inspections.some(i => i.status === 'failed' || i.status === 'confirmed_fail')
            });
        }
        
        res.json({
            annotator: {
                id: annotator.id,
                name: annotator.name,
                employee_id: annotator.employee_id,
                department: annotator.department
            },
            tasks: result,
            total_tasks: result.length,
            quality_issue_tasks: result.filter(t => t.has_quality_issue).length
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
