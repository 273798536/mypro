import json
import os
import hashlib
from datetime import datetime
from typing import List, Dict, Optional, Any
from dataclasses import asdict
from pathlib import Path

from models import (
    TrackOwnership,
    PlatformPlayback,
    NeighboringRightsContract,
    SettlementBatch,
    SettlementDetail,
    SettlementReport,
    DataIssue,
    RecordStatus
)


class StorageManager:
    def __init__(self, base_dir: str = "./data"):
        self.base_dir = Path(base_dir)
        self._ensure_directories()

    def _ensure_directories(self):
        directories = [
            "ownerships",
            "playbacks",
            "contracts",
            "batches",
            "details",
            "reports",
            "issues"
        ]
        for directory in directories:
            (self.base_dir / directory).mkdir(parents=True, exist_ok=True)

    def save_ownership(self, ownership: TrackOwnership) -> str:
        data = asdict(ownership)
        data['right_type'] = ownership.right_type.value
        data['status'] = ownership.status.value
        data['effective_start'] = str(ownership.effective_start)
        data['effective_end'] = str(ownership.effective_end) if ownership.effective_end else None
        data['created_at'] = str(ownership.created_at)
        data['updated_at'] = str(ownership.updated_at)

        file_path = self.base_dir / "ownerships" / f"{ownership.track_id}_{ownership.owner_id}_{ownership.version}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def save_playback(self, playback: PlatformPlayback) -> str:
        data = asdict(playback)
        data['status'] = playback.status.value
        data['created_at'] = str(playback.created_at)
        data['updated_at'] = str(playback.updated_at)

        file_path = self.base_dir / "playbacks" / f"{playback.playback_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def save_contract(self, contract: NeighboringRightsContract) -> str:
        data = asdict(contract)
        data['right_type'] = contract.right_type.value
        data['status'] = contract.status.value
        data['effective_start'] = str(contract.effective_start)
        data['effective_end'] = str(contract.effective_end) if contract.effective_end else None
        data['signed_date'] = str(contract.signed_date) if contract.signed_date else None
        data['created_at'] = str(contract.created_at)
        data['updated_at'] = str(contract.updated_at)

        file_path = self.base_dir / "contracts" / f"{contract.contract_id}_{contract.version}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def save_batch(self, batch: SettlementBatch) -> str:
        data = asdict(batch)
        data['created_at'] = str(batch.created_at)
        data['completed_at'] = str(batch.completed_at) if batch.completed_at else None

        file_path = self.base_dir / "batches" / f"{batch.batch_id}.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def save_details(self, details: List[SettlementDetail], batch_id: str) -> str:
        details_data = []
        for detail in details:
            data = asdict(detail)
            data['right_type'] = detail.right_type.value
            data['issues'] = [self._issue_to_dict(i) for i in detail.issues]
            details_data.append(data)

        file_path = self.base_dir / "details" / f"{batch_id}_details.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(details_data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def save_report(self, report: SettlementReport) -> str:
        details_summary = [{
            'detail_id': d.detail_id,
            'track_id': d.track_id,
            'track_name': d.track_name,
            'owner_name': d.owner_name,
            'settlement_amount': d.settlement_amount,
            'has_issues': len(d.issues) > 0
        } for d in report.details]

        data = {
            'batch_id': report.batch_id,
            'settlement_month': report.settlement_month,
            'generated_at': str(report.generated_at),
            'summary': report.summary,
            'details_summary': details_summary,
            'issues': [self._issue_to_dict(i) for i in report.issues],
            'handling_suggestions': report.handling_suggestions,
            'supplementary_impacts': report.supplementary_impacts
        }

        file_path = self.base_dir / "reports" / f"{report.batch_id}_report.json"
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return str(file_path)

    def _issue_to_dict(self, issue: DataIssue) -> Dict:
        return {
            'issue_id': issue.issue_id,
            'conflict_type': issue.conflict_type.value if issue.conflict_type else None,
            'severity': issue.severity,
            'description': issue.description,
            'related_records': issue.related_records,
            'suggestion': issue.suggestion,
            'affected_amount': issue.affected_amount,
            'created_at': str(issue.created_at),
            'resolved': issue.resolved,
            'resolution_note': issue.resolution_note
        }

    def batch_exists(self, batch_id: str) -> bool:
        file_path = self.base_dir / "batches" / f"{batch_id}.json"
        return file_path.exists()

    def get_batch(self, batch_id: str) -> Optional[Dict]:
        file_path = self.base_dir / "batches" / f"{batch_id}.json"
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def get_details(self, batch_id: str) -> Optional[List[Dict]]:
        file_path = self.base_dir / "details" / f"{batch_id}_details.json"
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def get_report(self, batch_id: str) -> Optional[Dict]:
        file_path = self.base_dir / "reports" / f"{batch_id}_report.json"
        if file_path.exists():
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        return None

    def list_batches(self, settlement_month: Optional[str] = None) -> List[str]:
        batch_files = list((self.base_dir / "batches").glob("*.json"))
        batches = []
        for file_path in batch_files:
            with open(file_path, 'r', encoding='utf-8') as f:
                batch_data = json.load(f)
                if settlement_month is None or batch_data.get('settlement_month') == settlement_month:
                    batches.append(batch_data)
        return sorted(batches, key=lambda x: x.get('created_at', ''), reverse=True)

    def get_batch_by_month(self, settlement_month: str) -> Optional[Dict]:
        batches = self.list_batches(settlement_month)
        return batches[0] if batches else None

    def generate_data_hash(self, data: Dict) -> str:
        data_str = json.dumps(data, sort_keys=True, ensure_ascii=False)
        return hashlib.md5(data_str.encode('utf-8')).hexdigest()

    def save_all(
        self,
        ownerships: List[TrackOwnership],
        playbacks: List[PlatformPlayback],
        contracts: List[NeighboringRightsContract],
        batch: SettlementBatch,
        details: List[SettlementDetail],
        report: SettlementReport
    ) -> Dict[str, Any]:
        for ownership in ownerships:
            self.save_ownership(ownership)
        for playback in playbacks:
            self.save_playback(playback)
        for contract in contracts:
            self.save_contract(contract)

        self.save_batch(batch)
        self.save_details(details, batch.batch_id)
        self.save_report(report)

        return {
            'batch_id': batch.batch_id,
            'ownerships_saved': len(ownerships),
            'playbacks_saved': len(playbacks),
            'contracts_saved': len(contracts),
            'details_saved': len(details)
        }


class IdempotencyManager:
    def __init__(self, storage_manager: StorageManager):
        self.storage = storage_manager
        self.checkpoint_file = self.storage.base_dir / "idempotency_checkpoints.json"
        self._load_checkpoints()

    def _load_checkpoints(self):
        if self.checkpoint_file.exists():
            with open(self.checkpoint_file, 'r', encoding='utf-8') as f:
                self.checkpoints = json.load(f)
        else:
            self.checkpoints = {}

    def _save_checkpoints(self):
        with open(self.checkpoint_file, 'w', encoding='utf-8') as f:
            json.dump(self.checkpoints, f, ensure_ascii=False, indent=2)

    def generate_run_checksum(
        self,
        settlement_month: str,
        ownerships: List[TrackOwnership],
        playbacks: List[PlatformPlayback],
        contracts: List[NeighboringRightsContract]
    ) -> str:
        data = {
            'settlement_month': settlement_month,
            'ownerships': [f"{o.track_id}_{o.owner_id}_{o.version}_{o.status.value}" for o in ownerships],
            'playbacks': [f"{p.playback_id}_{p.play_count}_{p.revenue_amount}" for p in playbacks if p.settlement_month == settlement_month],
            'contracts': [f"{c.contract_id}_{c.version}_{c.status.value}" for c in contracts]
        }
        return self.storage.generate_data_hash(data)

    def get_existing_batch_id(self, checksum: str) -> Optional[str]:
        return self.checkpoints.get(checksum)

    def register_run(self, checksum: str, batch_id: str):
        self.checkpoints[checksum] = batch_id
        self._save_checkpoints()

    def is_month_processed(self, settlement_month: str) -> bool:
        existing_batch = self.storage.get_batch_by_month(settlement_month)
        return existing_batch is not None

    def safe_calculate_settlement(
        self,
        settlement_month: str,
        ownerships: List[TrackOwnership],
        playbacks: List[PlatformPlayback],
        contracts: List[NeighboringRightsContract],
        calculate_func
    ) -> Dict[str, Any]:
        checksum = self.generate_run_checksum(settlement_month, ownerships, playbacks, contracts)
        existing_batch_id = self.get_existing_batch_id(checksum)

        if existing_batch_id and self.storage.batch_exists(existing_batch_id):
            batch_data = self.storage.get_batch(existing_batch_id)
            details_data = self.storage.get_details(existing_batch_id)
            report_data = self.storage.get_report(existing_batch_id)
            return {
                'is_new': False,
                'batch_id': existing_batch_id,
                'batch': batch_data,
                'details': details_data,
                'report': report_data,
                'message': f'检测到相同数据已计算，返回历史结果: {existing_batch_id}'
            }

        batch, details, issues = calculate_func(
            settlement_month=settlement_month,
            ownerships=ownerships,
            playbacks=playbacks,
            contracts=contracts
        )

        self.register_run(checksum, batch.batch_id)

        return {
            'is_new': True,
            'batch_id': batch.batch_id,
            'batch': batch,
            'details': details,
            'issues': issues,
            'message': f'新计算完成: {batch.batch_id}'
        }
