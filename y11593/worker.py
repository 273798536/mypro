import time
import threading
from datetime import datetime
from database import SessionLocal
from services import AsyncTaskService
from utils import setup_logger

logger = setup_logger("worker")

class TaskWorker:
    def __init__(self, poll_interval: int = 5):
        self.poll_interval = poll_interval
        self.running = False
        self.thread = None
    
    def start(self):
        self.running = True
        self.thread = threading.Thread(target=self._run, daemon=True)
        self.thread.start()
        logger.info("任务处理Worker已启动")
    
    def stop(self):
        self.running = False
        if self.thread:
            self.thread.join()
        logger.info("任务处理Worker已停止")
    
    def _run(self):
        while self.running:
            try:
                db = SessionLocal()
                try:
                    task_service = AsyncTaskService(db)
                    pending_tasks = task_service.get_pending_tasks()
                    
                    for task in pending_tasks:
                        if not self.running:
                            break
                        logger.info(f"开始执行任务: {task.task_id} - {task.task_name}")
                        task_service.execute_task(task)
                        logger.info(f"任务完成: {task.task_id} - 状态: {task.status}")
                finally:
                    db.close()
            except Exception as e:
                logger.error(f"任务处理异常: {str(e)}")
            
            if self.running:
                time.sleep(self.poll_interval)

def run_worker():
    worker = TaskWorker()
    worker.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        worker.stop()

if __name__ == "__main__":
    run_worker()
