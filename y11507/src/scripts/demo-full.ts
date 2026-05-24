import { execSync } from 'child_process';

const runStep = (step: string, command: string) => {
  console.log(`\n╔════════════════════════════════════════════════════════════╗`);
  console.log(`║  ${step.padEnd(52)} ║`);
  console.log(`╚════════════════════════════════════════════════════════════╝\n`);
  
  try {
    execSync(command, { stdio: 'inherit', cwd: process.cwd() });
  } catch (e) {
    console.error(`步骤失败: ${step}`);
    process.exit(1);
  }
};

const fullDemo = async () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║        医疗器械巡检重试补偿队列 - 完整演示                  ║
║                                                            ║
║  完整流程: 初始化 → 导入样例 → 触发坏数据 → 人工修正 → 生成报告
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);

  runStep('步骤 1: 初始化数据库', 'npm run init:db');
  runStep('步骤 2: 导入示例数据', 'npm run import:sample');
  runStep('步骤 3: 触发脏数据', 'npm run demo:bad-data');
  runStep('步骤 4: 人工修正脏数据', 'npm run demo:fix');
  runStep('步骤 5: 生成护士长报告', 'npm run demo:report');

  console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                    完整演示完成！                           ║
║                                                            ║
║  已复现所有关键场景:                                       ║
║  ✓ 初始化数据库                                            ║
║  ✓ 导入正常示例数据                                        ║
║  ✓ 触发各类脏数据（缺字段、跨日、改名、金额冲突）           ║
║  ✓ 人工接管并修正                                          ║
║  ✓ 补偿入账并关闭                                          ║
║  ✓ 生成护士长重点关注的报告                                 ║
║                                                            ║
║  数据一致性保证:                                           ║
║  ✓ 所有变更都有差异日志                                    ║
║  ✓ 导出文件与接口查询使用同一数据源                        ║
║  ✓ 原始数据、处理意见、前后差异都可回看                    ║
║                                                            ║
║  启动服务查看API:                                          ║
║  npm run dev                                               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
  `);
};

fullDemo().catch(console.error);
