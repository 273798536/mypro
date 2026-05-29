"""数据持久化"""
import json
import os
from datetime import datetime
from typing import Dict, List, Any

from .models import (
    WriteOffStatus, OccupationStatus, CorrectionTrace
)
from .engine import InvoiceFinanceEngine


class DataPersister:
    """将引擎状态回写到数据目录"""

    def persist_write_offs(self, engine: InvoiceFinanceEngine, data_dir: str) -> None:
        """回写核销申请状态"""
        filepath = os.path.join(data_dir, 'write_offs.json')
        existing = []
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing = json.load(f)

        existing_by_id = {item['id']: item for item in existing}

        for wo_id, wo in engine.write_offs.items():
            entry = existing_by_id.get(wo_id, {})
            entry['id'] = wo.id
            entry['source'] = wo.source.value
            entry['apply_no'] = wo.apply_no
            entry['invoice_id'] = wo.invoice_id
            entry['amount'] = wo.amount
            entry['apply_date'] = wo.apply_date.isoformat()
            entry['status'] = wo.status.value
            if wo.approved_amount is not None:
                entry['approved_amount'] = wo.approved_amount
            if wo.approved_at:
                entry['approved_at'] = wo.approved_at.isoformat()
            if wo.approver:
                entry['approver'] = wo.approver
            if wo.rejection_reason:
                entry['rejection_reason'] = wo.rejection_reason
            if wo.corrections:
                entry['corrections'] = [
                    self._correction_to_dict(c) for c in wo.corrections
                ]
            if wo.created_by:
                entry['created_by'] = wo.created_by
            existing_by_id[wo_id] = entry

        result = list(existing_by_id.values())
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

    def persist_occupations(self, engine: InvoiceFinanceEngine, data_dir: str) -> None:
        """回写额度占用记录"""
        filepath = os.path.join(data_dir, 'occupations.json')
        existing = []
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                existing = json.load(f)

        existing_by_id = {item['id']: item for item in existing}

        for occ_id, occ in engine.occupations.items():
            entry = existing_by_id.get(occ_id, {})
            entry['id'] = occ.id
            entry['source'] = occ.source.value
            entry['occupation_no'] = occ.occupation_no
            entry['invoice_id'] = occ.invoice_id
            entry['amount'] = occ.amount
            entry['status'] = occ.status.value
            if occ.locked_at:
                entry['locked_at'] = occ.locked_at.isoformat()
            if occ.occupied_at:
                entry['occupied_at'] = occ.occupied_at.isoformat()
            if occ.released_at:
                entry['released_at'] = occ.released_at.isoformat()
            if occ.release_reason:
                entry['release_reason'] = occ.release_reason
            if occ.corrections:
                entry['corrections'] = [
                    self._correction_to_dict(c) for c in occ.corrections
                ]
            if occ.created_by:
                entry['created_by'] = occ.created_by
            existing_by_id[occ_id] = entry

        result = list(existing_by_id.values())
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

    def _correction_to_dict(self, c: CorrectionTrace) -> Dict[str, Any]:
        return {
            'trace_id': c.trace_id,
            'field_name': c.field_name,
            'old_value': str(c.old_value),
            'new_value': str(c.new_value),
            'operator': c.operator,
            'operated_at': c.operated_at.isoformat(),
            'reason': c.reason,
            'source': c.source.value
        }
