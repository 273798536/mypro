import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';

const samplesDir = path.join(process.cwd(), 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

const data = [
  {
    '批次号': 'B20260601',
    '月台号': 'A01',
    '车牌号': '京A12345',
    '草图': 'sketch_001.png',
    '来源': '航拍剪辑',
    '评分': 85,
    '评分说明': '装载规范',
    '评分人': '张工',
  },
  {
    '批次号': 'B20260601',
    '月台号': 'A02',
    '车牌号': '沪B67890',
    '草图': 'sketch_002.png',
    '来源': '离线标注工具',
    '评分': 72,
    '评分说明': '基本规范',
    '评分人': '李工',
  },
  {
    '批次号': 'B20260601',
    '月台号': 'B01',
    '车牌号': '粤C11111',
    '草图': '',
    '来源': '现场采集',
    '评分': 90,
    '评分说明': '装载优秀',
    '评分人': '王工',
  },
  {
    '批次号': 'B20260602',
    '月台号': 'B02',
    '车牌号': '苏D22222',
    '草图': 'sketch_004.png',
    '来源': '历史数据补录',
    '评分': 58,
    '评分说明': '需要改进',
    '评分人': '张工',
  },
  {
    '批次号': 'B20260602',
    '月台号': 'C01',
    '车牌号': '浙E33333',
    '草图': 'sketch_005.png',
    '来源': '航拍剪辑',
    '评分': 78,
    '评分说明': '基本规范',
    '评分人': '李工',
  },
  {
    '批次号': 'B20260602',
    '月台号': 'A01',
    '车牌号': '京A12345',
    '草图': 'sketch_006.png',
    '来源': '离线标注工具',
    '评分': 88,
    '评分说明': '装载规范',
    '评分人': '王工',
  },
];

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(data);
XLSX.utils.book_append_sheet(wb, ws, '装载草图');

const outputPath = path.join(samplesDir, '装载草图样例.xlsx');
XLSX.writeFile(wb, outputPath);

console.log(`样例文件已生成：${outputPath}`);
console.log(`共 ${data.length} 条记录`);
