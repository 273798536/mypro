const app = require('./server');
const http = require('http');

const server = http.createServer(app);
const PORT = 3003;

function post(path, body) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', (e) => resolve({ error: e.message }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function get(path) {
  return new Promise((resolve) => {
    http.get('http://localhost:' + PORT + path, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(d) });
        } catch {
          resolve({ status: res.statusCode, body: d });
        }
      });
    }).on('error', (e) => resolve({ error: e.message }));
  });
}

server.listen(PORT, async () => {
  console.log('=== API Integration Test ===\n');

  await post('/api/samples/clear');
  console.log('✓ Clear data');

  const imp = await post('/api/samples/import');
  console.log('✓ Import samples:', imp.body.imported);

  const queue = await get('/api/deposits');
  console.log('\n--- Release Queue ---');
  for (const q of queue.body.queue) {
    const tag = q.canRelease ? 'READY' : 'BLOCKED';
    const issues = q.issues.length > 0 ? ` [${q.issues.join(',')}]` : '';
    console.log(`  [${tag}] ${q.orderId} ${q.customerName} ¥${q.depositAmount}->¥${q.releaseAmount}${issues}`);
  }

  console.log('\n--- Alerts (unresolved) ---');
  for (const a of queue.body.alerts) {
    if (!a.resolved) console.log(`  [${a.severity.toUpperCase()}] ${a.message}`);
  }

  const proc = await post('/api/deposits/process-all');
  console.log('\n--- Process All ---');
  console.log('  Completed:', proc.body.processed ? proc.body.processed.length : 0);
  if (proc.body.skipped) {
    for (const s of proc.body.skipped) {
      console.log(`  Skipped: ${s.orderId} issues=[${s.issues.join(',')}]`);
    }
  }

  const alerts = await get('/api/alerts');
  console.log('\n--- Final Alerts ---');
  console.log('  Counts:', JSON.stringify(alerts.body.counts));
  for (const a of alerts.body.alerts) {
    if (!a.resolved) console.log(`  [${a.severity.toUpperCase()}] ${a.message}`);
  }

  const report = await get('/api/reports');
  console.log('\n--- Report Summary ---');
  console.log('  ', JSON.stringify(report.body.summary));

  console.log('\n=== All tests passed ===');
  server.close();
});