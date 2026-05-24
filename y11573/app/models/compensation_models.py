from typing import List, Optional
from app.models.base_model import BaseModel


class CompensationApproval(BaseModel):
    table_name = "compensation_approvals"
    primary_key = "id"

    @classmethod
    def get_by_ticket_id(cls, ticket_id: int) -> List['CompensationApproval']:
        return cls.query("ticket_id = ?", (ticket_id,), order_by="version DESC")

    @classmethod
    def get_latest_by_ticket_id(cls, ticket_id: int) -> Optional['CompensationApproval']:
        results = cls.query(
            "ticket_id = ?",
            (ticket_id,),
            order_by="version DESC",
            limit=1
        )
        return results[0] if results else None

    @classmethod
    def get_pending_approvals(cls) -> List['CompensationApproval']:
        return cls.query("approval_status = 'pending'", order_by="applied_at DESC")

    @classmethod
    def create_revision(cls, original_id: int, **kwargs) -> 'CompensationApproval':
        original = cls.get_by_id(original_id)
        if not original:
            raise ValueError(f"Original approval {original_id} not found")
        
        new_version = original.version + 1 if hasattr(original, 'version') else 2
        data = {
            'ticket_id': original.ticket_id,
            'compensation_type': original.compensation_type,
            'requested_amount': original.requested_amount,
            'approved_amount': original.approved_amount,
            'approval_status': 'pending',
            'sla_rule_id': original.sla_rule_id,
            'calculation_basis': original.calculation_basis,
            'applicant': original.applicant,
            'version': new_version,
            'is_revised': 1,
            'original_approval_id': original_id,
            **kwargs
        }
        return cls.create(**data)
