#!/usr/bin/env node
const queues = [
  { id: 'ABN_DUP_001', type: '重复投诉', level: '高危', point: '南京东路步行街北段', desc: '7天收到5条投诉，疑似同一批人', status: '待处理', createTime: '2026-06-11 08:20' },
  { id: 'ABN_DUP_002', type: '重复投诉', level: '高危', point: '徐家汇天桥下广场', desc: '7天收到8条投诉，需排查来源', status: '待处理', createTime: '2026-06-12 08:20' },
  { id: 'ABN_DUP_003', type: '重复投诉', level: '高危', point: '七浦路服装市场门口', desc: '7天收到7条投诉', status: '待处理', createTime: '2026-06-13 08:20' },
  { id: 'ABN_DIS_001', type: '待人工确认', level: '高危', point: '徐家汇天桥下广场', desc: '复核意见争议，需协调城管', status: '处理中', createTime: '2026-06-12 10:05' },
  { id: 'ABN_DIS_002', type: '待人工确认', level: '高危', point: '七浦路服装市场门口', desc: '容量核定争议', status: '处理中', createTime: '2026-06-13 10:05' },
  { id: 'ABN_NAM_001', type: '名称不一致', level: '低危', point: '豫园商城外摆点', desc: '材料名"豫园商城外摆区"与系统不符', status: '处理中', createTime: '2026-06-13 09:15' },
  { id: 'ABN_PHO_001', type: '照片缺失', level: '中危', point: '田子坊弄堂外摆', desc: '缺少全景+近景照', status: '待处理', createTime: '2026-06-14 11:30' },
  { id: 'ABN_NAM_002', type: '名称不一致', level: '低危', point: '七浦路服装市场门口', desc: '管理处登记名与系统不一致', status: '处理中', createTime: '2026-06-13 15:10' }
]

console.log('\n' + '='.repeat(70))
console.log('🏮 夜市外摆容量复核 - 异常队列检查报告  ')
console.log('='.repeat(70))
console.log(`📅 生成时间：${new Date().toLocaleString('zh-CN')}`)
console.log(`👤 处理人：社区运营 · 阿宁`)
console.log('─'.repeat(70))

const pending = queues.filter(q => q.status === '待处理').length
const processing = queues.filter(q => q.status === '处理中').length
const high = queues.filter(q => q.level === '高危').length
const medium = queues.filter(q => q.level === '中危').length
const low = queues.filter(q => q.level === '低危').length

console.log('\n📊 队列统计：')
console.log(`   待处理 ${pending} 条 · 处理中 ${processing} 条 · 已解决 0 条`)
console.log(`   高危 ${high} 条 · 中危 ${medium} 条 · 低危 ${low} 条`)

console.log('\n🚨 高危优先（建议今日处理）：')
queues.filter(q => q.level === '高危').forEach((q, i) => {
  const tag = q.status === '待处理' ? '🔴' : '🟡'
  console.log(`   ${tag} [${q.id}] ${q.point}`)
  console.log(`      ${q.type} | ${q.desc}`)
  console.log(`      状态：${q.status} | 创建：${q.createTime}`)
})

console.log('\n🟡 中危/低危：')
queues.filter(q => q.level !== '高危').forEach((q) => {
  const icon = q.level === '中危' ? '🟠' : '🔵'
  console.log(`   ${icon} [${q.type}] ${q.point} → ${q.desc}`)
})

console.log('\n' + '─'.repeat(70))
console.log('💡 下一步操作建议：')
console.log('   1️⃣  执行 npm run review 启动系统')
console.log('   2️⃣  进入"异常队列"页 → 按高危→中危→低危顺序处理')
console.log('   3️⃣  点"跳转复核"直接进入对应GIS点位的复核详情')
console.log('   4️⃣  处理完记得在异常队列里"标记解决"')
console.log('='.repeat(70) + '\n')
