import path from 'path';
import fs from 'fs';
import { DatabaseManager } from '../database';
import { ensureDir, logSuccess, logInfo } from '../utils';

export interface InitOptions {
  force?: boolean;
}

export async function init(targetPath: string, options: InitOptions = {}): Promise<void> {
  const wwiDir = path.join(targetPath, '.wwi');
  const dataDir = path.join(wwiDir, 'data');
  const exportsDir = path.join(wwiDir, 'exports');
  const reportsDir = path.join(wwiDir, 'reports');
  const logsDir = path.join(wwiDir, 'logs');

  if (fs.existsSync(wwiDir) && !options.force) {
    logInfo('仓库波次巡检工作区已存在，跳过初始化');
    return;
  }

  ensureDir(wwiDir);
  ensureDir(dataDir);
  ensureDir(exportsDir);
  ensureDir(reportsDir);
  ensureDir(logsDir);

  const config = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(wwiDir, 'config.json'), JSON.stringify(config, null, 2));

  const db = new DatabaseManager(targetPath);
  await db.init();
  await db.close();

  fs.writeFileSync(
    path.join(dataDir, 'README.md'),
    `# 数据导入目录

## 支持的数据源

| 数据类型 | 文件名模式 | 必填字段 |
|---------|-----------|---------|
| 波次单 | wave_*.csv | waveNo, orderNo, skuCode, skuName, planQty, storeCode, storeName |
| 拣货差异 | pick_diff_*.csv | waveNo, orderNo, skuCode, pickQty, diffQty, diffType |
| 复核扫描 | review_scan_*.csv | waveNo, orderNo, skuCode, reviewQty, isException |
| 客服备注 | customer_note_*.csv | waveNo, orderNo, noteType, noteContent, isUrgent |
`
  );

  logSuccess('仓内波次拣货多源导入巡检工作区初始化完成');
  console.log('');
  logInfo('目录结构:');
  console.log('  .wwi/');
  console.log('  ├── facts.db          # 事实数据库（单一事实来源）');
  console.log('  ├── config.json       # 配置文件');
  console.log('  ├── data/             # 待导入数据目录');
  console.log('  ├── exports/          # 导出文件目录');
  console.log('  ├── reports/          # 报表目录');
  console.log('  └── logs/             # 日志目录');
  console.log('');
  logInfo('下一步: 将数据文件放入 .wwi/data/ 后运行 wwi import');
}
