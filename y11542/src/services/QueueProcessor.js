const TaskService = require('./TaskService');
const { TASK_STATUS, FAILURE_TYPE } = require('../utils/constants');

class QueueProcessor {
  constructor() {
    this.isRunning = false;
    this.processingTasks = new Set();
    this.intervalId = null;
    this.pollingInterval = 10000;
  }

  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('[QueueProcessor] 队列处理器已启动');
    
    this.recoverIncompleteTasks();
    
    this.intervalId = setInterval(() => {
      this.processPendingTasks();
      this.processRetryTasks();
    }, this.pollingInterval);
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    console.log('[QueueProcessor] 队列处理器已停止');
  }

  async recoverIncompleteTasks() {
    console.log('[QueueProcessor] 恢复未完成任务...');
    
    try {
      const processingTasks = await TaskService.getTasks({
        status: TASK_STATUS.PROCESSING
      });

      for (const task of processingTasks) {
        console.log(`[QueueProcessor] 恢复任务 ${task.id}，状态重置为 pending`);
        await TaskService.updateTaskStatus(task.id, TASK_STATUS.PENDING, {
          reason: '服务重启，任务状态重置'
        });
      }

      console.log(`[QueueProcessor] 已恢复 ${processingTasks.length} 个任务`);
    } catch (error) {
      console.error('[QueueProcessor] 恢复任务失败:', error);
    }
  }

  async processPendingTasks() {
    if (!this.isRunning) return;

    try {
      const pendingTasks = await TaskService.getTasks({
        status: TASK_STATUS.PENDING,
        limit: 10
      });

      for (const task of pendingTasks) {
        if (this.processingTasks.has(task.id)) continue;
        this.processTask(task);
      }
    } catch (error) {
      console.error('[QueueProcessor] 处理待办任务失败:', error);
    }
  }

  async processRetryTasks() {
    if (!this.isRunning) return;

    try {
      const retryTasks = await TaskService.getRetryableTasks();

      for (const task of retryTasks) {
        if (this.processingTasks.has(task.id)) continue;
        console.log(`[QueueProcessor] 执行重试任务 ${task.id} (第${task.retry_count}次)`);
        this.processTask(task);
      }
    } catch (error) {
      console.error('[QueueProcessor] 处理重试任务失败:', error);
    }
  }

  async processTask(task) {
    if (this.processingTasks.has(task.id)) return;
    
    this.processingTasks.add(task.id);

    try {
      await TaskService.markProcessing(task.id);
      
      const result = await this.executeTaskLogic(task);
      
      await this.handleTaskSuccess(task, result);
      
    } catch (error) {
      await this.handleTaskError(task, error);
    } finally {
      this.processingTasks.delete(task.id);
    }
  }

  async executeTaskLogic(task) {
    console.log(`[QueueProcessor] 执行任务逻辑: ${task.id}, 素材: ${task.material_id}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const shouldSimulateError = Math.random() < 0.3;
    if (shouldSimulateError) {
      const errorType = Math.random();
      if (errorType < 0.4) {
        throw Object.assign(new Error('网络超时，请稍后重试'), { failureType: FAILURE_TYPE.RETRYABLE });
      } else if (errorType < 0.7) {
        throw Object.assign(new Error('数据异常，需要人工核对'), { failureType: FAILURE_TYPE.NEEDS_MANUAL });
      } else {
        throw Object.assign(new Error('素材ID不存在，无法处理'), { failureType: FAILURE_TYPE.PERMANENT });
      }
    }

    return {
      success: true,
      verified: true,
      message: '归因匹配成功'
    };
  }

  async handleTaskSuccess(task, result) {
    console.log(`[QueueProcessor] 任务 ${task.id} 处理成功`);
    
    await TaskService.updateTaskStatus(task.id, TASK_STATUS.COMPENSATED, {
      reason: result.message || '任务处理成功',
      processedAt: new Date().toISOString()
    });
  }

  async handleTaskError(task, error) {
    const failureType = error.failureType || FAILURE_TYPE.RETRYABLE;
    
    console.log(`[QueueProcessor] 任务 ${task.id} 处理失败 [${failureType}]: ${error.message}`);
    
    await TaskService.handleFailure(task.id, failureType, error.message);
  }

  async triggerTask(taskId) {
    const task = await TaskService.getTaskById(taskId);
    if (!task) {
      throw new Error('任务不存在');
    }
    
    if (this.processingTasks.has(taskId)) {
      throw new Error('任务正在处理中');
    }

    this.processTask(task);
    return { message: '任务已触发处理' };
  }
}

module.exports = new QueueProcessor();