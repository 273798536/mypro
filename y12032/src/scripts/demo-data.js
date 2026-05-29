const { runQuery, initDatabase } = require('../database/db');

async function insertDemoData() {
    console.log('开始插入演示数据...');
    
    await runQuery("INSERT INTO annotators (name, employee_id, department, base_price) VALUES ('张三', 'AN001', '标注一组', 2000)");
    await runQuery("INSERT INTO annotators (name, employee_id, department, base_price) VALUES ('李四', 'AN002', '标注一组', 2000)");
    await runQuery("INSERT INTO annotators (name, employee_id, department, base_price) VALUES ('王五', 'AN003', '标注二组', 2000)");
    console.log('✓ 插入3名标注员');
    
    await runQuery("INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, status) VALUES ('T202405001', 1, '图像标注', 100, 0.5, 'BATCH001', '2024-05-10', 'confirmed')");
    await runQuery("INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, status) VALUES ('T202405002', 1, '文本标注', 200, 0.3, 'BATCH001', '2024-05-12', 'confirmed')");
    await runQuery("INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, status) VALUES ('T202405003', 2, '图像标注', 150, 0.5, 'BATCH001', '2024-05-11', 'confirmed')");
    await runQuery("INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, status) VALUES ('T202405004', 2, '音频标注', 80, 0.8, 'BATCH002', '2024-05-15', 'confirmed')");
    await runQuery("INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, status) VALUES ('T202405005', 3, '图像标注', 120, 0.5, 'BATCH002', '2024-05-13', 'rework_required')");
    await runQuery("INSERT INTO tasks (task_no, annotator_id, task_type, quantity, unit_price, batch_no, task_date, status) VALUES ('T202405006', 1, '文本标注', 300, 0.3, 'BATCH002', '2024-05-18', 'submitted')");
    console.log('✓ 插入6条任务记录');
    
    await runQuery("INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date) VALUES (1, '质检员A', 95, 5, 0.95, 'confirmed_pass', '2024-05-11')");
    await runQuery("INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date) VALUES (2, '质检员A', 190, 10, 0.95, 'confirmed_pass', '2024-05-13')");
    await runQuery("INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date) VALUES (3, '质检员B', 140, 10, 0.933, 'confirmed_pass', '2024-05-12')");
    await runQuery("INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date) VALUES (4, '质检员B', 75, 5, 0.9375, 'confirmed_pass', '2024-05-16')");
    await runQuery("INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date) VALUES (5, '质检员A', 90, 30, 0.75, 'confirmed_fail', '2024-05-14')");
    await runQuery("INSERT INTO inspections (task_id, inspector, pass_count, fail_count, accuracy, status, inspection_date) VALUES (6, '质检员C', 280, 20, 0.933, 'pending', '2024-05-19')");
    console.log('✓ 插入6条质检记录');
    
    await runQuery("INSERT INTO reworks (task_id, rework_no, reason, rework_count, handler_id, status, original_result, corrected_result) VALUES (5, 'RW001', '标注框不准确', 30, 3, 'completed', '准确率75%', '准确率95%')");
    console.log('✓ 插入1条返工单记录');
    
    await runQuery("INSERT INTO penalties (annotator_id, task_id, amount, reason, penalty_date) VALUES (3, 5, 50, '首次质检合格率低于80%', '2024-05-14')");
    console.log('✓ 插入1条扣罚记录');
    
    await runQuery("INSERT INTO subsidies (annotator_id, amount, reason, subsidy_date) VALUES (1, 100, '月度优秀标注员', '2024-05-25')");
    await runQuery("INSERT INTO subsidies (annotator_id, amount, reason, subsidy_date) VALUES (2, 50, '加班补贴', '2024-05-20')");
    console.log('✓ 插入2条补贴记录');
    
    console.log('\n演示数据插入完成！');
    console.log('数据说明：');
    console.log('  - 标注员: 张三(AN001), 李四(AN002), 王五(AN003)');
    console.log('  - 任务: 6条，覆盖已确认、待返工、已提交状态');
    console.log('  - 质检: 6条，包含待确认状态用于测试追溯');
    console.log('  - 返工: 1条，用于测试变更记录查询');
    console.log('  - 扣罚/补贴: 各有记录，工资计算时会自动统计');
}

async function main() {
    try {
        await initDatabase();
        await insertDemoData();
        process.exit(0);
    } catch (err) {
        console.error('错误:', err.message);
        process.exit(1);
    }
}

main();
