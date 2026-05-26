import logging
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.config import settings
from app.database import SessionLocal
from app.services.queue_service import CompensationQueueService, QueueStatus

logger = logging.getLogger(__name__)


class QueueWorker:
    def __init__(self):
        self.scheduler = BackgroundScheduler()
        self.is_running = False

    def start(self):
        if self.is_running:
            logger.warning("Queue worker is already running")
            return
        
        if not settings.QUEUE_WORKER_ENABLED:
            logger.info("Queue worker is disabled by configuration")
            return
        
        trigger = IntervalTrigger(seconds=settings.QUEUE_WORKER_INTERVAL_SECONDS)
        self.scheduler.add_job(
            self._process_queue,
            trigger=trigger,
            id="queue_processing",
            name="队列自动处理",
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info(
            "Queue worker started, processing every %d seconds",
            settings.QUEUE_WORKER_INTERVAL_SECONDS
        )

    def stop(self):
        if self.is_running:
            self.scheduler.shutdown(wait=False)
            self.is_running = False
            logger.info("Queue worker stopped")

    def _process_queue(self):
        db = SessionLocal()
        try:
            queue_service = CompensationQueueService(db)
            pending_items = queue_service.get_pending_items(batch_size=10)
            
            if not pending_items:
                logger.debug("No pending queue items to process")
                return
            
            logger.info("Processing %d pending queue items", len(pending_items))
            
            for item in pending_items:
                try:
                    result = queue_service.process_item(item.id)
                    if result["success"]:
                        logger.info(
                            "Queue item %d processed successfully (type: %s)",
                            item.id,
                            item.business_type
                        )
                    else:
                        logger.warning(
                            "Queue item %d processing failed: %s (type: %s, retry: %d/%d)",
                            item.id,
                            result.get("error", "Unknown"),
                            item.business_type,
                            item.retry_count,
                            item.max_retries
                        )
                except Exception as e:
                    logger.error(
                        "Exception processing queue item %d: %s",
                        item.id,
                        str(e),
                        exc_info=True
                    )
                    
        except Exception as e:
            logger.error("Error in queue worker: %s", str(e), exc_info=True)
        finally:
            db.close()


queue_worker = QueueWorker()
