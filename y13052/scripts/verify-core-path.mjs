#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dataDir = path.join(root, '.data');

const results = [];
async function test(name, fn) {
  try {
    const result = await fn();
    results.push({ name, pass: true, detail: result === true ? '' : String(result) });
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (e) {
    results.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
    process.stdout.write(`  ✗ ${name}\n`);
    process.stdout.write(`    ${e instanceof Error ? e.message : String(e)}\n`);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertEq(a, b, msg) { if (a !== b) throw new Error(`${msg}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); }

const apiBase = 'http://localhost:3001/api';

async function apiCall(method, url, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${apiBase}${url}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function apiBinary(method, url) {
  const res = await fetch(`${apiBase}${url}`, { method });
  const buf = res.ok ? await res.arrayBuffer() : null;
  return { status: res.status, ok: res.ok, headers: res.headers, buffer: buf };
}

async function run() {
  process.stdout.write('\n=== 核心路径验证 ===\n\n');

  process.stdout.write('1. 服务存活检查\n');
  await test('服务启动 /api/health 返回 200', async () => {
    const res = await apiCall('GET', '/health');
    assert(res.ok, '期望 200');
    return true;
  });

  process.stdout.write('\n2. 列表接口\n');
  await test('GET /api/cases 返回≥3条案件', async () => {
    const res = await apiCall('GET', '/cases');
    assert(res.ok, '请求失败');
    assertEq(res.data.code, 0, 'code=0');
    assert(Array.isArray(res.data.data), 'data是数组');
    assert(res.data.data.length >= 3, '期望≥3条');
    return `返回 ${res.data.data.length} 条`;
  });

  process.stdout.write('\n3. 详情接口\n');
  await test('GET /api/cases/case-001 返回完整详情含文件元数据', async () => {
    const res = await apiCall('GET', '/cases/case-001');
    assert(res.ok, '请求失败');
    assertEq(res.data.code, 0, 'code=0');
    const cs = res.data.data;
    assert(cs.id === 'case-001', 'id正确');
    assert(Array.isArray(cs.attachments), '有attachments数组');
    assert(cs.attachments.length >= 1, '至少1个附件');
    const att = cs.attachments[0];
    assert(att.filePath, '附件有filePath');
    assert(att.fileSize > 0, `附件有fileSize ${att.fileSize}`);
    return `附件 ${att.fileName} (${att.fileSize} bytes)`;
  });

  process.stdout.write('\n4. 附件下载接口\n');
  await test('GET /api/cases/case-001/attachments/att-001-1/download 返回PDF', async () => {
    const res = await apiBinary('GET', '/cases/case-001/attachments/att-001-1/download');
    assert(res.ok, `请求失败 HTTP ${res.status}`);
    assert(res.buffer, '有响应体');
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('pdf'), `期望pdf, 实际 ${contentType}`);
    const size = Number(res.headers.get('content-length')) || res.buffer.byteLength;
    assert(size > 100, `文件太小 ${size}`);
    const preview = Buffer.from(res.buffer).slice(0, 8).toString('latin1');
    assert(preview.startsWith('%PDF-1.'), `PDF头无效 ${preview.slice(0, 10)}`);
    return `${res.status === 200} ${size} bytes, PDF头: ${preview.slice(0, 10)}`;
  });

  await test('GET /api/cases/case-002/attachments/att-002-1/download 返回CSV(Excel)', async () => {
    const res = await apiBinary('GET', '/cases/case-002/attachments/att-002-1/download');
    assert(res.ok, `请求失败 HTTP ${res.status}`);
    assert(res.buffer, '有响应体');
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('csv'), `期望csv, 实际 ${contentType}`);
    const size = Number(res.headers.get('content-length')) || res.buffer.byteLength;
    assert(size > 10, `文件太小 ${size}`);
    const preview = Buffer.from(res.buffer).slice(0, 3);
    const hasBom = preview[0] === 0xef && preview[1] === 0xbb && preview[2] === 0xbf;
    assert(hasBom, 'CSV UTF-8 BOM 缺失');
    return `${res.status === 200} ${size} bytes, UTF-8 BOM`;
  });

  await test('GET /api/cases/case-001/attachments/invalid-id/download 返回404', async () => {
    const res = await apiBinary('GET', '/cases/case-001/attachments/invalid-id/download');
    assert(!res.ok, '期望失败');
    assert(res.status === 404, `期望404, 实际 ${res.status}`);
    return true;
  });

  process.stdout.write('\n5. 复核报告导出接口\n');
  await test('GET /api/cases/case-001/export?format=pdf 导出PDF报告', async () => {
    const res = await apiBinary('GET', '/cases/case-001/export?format=pdf');
    assert(res.ok, `请求失败 HTTP ${res.status}`);
    assert(res.buffer, '有响应体');
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('pdf'), `期望pdf, 实际 ${contentType}`);
    const size = Number(res.headers.get('content-length')) || res.buffer.byteLength;
    assert(size > 500, `文件太小 ${size}`);
    const preview = Buffer.from(res.buffer).slice(0, 8).toString('latin1');
    assert(preview.startsWith('%PDF-1.'), `PDF头无效 ${preview.slice(0, 10)}`);
    return `${res.status === 200} ${size} bytes`;
  });

  await test('GET /api/cases/case-001/export?format=csv 导出CSV数据', async () => {
    const res = await apiBinary('GET', '/cases/case-001/export?format=csv');
    assert(res.ok, `请求失败 HTTP ${res.status}`);
    assert(res.buffer, '有响应体');
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('csv'), `期望csv, 实际 ${contentType}`);
    const size = Number(res.headers.get('content-length')) || res.buffer.byteLength;
    assert(size > 100, `文件太小 ${size}`);
    const preview = Buffer.from(res.buffer).slice(0, 3);
    const hasBom = preview[0] === 0xef && preview[1] === 0xbb && preview[2] === 0xbf;
    assert(hasBom, 'CSV UTF-8 BOM 缺失');
    return `${res.status === 200} ${size} bytes, UTF-8 BOM`;
  });

  await test('GET /api/cases/case-001/export?format=html 导出HTML报告（中文验证）', async () => {
    const res = await apiBinary('GET', '/cases/case-001/export?format=html');
    assert(res.ok, `请求失败 HTTP ${res.status}`);
    assert(res.buffer, '有响应体');
    const contentType = res.headers.get('content-type') || '';
    assert(contentType.includes('html'), `期望html, 实际 ${contentType}`);
    const size = Number(res.headers.get('content-length')) || res.buffer.byteLength;
    assert(size > 1000, `文件太小 ${size}`);
    const html = Buffer.from(res.buffer).toString('utf-8');
    assert(html.includes('<!DOCTYPE html>'), '缺少DOCTYPE');
    assert(html.includes('滨海步道风场碰撞预审'), '缺少中文标题');
    assert(html.includes('复核报告'), '缺少复核报告字样');
    assert(html.includes('BH-2024-001'), '缺少案件编号');
    assert(html.includes('时间轴'), '缺少时间轴区块');
    assert(html.includes('巡检照片'), '缺少照片区块');
    assert(html.includes('碰撞对象'), '缺少对象区块');
    assert(html.includes('晚到附件'), '缺少附件区块');
    return `${res.status === 200} ${size} bytes, 中文正确`;
  });

  await test('GET /api/cases/case-001/export?format=invalid 返回400', async () => {
    const res = await apiBinary('GET', '/cases/case-001/export?format=invalid');
    assert(!res.ok, '期望失败');
    assert(res.status === 400, `期望400, 实际 ${res.status}`);
    return true;
  });

  process.stdout.write('\n6. 磁盘文件生成验证\n');
  await test('.data/files/case-001 目录存在且有文件', () => {
    const dir = path.join(dataDir, 'files/case-001');
    assert(fs.existsSync(dir), `目录不存在 ${dir}`);
    const files = fs.readdirSync(dir);
    assert(files.length >= 1, '至少1个文件');
    return `包含 ${files.length} 个文件: ${files.join(', ')}`;
  });

  await test('.data/files/case-002 目录存在且有文件', () => {
    const dir = path.join(dataDir, 'files/case-002');
    assert(fs.existsSync(dir), `目录不存在 ${dir}`);
    const files = fs.readdirSync(dir);
    assert(files.length >= 1, '至少1个文件');
    return `包含 ${files.length} 个文件: ${files.join(', ')}`;
  });

  await test('生成的PDF文件含合法PDF头和%%EOF', () => {
    const files = fs.readdirSync(path.join(dataDir, 'files/case-001')).filter((f) => f.endsWith('.pdf'));
    assert(files.length > 0, '无PDF文件');
    const filePath = path.join(dataDir, 'files/case-001', files[0]);
    const content = fs.readFileSync(filePath, 'latin1');
    assert(content.startsWith('%PDF-1.'), 'PDF头无效');
    assert(content.includes('%%EOF'), '缺少%%EOF');
    const size = fs.statSync(filePath).size;
    return `${files[0]}: ${size} bytes, 含合法PDF头和%%EOF`;
  });

  await test('生成的CSV文件含UTF-8 BOM', () => {
    const files = fs.readdirSync(path.join(dataDir, 'files/case-002')).filter((f) => f.endsWith('.csv'));
    assert(files.length > 0, '无CSV文件');
    const filePath = path.join(dataDir, 'files/case-002', files[0]);
    const buf = fs.readFileSync(filePath);
    assert(buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf, 'UTF-8 BOM缺失');
    const size = fs.statSync(filePath).size;
    return `${files[0]}: ${size} bytes`;
  });

  process.stdout.write('\n7. 补录生成新附件真实文件\n');
  await test('POST /api/cases/case-003/supplement 生成新附件文件', async () => {
    const res = await apiCall('POST', '/cases/case-003/supplement', {
      operator: '测试员',
      reason: '测试补录附件',
      extraAttachments: [
        { fileName: '测试附件.pdf', fileType: 'pdf', description: '测试描述' }
      ],
      linkedAttachmentIds: []
    });
    assert(res.ok, '请求失败');
    assertEq(res.data.code, 0, 'code=0');
    const updated = res.data.data.updatedCase;
    const newAtt = updated.attachments[updated.attachments.length - 1];
    assert(newAtt.filePath && newAtt.fileSize > 0, '新附件 filePath 和 fileSize 已回填');
    assert(fs.existsSync(newAtt.filePath), `文件真实存在于磁盘 ${newAtt.filePath}`);
    const content = fs.readFileSync(newAtt.filePath, 'latin1');
    assert(content.startsWith('%PDF-1.'), 'PDF头有效');
    return `新附件 ${newAtt.fileName} 已生成: ${newAtt.fileSize} bytes`;
  });

  process.stdout.write('\n8. 改判四端同步验证\n');
  await test('PUT /api/cases/case-001 改判后 attachments[0].linkedToConclusion=true', async () => {
    const beforeRes = await apiCall('GET', '/cases/case-001');
    const before = beforeRes.data.data;
    const attId = before.attachments[0].id;
    const res = await apiCall('PUT', '/cases/case-001', {
      toStatus: 'approved',
      reason: '测试通过',
      operator: '测试员',
      linkedPhotos: [],
      linkedObjects: [],
      linkedAttachmentIds: [attId],
      abnormalNote: '测试异常说明'
    });
    assert(res.ok, '请求失败');
    const afterRes = await apiCall('GET', '/cases/case-001');
    const after = afterRes.data.data;
    const att = after.attachments.find((a) => a.id === attId);
    assert(att.linkedToConclusion === true, 'linkedToConclusion 未更新');
    assert(att.conclusionId, 'conclusionId 未设置');
    return `附件 ${attId} → 已关联结论 ${att.conclusionId}`;
  });

  await test('历史记录 abnormalNote 和 linkedAttachmentIds 已写入', async () => {
    const res = await apiCall('GET', '/history');
    const history = res.data.data;
    const latest = history[0];
    assert(latest.linkedAttachmentIds && latest.linkedAttachmentIds.length > 0, '历史记录linkedAttachmentIds未写入');
    assertEq(latest.abnormalNote, '测试异常说明', 'abnormalNote不一致');
    return `最新历史记录: abnormalNote="${latest.abnormalNote}", linked=${JSON.stringify(latest.linkedAttachmentIds)}`;
  });

  process.stdout.write('\n9. 磁盘持久化验证\n');
  await test('.data/cases.json 包含更新后的数据', () => {
    const content = fs.readFileSync(path.join(dataDir, 'cases.json'), 'utf-8');
    const cases = JSON.parse(content);
    const case1 = cases.find((c) => c.id === 'case-001');
    const att = case1.attachments.find((a) => a.id === 'att-001-1');
    assert(att.linkedToConclusion === true, '磁盘中linkedToConclusion=true');
    assert(att.filePath && att.fileSize > 0, '磁盘中有filePath/fileSize');
    assert(fs.existsSync(att.filePath), `磁盘文件存在 ${att.filePath}`);
    return `磁盘数据一致: ${att.fileName} → ${att.filePath}`;
  });

  process.stdout.write('\n=== 验证结果 ===\n');
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  process.stdout.write(`\n通过: ${passed}/${results.length}\n`);
  if (failed > 0) {
    process.stdout.write(`失败: ${failed}/${results.length}\n`);
    for (const r of results.filter((r) => !r.pass)) {
      process.stdout.write(`  ✗ ${r.name}: ${r.detail}\n`);
    }
    process.exit(1);
  } else {
    process.stdout.write(`\n✅ 全部 ${passed} 项验证通过\n`);
    process.exit(0);
  }
}

run().catch((e) => {
  console.error('验证脚本异常:', e);
  process.exit(1);
});
