// 简单复刻核心逻辑的自测脚本
const PATTERNS = [
  { regex: /(\d{4})[.\-\/年](\d{1,2})[.\-\/月](\d{1,2})日?/, handler: (m) => {
    const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { normalized: null, raw: m[0], formatUnclear: true, isPartial: false };
    const pad = (n) => String(n).padStart(2, '0');
    return { normalized: `${y}-${pad(mo)}-${pad(d)}`, raw: m[0], formatUnclear: false, isPartial: false };
  } },
  { regex: /(\d{1,2})[月\-\/](\d{1,2})日?/, handler: (m) => {
    const mo = parseInt(m[1], 10), d = parseInt(m[2], 10);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { normalized: null, raw: m[0], formatUnclear: true, isPartial: true };
    const pad = (n) => String(n).padStart(2, '0');
    return { normalized: `${new Date().getFullYear()}-${pad(mo)}-${pad(d)}`, raw: m[0], formatUnclear: true, isPartial: true };
  } },
  { regex: /(\d{4})(\d{2})(\d{2})/, handler: (m) => {
    const y = parseInt(m[1], 10), mo = parseInt(m[2], 10), d = parseInt(m[3], 10);
    if (y < 1970 || y > 2100 || mo < 1 || mo > 12 || d < 1 || d > 31) return { normalized: null, raw: m[0], formatUnclear: true, isPartial: false };
    const pad = (n) => String(n).padStart(2, '0');
    return { normalized: `${y}-${pad(mo)}-${pad(d)}`, raw: m[0], formatUnclear: false, isPartial: false };
  } },
];

const DATE_HINT_CHARS = /[.\-\/年月日]/;
const DATE_HINT_WORDS = /(到期|截止|期限|有效期|前|之前|为止|结束)/;

function looksLikeDateField(text) {
  if (!text || !text.trim()) return false;
  const t = text.trim();
  if (t.length < 5) return false;
  if (/^\d+$/.test(t) && t.length >= 6 && t.length <= 8) return true;
  if (DATE_HINT_WORDS.test(t)) return true;
  const hasDigit = /\d/.test(t);
  const hasDateChar = DATE_HINT_CHARS.test(t);
  if (hasDigit && hasDateChar) return true;
  return false;
}

function parseDate(text) {
  if (!text || !text.trim()) return null;
  for (const p of PATTERNS) {
    const m = text.match(p.regex);
    if (m) return p.handler(m);
  }
  return null;
}

function parseDateOrInvalid(text) {
  const t = (text ?? '').trim();
  if (!t) return null;
  const parsed = parseDate(t);
  if (parsed) return parsed;
  if (looksLikeDateField(t)) return { normalized: null, raw: t, formatUnclear: true, isPartial: false };
  return null;
}

function isEmpty(s) { return s == null || String(s).trim().length === 0; }
function splitFields(line) { return line.split(/\t|\s{2,}|[|｜]/).map(s => s.trim()).filter(s => s.length > 0); }

// 构造解析：模拟童话 光良 2024.abc
function testSingleLine(line) {
  const parts = splitFields(line);
  const issues = [];
  let songName = '', artist = '', authDeadline = null, authDeadlineRaw = null;
  let consumedParts = 0;

  if (parts.length >= 1) { songName = parts[0]; consumedParts = 1; }
  if (parts.length >= 2) {
    const part2 = parts[1];
    const looksLikeDate = looksLikeDateField(part2);
    if (looksLikeDate) {
      const maybeDate = parseDateOrInvalid(part2);
      if (maybeDate) {
        authDeadline = maybeDate.normalized;
        authDeadlineRaw = maybeDate.raw;
        if (maybeDate.formatUnclear || !maybeDate.normalized) {
          issues.push({
            type: 'date_format_unclear',
            severity: maybeDate.normalized ? 'warning' : 'error',
            message: maybeDate.normalized
              ? `授权日期格式不规范，原始值"${maybeDate.raw}"已自动规范化为"${maybeDate.normalized}"`
              : `授权日期格式不规范/非法（原始值"${maybeDate.raw}"），无法解析为有效日期，请人工确认`,
          });
        }
        consumedParts = 2;
      } else { artist = part2; consumedParts = 2; }
    } else { artist = part2; consumedParts = 2; }
  }
  if (parts.length >= 3 && consumedParts === 2) {
    const part3 = parts[2];
    const maybeDate = parseDateOrInvalid(part3);
    if (maybeDate) {
      authDeadline = maybeDate.normalized;
      authDeadlineRaw = maybeDate.raw;
      if (maybeDate.formatUnclear || !maybeDate.normalized) {
        issues.push({
          type: 'date_format_unclear',
          severity: maybeDate.normalized ? 'warning' : 'error',
          message: maybeDate.normalized
            ? `授权日期格式不规范，原始值"${maybeDate.raw}"已自动规范化为"${maybeDate.normalized}"`
            : `授权日期格式不规范/非法（原始值"${maybeDate.raw}"），无法解析为有效日期，请人工确认`,
        });
      }
      consumedParts = 3;
    } else if (looksLikeDateField(part3)) {
      authDeadlineRaw = part3;
      issues.push({
        type: 'date_format_unclear',
        severity: 'error',
        message: `第3字段"${part3}"疑似授权日期但格式无法识别，请人工确认`,
      });
      consumedParts = 3;
    }
  }
  // missing_field
  if (!authDeadline && isEmpty(authDeadlineRaw)) {
    issues.push({ type: 'missing_field', severity: 'warning', message: '缺少授权期限字段' });
  } else if (!authDeadline && !isEmpty(authDeadlineRaw)) {
    if (!issues.some(i => i.message.includes('日期') || i.type === 'date_format_unclear')) {
      issues.push({ type: 'missing_field', severity: 'error', message: `提供了授权期限原始值"${authDeadlineRaw}"但无法解析` });
    }
  }
  return { songName, artist, authDeadline, authDeadlineRaw, issues };
}

console.log('\n========== 单元测试 ==========\n');

console.log('Test 1: looksLikeDateField 判定');
const cases1 = [
  ['2024.abc', true],
  ['2024.12.31', true],
  ['2024/12/20', true],
  ['光良', false],
  ['12月25日', true],
  ['20241231', true],
  ['周杰伦', false],
  ['2024.invalid.row', true],
  ['abcdef', false],
];
for (const [text, expected] of cases1) {
  const actual = looksLikeDateField(text);
  const pass = actual === expected;
  console.log(`  ${pass ? '✅' : '❌'} "${text}" → ${actual} (预期 ${expected})`);
}

console.log('\nTest 2: parseDateOrInvalid 对非法日期');
const cases2 = [
  { input: '2024.abc', expectRaw: '2024.abc', expectNorm: null, expectUnclear: true },
  { input: '2024.12.31', expectRaw: '2024.12.31', expectNorm: '2024-12-31', expectUnclear: false },
  { input: '12月25日', expectNormNotNull: true, expectUnclear: true },
  { input: '光良', expectNull: true },
];
for (const c of cases2) {
  const r = parseDateOrInvalid(c.input);
  let pass = true;
  if (c.expectNull && r !== null) pass = false;
  if (r) {
    if (c.expectRaw && r.raw !== c.expectRaw) pass = false;
    if (c.expectNorm !== undefined && r.normalized !== c.expectNorm) pass = false;
    if (c.expectNormNotNull && r.normalized === null) pass = false;
    if (c.expectUnclear !== undefined && r.formatUnclear !== c.expectUnclear) pass = false;
  }
  console.log(`  ${pass ? '✅' : '❌'} "${c.input}" → raw=${r?.raw} norm=${r?.normalized} unclear=${r?.formatUnclear}`);
}

console.log('\nTest 3: 解析 "童话    光良  2024.abc  非法日期格式"');
const r3 = testSingleLine('童话    光良  2024.abc  非法日期格式');
console.log(`  songName="${r3.songName}" artist="${r3.artist}"`);
console.log(`  authDeadline=${r3.authDeadline}, authDeadlineRaw="${r3.authDeadlineRaw}"`);
console.log(`  issues(${r3.issues.length}):`);
for (const iss of r3.issues) console.log(`    - [${iss.severity}] ${iss.type}: ${iss.message}`);
const pass3 = r3.songName === '童话' && r3.artist === '光良'
  && r3.authDeadline === null && r3.authDeadlineRaw === '2024.abc'
  && r3.issues.some(i => i.severity === 'error' && i.type === 'date_format_unclear');
console.log(`  结果: ${pass3 ? '✅ 符合预期（含 error 级日期非法问题）' : '❌ 失败'}`);

console.log('\nTest 4: 解析 "稻香    周杰伦"（缺授权期限）');
const r4 = testSingleLine('稻香    周杰伦');
console.log(`  songName="${r4.songName}" artist="${r4.artist}" authDeadline=${r4.authDeadline}`);
const missingAuth = r4.issues.find(i => i.type === 'missing_field' && i.message.includes('授权'));
console.log(`  missing_field(授权期): ${missingAuth ? '✅ ' + missingAuth.message : '❌ 未找到'}`);
console.log(`  所有 issues:`, r4.issues.map(i => `${i.severity}/${i.type}`));

console.log('\nTest 5: 解析 "  2024.invalid.row  完全无效行测试"（完全无效行）');
const r5 = testSingleLine('  2024.invalid.row  完全无效行测试');
console.log(`  songName="${r5.songName}" artist="${r5.artist}" authDeadline=${r5.authDeadline}`);
console.log(`  issues:`, r5.issues.map(i => `${i.severity}/${i.type}: ${i.message}`));
const allEmpty = isEmpty(r5.songName) && isEmpty(r5.artist) && !r5.authDeadline && isEmpty(r5.authDeadlineRaw);
console.log(`  判定为 fields=null（失败）: ${allEmpty ? '✅ YES' : '❌ NO'}`);

console.log('\nTest 6: 解析 "年少有为    2025.08.08  缺少艺人字段"（艺人字段被日期替代）');
const r6 = testSingleLine('年少有为    2025.08.08  缺少艺人字段');
console.log(`  songName="${r6.songName}" artist="${r6.artist}" authDeadline=${r6.authDeadline}`);
console.log(`  issues:`, r6.issues.map(i => `${i.severity}/${i.type}: ${i.message}`));
const missingArtist = r6.issues.find(i => i.message.includes('艺') || (i.type === 'missing_field' && r6.artist === ''));
// 注意：由于字段2看起来像日期被解析为授权期，所以 artist 确实保持为空 → 有 missing_field(artist)
// 但我们的简化脚本没加 artist 的 missing_field 检查
console.log(`  (说明：此处简化脚本未加 artist missing_field 逻辑；真实代码在 textParser.ts:184-186 有此逻辑)`);

console.log('\n========== 自测完成 ==========\n');
