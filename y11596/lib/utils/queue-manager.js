const fs = require('fs');
const path = require('path');
const {
  getWorkspacePaths,
  readJson,
  writeJson,
  generateId,
  getTimestamp
} = require('./file-manager');

const QUEUE_DIR = 'queue';
const RETRY_QUEUE_FILE = 'retry-queue.json';
const DEAD_LETTER_FILE = 'dead-letter.json';
const MAX_RETRY_ATTEMPTS = 3;

const RETRY_DELAY_STRATEGIES = {
  exponential: (attempt) => Math.pow(2, attempt) * 1000,
  linear: (attempt) => (attempt + 1) * 5000,
  fixed: () => 5000
};

function getQueuePaths(root) {
  const paths = getWorkspacePaths(root);
  return {
    retry: path.join(paths.root, QUEUE_DIR, RETRY_QUEUE_FILE),
    deadLetter: path.join(paths.root, QUEUE_DIR, DEAD_LETTER_FILE),
    queueDir: path.join(paths.root, QUEUE_DIR)
  };
}

function ensureQueueDir(root) {
  const queuePaths = getQueuePaths(root);
  if (!fs.existsSync(queuePaths.queueDir)) {
    fs.mkdirSync(queuePaths.queueDir, { recursive: true });
  }
  return queuePaths;
}

function readRetryQueue(root) {
  const queuePaths = ensureQueueDir(root);
  const queue = readJson(queuePaths.retry);
  return queue || [];
}

function writeRetryQueue(root, queue) {
  const queuePaths = ensureQueueDir(root);
  writeJson(queuePaths.retry, queue);
}

function readDeadLetterQueue(root) {
  const queuePaths = ensureQueueDir(root);
  const queue = readJson(queuePaths.deadLetter);
  return queue || [];
}

function writeDeadLetterQueue(root, queue) {
  const queuePaths = ensureQueueDir(root);
  writeJson(queuePaths.deadLetter, queue);
}

function addToRetryQueue(root, item, options = {}) {
  const queue = readRetryQueue(root);
  
  const queueItem = {
    id: generateId(),
    createdAt: getTimestamp(),
    retryCount: 0,
    maxRetries: options.maxRetries || MAX_RETRY_ATTEMPTS,
    delayStrategy: options.delayStrategy || 'exponential',
    status: 'pending',
    nextRetryAt: calculateNextRetry(0, options.delayStrategy || 'exponential'),
    lastError: null,
    lastRetryAt: null,
    originalData: item.originalData || item,
    action: item.action || 'import',
    dataType: item.dataType || null,
    sourceFile: item.sourceFile || null,
    rowNumber: item.rowNumber || null,
    error: item.error || null,
    metadata: options.metadata || {}
  };

  queue.push(queueItem);
  writeRetryQueue(root, queue);

  return queueItem;
}

function calculateNextRetry(attempt, strategy) {
  const delay = RETRY_DELAY_STRATEGIES[strategy](attempt);
  return new Date(Date.now() + delay).toISOString();
}

function processRetryQueue(root, processor) {
  const queue = readRetryQueue(root);
  const now = new Date();
  const results = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    movedToDeadLetter: 0,
    items: []
  };

  const updatedQueue = [];
  const deadLetterQueue = readDeadLetterQueue(root);

  for (const item of queue) {
    if (item.status !== 'pending') {
      updatedQueue.push(item);
      continue;
    }

    const nextRetry = new Date(item.nextRetryAt);
    if (nextRetry > now) {
      updatedQueue.push(item);
      continue;
    }

    results.processed++;
    item.retryCount++;
    item.lastRetryAt = now.toISOString();

    try {
      const result = processor(item);
      
      if (result.success) {
        item.status = 'completed';
        item.completedAt = now.toISOString();
        item.result = result.data;
        results.succeeded++;
        results.items.push(item);
        continue;
      } else {
        item.lastError = result.error || '处理失败';
        
        if (result.retryable === false || item.retryCount >= item.maxRetries) {
          item.status = 'dead_letter';
          item.movedToDeadLetterAt = now.toISOString();
          item.deadLetterReason = result.retryable === false 
            ? '不可重试错误' 
            : `重试 ${item.maxRetries} 次失败`;
          
          const deadLetterItem = {
            ...item,
            deadLetterId: generateId(),
            originalQueueId: item.id,
            notRetryable: result.retryable === false
          };
          deadLetterQueue.push(deadLetterItem);
          results.movedToDeadLetter++;
          results.failed++;
          results.items.push(item);
          continue;
        } else {
          item.status = 'pending';
          item.nextRetryAt = calculateNextRetry(item.retryCount, item.delayStrategy);
          updatedQueue.push(item);
          results.failed++;
          results.items.push(item);
          continue;
        }
      }
    } catch (e) {
      item.lastError = e.message;
      results.failed++;

      if (item.retryCount >= item.maxRetries) {
        item.status = 'dead_letter';
        item.movedToDeadLetterAt = now.toISOString();
        
        const deadLetterItem = {
          ...item,
          deadLetterReason: `重试 ${item.maxRetries} 次失败`,
          originalQueueId: item.id,
          deadLetterId: generateId()
        };
        deadLetterQueue.push(deadLetterItem);
        results.movedToDeadLetter++;
        results.items.push(item);
        continue;
      } else {
        item.status = 'pending';
        item.nextRetryAt = calculateNextRetry(item.retryCount, item.delayStrategy);
        updatedQueue.push(item);
        results.items.push(item);
        continue;
      }
    }

    results.items.push(item);
  }

  writeRetryQueue(root, updatedQueue);
  writeDeadLetterQueue(root, deadLetterQueue);

  return results;
}

function getRetryQueueStats(root) {
  const queue = readRetryQueue(root);
  const deadLetter = readDeadLetterQueue(root);

  return {
    retry: {
      total: queue.length,
      pending: queue.filter(i => i.status === 'pending').length,
      processing: queue.filter(i => i.status === 'processing').length,
      completed: queue.filter(i => i.status === 'completed').length,
      deadLetter: queue.filter(i => i.status === 'dead_letter').length
    },
    deadLetter: {
      total: deadLetter.length
    }
  };
}

function moveToDeadLetter(root, itemId, reason) {
  const queue = readRetryQueue(root);
  const index = queue.findIndex(i => i.id === itemId);
  
  if (index < 0) {
    throw new Error(`重试项不存在: ${itemId}`);
  }

  const item = queue[index];
  item.status = 'dead_letter';
  item.movedToDeadLetterAt = getTimestamp();
  item.movedByUser = true;
  item.deadLetterReason = reason || '人工移至死信队列';

  const deadLetterItem = {
    ...item,
    deadLetterId: generateId(),
    originalQueueId: itemId
  };

  const deadLetterQueue = readDeadLetterQueue(root);
  deadLetterQueue.push(deadLetterItem);
  writeDeadLetterQueue(root, deadLetterQueue);

  queue.splice(index, 1);
  writeRetryQueue(root, queue);

  return deadLetterItem;
}

function requeueFromDeadLetter(root, deadLetterId) {
  const deadLetterQueue = readDeadLetterQueue(root);
  const index = deadLetterQueue.findIndex(i => i.deadLetterId === deadLetterId);
  
  if (index < 0) {
    throw new Error(`死信项不存在: ${deadLetterId}`);
  }

  const item = deadLetterQueue[index];
  deadLetterQueue.splice(index, 1);
  writeDeadLetterQueue(root, deadLetterQueue);

  const newRetryItem = addToRetryQueue(root, item.originalData, {
    maxRetries: item.maxRetries,
    delayStrategy: item.delayStrategy,
    metadata: {
      ...item.metadata,
      requeuedFromDeadLetter: true,
      originalDeadLetterId: deadLetterId,
      previousErrors: item.retryCount
    }
  });

  return newRetryItem;
}

function clearCompletedRetryItems(root) {
  const queue = readRetryQueue(root);
  const filtered = queue.filter(i => i.status !== 'completed');
  const clearedCount = queue.length - filtered.length;
  writeRetryQueue(root, filtered);
  return clearedCount;
}

function clearDeadLetterQueue(root) {
  const count = readDeadLetterQueue(root).length;
  writeDeadLetterQueue(root, []);
  return count;
}

function getFailedImportItems(root) {
  const paths = getWorkspacePaths(root);
  const queue = readRetryQueue(root);
  
  return queue.filter(item => 
    item.action === 'import' && 
    item.status === 'pending' &&
    item.error
  );
}

module.exports = {
  QUEUE_DIR,
  RETRY_QUEUE_FILE,
  DEAD_LETTER_FILE,
  MAX_RETRY_ATTEMPTS,
  addToRetryQueue,
  processRetryQueue,
  getRetryQueueStats,
  moveToDeadLetter,
  requeueFromDeadLetter,
  clearCompletedRetryItems,
  clearDeadLetterQueue,
  readRetryQueue,
  readDeadLetterQueue,
  getFailedImportItems
};
