const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3000;

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('==========================================');
  console.log('  微波炉加热均匀性测试系统 - 验收测试');
  console.log('==========================================\n');

  let passed = 0;
  let failed = 0;

  try {
    console.log('检查服务状态...');
    const health = await request('GET', '/health');
    if (health.status === 'ok') {
      console.log('✅ 服务运行正常\n');
      passed++;
    } else {
      console.log('❌ 服务异常');
      failed++;
      return;
    }
  } catch (e) {
    console.log('❌ 服务未启动，请先运行: npm start');
    return;
  }

  let batchId;
  let initialScore;

  console.log('测试 1: 创建正常批次（温度测点 + 功率档）');
  try {
    const result = await request('POST', '/api/batches', {
      temperaturePoints: [
        { id: 'P001', position: '左上', temperature: 87.2 },
        { id: 'P002', position: '中上', temperature: 89.5 },
        { id: 'P003', position: '右上', temperature: 88.1 },
        { id: 'P004', position: '左中', temperature: 86.3 },
        { id: 'P005', position: '中心', temperature: 91.2 },
        { id: 'P006', position: '右中', temperature: 87.7 },
        { id: 'P007', position: '左下', temperature: 85.5 },
        { id: 'P008', position: '中下', temperature: 86.2 },
        { id: 'P009', position: '右下', temperature: 84.9 }
      ],
      powerLevel: 100,
      turntableRotation: true
    });

    if (result.success && result.batch) {
      batchId = result.batch.id;
      initialScore = result.batch.analysis.score;
      console.log(`✅ 批次创建成功，ID: ${batchId}`);
      console.log(`   均匀性评分: ${initialScore}`);
      console.log(`   等级: ${result.batch.analysis.grade}`);
      console.log(`   通过: ${result.batch.analysis.pass}`);
      console.log(`   版本: ${result.batch.version}`);
      passed++;
    } else {
      console.log('❌ 批次创建失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 2: 重复分析 - 验证可重复性');
  try {
    await request('POST', `/api/batches/${batchId}/reanalyze`);
    const result = await request('GET', `/api/batches/${batchId}`);
    const newScore = result.batch.analysis.score;

    if (newScore === initialScore) {
      console.log(`✅ 重复分析评分一致: ${newScore}`);
      console.log('   可重复性验证通过');
      passed++;
    } else {
      console.log(`❌ 评分不一致: ${initialScore} vs ${newScore}`);
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 3: 补充食物尺寸，验证变化追踪');
  try {
    const result = await request('PATCH', `/api/batches/${batchId}/food-dimensions`, {
      width: 20,
      depth: 20,
      height: 10
    });

    if (result.success && result.changes) {
      console.log('✅ 食物尺寸补充成功');
      console.log(`   旧值: ${JSON.stringify(result.changes.oldValue)}`);
      console.log(`   新值: ${JSON.stringify(result.changes.newValue)}`);
      
      if (result.changes.analysisChanges.hasChanges) {
        console.log('   分析结果已更新:');
        result.changes.analysisChanges.changes.forEach(c => {
          console.log(`     - ${c.field}: ${c.oldValue} -> ${c.newValue}`);
        });
      }
      passed++;
    } else {
      console.log('❌ 食物尺寸补充失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 4: 版本历史验证');
  try {
    const result = await request('GET', `/api/batches/${batchId}/versions`);
    if (result.success && result.versions.length >= 3) {
      console.log(`✅ 版本历史正确，共 ${result.versions.length} 个版本`);
      result.versions.forEach(v => {
        console.log(`   - v${v.version}: 评分 ${v.score}`);
      });
      passed++;
    } else {
      console.log('❌ 版本历史不正确');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 5: 版本对比 - v1 vs v3');
  try {
    const result = await request('GET', `/api/batches/${batchId}/compare/1/3`);
    if (result.success && result.versionChanges) {
      console.log('✅ 版本对比成功');
      result.versionChanges.changes.forEach(c => {
        console.log(`   - ${c.field} 已变更`);
      });
      if (result.analysisComparison && result.analysisComparison.hasChanges) {
        console.log('   分析结果变化:');
        result.analysisComparison.changes.forEach(c => {
          console.log(`     - ${c.field}: ${c.oldValue} -> ${c.newValue}`);
        });
        console.log('   受影响的明细:');
        result.analysisComparison.affectedDetails.forEach(a => {
          console.log(`     - ${a.area}`);
        });
      }
      passed++;
    } else {
      console.log('❌ 版本对比失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 6: 边界样例 - 测点缺失');
  try {
    const result = await request('POST', '/api/batches', {
      temperaturePoints: [
        { id: 'P001', position: '左上', temperature: 85.2 },
        { id: 'P002', position: '中上', temperature: null },
        { id: 'P003', position: '右上', temperature: 86.1 },
        { id: 'P004', position: '左中', temperature: null }
      ],
      powerLevel: 80,
      turntableRotation: true
    });

    const hasMissingAnomaly = result.batch.anomalies.some(a => a.type === 'missing_points');
    if (hasMissingAnomaly) {
      console.log('✅ 正确检测到测点缺失异常');
      result.batch.anomalies.filter(a => a.type === 'missing_points').forEach(a => {
        console.log(`   - ${a.message}`);
      });
      passed++;
    } else {
      console.log('❌ 未检测到测点缺失异常');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 7: 边界样例 - 转盘停转');
  try {
    const result = await request('POST', '/api/batches', {
      temperaturePoints: [
        { id: 'P001', position: '左上', temperature: 95.2 },
        { id: 'P002', position: '中上', temperature: 92.5 },
        { id: 'P003', position: '右上', temperature: 60.1 }
      ],
      powerLevel: 100,
      turntableRotation: false
    });

    const hasTurntableAnomaly = result.batch.anomalies.some(a => a.type === 'turntable_stopped');
    if (hasTurntableAnomaly) {
      console.log('✅ 正确检测到转盘停转异常');
      result.batch.anomalies.filter(a => a.type === 'turntable_stopped').forEach(a => {
        console.log(`   - ${a.message}`);
      });
      passed++;
    } else {
      console.log('❌ 未检测到转盘停转异常');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 8: 边界样例 - 功率跳档（温度与功率不匹配）');
  try {
    const result = await request('POST', '/api/batches', {
      temperaturePoints: [
        { id: 'P001', position: '左上', temperature: 45.2 },
        { id: 'P002', position: '中上', temperature: 48.5 }
      ],
      powerLevel: 100,
      turntableRotation: true
    });

    const hasPowerAnomaly = result.batch.anomalies.some(a => a.type === 'power_mismatch');
    if (hasPowerAnomaly) {
      console.log('✅ 正确检测到功率与温度不匹配');
      result.batch.anomalies.filter(a => a.type === 'power_mismatch').forEach(a => {
        console.log(`   - ${a.message}`);
      });
      passed++;
    } else {
      console.log('❌ 未检测到功率跳档异常');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 9: 复核批次');
  try {
    const result = await request('POST', `/api/batches/${batchId}/review`, {
      status: 'reviewed',
      reviewNotes: '数据复核完毕，加热均匀性测试结果有效'
    });

    if (result.success && result.batch.status === 'reviewed') {
      console.log('✅ 批次复核成功');
      console.log(`   状态: ${result.batch.status}`);
      console.log(`   复核意见: ${result.batch.reviewNotes}`);
      passed++;
    } else {
      console.log('❌ 批次复核失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 10: 导出报告');
  try {
    const result = await request('GET', `/api/batches/${batchId}/export`);
    if (result.exportTime && result.batchId) {
      console.log('✅ 报告导出成功');
      console.log(`   导出时间: ${result.exportTime}`);
      console.log(`   批次ID: ${result.batchId}`);
      console.log(`   版本: ${result.version}`);
      passed++;
    } else {
      console.log('❌ 报告导出失败');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('测试 11: 批次列表');
  try {
    const result = await request('GET', '/api/batches');
    if (result.success && result.batches.length >= 4) {
      console.log(`✅ 批次列表正确，共 ${result.batches.length} 个批次`);
      result.batches.forEach(b => {
        console.log(`   - ${b.id} | v${b.version} | 评分: ${b.score} | ${b.status}`);
      });
      passed++;
    } else {
      console.log('❌ 批次列表不正确');
      failed++;
    }
  } catch (e) {
    console.log('❌ 测试失败:', e.message);
    failed++;
  }
  console.log('');

  console.log('==========================================');
  console.log('  测试结果汇总');
  console.log('==========================================');
  console.log(`通过: ${passed}`);
  console.log(`失败: ${failed}`);
  console.log(`总计: ${passed + failed}`);
  console.log('');

  if (failed === 0) {
    console.log('🎉 所有测试通过！系统已准备就绪。');
    console.log('');
    console.log('使用方式:');
    console.log('  npm start          - 启动服务');
    console.log('  npm test           - 运行验收测试');
    console.log('  ./tests/acceptance-test.sh  - curl 验收脚本');
  } else {
    console.log('⚠️  部分测试失败，请检查系统。');
    process.exit(1);
  }
}

runTests().catch(console.error);
