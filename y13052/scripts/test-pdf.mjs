import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.chdir(path.resolve(__dirname, '..'));

const { default: mockData } = await import('./api/store/mockData.js');
const { generateCaseReport } = await import('./api/store/fileStore.js');

const cs = mockData.mockCases[0];
console.log('测试案件:', cs.caseNumber);
console.log('碰撞摘要:', cs.collisionSummary);

const result = await generateCaseReport(cs, 'pdf');
console.log('\n生成文件:', result.filePath);
console.log('文件大小:', result.fileSize, 'bytes');

const buf = fs.readFileSync(result.filePath);
console.log('魔数前8字节:', buf.slice(0, 8).toString('hex'));
console.log('魔数前8字节(ascii):', buf.slice(0, 8).toString('latin1'));

const hasEof = buf.toString('latin1').includes('%%EOF');
console.log('包含%%EOF:', hasEof);

const tail = buf.slice(-40).toString('latin1');
console.log('尾部40字符:', JSON.stringify(tail));

const xrefIdx = buf.toString('latin1').indexOf('xref');
console.log('xref位置:', xrefIdx);

console.log('\n--- xref 前后内容 ---');
if (xrefIdx >= 0) {
  const before = buf.slice(Math.max(0, xrefIdx - 20), xrefIdx + 100).toString('latin1');
  console.log(before);
}

console.log('\n--- 第1个stream内容(前200字节) ---');
const streamIdx = buf.indexOf('stream\n');
if (streamIdx >= 0) {
  const content = buf.slice(streamIdx + 7, streamIdx + 200).toString('latin1');
  console.log(content.slice(0, 200));
}

console.log('\n--- 标题对象 ---');
const titleIdx = buf.indexOf('/Title');
if (titleIdx >= 0) {
  const around = buf.slice(titleIdx - 10, titleIdx + 80).toString('latin1');
  console.log(around);
}

console.log('\n验证完成');
