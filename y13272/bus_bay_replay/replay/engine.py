import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Optional

from .models import ReplayState, ComplaintRecord, MeetingMinute, ComplaintStatus, RecordAction, HistoryEntry
from .loader import DataLoader
from .idempotent import IdempotencyManager
from .history import HistoryManager
from .classifier import StatusClassifier
from .report import ReportGenerator


class ReplayEngine:
    def __init__(self, data_dir: str, state_dir: str = ".replay_state"):
        self.data_dir = data_dir
        self.state_dir = Path(state_dir)
        self.state = ReplayState()
        self.loader = DataLoader(data_dir)
        self.idempotent = IdempotencyManager(self.state)
        self.history = HistoryManager(self.state)
        self.classifier = StatusClassifier(self.state)
        self.report = ReportGenerator(self.state)

    def start(self) -> dict:
        records, minutes = self.loader.load_all()

        seen_ids = set()
        accepted_records = []
        duplicates = 0
        messages = []

        for record in records:
            key = record.idempotency_key()
            if key in self.state.idempotency_seen or record.complaint_id in seen_ids:
                duplicates += 1
                messages.append(f"[去重] {record.complaint_id}: 重复提交已忽略")
                continue

            self.state.idempotency_seen.add(key)
            seen_ids.add(record.complaint_id)
            accepted_records.append(record)

        for record in accepted_records:
            self.state.records[record.complaint_id] = record
            self.state.history.append(
                HistoryEntry(
                    entry_id=f"HIS-{uuid.uuid4().hex[:8]}",
                    entity_type="complaint",
                    entity_id=record.complaint_id,
                    action=RecordAction.SUBMIT,
                    actor="import",
                    timestamp=record.submit_time,
                    after_value={
                        "bay_name": record.bay_name,
                        "status": record.status.value,
                        "description": record.description[:50] + "..." if len(record.description) > 50 else record.description,
                    },
                    reason="初始提交",
                    source_ref=record.source,
                )
            )

        for minute in minutes:
            self.history.add_minute_version(minute, actor="import")

        self.classifier.detect_conflicts()

        self.state.created_at = datetime.now()
        self.state.last_updated = datetime.now()

        self._save_state()

        return {
            "total_records": len(records),
            "accepted": len(accepted_records),
            "duplicates": duplicates,
            "total_minutes": len(minutes),
            "messages": messages,
            "status_stats": self.classifier.stats(),
        }

    def rerun(self) -> dict:
        self.state = ReplayState()
        return self.start()

    def update_status(
        self,
        complaint_id: str,
        new_status: str,
        actor: str,
        reason: str = "",
        handle_result: Optional[str] = None,
    ) -> Optional[ComplaintRecord]:
        try:
            status = ComplaintStatus(new_status)
        except ValueError:
            return None

        result = self.history.update_complaint_status(
            complaint_id, status, actor, reason, handle_result
        )
        if result:
            self._save_state()
        return result

    def add_minute(self, minute: MeetingMinute, actor: str = "system") -> bool:
        result = self.history.add_minute_version(minute, actor)
        if result:
            self._save_state()
        return result

    def get_review_list(self) -> dict:
        return self.classifier.get_for_review()

    def get_complaint_history(self, complaint_id: str) -> list:
        return self.history.get_complaint_history(complaint_id)

    def get_minute_trace(self, minute_id: str) -> dict:
        return self.history.trace_minute_origin(minute_id)

    def generate_report(self, output_path: str) -> str:
        return self.report.generate_full_report(output_path)

    def generate_minute_trace_report(self, minute_id: str, output_path: str) -> Optional[str]:
        return self.report.generate_minute_trace_report(minute_id, output_path)

    def load_state(self) -> bool:
        state_file = self.state_dir / "state.json"
        if not state_file.exists():
            return False

        try:
            with open(state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            self._state_from_dict(data)
            return True
        except (json.JSONDecodeError, KeyError):
            return False

    def _save_state(self):
        self.state_dir.mkdir(parents=True, exist_ok=True)
        state_file = self.state_dir / "state.json"
        with open(state_file, "w", encoding="utf-8") as f:
            json.dump(self._state_to_dict(), f, ensure_ascii=False, indent=2)

    def _state_to_dict(self) -> dict:
        return {
            "created_at": self.state.created_at.isoformat(),
            "last_updated": self.state.last_updated.isoformat(),
            "records": {
                k: self._record_to_dict(v) for k, v in self.state.records.items()
            },
            "minutes": {
                k: [self._minute_to_dict(m) for m in v]
                for k, v in self.state.minutes.items()
            },
            "history": [h.to_dict() for h in self.state.history],
            "idempotency_seen": list(self.state.idempotency_seen),
        }

    def _record_to_dict(self, r: ComplaintRecord) -> dict:
        return {
            "complaint_id": r.complaint_id,
            "bay_name": r.bay_name,
            "bay_address": r.bay_address,
            "complaint_type": r.complaint_type,
            "description": r.description,
            "submitter": r.submitter,
            "submit_time": r.submit_time.isoformat(),
            "status": r.status.value,
            "handler": r.handler,
            "handle_result": r.handle_result,
            "handle_time": r.handle_time.isoformat() if r.handle_time else None,
            "source": r.source,
            "extra": r.extra,
        }

    def _minute_to_dict(self, m: MeetingMinute) -> dict:
        return {
            "minute_id": m.minute_id,
            "meeting_time": m.meeting_time.isoformat(),
            "meeting_title": m.meeting_title,
            "content": m.content,
            "recorder": m.recorder,
            "version": m.version,
            "is_appendum": m.is_appendum,
            "appendum_note": m.appendum_note,
            "screenshot_refs": m.screenshot_refs,
            "related_complaint_ids": m.related_complaint_ids,
            "raw_source": m.raw_source,
        }

    def _state_from_dict(self, data: dict):
        self.state.created_at = datetime.fromisoformat(data["created_at"])
        self.state.last_updated = datetime.fromisoformat(data["last_updated"])

        self.state.records = {}
        for k, v in data["records"].items():
            self.state.records[k] = ComplaintRecord(
                complaint_id=v["complaint_id"],
                bay_name=v["bay_name"],
                bay_address=v["bay_address"],
                complaint_type=v["complaint_type"],
                description=v["description"],
                submitter=v["submitter"],
                submit_time=datetime.fromisoformat(v["submit_time"]),
                status=ComplaintStatus(v["status"]),
                handler=v.get("handler"),
                handle_result=v.get("handle_result"),
                handle_time=datetime.fromisoformat(v["handle_time"]) if v.get("handle_time") else None,
                source=v.get("source", "manual"),
                extra=v.get("extra", {}),
            )

        self.state.minutes = {}
        for k, versions in data["minutes"].items():
            self.state.minutes[k] = [
                MeetingMinute(
                    minute_id=m["minute_id"],
                    meeting_time=datetime.fromisoformat(m["meeting_time"]),
                    meeting_title=m["meeting_title"],
                    content=m["content"],
                    recorder=m["recorder"],
                    version=m["version"],
                    is_appendum=m["is_appendum"],
                    appendum_note=m.get("appendum_note"),
                    screenshot_refs=m.get("screenshot_refs", []),
                    related_complaint_ids=m.get("related_complaint_ids", []),
                    raw_source=m.get("raw_source"),
                )
                for m in versions
            ]

        from .models import RecordAction
        self.state.history = [
            self._history_from_dict(h) for h in data["history"]
        ]

        self.state.idempotency_seen = set(data.get("idempotency_seen", []))

    def _history_from_dict(self, h: dict) -> "HistoryEntry":
        from .models import HistoryEntry, RecordAction
        return HistoryEntry(
            entry_id=h["entry_id"],
            entity_type=h["entity_type"],
            entity_id=h["entity_id"],
            action=RecordAction(h["action"]),
            actor=h["actor"],
            timestamp=datetime.fromisoformat(h["timestamp"]),
            before_value=h.get("before_value"),
            after_value=h.get("after_value"),
            reason=h.get("reason"),
            source_ref=h.get("source_ref"),
        )

    def stats(self) -> dict:
        return {
            "total_records": len(self.state.records),
            "total_minutes": len(self.state.minutes),
            "total_history": len(self.state.history),
            "idempotency_seen": len(self.state.idempotency_seen),
            "status_stats": self.classifier.stats(),
        }
