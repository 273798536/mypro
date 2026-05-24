const moment = require('moment');
const { AsyncTask } = require('../models');
const logger = require('../config/logger');

class AsyncTaskService {
  static async createTask(taskType, taskName, inputParams = {}, options = {}) {
    const task = await AsyncTask.create({
      task_type: taskType,
      task_name: taskName,
      input_params: JSON.stringify(inputParams),
      status: 'pending',
      priority: options.priority || 5,
      max_retry_count: options.maxRetryCount || 3,
      created_by: options.createdBy || 'system',
      parent_task_id: options.parentTaskId
    });
    logger.info(`创建异步任务: ${task.id} [${taskType}] ${taskName}`);
    return task;
  }

  static async getNextTask(taskTypes = null) {
    const where = {
      status: ['pending', 'retry']
    };
    if (taskTypes) {
      where.task_type = taskTypes;
    }
    const task = await AsyncTask.findOne({
      where,
      order: [
        ['priority', 'DESC'],
        ['created_at', 'ASC']
      ]
    });
    if (task && task.status === 'retry' && task.next_retry_at) {
      if (moment().isBefore(task.next_retry_at)) {
        return null;
      }
    }
    return task;
  }

  static async startTask(taskId) {
    return await AsyncTask.update(
      {
        status: 'processing',
        process_started_at: new Date(),
        retry_count: AsyncTask.sequelize.literal('retry_count + 1')
      },
      { where: { id: taskId } }
    );
  }

  static async completeTask(taskId, resultData = {}) {
    const task = await AsyncTask.findByPk(taskId);
    const duration = task.process_started_at 
      ? Date.now() - new Date(task.process_started_at).getTime() 
      : 0;
    await AsyncTask.update(
      {
        status: 'success',
        result_data: JSON.stringify(resultData),
        process_ended_at: new Date(),
        process_duration: duration
      },
      { where: { id: taskId } }
    );
    logger.info(`任务完成: ${taskId}`);
  }

  static async failTask(taskId, error, options = {}) {
    const task = await AsyncTask.findByPk(taskId);
    const duration = task.process_started_at 
      ? Date.now() - new Date(task.process_started_at).getTime() 
      : 0;
    const shouldRetry = task.retry_count < task.max_retry_count && options.retryable !== false;
    const status = shouldRetry ? 'retry' : (options.manual ? 'manual' : 'failed');
    const nextRetryAt = shouldRetry 
      ? moment().add(Math.pow(2, task.retry_count) * 5, 'minutes').toDate()
      : null;
    await AsyncTask.update(
      {
        status,
        error_message: error.message || String(error),
        error_stack: error.stack,
        process_ended_at: new Date(),
        process_duration: duration,
        last_retry_at: new Date(),
        next_retry_at: nextRetryAt
      },
      { where: { id: taskId } }
    );
    logger.warn(`任务${shouldRetry ? '待重试' : status === 'manual' ? '待人工处理' : '永久失败'}: ${taskId}, ${error.message}`);
    return { status, shouldRetry };
  }

  static async markForManual(taskId, errorMessage) {
    await AsyncTask.update(
      { status: 'manual', error_message: errorMessage },
      { where: { id: taskId } }
    );
    logger.info(`任务标记为待人工处理: ${taskId}`);
  }

  static async getTasksByStatus(status, taskType = null) {
    const where = { status };
    if (taskType) where.task_type = taskType;
    return await AsyncTask.findAll({ where, order: [['created_at', 'DESC']] });
  }

  static async getPendingRetryTasks() {
    return await AsyncTask.findAll({
      where: {
        status: 'retry',
        next_retry_at: { [AsyncTask.sequelize.Op.lte]: new Date() }
      },
      order: [['next_retry_at', 'ASC']]
    });
  }

  static async resumeInterruptedTasks() {
    const interrupted = await AsyncTask.findAll({
      where: { status: 'processing' }
    });
    for (const task of interrupted) {
      await this.failTask(task.id, new Error('服务中断，任务被中断'), { retryable: true });
    }
    logger.info(`恢复中断任务: ${interrupted.length} 个`);
    return interrupted.length;
  }
}

module.exports = AsyncTaskService;
