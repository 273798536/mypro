const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawn, execSync } = require('child_process');

const NODE_BIN = process.env.NODE_BIN || 'node';
const BACKEND_DIR = path.resolve(__dirname);
const DB_PATH = path.join(BACKEND_DIR, 'data', 'dispute.db');
const TEST_DATA_DIR = path.resolve(__dirname, '..', 'test-data');
const API = 'http://localhost:4000';

const assertEq = (label, actual, expected) => {
  const ok = actual === expected;
  console.log(`  ${ok ? '✅' : '❌'} ${label}: expected=${expected}, actual=${actual}`);
  if (!ok) process.exitCode = 1;
  return ok;
};

function request({ method, endpoint, files, json }) {
  if (!method) method = files || json ? 'POST' : 'GET';
  return new Promise((resolve, reject) => {
    const u = new URL(`${API}${endpoint}`);
    const opts = {
      method,
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + (u.search || ''),
      headers: {}
    };

    let postData = null;

    if (files && files.length > 0) {
      const boundary = `----FormBoundary${Date.now()}${Math.random().toString(16).slice(2)}`;
      opts.headers['Content-Type'] = `multipart/form-data; boundary=${boundary}`;
      const chunks = [];
      for (const file of files) {
        chunks.push(Buffer.from(`--${boundary}\r\n`));
        const fname = require('path').basename(file);
        chunks.push(Buffer.from(
          `Content-Disposition: form-data; name="files"; filename="${fname}"\r\n` +
          `Content-Type: message/rfc822\r\n\r\n`
        ));
        chunks.push(fs.readFileSync(file));
        chunks.push(Buffer.from(`\r\n`));
      }
      chunks.push(Buffer.from(`--${boundary}--\r\n`));
      postData = Buffer.concat(chunks);
      opts.headers['Content-Length'] = postData.length;
    } else if (json) {
      postData = Buffer.from(JSON.stringify(json));
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = postData.length;
    }

    const req = http.request(opts, (res) => {
      let body = '';
      res.on('data', (d) => (body += d));
      res.on('end', () => {
        if (res.statusCode >= 400) {
          reject(new Error(`${res.statusCode} ${body.slice(0, 300)}`));
          return;
        }
        try { resolve(JSON.parse(body)); } catch { reject(new Error(`Non-JSON: ${body.slice(0, 300)}`)); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

(async function main() {
  console.log('=== Step 0: 重置数据库 ===');
  if (fs.existsSync(DB_PATH)) { fs.unlinkSync(DB_PATH); console.log('  已删除旧 DB'); }

  // 杀掉旧后端
  try {
    execSync('pkill -f "src/index.js" 2>/dev/null || true');
    await new Promise(r => setTimeout(r, 500));
  } catch {}

  console.log('\n=== Step 1: 启动后端服务 ===');
  const server = spawn(NODE_BIN, [path.join(BACKEND_DIR, 'src', 'index.js')], {
    cwd: BACKEND_DIR,
    stdio: 'inherit'
  });
  process.on('exit', () => server.kill('SIGTERM'));

  for (let i = 0; i < 20; i++) {
    try {
      await request({ endpoint: '/api/disputes' });
      console.log('  后端已启动');
      break;
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  console.log('\n=== Step 2: 导入 01/02/03 主邮件（首次） ===');
  let resp = await request({
    endpoint: '/api/emails/import',
    files: [
      path.join(TEST_DATA_DIR, '01-CD202506001-approval.eml'),
      path.join(TEST_DATA_DIR, '02-CD202506002-approval.eml'),
      path.join(TEST_DATA_DIR, '03-CD202506003-processed.eml')
    ]
  });
  console.log('  summary:', JSON.stringify(resp.summary));
  assertEq('newDisputes', resp.summary.newDisputes, 3);
  assertEq('updatedDisputes', resp.summary.updatedDisputes, 0);
  assertEq('attachments', resp.summary.attachments, 3); // 每封邮件 1 附件
  assertEq('duplicates', resp.summary.duplicates, 0);

  console.log('\n=== Step 3: 给 CD202506001 加项目经理备注 ===');
  let list = await request({ endpoint: '/api/disputes' });
  const cd001 = list.find(d => d.case_no === 'CD202506001');
  const cd002 = list.find(d => d.case_no === 'CD202506002');
  console.log('  list count:', list.length, 'cd001:', !!cd001, 'cd001?.id:', cd001 && cd001.id);
  assertEq('CD202506001 attachment_count (真实关联)', cd001.attachment_count, 1);
  assertEq('CD202506002 attachment_count (真实关联)', cd002.attachment_count, 1);

  const REMARK = '项目经理审核：需与商户确认物流凭证';
  const remarkUrl = `/api/disputes/${cd001.id}/remark`;
  console.log('  PUT URL:', API + remarkUrl);
  const updated = await request({
    method: 'PUT',
    endpoint: remarkUrl,
    json: { remark: REMARK, operator: '项目经理' }
  });
  assertEq('备注已保存', updated.remark, REMARK);

  console.log('\n=== Step 4: 重复导入 01 号邮件（核心测试） ===');
  resp = await request({
    endpoint: '/api/emails/import',
    files: [
      path.join(TEST_DATA_DIR, '01-CD202506001-approval.eml')
    ]
  });
  console.log('  summary:', JSON.stringify(resp.summary));
  console.log('  results:', JSON.stringify(resp.results));
  assertEq('duplicates==1', resp.summary.duplicates, 1);
  assertEq('newDisputes==0', resp.summary.newDisputes, 0);
  assertEq('updatedDisputes==0', resp.summary.updatedDisputes, 0);
  assertEq('attachments==0（不重复加）', resp.summary.attachments, 0);

  list = await request({ endpoint: '/api/disputes' });
  const cd001AfterDup = list.find(d => d.case_no === 'CD202506001');
  assertEq('争议款行数：CD202506001 唯一', list.filter(d => d.case_no === 'CD202506001').length, 1);
  assertEq('CD202506001 附件数不翻倍', cd001AfterDup.attachment_count, 1);
  assertEq('CD202506001 备注不被覆盖', cd001AfterDup.remark, REMARK);

  console.log('\n=== Step 5: 导入 04 号晚到凭证 ===');
  resp = await request({
    endpoint: '/api/emails/import-late',
    files: [
      path.join(TEST_DATA_DIR, '04-CD202506001-late-attachment.eml')
    ]
  });
  console.log('  summary:', JSON.stringify(resp.summary));
  assertEq('updatedDisputes==1', resp.summary.updatedDisputes, 1);
  assertEq('duplicates==0', resp.summary.duplicates, 0);
  assertEq('晚到附件==2', resp.summary.attachments, 2);

  list = await request({ endpoint: '/api/disputes' });
  const cd001Late = list.find(d => d.case_no === 'CD202506001');
  assertEq('CD202506001 总附件数 = 1普通 + 2晚到', cd001Late.attachment_count, 3);
  assertEq('CD202506001 晚到附件数 = 2', cd001Late.late_attachment_count, 2);
  assertEq('备注仍然保留', cd001Late.remark, REMARK);

  console.log('\n=== Step 6: 导入 05 号补充邮件（补税费/汇率给 CD202506002） ===');
  resp = await request({
    endpoint: '/api/emails/import',
    files: [
      path.join(TEST_DATA_DIR, '05-CD202506002-supplement.eml')
    ]
  });
  console.log('  summary:', JSON.stringify(resp.summary));
  assertEq('updatedDisputes==1', resp.summary.updatedDisputes, 1);
  assertEq('duplicates==0', resp.summary.duplicates, 0);
  assertEq('附件数=1', resp.summary.attachments, 1);

  list = await request({ endpoint: '/api/disputes' });
  const cd002Sup = list.find(d => d.case_no === 'CD202506002');
  assertEq('CD202506002 税费从空填入 448', cd002Sup.tax_amount, 448);
  assertEq('CD202506002 汇率从空填入 0.925', cd002Sup.exchange_rate, 0.925);
  assertEq('CD202506002 总附件数 = 1主 + 1补充', cd002Sup.attachment_count, 2);

  console.log('\n=== Step 7: 再次重复导入 04 号晚到凭证（不重复标记） ===');
  resp = await request({
    endpoint: '/api/emails/import-late',
    files: [
      path.join(TEST_DATA_DIR, '04-CD202506001-late-attachment.eml')
    ]
  });
  console.log('  summary:', JSON.stringify(resp.summary));
  assertEq('duplicates==1', resp.summary.duplicates, 1);
  assertEq('updatedDisputes==0', resp.summary.updatedDisputes, 0);
  assertEq('attachments==0（不重复）', resp.summary.attachments, 0);

  list = await request({ endpoint: '/api/disputes' });
  const cd001Final = list.find(d => d.case_no === 'CD202506001');
  assertEq('CD202506001 总附件数还是 3', cd001Final.attachment_count, 3);
  assertEq('CD202506001 晚到附件数还是 2', cd001Final.late_attachment_count, 2);

  console.log('\n=== Step 8: 最终核验（直接查DB） ===');
  console.log('（调用 _check_db.js 输出明细）\n');
  const checkOut = execSync(`${NODE_BIN} ${path.join(BACKEND_DIR, '_check_db.js')}`, { cwd: BACKEND_DIR, encoding: 'utf8' });
  console.log(checkOut);

  console.log('\n=== Step 9: 导出 Excel（不抛异常即通过） ===');
  await new Promise((resolve, reject) => {
    http.get(`${API}/api/export`, (res) => {
      assertEq('导出 200 响应', res.statusCode, 200);
      let len = 0;
      res.on('data', d => (len += d.length));
      res.on('end', () => {
        console.log(`  ✅ 导出文件大小：${len} bytes`);
        resolve();
      });
      res.on('error', reject);
    });
  });

  console.log('\n=== Step 10: 时间线核验 ===');
  const timeline = await request({ endpoint: '/api/timeline' });
  const types = {};
  for (const t of timeline) types[t.event_type] = (types[t.event_type] || 0) + 1;
  console.log('  event_type 统计:', JSON.stringify(types));
  assertEq('remark_update 应=1', types['remark_update'] || 0, 1);
  assertEq('import 应=3', types['import'] || 0, 3);
  assertEq('duplicate_check 应>=2（01重复 + 04重复）', (types['duplicate_check'] || 0) >= 2, true);

  console.log('\n============================================');
  console.log(process.exitCode === 1
    ? '❌ 有断言失败，请查看上方日志'
    : '🎉 端到端流程全部通过！数据一致 ✅');
  console.log('============================================\n');
  server.kill('SIGTERM');
})().catch((e) => {
  console.error('\n❌ 运行中出错:', e.message || e);
  console.error('Stack:', e && e.stack ? e.stack : '(no stack)');
  process.exitCode = 1;
  try { execSync('pkill -f "src/index.js" 2>/dev/null || true'); } catch {}
});
