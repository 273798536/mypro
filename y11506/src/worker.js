const { getDatabase, initDatabase, closeDatabase } = require('./db/database');
const { claimNextTask, completeTask, failTask, TASK_TYPES, TASK_STATUSES, recoverStuckTasks } = require('./services/taskService');
const { importData, createTask } = require('./services/importService');
const { validateBatch } = require('./services/validationService');
const { generateBatchReport, generateStatusReport, generateDepartmentReport } = require('./services/reportService');
const { exportBatchData, exportFailedRecords, exportCalibrationStatus, exportReport } = require('./services/exportService');

class Worker {
  constructor(options = {}) {
    this.running = false;
    this.pollInterval = options.pollInterval || 1000;
    this.maxConsecutiveEmpty = options.maxConsecutiveEmpty || 3;
    this.consecutiveEmpty = 0;
    this.taskTypes = options.taskTypes || null;
  }

  async processTask(task) {
    const payload = task.payload || {};
    
    try {
      let result;
      
      switch (task.task_type) {
        case TASK_TYPES.IMPORT_ASYNC:
          result = await importData(payload.sourceType, payload.filePath, payload.options || {});
          break;
          
        case TASK_TYPES.IMPORT_VALIDATION:
          result = validateBatch(payload.batchId);
          break;
          
        case TASK_TYPES.REPORT_GENERATION:
          if (payload.batchId) {
            result = generateBatchReport(payload.batchId);
          } else if (payload.department) {
            result = generateDepartmentReport(payload.department);
          } else {
            result = generateStatusReport();
          }
          if (payload.outputPath) {
            exportReport(result, payload.outputPath);
          }
          break;
          
        case TASK_TYPES.EXPORT:
          if (payload.calibrationStatus) {
            result = exportCalibrationStatus(payload.outputDir, payload.options || {});
          } else if (payload.failedOnly) {
            result = exportFailedRecords(payload.batchId, payload.outputDir);
          } else {
            result = exportBatchData(payload.batchId, payload.outputDir);
          }
          break;
          
        case TASK_TYPES.CERTIFICATE_CHECK:
          result = await this.checkCertificates();
          break;
          
        case TASK_TYPES.BATCH_PROCESS:
          result = await this.processBatch(payload.batchId);
          break;
          
        case TASK_TYPES.DIFF_ANALYSIS:
          result = await this.analyzeDiffs(payload);
          break;
          
        default:
          throw new Error(`Unknown task type: ${task.task_type}`);
      }
      
      completeTask(task.task_id);
      return { success: true, result, taskId: task.task_id };
      
    } catch (error) {
      const shouldRetry = !payload.noRetry;
      const manualOnly = payload.manualOnly || false;
      
      if (manualOnly) {
        failTask(task.task_id, error, { manual: true });
        return { success: false, manual: true, error, taskId: task.task_id };
      } else if (shouldRetry) {
        failTask(task.task_id, error, { noRetry: false });
        return { success: false, willRetry: true, error, taskId: task.task_id };
      } else {
        failTask(task.task_id, error, { noRetry: true });
        return { success: false, error, taskId: task.task_id };
      }
    }
  }

  async checkCertificates() {
    const { validateAll } = require('./services/validationService');
    const { fixCertificateStatus } = require('./services/fixService');
    
    const result = validateAll();
    
    if (result.linkageIssues > 0) {
      fixCertificateStatus(null, process.env.USER || 'system');
    }
    
    return result;
  }

  async processBatch(batchId) {
    const { getBatchInfo } = require('./services/importService');
    
    const batch = getBatchInfo(batchId);
    if (!batch) {
      throw new Error(`Batch not found: ${batchId}`);
    }
    
    const validationResult = validateBatch(batchId);
    
    return {
      batchId,
      validation: validationResult
    };
  }

  async analyzeDiffs(payload) {
    const db = getDatabase();
    
    const { batchId } = payload;
    
    const diffs = db.prepare(`
      SELECT 
        id,
        device_id,
        device_name,
        department,
        expected_quantity,
        actual_quantity,
        difference,
        diff_type,
        status
      FROM inventory_diffs
      WHERE batch_id = ?
      ORDER BY diff_type, ABS(difference) DESC
    `).all(batchId);
    
    const summary = {
      total: diffs.length,
      surplus: diffs.filter(d => d.diff_type === 'surplus').length,
      shortage: diffs.filter(d => d.diff_type === 'shortage').length,
      matched: diffs.filter(d => d.diff_type === 'matched').length,
      totalDiffAmount: diffs.reduce((sum, d) => sum + Math.abs(d.difference), 0)
    };
    
    return { batchId, summary, details: diffs };
  }

  async pollOnce() {
    const task = claimNextTask(this.taskTypes);
    
    if (!task) {
      this.consecutiveEmpty++;
      return null;
    }
    
    this.consecutiveEmpty = 0;
    return this.processTask(task);
  }

  async start() {
    this.running = true;
    initDatabase();
    recoverStuckTasks();
    
    console.log(`Worker started, polling every ${this.pollInterval}ms`);
    
    while (this.running) {
      try {
        const result = await this.pollOnce();
        
        if (result) {
          if (result.success) {
            console.log(`✓ Task ${result.taskId} completed`);
          } else if (result.willRetry) {
            console.log(`⚠ Task ${result.taskId} failed, will retry: ${result.error.message}`);
          } else if (result.manual) {
            console.log(`⚠ Task ${result.taskId} requires manual intervention: ${result.error.message}`);
          } else {
            console.log(`✗ Task ${result.taskId} permanently failed: ${result.error.message}`);
          }
        } else {
          if (this.consecutiveEmpty >= this.maxConsecutiveEmpty) {
            console.log(`No tasks for ${this.consecutiveEmpty} polls, continuing to wait...`);
            this.consecutiveEmpty = 0;
          }
        }
      } catch (error) {
        console.error('Worker error:', error);
      }
      
      await new Promise(resolve => setTimeout(resolve, this.pollInterval));
    }
    
    closeDatabase();
    console.log('Worker stopped');
  }

  stop() {
    this.running = false;
  }
}

async function runStandaloneWorker() {
  const worker = new Worker({
    pollInterval: parseInt(process.env.WORKER_POLL_INTERVAL) || 1000
  });
  
  process.on('SIGTERM', () => worker.stop());
  process.on('SIGINT', () => worker.stop());
  
  await worker.start();
}

if (require.main === module) {
  runStandaloneWorker().catch(console.error);
}

module.exports = {
  Worker,
  runStandaloneWorker
};
