from datetime import datetime, timedelta
from typing import Optional, ContextManager
from contextlib import contextmanager
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid

from ..models import ResourceLock


class LockService:
    def __init__(self, db: Session, lock_holder: Optional[str] = None):
        self.db = db
        self.lock_holder = lock_holder or f"holder_{uuid.uuid4().hex[:8]}"

    def acquire_lock(self, resource_type: str, resource_id: str,
                     timeout_seconds: int = 300) -> bool:
        self._clean_expired_locks()

        existing_lock = self.db.query(ResourceLock).filter(
            and_(
                ResourceLock.resource_type == resource_type,
                ResourceLock.resource_id == resource_id,
                ResourceLock.is_active == True
            )
        ).first()

        if existing_lock:
            if existing_lock.lock_holder == self.lock_holder:
                existing_lock.expires_at = datetime.now() + timedelta(seconds=timeout_seconds)
                self.db.flush()
                return True
            return False

        lock = ResourceLock(
            resource_type=resource_type,
            resource_id=resource_id,
            lock_holder=self.lock_holder,
            expires_at=datetime.now() + timedelta(seconds=timeout_seconds),
            is_active=True
        )
        self.db.add(lock)
        self.db.flush()
        return True

    def release_lock(self, resource_type: str, resource_id: str) -> bool:
        lock = self.db.query(ResourceLock).filter(
            and_(
                ResourceLock.resource_type == resource_type,
                ResourceLock.resource_id == resource_id,
                ResourceLock.lock_holder == self.lock_holder,
                ResourceLock.is_active == True
            )
        ).first()

        if lock:
            lock.is_active = False
            self.db.flush()
            return True
        return False

    def _clean_expired_locks(self):
        expired = self.db.query(ResourceLock).filter(
            and_(
                ResourceLock.is_active == True,
                ResourceLock.expires_at < datetime.now()
            )
        ).all()

        for lock in expired:
            lock.is_active = False
        self.db.flush()

    @contextmanager
    def lock(self, resource_type: str, resource_id: str,
             timeout_seconds: int = 300, wait: bool = True,
             max_wait_seconds: int = 30) -> ContextManager[bool]:
        import time

        start_time = time.time()
        acquired = False

        while not acquired:
            acquired = self.acquire_lock(resource_type, resource_id, timeout_seconds)
            if acquired or not wait:
                break
            if time.time() - start_time > max_wait_seconds:
                break
            time.sleep(0.5)

        try:
            yield acquired
        finally:
            if acquired:
                self.release_lock(resource_type, resource_id)
