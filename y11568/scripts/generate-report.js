const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbPath = path.resolve(process.env.DB_PATH || './data/city_lighting.db');
const db = new sqlite3.Database(dbPath);

const generateReport = () => {
  return new Promise((resolve, reject) => {
    const report = {
      generated_at: new Date().toISOString(),
      summary: {},
      work_order_stats: {},
      abnormal_data: {},
      road_section_analysis: []
    };

    db.get('SELECT COUNT(*) as total FROM work_orders', (err, result) => {
      if (err) return reject(err);
      report.summary.total_work_orders = result.total;

      db.all('SELECT status, COUNT(*) as count FROM work_orders GROUP BY status', (err, results) => {
        if (err) return reject(err);
        report.work_order_stats.by_status = results.reduce((acc, r) => {
          acc[r.status] = r.count;
          return acc;
        }, {});

        db.all('SELECT fault_type, COUNT(*) as count FROM work_orders GROUP BY fault_type', (err, results) => {
          if (err) return reject(err);
          report.work_order_stats.by_fault_type = results.reduce((acc, r) => {
            acc[r.fault_type] = r.count;
            return acc;
          }, {});

          db.get('SELECT COUNT(*) as count FROM bad_data_records WHERE is_resolved = 0', (err, result) => {
            if (err) return reject(err);
            report.summary.unresolved_bad_data = result.count;

            db.all('SELECT source_table, COUNT(*) as count FROM bad_data_records WHERE is_resolved = 0 GROUP BY source_table', (err, results) => {
              if (err) return reject(err);
              report.abnormal_data.by_source_table = results.reduce((acc, r) => {
                acc[r.source_table] = r.count;
                return acc;
              }, {});

              db.get('SELECT COUNT(*) as count FROM inspection_photos WHERE is_abnormal = 1', (err, result) => {
                if (err) return reject(err);
                report.abnormal_data.abnormal_photos = result.count;

                db.get('SELECT COUNT(*) as count FROM spare_parts WHERE is_qualified = 0', (err, result) => {
                  if (err) return reject(err);
                  report.abnormal_data.unqualified_parts = result.count;

                  db.get('SELECT COUNT(*) as count FROM external_receipts WHERE has_exception = 1', (err, result) => {
                    if (err) return reject(err);
                    report.abnormal_data.exception_receipts = result.count;

                    db.all(`
                      SELECT 
                        road_section, 
                        COUNT(*) as order_count,
                        SUM(light_count) as total_lights
                      FROM work_orders 
                      GROUP BY road_section 
                      HAVING order_count > 0
                      ORDER BY order_count DESC
                    `, (err, results) => {
                      if (err) return reject(err);
                      report.road_section_analysis = results.map(r => ({
                        ...r,
                        suggested_merge: r.order_count > 1
                      }));

                      db.all(`
                        SELECT 
                          u.name,
                          u.role,
                          COUNT(wo.id) as created_orders
                        FROM users u
                        LEFT JOIN work_orders wo ON u.id = wo.entry_user_id
                        GROUP BY u.id
                      `, (err, results) => {
                        if (err) return reject(err);
                        report.user_activity = results;

                        db.all('SELECT * FROM operation_logs ORDER BY created_at DESC LIMIT 10', (err, results) => {
                          if (err) return reject(err);
                          report.recent_operations = results.map(log => ({
                            ...log,
                            diff_summary: log.diff_summary ? JSON.parse(log.diff_summary) : null
                          }));

                          resolve(report);
                        });
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

const printReport = (report) => {
  console.log('\n========================================');
  console.log('    城市照明抢修验收链路分析报告');
  console.log('========================================');
  console.log(`生成时间: ${report.generated_at}`);
  console.log('\n【汇总统计】');
  console.log(`  总工单数: ${report.summary.total_work_orders}`);
  console.log(`  未解决坏数据: ${report.summary.unresolved_bad_data}`);
  
  console.log('\n【工单状态分布】');
  Object.entries(report.work_order_stats.by_status || {}).forEach(([status, count]) => {
    console.log(`  ${status}: ${count}`);
  });
  
  console.log('\n【故障类型分布】');
  Object.entries(report.work_order_stats.by_fault_type || {}).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });
  
  console.log('\n【异常数据统计】');
  console.log(`  异常照片: ${report.abnormal_data.abnormal_photos}`);
  console.log(`  不合格备件: ${report.abnormal_data.unqualified_parts}`);
  console.log(`  有异常的回执: ${report.abnormal_data.exception_receipts}`);
  console.log(`  坏数据按来源:`);
  Object.entries(report.abnormal_data.by_source_table || {}).forEach(([table, count]) => {
    console.log(`    ${table}: ${count}`);
  });
  
  console.log('\n【路段分析 - 需关注的重复工单】');
  const needMerge = report.road_section_analysis.filter(r => r.suggested_merge);
  if (needMerge.length > 0) {
    needMerge.forEach(r => {
      console.log(`  ${r.road_section}: ${r.order_count} 个工单 (共${r.total_lights}盏灯) - 建议合并`);
    });
  } else {
    console.log('  无需要合并的工单');
  }
  
  console.log('\n【最近10条操作记录】');
  report.recent_operations.forEach((log, i) => {
    console.log(`  ${i + 1}. [${log.created_at}] ${log.user_role} - ${log.operation_type}`);
    if (log.diff_summary) {
      const changes = Object.keys(log.diff_summary).length;
      console.log(`     ${changes} 处变更`);
    }
  });
  
  console.log('\n========================================\n');
};

const run = async () => {
  try {
    console.log('正在生成分析报告...');
    const report = await generateReport();
    
    const exportDir = path.resolve('./exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    
    const filename = `full_report_${Date.now()}.json`;
    const filePath = path.join(exportDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
    
    printReport(report);
    console.log(`完整报告已保存至: ${filePath}`);
  } catch (err) {
    console.error('生成报告失败:', err.message);
  } finally {
    db.close();
  }
};

run();
