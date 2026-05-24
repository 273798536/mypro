import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

from sqlalchemy.orm import Session

from .models import (
    BidRecord,
    ImportFailure,
    RecordHistory,
    ImportSession,
    RecordType,
    RecordStatus,
    OperationType,
    UserRole,
)
from .config import Config


class PermissionDeniedError(Exception):
    pass


class RecordKeyGenerator:
    @staticmethod
    def generate(record_type: RecordType, data: Dict[str, Any]) -> str:
        key_parts = [record_type.value]

        if record_type == RecordType.QUALIFICATION:
            key_parts.extend([
                str(data.get("supplier_name", "")),
                str(data.get("qualification_type", "")),
            ])
        elif record_type == RecordType.PRICE_VERSION:
            key_parts.extend([
                str(data.get("supplier_name", "")),
                str(data.get("price_version", "")),
            ])
        elif record_type == RecordType.SEALED_SCAN:
            key_parts.extend([
                str(data.get("supplier_name", "")),
                str(data.get("scan_page", "")),
            ])
        elif record_type == RecordType.ANOMALY_PHOTO:
            key_parts.extend([
                str(data.get("supplier_name", "")),
                str(data.get("photo_path", "")),
            ])

        key_string = "|".join(key_parts)
        return hashlib.md5(key_string.encode("utf-8")).hexdigest()


class PermissionChecker:
    ROLE_PERMISSIONS = {
        UserRole.ADMIN: {"init", "import", "check", "fix", "report", "history", "export"},
        UserRole.OPERATOR: {"import", "check", "fix", "report", "history", "export"},
        UserRole.VIEWER: {"report", "history", "export"},
    }

    @classmethod
    def check_permission(cls, user_role: str, action: str) -> bool:
        try:
            role = UserRole(user_role)
            return action in cls.ROLE_PERMISSIONS.get(role, set())
        except ValueError:
            return False

    @classmethod
    def require_permission(cls, user_role: str, action: str):
        if not cls.check_permission(user_role, action):
            raise PermissionDeniedError(
                f"用户角色 '{user_role}' 没有权限执行 '{action}' 操作"
            )


class DeduplicationManager:
    def __init__(self, db: Session):
        self.db = db

    def find_existing_record(self, record_key: str) -> Optional[BidRecord]:
        return (
            self.db.query(BidRecord)
            .filter(BidRecord.record_key == record_key)
            .first()
        )

    def is_duplicate_file(self, file_path: str, file_hash: str) -> bool:
        from pathlib import Path
        file_name = Path(file_path).name
        session = (
            self.db.query(ImportSession)
            .filter(
                ImportSession.source_file == file_name,
                ImportSession.file_hash == file_hash,
            )
            .first()
        )
        return session is not None


class HistoryManager:
    def __init__(self, db: Session, operated_by: str):
        self.db = db
        self.operated_by = operated_by

    def _record_to_dict(self, record: BidRecord) -> Dict:
        return {
            "supplier_name": record.supplier_name,
            "qualification_type": record.qualification_type,
            "qualification_level": record.qualification_level,
            "valid_until": record.valid_until.isoformat() if record.valid_until else None,
            "price_version": record.price_version,
            "total_amount": record.total_amount,
            "scan_page": record.scan_page,
            "scan_hash": record.scan_hash,
            "photo_path": record.photo_path,
            "anomaly_type": record.anomaly_type,
            "remark": record.remark,
            "customer_remark": record.customer_remark,
            "status": record.status.value,
            "version": record.version,
        }

    def log_create(self, record: BidRecord, remark: str = None):
        history = RecordHistory(
            record_id=record.id,
            operation=OperationType.IMPORT,
            old_values=None,
            new_values=json.dumps(self._record_to_dict(record), ensure_ascii=False),
            operated_by=self.operated_by,
            remark=remark,
        )
        self.db.add(history)

    def log_update(self, record: BidRecord, old_values: Dict, remark: str = None):
        history = RecordHistory(
            record_id=record.id,
            operation=OperationType.UPDATE,
            old_values=json.dumps(old_values, ensure_ascii=False),
            new_values=json.dumps(self._record_to_dict(record), ensure_ascii=False),
            operated_by=self.operated_by,
            remark=remark,
        )
        self.db.add(history)

    def log_fix(self, record: BidRecord, old_values: Dict, remark: str = None):
        history = RecordHistory(
            record_id=record.id,
            operation=OperationType.FIX,
            old_values=json.dumps(old_values, ensure_ascii=False),
            new_values=json.dumps(self._record_to_dict(record), ensure_ascii=False),
            operated_by=self.operated_by,
            remark=remark,
        )
        self.db.add(history)


class FailureManager:
    def __init__(self, db: Session):
        self.db = db

    def record_failure(
        self,
        source_file: str,
        source_row: int,
        error_code: str,
        error_message: str,
        field_name: str = None,
        raw_value: str = None,
        record_id: int = None,
    ) -> ImportFailure:
        failure = ImportFailure(
            record_id=record_id,
            source_file=source_file,
            source_row=source_row,
            error_code=error_code,
            error_message=error_message,
            field_name=field_name,
            raw_value=raw_value,
        )
        self.db.add(failure)
        self.db.flush()
        return failure

    def get_unresolved_failures(self, source_file: str = None) -> List[ImportFailure]:
        query = self.db.query(ImportFailure).filter(ImportFailure.is_resolved == False)
        if source_file:
            query = query.filter(ImportFailure.source_file == source_file)
        return query.all()

    def resolve_failure(self, failure_id: int):
        failure = (
            self.db.query(ImportFailure).filter(ImportFailure.id == failure_id).first()
        )
        if failure:
            failure.is_resolved = True
            failure.resolved_at = datetime.utcnow()


class RecordManager:
    def __init__(self, db: Session, operated_by: str):
        self.db = db
        self.operated_by = operated_by
        self.dedup = DeduplicationManager(db)
        self.history = HistoryManager(db, operated_by)
        self.failures = FailureManager(db)

    def create_or_update_record(
        self,
        record_type: RecordType,
        data: Dict[str, Any],
        source_file: str,
        source_row: int,
    ) -> Tuple[BidRecord, bool]:
        record_key = RecordKeyGenerator.generate(record_type, data)
        existing = self.dedup.find_existing_record(record_key)

        if existing:
            old_values = self.history._record_to_dict(existing)
            has_changes = False

            for key, value in data.items():
                if hasattr(existing, key) and getattr(existing, key) != value:
                    setattr(existing, key, value)
                    has_changes = True

            if has_changes:
                existing.version += 1
                existing.updated_by = self.operated_by
                existing.updated_at = datetime.utcnow()
                self.history.log_update(existing, old_values, f"更新记录，原始行号: {source_row}")

            return existing, False
        else:
            record = BidRecord(
                record_key=record_key,
                record_type=record_type,
                source_file=source_file,
                source_row=source_row,
                status=RecordStatus.PENDING,
                updated_by=self.operated_by,
            )

            for key, value in data.items():
                if hasattr(record, key):
                    setattr(record, key, value)

            self.db.add(record)
            self.db.flush()
            self.history.log_create(record, f"新建记录，原始行号: {source_row}")

            return record, True

    def fix_record(
        self, record_id: int, fixes: Dict[str, Any], remark: str = None
    ) -> Optional[BidRecord]:
        record = self.db.query(BidRecord).filter(BidRecord.id == record_id).first()
        if not record:
            return None

        old_values = self.history._record_to_dict(record)

        for key, value in fixes.items():
            if hasattr(record, key):
                setattr(record, key, value)

        record.status = RecordStatus.FIXED
        record.updated_by = self.operated_by
        record.version += 1

        self.history.log_fix(record, old_values, remark)

        for failure in record.failures:
            self.failures.resolve_failure(failure.id)

        return record


def calculate_file_hash(file_path: str) -> str:
    path = Path(file_path)
    if not path.exists():
        return ""

    hasher = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            hasher.update(chunk)
    return hasher.hexdigest()
