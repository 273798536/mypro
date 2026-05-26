
import { taskRepository } from '../repositories/taskRepository';
import { historyRepository } from '../repositories/historyRepository';
import { evidenceRepository } from '../repositories/evidenceRepository';
import type { QueueTask, TaskStatus, SourceType, CreateTaskRequest, ImportResult } from '../../shared/types';

class QueueService {
  private processing: Set<string> = new Set();
  private isRunning: boolean = false;
  private retryIntervals: number[] = [60000, 300000, 900000];

  createTask(request: CreateTaskRequest, operator: string = 'system'): QueueTask {
    const existing = taskRepository.findBySource(
      request.sourceType,
      request.sourceFile,
      request.sourceLine
    );
    
    if (existing) {
      throw new Error(`Duplicate task: same source record already exists`);
    }

    const task = taskRepository.create(request);
    
    evidenceRepository.create({
      taskId: task.id,
      fileName: request.sourceFile,
      originalContent: JSON.stringify(request.rawData),
      lineNumber: request.sourceLine,
    });

    historyRepository.create({
      taskId: task.id,
      operation: 'create',
      operator,
      afterState: { status: task.status, standardData: task.standardData },
      diff: historyRepository.calculateDiff(null, { status: task.status, standardData: task.standardData }),
    });

    return task;
  }

  getTask(id: string): QueueTask | null {
    return taskRepository.findById(id);
  }

  getTasks(filters?: { status?: TaskStatus; sourceType?: SourceType }): QueueTask[] {
    return taskRepository.findAll(filters);
  }

  getTaskHistory(taskId: string) {
    return historyRepository.findByTaskId(taskId);
  }

  getTaskEvidence(taskId: string) {
    const evidence = evidenceRepository.findByTaskId(taskId);
    return evidence ? [evidence] : [];
  }

  async processTask(taskId: string, operator: string = 'system'): Promise<QueueTask> {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    if (this.processing.has(taskId)) {
      throw new Error('Task is already being processed');
    }

    this.processing.add(taskId);
    const beforeState = { status: task.status, retryCount: task.retryCount };

    try {
      taskRepository.updateStatus(taskId, 'processing');
      await this.simulateCompensation(task);
      taskRepository.updateStatus(taskId, 'success');
      
      const afterTask = taskRepository.findById(taskId)!;
      historyRepository.create({
        taskId,
        operation: 'process',
        operator,
        beforeState,
        afterState: { status: afterTask.status },
        diff: historyRepository.calculateDiff(beforeState, { status: afterTask.status }),
      });

      return afterTask;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      taskRepository.incrementRetry(taskId);
      const updatedTask = taskRepository.findById(taskId)!;
      
      let newStatus: TaskStatus = 'waiting_retry';
      if (updatedTask.retryCount >= updatedTask.maxRetries) {
        newStatus = 'waiting_manual';
      }
      
      taskRepository.updateStatus(taskId, newStatus, errorMessage);
      
      const afterTask = taskRepository.findById(taskId)!;
      historyRepository.create({
        taskId,
        operation: 'process_failed',
        operator,
        beforeState,
        afterState: { status: afterTask.status, retryCount: afterTask.retryCount, error: errorMessage },
        diff: historyRepository.calculateDiff(beforeState, { status: afterTask.status, retryCount: afterTask.retryCount }),
        remark: errorMessage,
      });

      throw error;
    } finally {
      this.processing.delete(taskId);
    }
  }

  private async simulateCompensation(task: QueueTask): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500));
    const amount = task.standardData.amount;
    if (amount && Number(amount) < 0) {
      throw new Error('Invalid amount: cannot be negative');
    }
  }

  async manualRetry(taskId: string, operator: string): Promise<QueueTask> {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeState = { status: task.status, retryCount: task.retryCount };
    taskRepository.updateStatus(taskId, 'pending', undefined);
    
    historyRepository.create({
      taskId,
      operation: 'manual_retry',
      operator,
      beforeState,
      afterState: { status: 'pending' },
      diff: historyRepository.calculateDiff(beforeState, { status: 'pending' }),
    });

    return this.processTask(taskId, operator);
  }

  manualOverride(
    taskId: string, 
    standardData: Record<string, any>, 
    operator: string,
    remark?: string
  ): QueueTask {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeState = { standardData: task.standardData, status: task.status };
    taskRepository.updateStandardData(taskId, standardData);
    taskRepository.updateStatus(taskId, 'pending', undefined);
    
    const updatedTask = taskRepository.findById(taskId)!;
    
    historyRepository.create({
      taskId,
      operation: 'manual_override',
      operator,
      beforeState,
      afterState: { standardData: updatedTask.standardData, status: updatedTask.status },
      diff: historyRepository.calculateDiff(beforeState, { standardData: updatedTask.standardData, status: updatedTask.status }),
      remark,
    });

    return updatedTask;
  }

  compensate(taskId: string, operator: string, remark?: string): QueueTask {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeState = { status: task.status };
    taskRepository.updateStatus(taskId, 'success');
    
    const updatedTask = taskRepository.findById(taskId)!;
    
    historyRepository.create({
      taskId,
      operation: 'compensate',
      operator,
      beforeState,
      afterState: { status: updatedTask.status },
      diff: historyRepository.calculateDiff(beforeState, { status: updatedTask.status }),
      remark,
    });

    return updatedTask;
  }

  close(taskId: string, operator: string, remark?: string): QueueTask {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeState = { status: task.status };
    taskRepository.updateStatus(taskId, 'closed');
    
    const updatedTask = taskRepository.findById(taskId)!;
    
    historyRepository.create({
      taskId,
      operation: 'close',
      operator,
      beforeState,
      afterState: { status: updatedTask.status },
      diff: historyRepository.calculateDiff(beforeState, { status: updatedTask.status }),
      remark,
    });

    return updatedTask;
  }

  markPermanentFailed(taskId: string, operator: string, remark?: string): QueueTask {
    const task = taskRepository.findById(taskId);
    if (!task) {
      throw new Error('Task not found');
    }

    const beforeState = { status: task.status };
    taskRepository.updateStatus(taskId, 'permanent_failed');
    
    const updatedTask = taskRepository.findById(taskId)!;
    
    historyRepository.create({
      taskId,
      operation: 'mark_permanent_failed',
      operator,
      beforeState,
      afterState: { status: updatedTask.status },
      diff: historyRepository.calculateDiff(beforeState, { status: updatedTask.status }),
      remark,
    });

    return updatedTask;
  }

  reviveDeadLetter(taskId: string, operator: string): QueueTask {
    const task = taskRepository.findById(taskId);
    if (!task || task.status !== 'permanent_failed') {
      throw new Error('Task is not a dead letter');
    }

    const beforeState = { status: task.status };
    taskRepository.updateStatus(taskId, 'waiting_manual');
    
    const updatedTask = taskRepository.findById(taskId)!;
    
    historyRepository.create({
      taskId,
      operation: 'revive_dead_letter',
      operator,
      beforeState,
      afterState: { status: updatedTask.status },
      diff: historyRepository.calculateDiff(beforeState, { status: updatedTask.status }),
    });

    return updatedTask;
  }

  getDeadLetters(): QueueTask[] {
    return taskRepository.findDeadLetters();
  }

  getStats() {
    return taskRepository.getStats();
  }

  getRetryCategories() {
    return taskRepository.getRetryCategories();
  }

  startProcessing(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.processLoop();
  }

  stopProcessing(): void {
    this.isRunning = false;
  }

  resumeProcessing(): number {
    const pendingTasks = taskRepository.findPendingTasks();
    for (const task of pendingTasks) {
      if (!this.processing.has(task.id)) {
        setTimeout(() => {
          this.processTask(task.id).catch(() => {});
        }, this.getRetryDelay(task.retryCount));
      }
    }
    return pendingTasks.length;
  }

  private getRetryDelay(retryCount: number): number {
    return this.retryIntervals[Math.min(retryCount, this.retryIntervals.length - 1)];
  }

  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        const pendingTasks = taskRepository.findPendingTasks();
        for (const task of pendingTasks) {
          if (!this.processing.has(task.id)) {
            this.processTask(task.id).catch(() => {});
          }
        }
      } catch (error) {
        console.error('Process loop error:', error);
      }
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  importFromCsv(
    sourceType: SourceType,
    fileName: string,
    rows: Record<string, any>[],
    operator: string
  ): ImportResult {
    const result: ImportResult = {
      success: 0,
      failed: 0,
      duplicates: 0,
      tasks: [],
      errors: [],
    };

    for (let i = 0; i < rows.length; i++) {
      const rawData = rows[i];
      const sourceLine = i + 1;

      try {
        const existing = taskRepository.findBySource(sourceType, fileName, sourceLine);
        if (existing) {
          result.duplicates++;
          result.tasks.push(existing);
          continue;
        }

        const { standardData, error: parseError } = this.standardizeData(sourceType, rawData);
        
        if (parseError) {
          const task = this.createFailedTask({
            sourceType,
            sourceFile: fileName,
            sourceLine,
            rawData,
            standardData: standardData || {},
            errorMessage: parseError,
          }, operator);
          
          result.failed++;
          result.errors.push(`Line ${sourceLine}: ${parseError}`);
          result.tasks.push(task);
          continue;
        }

        const task = this.createTask({
          sourceType,
          sourceFile: fileName,
          sourceLine,
          rawData,
          standardData: standardData!,
        }, operator);

        result.success++;
        result.tasks.push(task);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const task = this.createFailedTask({
          sourceType,
          sourceFile: fileName,
          sourceLine,
          rawData,
          standardData: {},
          errorMessage,
        }, operator);
        
        result.failed++;
        result.errors.push(`Line ${sourceLine}: ${errorMessage}`);
        result.tasks.push(task);
      }
    }

    return result;
  }

  private createFailedTask(
    data: {
      sourceType: SourceType;
      sourceFile: string;
      sourceLine: number;
      rawData: Record<string, any>;
      standardData: Record<string, any>;
      errorMessage: string;
    },
    operator: string
  ): QueueTask {
    const task = taskRepository.create({
      sourceType: data.sourceType,
      sourceFile: data.sourceFile,
      sourceLine: data.sourceLine,
      rawData: data.rawData,
      standardData: data.standardData,
    });

    evidenceRepository.create({
      taskId: task.id,
      fileName: data.sourceFile,
      originalContent: JSON.stringify(data.rawData),
      lineNumber: data.sourceLine,
    });

    taskRepository.updateStatus(task.id, 'waiting_manual', data.errorMessage);

    historyRepository.create({
      taskId: task.id,
      operation: 'import_failed',
      operator,
      beforeState: null,
      afterState: { status: 'waiting_manual', error: data.errorMessage },
      diff: historyRepository.calculateDiff(null, { status: 'waiting_manual', error: data.errorMessage }),
      remark: data.errorMessage,
    });

    return taskRepository.findById(task.id)!;
  }

  private standardizeData(sourceType: SourceType, rawData: Record<string, any>): { standardData?: Record<string, any>; error?: string } {
    const standard: Record<string, any> = {};

    switch (sourceType) {
      case 'recharge':
        standard.memberId = rawData.memberId || rawData['会员ID'] || rawData.member_id;
        standard.amount = rawData.amount || rawData['金额'] || rawData['充值金额'];
        standard.storeId = rawData.storeId || rawData['门店ID'] || rawData.store_id;
        standard.transactionId = rawData.transactionId || rawData['交易号'];
        standard.transactionTime = rawData.transactionTime || rawData['交易时间'];
        break;
      case 'refund':
        standard.memberId = rawData.memberId || rawData['会员ID'] || rawData.member_id;
        standard.amount = rawData.amount || rawData['金额'] || rawData['退款金额'];
        standard.storeId = rawData.storeId || rawData['门店ID'] || rawData.store_id;
        standard.refundReason = rawData.reason || rawData['退款原因'];
        standard.originalTransactionId = rawData.originalTransactionId || rawData['原交易号'];
        break;
      case 'store_transfer':
        standard.fromStoreId = rawData.fromStoreId || rawData['转出门店'];
        standard.toStoreId = rawData.toStoreId || rawData['转入门店'];
        standard.memberId = rawData.memberId || rawData['会员ID'];
        standard.amount = rawData.amount || rawData['转移金额'];
        standard.transferTime = rawData.transferTime || rawData['交接时间'];
        break;
      case 'supplier_statement':
        standard.supplierId = rawData.supplierId || rawData['供应商ID'];
        standard.supplierName = rawData.supplierName || rawData['供应商名称'];
        standard.amount = rawData.amount || rawData['金额'] || rawData['对账金额'];
        standard.statementDate = rawData.statementDate || rawData['对账日期'];
        break;
    }

    if (!standard.amount) {
      return { standardData: standard, error: 'Missing required field: amount' };
    }

    const amountNum = Number(standard.amount);
    if (isNaN(amountNum) || amountNum < 0) {
      return { standardData: standard, error: `Invalid amount: ${standard.amount} (must be non-negative number)` };
    }

    return { standardData: standard };
  }
}

export const queueService = new QueueService();
