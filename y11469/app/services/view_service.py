from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.core.enums import RoleType, RecordStatus
from app.models.ledger import LedgerRecord, ProcessingChain, StatusHistory


class ViewService:
    def __init__(self, db: Session):
        self.db = db

    SENSITIVE_FIELDS = [
        "original_raw_data", "price_difference", "original_price",
        "modified_price", "adjust_reason"
    ]

    ROLE_FIELD_PERMISSIONS = {
        RoleType.DESIGNER: {
            "allowed": ["style_code", "style_name", "version", "designer", "pattern_maker",
                       "sample_maker", "fabric_code", "fabric_name", "fabric_quantity",
                       "status", "remarks", "created_at", "updated_at"],
            "masked": ["warehouse_keeper", "adjust_reason"],
        },
        RoleType.PATTERN_MAKER: {
            "allowed": ["style_code", "style_name", "version", "pattern_maker",
                       "fabric_code", "fabric_name", "fabric_quantity", "status",
                       "remarks", "created_at"],
            "masked": ["designer", "sample_maker", "warehouse_keeper", "adjust_reason"],
        },
        RoleType.SAMPLE_MAKER: {
            "allowed": ["style_code", "style_name", "version", "sample_maker",
                       "fabric_name", "fabric_quantity", "status", "remarks"],
            "masked": ["designer", "pattern_maker", "warehouse_keeper", "fabric_code", "adjust_reason"],
        },
        RoleType.WAREHOUSE: {
            "allowed": ["style_code", "version", "fabric_code", "fabric_name",
                       "fabric_quantity", "warehouse_keeper", "status"],
            "masked": ["designer", "pattern_maker", "sample_maker", "style_name", "adjust_reason"],
        },
        RoleType.QUALITY: {
            "allowed": ["style_code", "style_name", "version", "status", "remarks",
                       "fabric_name", "fabric_quantity", "created_at"],
            "masked": ["designer", "pattern_maker", "sample_maker", "warehouse_keeper", "adjust_reason"],
        },
        RoleType.BRAND_PLANNER: {
            "allowed": ["style_code", "style_name", "version", "status", "fabric_name",
                       "fabric_quantity", "designer", "pattern_maker", "sample_maker",
                       "created_at", "updated_at", "manual_adjusted", "adjust_count"],
            "masked": ["adjust_reason", "warehouse_keeper"],
        },
        RoleType.AUDITOR: {
            "allowed": ["*"],
            "masked": [],
        },
        RoleType.ADMIN: {
            "allowed": ["*"],
            "masked": [],
        },
    }

    def mask_sensitive_data(self, data: Dict[str, Any], role: str) -> Dict[str, Any]:
        permissions = self.ROLE_FIELD_PERMISSIONS.get(role)
        if not permissions:
            permissions = self.ROLE_FIELD_PERMISSIONS[RoleType.QUALITY]

        if permissions["allowed"] == ["*"]:
            return data

        result = {}
        for key, value in data.items():
            if key in permissions["masked"]:
                result[key] = "***"
            elif key in permissions["allowed"]:
                if isinstance(value, dict):
                    result[key] = self.mask_sensitive_data(value, role)
                elif isinstance(value, list):
                    result[key] = [
                        self.mask_sensitive_data(item, role) if isinstance(item, dict) else item
                        for item in value
                    ]
                else:
                    result[key] = value
        return result

    def get_role_view(
        self,
        role: str,
        style_code: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        query = self.db.query(LedgerRecord).filter(LedgerRecord.is_deleted == False)

        if style_code:
            query = query.filter(LedgerRecord.style_code.like(f"%{style_code}%"))
        if status:
            query = query.filter(LedgerRecord.status == status)

        role_based_filters = {
            RoleType.DESIGNER: lambda q: q,
            RoleType.PATTERN_MAKER: lambda q: q,
            RoleType.SAMPLE_MAKER: lambda q: q,
            RoleType.WAREHOUSE: lambda q: q.filter(LedgerRecord.fabric_quantity > 0),
            RoleType.BRAND_PLANNER: lambda q: q.filter(
                LedgerRecord.status.in_([
                    RecordStatus.AUDIT_ONLY,
                    RecordStatus.FROZEN,
                    RecordStatus.EXPORTED
                ])
            ),
        }

        if role in role_based_filters:
            query = role_based_filters[role](query)

        total = query.count()
        records = query.order_by(LedgerRecord.updated_at.desc()) \
            .offset((page - 1) * page_size) \
            .limit(page_size) \
            .all()

        masked_records = []
        for record in records:
            record_dict = self._record_to_dict(record)
            masked_records.append(self.mask_sensitive_data(record_dict, role))

        return {
            "role": role,
            "page": page,
            "page_size": page_size,
            "total": total,
            "records": masked_records,
        }

    def _record_to_dict(self, record: LedgerRecord) -> Dict[str, Any]:
        return {
            "id": record.id,
            "record_no": record.record_no,
            "style_code": record.style_code,
            "style_name": record.style_name,
            "version": record.version,
            "parent_version_id": record.parent_version_id,
            "status": record.status,
            "current_role": record.current_role,
            "designer": record.designer,
            "pattern_maker": record.pattern_maker,
            "sample_maker": record.sample_maker,
            "warehouse_keeper": record.warehouse_keeper,
            "fabric_code": record.fabric_code,
            "fabric_name": record.fabric_name,
            "fabric_quantity": record.fabric_quantity,
            "fabric_unit": record.fabric_unit,
            "fabric_status": record.fabric_status,
            "is_frozen": record.is_frozen,
            "frozen_at": record.frozen_at.isoformat() if record.frozen_at else None,
            "frozen_by": record.frozen_by,
            "freeze_reason": record.freeze_reason,
            "manual_adjusted": record.manual_adjusted,
            "adjust_count": record.adjust_count,
            "last_adjusted_at": record.last_adjusted_at.isoformat() if record.last_adjusted_at else None,
            "last_adjusted_by": record.last_adjusted_by,
            "adjust_reason": record.adjust_reason,
            "export_count": record.export_count,
            "last_exported_at": record.last_exported_at.isoformat() if record.last_exported_at else None,
            "created_at": record.created_at.isoformat() if record.created_at else None,
            "updated_at": record.updated_at.isoformat() if record.updated_at else None,
            "remarks": record.remarks,
        }

    def get_brand_planner_dashboard(self) -> Dict[str, Any]:
        total_records = self.db.query(LedgerRecord).filter(
            LedgerRecord.is_deleted == False
        ).count()

        status_breakdown = self.db.query(
            LedgerRecord.status,
            LedgerRecord.id
        ).filter(LedgerRecord.is_deleted == False).all()

        status_counts = {}
        for status, _ in status_breakdown:
            status_counts[status] = status_counts.get(status, 0) + 1

        manual_adjusted_count = self.db.query(LedgerRecord).filter(
            LedgerRecord.manual_adjusted == True,
            LedgerRecord.is_deleted == False
        ).count()

        frozen_count = self.db.query(LedgerRecord).filter(
            LedgerRecord.is_frozen == True,
            LedgerRecord.is_deleted == False
        ).count()

        chains_with_issues = self.db.query(ProcessingChain).filter(
            ProcessingChain.has_old_fabric_issue == True
        ).count()

        recent_changes = self.db.query(StatusHistory).order_by(
            StatusHistory.operated_at.desc()
        ).limit(10).all()

        change_list = []
        for change in recent_changes:
            change_list.append({
                "time": change.operated_at.isoformat(),
                "operator": change.operator,
                "role": change.operator_role,
                "from_status": change.from_status,
                "to_status": change.to_status,
                "reason": change.transition_reason,
            })

        return {
            "overview": {
                "total_records": total_records,
                "manual_adjusted_count": manual_adjusted_count,
                "frozen_count": frozen_count,
                "chains_with_issues": chains_with_issues,
            },
            "status_breakdown": status_counts,
            "recent_changes": change_list,
        }

    def get_change_audit_trail(self, record_id: int) -> List[Dict[str, Any]]:
        history = self.db.query(StatusHistory).filter(
            StatusHistory.ledger_record_id == record_id
        ).order_by(StatusHistory.operated_at).all()

        trail = []
        for h in history:
            trail.append({
                "sequence": len(trail) + 1,
                "time": h.operated_at.isoformat(),
                "operator": h.operator,
                "operator_role": h.operator_role,
                "from_status": h.from_status,
                "to_status": h.to_status,
                "reason": h.transition_reason,
                "has_extra_info": bool(h.extra_info),
            })
        return trail

    def export_records(
        self,
        record_ids: List[int],
        mask_sensitive: bool = True,
        operator_role: str = RoleType.AUDITOR
    ) -> List[Dict[str, Any]]:
        records = self.db.query(LedgerRecord).filter(
            LedgerRecord.id.in_(record_ids),
            LedgerRecord.is_deleted == False
        ).all()

        exported_data = []
        for record in records:
            record_dict = self._record_to_dict(record)
            record_dict["status_history"] = [
                {
                    "time": h.operated_at.isoformat(),
                    "operator": h.operator,
                    "role": h.operator_role,
                    "from": h.from_status,
                    "to": h.to_status,
                    "reason": h.transition_reason,
                }
                for h in record.status_history
            ]

            if mask_sensitive:
                record_dict = self.mask_sensitive_data(record_dict, operator_role)

            record_dict["_exported_at"] = __import__("datetime").datetime.utcnow().isoformat()
            record_dict["_masked"] = mask_sensitive

            exported_data.append(record_dict)

        return exported_data
