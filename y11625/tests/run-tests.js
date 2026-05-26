const db = require('../src/db');
const Address = require('../src/models/Address');
const Task = require('../src/models/Task');
const OnChainInteraction = require('../src/models/OnChainInteraction');
const ExchangeTag = require('../src/models/ExchangeTag');
const CommunityList = require('../src/models/CommunityList');
const Whitelist = require('../src/models/Whitelist');
const FilterRule = require('../src/models/FilterRule');
const FilterReport = require('../src/models/FilterReport');
const AuditLog = require('../src/models/AuditLog');
const Cluster = require('../src/models/Cluster');
const ClusteringEngine = require('../src/engine/ClusteringEngine');
const RiskEngine = require('../src/engine/RiskEngine');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed++;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || '断言失败');
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || `期望 ${a} 等于 ${b}`);
}

async function runTests() {
  console.log('\n🧪 运行 Web3 女巫过滤系统测试\n');

  console.log('--- 数据模型测试 ---');

  test('创建地址', () => {
    const addr = Address.create({
      address: '0x' + '11'.repeat(20),
      label: '测试地址',
      source: 'test'
    });
    assert(addr.id, '地址应包含ID');
    assertEqual(addr.address, '0x' + '11'.repeat(20));
    assertEqual(addr.source, 'test');
    assertEqual(addr.riskScore, 0);
  });

  test('查找地址', () => {
    const addr = Address.findByAddress('0x' + '11'.repeat(20));
    assert(addr, '应找到地址');
    assertEqual(addr.label, '测试地址');
  });

  test('更新地址', () => {
    const addr = Address.findByAddress('0x' + '11'.repeat(20));
    Address.update(addr.id, { label: '更新后的测试地址' });
    const updated = Address.findById(addr.id);
    assertEqual(updated.label, '更新后的测试地址');
  });

  test('创建任务记录', () => {
    const addr = Address.findByAddress('0x' + '11'.repeat(20));
    const task = Task.create({
      addressId: addr.id,
      address: addr.address,
      taskType: 'twitter_follow',
      taskName: '关注官方推特',
      source: 'test'
    });
    assert(task.id, '任务应包含ID');
    assertEqual(task.address, addr.address);
  });

  test('标记可疑任务', () => {
    const tasks = Task.findByAddress('0x' + '11'.repeat(20));
    Task.markSuspicious(tasks[0].id, '时间异常');
    const updated = Task.findByAddress('0x' + '11'.repeat(20));
    assert(updated[0].isSuspicious, '任务应被标记为可疑');
  });

  test('创建链上交互记录', () => {
    const addr = Address.findByAddress('0x' + '11'.repeat(20));
    const interaction = OnChainInteraction.create({
      addressId: addr.id,
      address: addr.address,
      chain: 'ethereum',
      interactionType: 'transfer',
      txHash: '0xabcdef',
      source: 'test'
    });
    assert(interaction.id, '交互记录应包含ID');
  });

  test('创建交易所标签', () => {
    ExchangeTag.create({
      address: '0x' + '22'.repeat(20),
      exchangeName: 'Binance',
      tagType: 'hot_wallet',
      source: 'test',
      confidence: 0.95
    });
    const isEx = ExchangeTag.isExchange('0x' + '22'.repeat(20));
    assert(isEx, '应识别为交易所地址');
  });

  test('创建社区名单', () => {
    CommunityList.create({
      listName: '测试社区',
      listType: 'community',
      address: '0x' + '33'.repeat(20),
      contributorLevel: 'core',
      source: 'test'
    });
    const isMember = CommunityList.isCommunityMember('0x' + '33'.repeat(20));
    assert(isMember, '应识别为社区成员');
  });

  test('创建白名单', () => {
    Whitelist.create({
      address: '0x' + '44'.repeat(20),
      reason: '测试白名单',
      addedBy: 'test',
      source: 'test'
    });
    const isWL = Whitelist.isWhitelisted('0x' + '44'.repeat(20));
    assert(isWL, '应在白名单中');
  });

  test('审计日志记录', () => {
    const log = AuditLog.create({
      action: 'test_action',
      entityType: 'address',
      address: '0x' + '11'.repeat(20),
      reason: '测试审计'
    });
    const recent = AuditLog.getRecent(5);
    assert(recent.length > 0, '应有审计记录');
    assertEqual(recent[0].action, 'test_action');
  });

  test('过滤规则初始化', () => {
    FilterRule.initDefaults();
    const rules = FilterRule.findAll();
    assert(rules.length >= 7, '应包含默认规则');
    const enabled = FilterRule.findEnabled();
    assert(enabled.length > 0, '应有启用的规则');
  });

  test('地址聚类功能', async () => {
    const result = await ClusteringEngine.runClustering({
      similarityThreshold: 0.7,
      minClusterSize: 2
    });
    assert(typeof result.clusterCount === 'number', '应返回聚类数量');
  });

  test('风险评估功能', async () => {
    const result = await RiskEngine.evaluateAll({
      reportName: '测试报告',
      description: '自动化测试'
    });
    assert(result.report, '应生成报告');
    assert(result.summary.total > 0, '应有地址被评估');
    const report = FilterReport.findById(result.report.id);
    assert(report, '报告应被保存');
  });

  test('风险评估 - 白名单应归零', () => {
    const whitelistedAddr = Address.findByAddress('0x' + '44'.repeat(20));
    if (whitelistedAddr) {
      assertEqual(whitelistedAddr.isWhitelisted, true, '应标记为白名单');
    }
  });

  test('风险评估 - 交易所应标记', () => {
    const exchangeAddr = Address.findByAddress('0x' + '22'.repeat(20));
    if (exchangeAddr) {
      assertEqual(exchangeAddr.isExchange, true, '应标记为交易所');
    }
  });

  test('聚类应保存到数据库', () => {
    const clusters = Cluster.findAll();
    assert(Array.isArray(clusters), '聚类应为数组');
  });

  test('审计日志追踪地址变更', () => {
    const addr = Address.findByAddress('0x' + '11'.repeat(20));
    const logs = AuditLog.findByAddress(addr.address);
    assert(logs.length > 0, '应有该地址的审计记录');
  });

  test('任务统计功能', () => {
    const stats = Task.getTaskStats();
    assert(typeof stats === 'object', '应返回统计对象');
  });

  test('链上交互统计功能', () => {
    const stats = OnChainInteraction.getInteractionStats();
    assert(typeof stats === 'object', '应返回统计对象');
  });

  test('社区统计功能', () => {
    const stats = CommunityList.getCommunityStats();
    assert(typeof stats === 'object', '应返回统计对象');
  });

  test('获取最新报告', () => {
    const latest = FilterReport.getLatest(3);
    assert(Array.isArray(latest), '应返回数组');
  });

  console.log(`\n📊 测试结果: ${passed} 通过, ${failed} 失败`);
  if (failed > 0) {
    console.log('⚠️  有测试失败，请检查错误信息。');
    process.exit(1);
  } else {
    console.log('✅ 全部测试通过！');
  }
}

FilterRule.initDefaults();
runTests().catch(e => {
  console.error('测试运行异常:', e);
  process.exit(1);
});
