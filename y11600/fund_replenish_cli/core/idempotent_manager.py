import hashlib
import json
from datetime import datetime
from pathlib import Path
from typing import Dict, Optional, List, Set
from ..models import ReplenishRecord, BankReturn


class IdempotentManager:
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.state_file = self.output_dir / ".idempotent_state.json"
        self.processed_keys: Set[str] = set()
        self.record_hashes: Dict[str, str] = {}
        self._load_state()

    def _load_state(self):
        if self.state_file.exists():
            with open(self.state_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                self.processed_keys = set(data.get("processed_keys", []))
                self.record_hashes = data.get("record_hashes", {})

    def _save_state(self):
        with open(self.state_file, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "processed_keys": list(self.processed_keys),
                    "record_hashes": self.record_hashes,
                    "last_updated": datetime.now().isoformat(),
                },
                f,
                ensure_ascii=False,
                indent=2,
            )

    def generate_record_key(self, bank_return: BankReturn) -> str:
        key = f"{bank_return.serial_no}_{bank_return.customer_id}_{bank_return.plan_id}_{bank_return.deduct_date.isoformat()}"
        return hashlib.sha256(key.encode()).hexdigest()[:16]

    def generate_content_hash(self, record: ReplenishRecord) -> str:
        content = {
            "bank_return": record.bank_return.model_dump(mode="json"),
            "customer_plan": record.customer_plan.model_dump(mode="json"),
            "status": record.status,
            "replenish_attempts": record.replenish_attempts,
            "risks": [r.value for r in record.risks],
        }
        content_str = json.dumps(content, sort_keys=True, default=str)
        return hashlib.sha256(content_str.encode()).hexdigest()

    def is_processed(self, record_key: str) -> bool:
        return record_key in self.processed_keys

    def has_changes(self, record_key: str, new_hash: str) -> bool:
        old_hash = self.record_hashes.get(record_key)
        return old_hash != new_hash

    def mark_processed(self, record_key: str, content_hash: str):
        self.processed_keys.add(record_key)
        self.record_hashes[record_key] = content_hash
        self._save_state()

    def create_output_batch(self) -> str:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        batch_id = f"batch_{timestamp}"
        batch_dir = self.output_dir / batch_id
        batch_dir.mkdir(parents=True, exist_ok=True)
        return str(batch_dir)

    def get_latest_batch(self) -> Optional[str]:
        batch_dirs = sorted(
            [d for d in self.output_dir.iterdir() if d.is_dir() and d.name.startswith("batch_")],
            key=lambda d: d.name,
        )
        return str(batch_dirs[-1]) if batch_dirs else None

    def get_all_batches(self) -> List[str]:
        batch_dirs = sorted(
            [d for d in self.output_dir.iterdir() if d.is_dir() and d.name.startswith("batch_")],
            key=lambda d: d.name,
        )
        return [str(d) for d in batch_dirs]
