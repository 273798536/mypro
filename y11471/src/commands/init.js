const { initWorkspace, isInitialized, DATA_DIR, DB_PATH } = require('../database');
const { printSuccess, printError, printInfo } = require('../utils');

async function initCommand(options) {
  try {
    if (isInitialized()) {
      printInfo('工作目录已存在，将复用现有数据库');
      printInfo(`数据目录: ${DATA_DIR}`);
      printInfo(`数据库: ${DB_PATH}`);
      return;
    }

    const result = await initWorkspace(options.name);
    
    printSuccess('工作目录初始化成功!');
    printInfo(`数据目录: ${result.dataDir}`);
    printInfo(`数据库: ${result.dbPath}`);
    
    console.log('\n下一步操作:');
    console.log('  wra import application <文件路径>  # 导入退供申请');
    console.log('  wra check                    # 数据校验');
    console.log('  wra report                   # 查看报表');
  } catch (error) {
    printError(`初始化失败: ${error.message}`);
    process.exit(1);
  }
}

module.exports = initCommand;
