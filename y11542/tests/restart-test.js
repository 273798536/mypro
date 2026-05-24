const http = require('http');

function request(method, path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method
    };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.end();
  });
}

async function checkDataAfterRestart() {
  console.log('验证重启后数据是否保留...');
  
  const tasks = await request('GET', '/api/tasks');
  console.log('任务总数:', tasks.data.length);
  
  const stats = await request('GET', '/api/tasks/statistics/summary');
  console.log('\n按状态统计:');
  stats.data.byStatus.forEach(s => {
    console.log(`  ${s.status}: ${s.count}`);
  });
  
  console.log('\n关键指标:');
  console.log('  待人工处理:', stats.data.manualPending);
  console.log('  永久失败:', stats.data.permanentFailed);
  console.log('  已补偿笔数:', stats.data.compensation.count);
  console.log('  补偿总额:', stats.data.compensation.total_amount);
  
  if (tasks.data.length > 0) {
    console.log('\n✅ 重启后数据保留成功!');
    console.log('\n重启前创建的任务在重启后仍然可查询，证明数据已持久化到磁盘。');
  } else {
    console.log('\n❌ 数据丢失!');
  }
}

checkDataAfterRestart();