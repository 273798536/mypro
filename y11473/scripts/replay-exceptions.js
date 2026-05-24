const { sequelize, ExceptionRecord } = require('../src/models');
const ExceptionService = require('../src/services/ExceptionService');
const logger = require('../src/config/logger');

async function replayPendingExceptions() {
  console.log('开始回放待处理异常...');
  
  try {
    const exceptions = await ExceptionRecord.findAll({
      where: { status: 'pending' },
      order: [['created_at', 'ASC']]
    });

    console.log(`找到 ${exceptions.length} 个待处理异常`);

    let successCount = 0;
    let failCount = 0;

    for (const exception of exceptions) {
      console.log(`回放异常: ${exception.id} [${exception.exception_type}] ${exception.exception_code}`);
      try {
        const success = await ExceptionService.replayException(exception.id);
        if (success) {
          successCount++;
          console.log(`  成功`);
        } else {
          failCount++;
          console.log(`  失败`);
        }
      } catch (e) {
        failCount++;
        console.log(`  错误: ${e.message}`);
      }
    }

    console.log(`回放完成: 成功 ${successCount}, 失败 ${failCount}`);
    process.exit(0);
  } catch (error) {
    console.error('回放异常失败:', error);
    process.exit(1);
  }
}

async function replaySingleException(exceptionId) {
  console.log(`回放异常: ${exceptionId}`);
  try {
    const success = await ExceptionService.replayException(exceptionId);
    console.log(success ? '成功' : '失败');
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('回放失败:', error);
    process.exit(1);
  }
}

const exceptionId = process.argv[2];
if (exceptionId) {
  replaySingleException(exceptionId);
} else {
  replayPendingExceptions();
}
