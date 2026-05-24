import { createAsyncTask, getPendingTasks, updateAsyncTaskStatus, resetFailedTask, getFailedTasks } from '../dao/asyncTaskDao';
import { TaskStatus, ImportStrategy } from '../types';
import { batchImportLedgers, CreateLedgerRequest } from './ledgerService';

let taskProcessorInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

export interface BatchImportPayload {
  ledgersData: CreateLedgerRequest[];
  strategy: ImportStrategy;
  userId: string;
  userName: string;
}

export async function createBatchImportTask(
  ledgersData: CreateLedgerRequest[],
  strategy: ImportStrategy,
  userId: string,
  userName: string
): Promise<string> {
  const payload: BatchImportPayload = {
    ledgersData,
    strategy,
    userId,
    userName
  };

  const task = await createAsyncTask({
    type: 'batch_import',
    status: TaskStatus.PENDING,
    payload: JSON.stringify(payload),
    maxRetries: 3
  });

  return task.id;
}

async function processTask(taskId: string, payload: BatchImportPayload): Promise<string> {
  return new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await batchImportLedgers(
          payload.ledgersData,
          payload.strategy,
          payload.userId,
          payload.userName
        );

        if (result.errors.length > 0 && result.created === 0 && result.updated === 0) {
          reject(new Error(`批量导入全部失败: ${result.errors.join('; ')}`));
        } else {
          resolve(JSON.stringify(result));
        }
      } catch (e: any) {
        reject(e);
      }
    }, 100);
  });
}

export async function processPendingTasks(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const tasks = await getPendingTasks();

    for (const task of tasks) {
      if (task.type === 'batch_import') {
        await updateAsyncTaskStatus(task.id, TaskStatus.PROCESSING);

        try {
          const payload: BatchImportPayload = JSON.parse(task.payload);
          const result = await processTask(task.id, payload);

          await updateAsyncTaskStatus(task.id, TaskStatus.COMPLETED, {
            result
          });
        } catch (e: any) {
          const newRetryCount = task.retryCount + 1;

          if (newRetryCount >= task.maxRetries) {
            await updateAsyncTaskStatus(task.id, TaskStatus.PERMANENT_FAILED, {
              errorMessage: e.message,
              incrementRetry: true
            });
          } else if (e.message.includes('人工')) {
            await updateAsyncTaskStatus(task.id, TaskStatus.WAIT_MANUAL, {
              errorMessage: e.message,
              incrementRetry: true
            });
          } else {
            const nextRetry = new Date(Date.now() + 60000 * newRetryCount).toISOString();
            await updateAsyncTaskStatus(task.id, TaskStatus.WAIT_RETRY, {
              errorMessage: e.message,
              incrementRetry: true,
              nextRetryAt: nextRetry
            });
          }
        }
      }
    }
  } finally {
    isProcessing = false;
  }
}

export function startTaskProcessor(): void {
  if (taskProcessorInterval) {
    console.log('Task processor already running');
    return;
  }

  console.log('Starting task processor...');
  taskProcessorInterval = setInterval(() => {
    processPendingTasks().catch(console.error);
  }, 5000);
}

export function stopTaskProcessor(): void {
  if (taskProcessorInterval) {
    clearInterval(taskProcessorInterval);
    taskProcessorInterval = null;
    console.log('Task processor stopped');
  }
}

export async function retryTask(taskId: string): Promise<boolean> {
  const result = await resetFailedTask(taskId);
  return result !== null;
}

export async function getAllFailedTasks() {
  return getFailedTasks();
}
