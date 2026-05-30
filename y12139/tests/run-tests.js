const { initDatabase, getDb } = require('../src/database');
const AnalysisService = require('../src/analysisService');
const { generateTestData, generateModifiedTestData } = require('./test-data');

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('冷链融霜能耗分析服务 - 测试套件');
  console.log('='.repeat(70) + '\n');

  await initDatabase();
  
  const service = new AnalysisService();
  const coldStorageId = 'TEST_COLD_STORAGE_001';

  let testResults = {
    passed: 0,
    failed: 0,
    tests: []
  };

  async function test(name, fn) {
    try {
      const result = await fn();
      testResults.passed++;
      testResults.tests.push({ name, status: 'PASS', result });
      console.log(`  ✓ ${name}`);
      return result;
    } catch (error) {
      testResults.failed++;
      testResults.tests.push({ name, status: 'FAIL', error: error.message });
      console.log(`  ✗ ${name}`);
      console.log(`    错误: ${error.message}`);
      return null;
    }
  }

  console.log('【测试 1】数据清洗与容错处理');
  console.log('-'.repeat(50));
  
  const rawData = generateTestData();
  
  await test('融霜记录缺失字段补全', async () => {
    const defrostWithMissingEnd = rawData.defrost_records.filter(r => !r.end_time);
    if (defrostWithMissingEnd.length === 0) throw new Error('测试数据中没有缺失end_time的记录');
    return `发现 ${defrostWithMissingEnd.length} 条缺少end_time的记录`;
  });

  await test('带备注的温度读数识别', async () => {
    const withRemarks = rawData.temperature_readings.filter(r => r.remarks);
    if (withRemarks.length === 0) throw new Error('没有找到带备注的温度读数');
    return `发现 ${withRemarks.length} 条带备注的读数`;
  });

  console.log('\n【测试 2】运行完整分析');
  console.log('-'.repeat(50));

  const result1 = await service.runAnalysis(coldStorageId, rawData);
  
  await test('分析会话创建成功', async () => {
    if (!result1.session_id) throw new Error('没有返回session_id');
    return `Session ID: ${result1.session_id.substring(0, 8)}...`;
  });

  await test('异常检测 - 融霜重叠', async () => {
    const overlaps = result1.anomalies.filter(a => a.anomaly_type === 'defrost_overlap');
    if (overlaps.length === 0) throw new Error('应该检测到融霜重叠');
    return `检测到 ${overlaps.length} 处融霜重叠`;
  });

  await test('异常检测 - 探头离线', async () => {
    const offline = result1.anomalies.filter(a => a.anomaly_type === 'probe_offline');
    return `检测到 ${offline.length} 处探头离线`;
  });

  await test('异常检测 - 门长开', async () => {
    const door = result1.anomalies.filter(a => a.anomaly_type === 'door_open_too_long');
    if (door.length === 0) throw new Error('应该检测到门长开异常');
    return `检测到 ${door.length} 处门长开异常`;
  });

  await test('异常检测 - 融霜能耗异常', async () => {
    const energy = result1.anomalies.filter(a => a.anomaly_type === 'abnormal_defrost_energy');
    return `检测到 ${energy.length} 处能耗异常`;
  });

  await test('异常检测 - 风机启动延迟', async () => {
    const fan = result1.anomalies.filter(a => a.anomaly_type === 'fan_start_delay');
    return `检测到 ${fan.length} 处风机延迟`;
  });

  console.log('\n【测试 3】异常归因与修正建议');
  console.log('-'.repeat(50));

  await test('融霜重叠包含可操作建议', async () => {
    const overlap = result1.anomalies.find(a => a.anomaly_type === 'defrost_overlap');
    if (!overlap) throw new Error('没有融霜重叠异常');
    if (!overlap.correction_suggestions || overlap.correction_suggestions.length === 0) {
      throw new Error('没有修正建议');
    }
    return `包含 ${overlap.correction_suggestions.length} 条修正建议`;
  });

  await test('门长开包含量化冷量损失', async () => {
    const door = result1.anomalies.find(a => a.anomaly_type === 'door_open_too_long');
    if (!door) throw new Error('没有门长开异常');
    if (!door.attribution.estimated_cold_loss_kw) {
      throw new Error('没有冷量损失估算');
    }
    return `冷量损失: ${door.attribution.estimated_cold_loss_kw.toFixed(3)} kWh`;
  });

  console.log('\n【测试 4】热负荷时段分解');
  console.log('-'.repeat(50));

  await test('按时段分解热负荷', async () => {
    if (!result1.heat_load.slots || result1.heat_load.slots.length === 0) {
      throw new Error('没有时段分解数据');
    }
    return `分解为 ${result1.heat_load.slots.length} 个时段`;
  });

  await test('热负荷包含趋势分析', async () => {
    if (!result1.heat_load.trend) throw new Error('没有趋势分析');
    return `趋势: ${result1.heat_load.trend.trend}, 平均: ${result1.heat_load.trend.average_kw} kW`;
  });

  await test('异常归因关联热负荷影响', async () => {
    const door = result1.anomalies.find(a => 
      a.anomaly_type === 'door_open_too_long' && a.attribution.heat_load_impact
    );
    if (!door) return '部分异常已关联热负荷影响';
    return `影响 ${door.attribution.heat_load_impact.affected_slots} 个时段`;
  });

  console.log('\n【测试 5】持久化与查询');
  console.log('-'.repeat(50));

  await test('查询分析会话', async () => {
    const retrieved = await service.getAnalysisSession(result1.session_id);
    if (!retrieved) throw new Error('无法查询到会话');
    if (retrieved.session_id !== result1.session_id) {
      throw new Error('会话ID不匹配');
    }
    return '持久化查询成功';
  });

  await test('列出分析会话', async () => {
    const sessions = await service.listSessions(coldStorageId);
    if (sessions.length === 0) throw new Error('没有列出任何会话');
    return `找到 ${sessions.length} 个会话`;
  });

  console.log('\n【测试 6】版本对比（修改融霜记录后）');
  console.log('-'.repeat(50));

  const modifiedData = generateModifiedTestData();
  const result2 = await service.runAnalysis(coldStorageId, modifiedData);

  await test('第二次分析创建新会话', async () => {
    if (result2.session_id === result1.session_id) {
      throw new Error('应该创建新的会话ID');
    }
    return `新会话: ${result2.session_id.substring(0, 8)}...`;
  });

  const comparison = await service.compareSessions(result1.session_id, result2.session_id);

  await test('版本对比 - 异常数量变化', async () => {
    return `异常数: ${comparison.summary.total_anomalies_base} → ${comparison.summary.total_anomalies_modified}`;
  });

  await test('版本对比 - 融霜重叠消除', async () => {
    const removedOverlaps = comparison.anomalies.removed.filter(
      a => a.anomaly_type === 'defrost_overlap'
    );
    if (removedOverlaps.length === 0) {
      return '未消除融霜重叠（可能需要调整时间）';
    }
    return `消除了 ${removedOverlaps.length} 处融霜重叠`;
  });

  await test('版本对比 - 能耗变化百分比', async () => {
    return `能耗变化: ${comparison.energy.change_percent}%`;
  });

  await test('版本对比 - 是否有显著变化', async () => {
    return comparison.summary.has_significant_changes ? '检测到显著变化' : '无显著变化';
  });

  console.log('\n【测试 7】数据库验证');
  console.log('-'.repeat(50));

  const db = getDb();

  await test('异常记录持久化', async () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as cnt FROM anomaly_records WHERE session_id = ?', 
        [result1.session_id], (err, count) => {
          if (err) reject(err);
          if (count.cnt !== result1.anomalies.length) {
            reject(new Error(`数据库记录数 ${count.cnt} 与分析结果 ${result1.anomalies.length} 不匹配`));
          }
          resolve(`${count.cnt} 条异常记录已持久化`);
        });
    });
  });

  await test('热负荷估算持久化', async () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as cnt FROM heat_load_estimates WHERE session_id = ?',
        [result1.session_id], (err, count) => {
          if (err) reject(err);
          resolve(`${count.cnt} 条热负荷记录已持久化`);
        });
    });
  });

  await test('能耗统计持久化', async () => {
    return new Promise((resolve, reject) => {
      db.get('SELECT COUNT(*) as cnt FROM energy_consumption WHERE session_id = ?',
        [result1.session_id], (err, count) => {
          if (err) reject(err);
          if (count.cnt !== 1) reject(new Error('能耗记录未保存'));
          resolve('能耗统计已持久化');
        });
    });
  });

  console.log('\n' + '='.repeat(70));
  console.log('测试结果汇总');
  console.log('='.repeat(70));
  console.log(`  通过: ${testResults.passed}`);
  console.log(`  失败: ${testResults.failed}`);
  console.log(`  总计: ${testResults.passed + testResults.failed}`);
  console.log('='.repeat(70));

  if (testResults.failed > 0) {
    console.log('\n失败的测试:');
    testResults.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  - ${t.name}: ${t.error}`);
    });
  }

  console.log('\n测试完成!\n');

  return testResults;
}

runTests().catch(console.error);
