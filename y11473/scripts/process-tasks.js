const { sequelize } = require('../src/models');
const AsyncTaskService = require('../src/services/AsyncTaskService');
const ImportService = require('../src/services/ImportService');
const ExportService = require('../src/services/ExportService');
const ReconciliationService = require('../src/services/ReconciliationService');
const logger = require('../src/config/logger');
const path = require('path');

const exportsDir = path.join(__dirname, '../exports');

async function processTasks() {
  console.log('开始处理任务...');
  
  try {
    const task = await AsyncTaskService.getNextTask();
    if (!task) {
      console.log('没有待处理的任务');
      process.exit(0);
    }

    console.log(`处理任务: ${task.id} [${task.task_type}] ${task.task_name}`);
    await AsyncTaskService.startTask(task.id);
    
    const inputParams = task.input_params ? JSON.parse(task.input_params) : {};
    
    let result;
    switch (task.task_type) {
      case 'import_parse':
        result = await ImportService.importFile(inputParams.filePath, inputParams.sourceType, inputParams.options);
        break;
      case 'export':
        if (inputParams.exportAll) {
          result = await ExportService.exportAll(inputParams.filters || {}, exportsDir);
        } else if (inputParams.batchNo) {
          result = await ExportService.exportReconciliationReport(inputParams.batchNo, exportsDir);
        } else {
          result = await ExportService.exportExceptions(inputParams.filters || {}, exportsDir);
        }
        break;
      case 'reconciliation':
        if (inputParams.all) {
          result = await ReconciliationService.reconcileAllBatches();
        } else {
          result = await ReconciliationService.reconcileByBatch(inputParams.batchNo);
        }
        break;
      default:
        throw new Error(`未知任务类型: ${task.task_type}`);
    }
    
    await AsyncTaskService.completeTask(task.id, result);
    console.log('任务完成:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('任务处理失败:', error);
    process.exit(1);
  }
}

processTasks();
