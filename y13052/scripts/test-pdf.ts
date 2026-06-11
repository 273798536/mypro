import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mockCases } from '../api/store/mockData.js';
import { generateCaseReport, generateAttachmentFile } from '../api/store/fileStore.js';
import type { LateAttachment } from '../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
process.chdir(path.resolve(__dirname, '..'));

const cs = mockCases[0];
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

if (xrefIdx >= 0) {
  const before = buf.slice(Math.max(0, xrefIdx - 20), xrefIdx + 200).toString('latin1');
  console.log('\n--- xref 附近 ---');
  console.log(before);
}

const streamIdx = buf.indexOf(Buffer.from('stream\n'));
if (streamIdx >= 0) {
  const content = buf.slice(streamIdx + 7, streamIdx + 300).toString('latin1');
  console.log('\n--- 第1个stream内容 ---');
  console.log(content.slice(0, 300));
}

const titleIdx = buf.indexOf(Buffer.from('/Title'));
if (titleIdx >= 0) {
  const around = buf.slice(titleIdx - 10, titleIdx + 80).toString('latin1');
  console.log('\n--- Title 附近 ---');
  console.log(around);
}

const fontIdx = buf.indexOf(Buffer.from('/Type0'));
if (fontIdx >= 0) {
  const around = buf.slice(fontIdx - 20, fontIdx + 120).toString('latin1');
  console.log('\n--- Type0 字体 ---');
  console.log(around);
}

const att = cs.attachments[0];
if (att) {
  console.log('\n--- 测试附件PDF生成 ---');
  const attResult = await generateAttachmentFile(cs, att as LateAttachment);
  console.log('附件文件:', attResult.filePath);
  console.log('附件大小:', attResult.fileSize, 'bytes');
  const attBuf = fs.readFileSync(attResult.filePath);
  console.log('附件魔数:', attBuf.slice(0, 8).toString('latin1'));
  console.log('附件含%%EOF:', attBuf.toString('latin1').includes('%%EOF'));
}

console.log('\n✅ 验证完成');
