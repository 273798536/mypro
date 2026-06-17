const { initDatabase, getDb } = require('./db');
const { importBatch } = require('./services');
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const samplesDir = path.join(__dirname, '..', 'data', 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

initDatabase();
const db = getDb();

const defaultRules = [
  { rule_name: '违禁词-涉政', rule_pattern: '(违禁|敏感词示例)', rule_type: 'political', description: '涉政类违禁词检测' },
  { rule_name: '违规广告', rule_pattern: '(加微信|私聊我|代刷|刷单)', rule_type: 'advertising', description: '违规广告检测' },
  { rule_name: '低俗内容', rule_pattern: '(低俗|色情)', rule_type: 'porn', description: '低俗色情内容检测' },
  { rule_name: '暴力内容', rule_pattern: '(暴力|打砸|恐怖)', rule_type: 'violence', description: '暴力恐怖内容检测' },
  { rule_name: '诈骗信息', rule_pattern: '(中奖|领奖|汇款|转账.*密码)', rule_type: 'fraud', description: '诈骗类信息检测' }
];

const ruleCount = db.prepare('SELECT COUNT(*) as cnt FROM sensitive_rules').get().cnt;
if (ruleCount === 0) {
  const insertRule = db.prepare('INSERT INTO sensitive_rules (rule_name, rule_pattern, rule_type, description) VALUES (?, ?, ?, ?)');
  for (const rule of defaultRules) {
    insertRule.run(rule.rule_name, rule.rule_pattern, rule.rule_type, rule.description);
  }
  console.log('✓ 已插入默认规则');
}

const sampleData = {
  normal: [
    { content: '今天天气真不错，适合出去散步', expected_result: 'pass', note: '日常闲聊' },
    { content: '这本书的第三章讲的非常详细，值得一读', expected_result: 'pass', note: '学习讨论' },
    { content: '请问这个功能怎么使用，有没有教程可以参考', expected_result: 'pass', note: '正常提问' },
    { content: '感谢您的帮助，问题已经解决了', expected_result: 'pass', note: '礼貌用语' },
    { content: '周末一起去公园拍照吧', expected_result: 'pass', note: '正常邀约' }
  ],
  boundary: [
    { content: '这个产品真的秒杀同类，效果好到加微信了解更多', expected_result: 'block', note: '包含违规词但是部分正常内容' },
    { content: '那个电影场面有点暴力，但整体是部好片', expected_result: 'pass', note: '讨论电影内容' },
    { content: '听说有人刷单赚了钱，不知道是不是真的', expected_result: 'block', note: '提及违规行为' },
    { content: '这首歌歌词有点低俗，但是旋律很好听', expected_result: 'pass', note: '音乐评论' },
    { content: '这条消息是中奖通知，请点击链接领奖', expected_result: 'block', note: '疑似诈骗' }
  ],
  bad: [
    { content: '加微信xxxxx，私聊我发你资源', expected_result: 'block', note: '明确违规广告' },
    { content: '专业代刷业务，信誉保证，加微信联系', expected_result: 'block', note: '违规刷单广告' },
    { content: '汇款到这个账户，密码告诉你操作方法', expected_result: 'block', note: '诈骗信息' },
    { content: '教你怎么打砸闹事不被发现', expected_result: 'block', note: '暴力内容' },
    { content: '这里有低俗内容视频，加微信获取', expected_result: 'block', note: '低俗内容' }
  ]
};

const samples = [];
let idx = 1;
for (const [type, list] of Object.entries(sampleData)) {
  for (const item of list) {
    samples.push({
      sample_id: `SAMPLE-DEMO-${String(idx).padStart(3, '0')}`,
      content: item.content,
      sample_type: type,
      expected_result: item.expected_result,
      note: item.note
    });
    idx++;
  }
}

const csvContent = Papa.unparse(samples);
const csvPath = path.join(samplesDir, 'demo-samples.csv');
fs.writeFileSync(csvPath, csvContent, 'utf-8');
console.log(`✓ 示例 CSV 已保存到: ${csvPath}`);

const result = importBatch({
  batch_id: 'BATCH-DEMO-001',
  batch_name: '演示样本 - 首次导入',
  description: '演示用的三类样本集合，包含正常、边界和坏样本',
  source: 'seed-script',
  samples
});

console.log(`
=========================================
  示例数据导入完成
=========================================
  批次ID: BATCH-DEMO-001
  样本总数: ${result.total}
  新增: ${result.inserted}
  更新: ${result.updated}
  跳过: ${result.skipped}
=========================================
  示例数据位置:
  - 数据库: data/sensitive_word.db
  - CSV样本: data/samples/demo-samples.csv
=========================================
`);

const batchCount = db.prepare('SELECT COUNT(*) as cnt FROM sample_batches').get().cnt;
const sampleCount = db.prepare('SELECT COUNT(*) as cnt FROM test_samples').get().cnt;
console.log(`数据库状态: ${batchCount} 个批次, ${sampleCount} 个样本`);
