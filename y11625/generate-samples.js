const db = require('./src/db');
const Address = require('./src/models/Address');
const Task = require('./src/models/Task');
const OnChainInteraction = require('./src/models/OnChainInteraction');
const ExchangeTag = require('./src/models/ExchangeTag');
const CommunityList = require('./src/models/CommunityList');
const Whitelist = require('./src/models/Whitelist');
const FilterRule = require('./src/models/FilterRule');
const AuditLog = require('./src/models/AuditLog');

const dataDir = require('path').join(process.cwd(), 'data');

const fs = require('fs');
if (fs.existsSync(dataDir + '/sybil-db.json')) {
  fs.unlinkSync(dataDir + '/sybil-db.json');
}

delete require.cache[require.resolve('./src/db')];
const freshDb = require('./src/db');

function randomHex(len) {
  return Math.random().toString(16).substr(2, len);
}

function randomAddress() {
  return '0x' + randomHex(40);
}

function randomTime() {
  const now = Date.now();
  const past = now - (30 * 24 * 60 * 60 * 1000);
  return new Date(past + Math.random() * (now - past)).toISOString();
}

function generateSampleData() {
  console.log('正在生成示例数据...\n');

  const normalAddresses = [];
  for (let i = 0; i < 8; i++) {
    const addr = randomAddress();
    Address.create({
      address: addr,
      label: `正常用户_${i + 1}`,
      source: 'sample_data',
      metadata: {
        twitter_follower: Math.random() > 0.5,
        discord_member: Math.random() > 0.5,
        region: ['US', 'EU', 'Asia'][i % 3],
        device_type: 'mobile'
      }
    });
    normalAddresses.push(addr);

    const taskTypes = ['twitter_follow', 'discord_join', 'retweet', 'blog_post'];
    for (let j = 0; j < 3 + Math.floor(Math.random() * 5); j++) {
      Task.create({
        address: addr,
        taskType: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        taskName: taskTypes[Math.floor(Math.random() * taskTypes.length)],
        completedAt: randomTime(),
        source: 'sample_data'
      });
    }

    const chainTypes = ['transfer', 'swap', 'stake', 'mint'];
    for (let j = 0; j < 2 + Math.floor(Math.random() * 4); j++) {
      OnChainInteraction.create({
        address: addr,
        chain: 'ethereum',
        interactionType: chainTypes[Math.floor(Math.random() * chainTypes.length)],
        contractAddress: randomAddress(),
        txHash: '0x' + randomHex(64),
        timestamp: randomTime(),
        source: 'sample_data'
      });
    }

    CommunityList.create({
      listName: '社区核心成员',
      listType: 'community',
      address: addr,
      contributorLevel: ['member', 'core', 'mod'][i % 3],
      joinedAt: randomTime(),
      source: 'sample_data'
    });
  }

  const sybilGroup = [];
  const sybilAddr1 = randomAddress();
  sybilGroup.push(sybilAddr1);
  Address.create({
    address: sybilAddr1,
    label: '疑似女巫1',
    source: 'sample_data',
    metadata: { ip_hash: 'ip_cluster_A', device: 'bot_like_v1' }
  });

  const sybilAddr2 = randomAddress();
  sybilGroup.push(sybilAddr2);
  Address.create({
    address: sybilAddr2,
    label: '疑似女巫2',
    source: 'sample_data',
    metadata: { ip_hash: 'ip_cluster_A', device: 'bot_like_v1' }
  });

  const sybilAddr3 = randomAddress();
  sybilGroup.push(sybilAddr3);
  Address.create({
    address: sybilAddr3,
    label: '疑似女巫3',
    source: 'sample_data',
    metadata: { ip_hash: 'ip_cluster_A', device: 'bot_like_v1' }
  });

  const sybilAddr4 = randomAddress();
  sybilGroup.push(sybilAddr4);
  Address.create({
    address: sybilAddr4,
    label: '疑似女巫4',
    source: 'sample_data',
    metadata: { ip_hash: 'ip_cluster_A', device: 'bot_like_v1' }
  });

  const sybilAddr5 = randomAddress();
  sybilGroup.push(sybilAddr5);
  Address.create({
    address: sybilAddr5,
    label: '疑似女巫5',
    source: 'sample_data',
    metadata: { ip_hash: 'ip_cluster_A', device: 'bot_like_v1' }
  });

  const sybilAddr6 = randomAddress();
  sybilGroup.push(sybilAddr6);
  Address.create({
    address: sybilAddr6,
    label: '疑似女巫6',
    source: 'sample_data',
    metadata: { ip_hash: 'ip_cluster_A', device: 'bot_like_v1' }
  });

  sybilGroup.forEach(addr => {
    const taskTypes = ['twitter_follow', 'discord_join'];
    for (let j = 0; j < 8; j++) {
      Task.create({
        address: addr,
        taskType: taskTypes[j % 2],
        taskName: taskTypes[j % 2],
        completedAt: randomTime(),
        source: 'sample_data',
        isSuspicious: Math.random() > 0.4,
        suspicionReason: '完成时间过于集中'
      });
    }

    OnChainInteraction.create({
      address: addr,
      chain: 'ethereum',
      interactionType: 'transfer',
      contractAddress: '0x' + randomHex(40),
      txHash: '0x' + randomHex(64),
      timestamp: randomTime(),
      source: 'sample_data'
    });
  });

  const exchangeAddr = randomAddress();
  Address.create({
    address: exchangeAddr,
    label: 'Binance热钱包',
    source: 'sample_data'
  });
  ExchangeTag.create({
    address: exchangeAddr,
    exchangeName: 'Binance',
    tagType: 'hot_wallet',
    source: 'sample_data',
    confidence: 0.95
  });

  const exchangeAddr2 = randomAddress();
  Address.create({
    address: exchangeAddr2,
    label: 'Coinbase交易所',
    source: 'sample_data'
  });
  ExchangeTag.create({
    address: exchangeAddr2,
    exchangeName: 'Coinbase',
    tagType: 'exchange',
    source: 'sample_data',
    confidence: 0.98
  });

  const trustedAddr = randomAddress();
  Address.create({
    address: trustedAddr,
    label: '项目早期贡献者',
    source: 'sample_data'
  });
  Whitelist.create({
    address: trustedAddr,
    reason: '项目早期核心贡献者，社区管理员',
    addedBy: 'admin',
    source: 'sample_data'
  });
  Task.create({
    address: trustedAddr,
    taskType: 'blog_post',
    taskName: '撰写项目介绍博客',
    completedAt: randomTime(),
    source: 'sample_data'
  });
  CommunityList.create({
    listName: '社区核心成员',
    listType: 'community',
    address: trustedAddr,
    contributorLevel: 'admin',
    joinedAt: randomTime(),
    source: 'sample_data'
  });

  const newAddr = randomAddress();
  Address.create({
    address: newAddr,
    label: '新钱包_可能新用户',
    source: 'sample_data'
  });
  Task.create({
    address: newAddr,
    taskType: 'twitter_follow',
    taskName: '关注官方推特',
    completedAt: randomTime(),
    source: 'sample_data'
  });

  const emptyAddr = randomAddress();
  Address.create({
    address: emptyAddr,
    label: '无活动地址',
    source: 'sample_data'
  });

  console.log('✅ 示例数据生成完成！');
  console.log(`   - 正常用户: 8个`);
  console.log(`   - 疑似女巫: 6个 (同源IP/设备聚类)`);
  console.log(`   - 交易所地址: 2个`);
  console.log(`   - 白名单地址: 1个`);
  console.log(`   - 新钱包: 1个`);
  console.log(`   - 无活动地址: 1个`);
  console.log(`   - 任务记录: ${Task.findAll().length}条`);
  console.log(`   - 链上交互: ${OnChainInteraction.findAll().length}条`);
  console.log(`\n💡 运行 "npm start" 进入CLI界面，或 "node src/cli.js" 直接启动。`);
}

FilterRule.initDefaults();
generateSampleData();
