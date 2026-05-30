import type { DataSource, SecurityUnit } from '../engine/types';

function generateHash(content: string): string {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export const securityUnits: SecurityUnit[] = [
  {
    id: 'unit-fixed',
    type: 'fixed_post',
    name: '固定岗哨',
    capacity: 5,
    responseTime: 30,
    coverageRadius: 30
  },
  {
    id: 'unit-patrol',
    type: 'patrol',
    name: '巡逻队',
    capacity: 3,
    responseTime: 60,
    coverageRadius: 80
  },
  {
    id: 'unit-emergency',
    type: 'emergency_response',
    name: '应急响应队',
    capacity: 8,
    responseTime: 15,
    coverageRadius: 50
  }
];

export const patrolReports: DataSource[] = [
  {
    id: 'ds-patrol-001',
    type: 'patrol_report',
    name: '巡逻队排班表 - 日落音乐节',
    title: '日落音乐节2024巡逻排班及路线规划报告',
    content: `
巡逻报告编号: PATROL-2024-0530
提交时间: 2024-05-30 08:30:00
巡逻区域: 日落音乐节全场
巡逻队长: 张卫国

巡逻路线规划:
路线A (外圈): 主入口 → 南出口 → 东出口 → EDM舞台 → 北出口 → 西出口 → 独立音乐舞台 → 主入口
路线B (内圈): 主舞台前方 → 前排围栏 → VIP区 → 美食区A → 卫生间1 → 美食区B → 卫生间2

人员配置:
- 巡逻队Alpha: 3人, 负责路线A, 15分钟一圈
- 巡逻队Bravo: 3人, 负责路线B, 10分钟一圈
- 巡逻队Charlie: 2人, 机动支援

上一班次异常记录:
1. 22:15 - 南出口发现人群聚集倾向, 已增派1名固定岗
2. 23:00 - EDM舞台前方发现醉酒人员, 已移交医疗点
3. 00:30 - 卫生间2附近发现可疑物品, 经检查为遗失背包, 已交失物招领

注意事项:
- 主舞台散场时南出口压力较大, 建议提前部署
- 美食区夜间人流高峰为21:00-23:00
- 独立音乐舞台观众较年轻化, 注意管控冲突
    `.trim(),
    originalFile: 'patrol_report_sunset_20240530.pdf',
    originalPath: '/reports/patrol/patrol_report_sunset_20240530.pdf',
    hash: generateHash('patrol_report_sunset_20240530.pdf' + Date.now()),
    contentHash: 'sha256:' + generateHash('patrol_report_sunset_20240530.pdf' + Date.now()),
    timestamp: Date.now() - 3600000 * 2,
    source: '安保部 - 张卫国',
    summary: '日落音乐节巡逻排班报告，包含A、B两条巡逻路线规划，3支巡逻队共8人的人员配置，以及上一班次的异常记录和注意事项。特别提醒南出口散场压力较大。',
    format: 'pdf',
    notes: '巡逻队长签字确认，已同步至所有队员',
    tags: ['巡逻', '排班', '日落音乐节', '路线规划']
  },
  {
    id: 'ds-patrol-002',
    type: 'patrol_report',
    name: '巡逻漏洞分析 - 电音码头',
    title: '电音码头音乐节巡逻漏洞及空窗区域分析报告',
    content: `
巡逻漏洞分析报告
分析日期: 2024-05-29
分析人员: 安保指挥部

已发现巡逻空窗区域:
1. 西北出口后方绿化带 (空窗时间: 01:00-03:00)
   - 原因: 巡逻路线未覆盖, 灯光不足
   - 风险等级: 高
   - 建议: 增设监控摄像头, 调整巡逻路线

2. 美食广场后侧通道 (空窗时间: 随机)
   - 原因: 障碍物遮挡, 巡逻人员易忽略
   - 风险等级: 中
   - 建议: 清理通道, 增设固定岗

3. 贝斯舞台与铁克诺舞台之间通道 (空窗时间: 22:00-00:00)
   - 原因: 两个舞台同时演出时巡逻队被分流
   - 风险等级: 高
   - 建议: 高峰期增加机动巡逻队

历史事件关联:
- 2024-05-20 电音码头场次, 该通道发生2起斗殴事件
- 均因巡逻空窗导致响应延迟超过10分钟
    `.trim(),
    originalFile: 'patrol_gap_analysis_electro_dock.pdf',
    originalPath: '/analysis/patrol_gap_analysis_electro_dock.pdf',
    hash: generateHash('patrol_gap_analysis_electro_dock.pdf' + Date.now()),
    contentHash: 'sha256:' + generateHash('patrol_gap_analysis_electro_dock.pdf' + Date.now()),
    timestamp: Date.now() - 86400000,
    source: '安保指挥部',
    summary: '电音码头音乐节巡逻漏洞分析报告，识别出3处巡逻空窗区域，其中西北出口绿化带和舞台间通道为高风险区域，建议调整巡逻路线并增设固定岗。',
    format: 'pdf',
    notes: '历史数据显示该区域曾因巡逻空窗导致斗殴事件响应延迟',
    tags: ['巡逻漏洞', '风险分析', '电音码头', '空窗']
  }
];

export const securityReports: DataSource[] = [
  {
    id: 'ds-security-001',
    type: 'security_report',
    name: '出口拥堵风险评估 - 脏样例',
    title: '日落音乐节出口拥堵风险评估报告（脏数据样例）',
    content: `
【警告】出口拥堵风险评估 - 脏数据样例
报告编号: SEC-RISK-2024-0530-001
生成时间: 2024-05-30 14:00:00
数据状态: 待清洗 [标记: 脏数据]

风险评估摘要:
本次报告包含系统自动检测到的异常数据, 已标记为"脏样例"供训练使用。

检测到的出口拥堵风险点:

1. 南出口 (ID: exit-south)
   预测拥堵时间: 22:45-23:30
   预测峰值人数: 3,500人
   设计容量: 2,000人/小时
   拥堵系数: 1.75 [严重]
   原始数据来源: 历史人流统计 + 实时票务数据
   数据异常标记: ✗ 票务数据缺失15%记录
                   ✗ 历史统计时间区间不匹配
                   ✗ 可能混入了上周数据

2. 北出口 (ID: exit-north)
   预测拥堵时间: 23:00-23:45
   预测峰值人数: 2,800人
   设计容量: 2,000人/小时
   拥堵系数: 1.4 [中等]
   原始数据来源: 人流模拟系统
   数据异常标记: ✓ 数据正常

3. 东出口 (ID: exit-east)
   预测拥堵时间: 22:30-23:15
   预测峰值人数: 1,200人
   设计容量: 1,500人/小时
   拥堵系数: 0.8 [正常]
   原始数据来源: 人工上报 + 监控计数
   数据异常标记: ✗ 人工上报与监控计数偏差30%

⚠️ 重要提示: 本报告包含已标记的脏数据, 用于测试决策系统对低质量数据的识别能力。
   实际部署时, 脏数据会被自动清洗模块拦截。
    `.trim(),
    originalFile: 'exit_congestion_risk_dirty_sample.pdf',
    originalPath: '/risk/exit_congestion_risk_dirty_sample.pdf',
    hash: generateHash('exit_congestion_risk_dirty_sample.pdf' + Date.now()),
    contentHash: 'sha256:' + generateHash('exit_congestion_risk_dirty_sample.pdf' + Date.now()),
    timestamp: Date.now() - 1800000,
    source: '风险评估系统（自动生成）',
    summary: '出口拥堵风险评估报告，包含脏数据标记。南出口预测拥堵系数1.75（严重），但票务数据缺失15%且可能混入上周数据；北出口拥堵系数1.4（中等）数据正常；东出口拥堵系数0.8（正常）但人工上报与监控偏差30%。',
    format: 'pdf',
    notes: '⚠️ 脏数据样例 - 用于训练识别低质量数据',
    tags: ['风险评估', '出口拥堵', '脏数据', '日落音乐节'],
    isDirty: true,
    dirtyReason: '数据包含多处异常：票务数据缺失15%、历史统计时间不匹配、人工上报与监控计数偏差30%'
  },
  {
    id: 'ds-security-002',
    type: 'security_report',
    name: '音乐节安保预案 v3.2',
    title: '音乐节安保应急预案 v3.2',
    content: `
音乐节安保应急预案
版本: 3.2
生效日期: 2024-05-01
编制单位: 安保指挥部

一、事件分级响应机制

一级事件 (红色):
- 人群踩踏风险、大规模冲突、恐怖袭击
- 响应: 立即启动全场疏散, 通知公安、消防、医疗
- 决策时限: 30秒内

二级事件 (橙色):
- 出口拥堵、局部冲突、医疗紧急情况
- 响应: 增派附近安保力量, 现场控制
- 决策时限: 2分钟内

三级事件 (黄色):
- 巡逻空窗、小额物品遗失、小纠纷
- 响应: 就近巡逻队处理, 记录备案
- 决策时限: 5分钟内

二、出口拥堵处置流程

1. 检测到拥堵指数 > 1.2
2. 自动触发: 出口附近安保力量向拥堵点集结
3. 人工判断: 确认拥堵原因和严重程度
4. 可选措施:
   - 开启备用出口
   - 实施人流单向引导
   - 通知舞台延迟散场
   - 请求外部支援

三、常见误判防范

1. 巡逻空窗 ≠ 实际风险
   - 需要结合: 该区域历史事件记录、当前人流密度、监控画面

2. 天气突变处置
   - 雨天: 出口防滑、增加遮雨设施
   - 雷雨: 暂停户外演出, 引导人群到室内区域
   - 高温: 增加饮水点, 防范中暑

3. 数据合并错误
   - 不同来源数据冲突时, 以现场确认为准
   - 禁止自动合并时间戳不匹配的数据
   - 人工复核所有合并操作
    `.trim(),
    originalFile: 'security_protocol_v3.2.pdf',
    originalPath: '/protocol/security_protocol_v3.2.pdf',
    hash: generateHash('security_protocol_v3.2.pdf' + Date.now()),
    contentHash: 'sha256:' + generateHash('security_protocol_v3.2.pdf' + Date.now()),
    timestamp: Date.now() - 86400000 * 7,
    source: '安保指挥部',
    summary: '音乐节安保应急预案v3.2，定义了三级事件响应机制（一级30秒、二级2分钟、三级5分钟决策时限），出口拥堵处置流程，以及巡逻空窗、天气突变、数据合并错误等常见误判的防范措施。',
    format: 'pdf',
    notes: '所有安保人员必须熟读并考核通过',
    tags: ['应急预案', '安保', '操作规程', '事件分级']
  }
];

export const weatherData: DataSource[] = [
  {
    id: 'ds-weather-001',
    type: 'weather_data',
    name: '天气预报 - 5月30日音乐节',
    title: '2024年5月30日日落音乐节现场天气预报',
    content: `
天气预报
日期: 2024-05-30
预报时效: 24小时
发布单位: 市气象局

逐小时预报:
18:00 - 晴, 28°C, 南风3级, 降水概率 5%
19:00 - 晴, 26°C, 南风3级, 降水概率 5%
20:00 - 多云, 24°C, 东南风3级, 降水概率 10%
21:00 - 多云, 23°C, 东南风3级, 降水概率 15%
22:00 - 阴, 22°C, 东风4级, 降水概率 30%
23:00 - 阵雨, 21°C, 东风4级, 降水概率 60% ⚠️
00:00 - 中雨, 20°C, 东北风5级, 降水概率 80% ⚠️
01:00 - 中雨, 19°C, 东北风5级, 降水概率 75%

天气突变风险提示:
- 预计22:30左右天气转坏, 可能影响散场
- 建议: 准备应急雨棚, 检查排水系统
- 注意: 雷雨天气需暂停所有户外演出

⚠️ 数据质量提示:
本次预报由两套独立模型生成, 存在15%的概率偏差。
23:00后的降水概率预测在两套模型中相差20%。
    `.trim(),
    originalFile: 'weather_forecast_20240530.json',
    originalPath: '/weather/weather_forecast_20240530.json',
    hash: generateHash('weather_forecast_20240530.json' + Date.now()),
    contentHash: 'sha256:' + generateHash('weather_forecast_20240530.json' + Date.now()),
    timestamp: Date.now() - 3600000 * 6,
    source: '市气象局',
    summary: '5月30日音乐节天气预报，18:00-21:00晴转多云，22:00后转阴，23:00开始有阵雨，00:00转为中雨。23:00后的降水概率预测存在20%的模型偏差，需注意天气突变对散场的影响。',
    format: 'json',
    notes: '两套独立模型预测，存在一定偏差',
    tags: ['天气预报', '天气突变', '降水概率', '日落音乐节']
  }
];

export const allDataSources: DataSource[] = [
  ...patrolReports,
  ...securityReports,
  ...weatherData
];

export const getDataSourceById = (id: string): DataSource | undefined => {
  return allDataSources.find(d => d.id === id);
};
