from typing import Any, Dict, List
from app.models import UserRole


class FieldPermissionService:
    BATCH_FIELDS_BY_ROLE = {
        UserRole.READ_ONLY: {
            "base": ["id", "batch_no", "pot_no", "product_name", "production_date", "status", "created_at"],
            "nested": ["sample_labels", "temperature_records", "store_complaints", "affected_stores"]
        },
        UserRole.DATA_ENTRY: {
            "base": ["id", "batch_no", "pot_no", "product_name", "production_date", "status",
                     "created_by", "created_at", "updated_at"],
            "nested": ["sample_labels", "temperature_records", "store_complaints", "affected_stores"]
        },
        UserRole.REVIEWER: {
            "base": ["id", "batch_no", "pot_no", "product_name", "production_date", "status",
                     "created_by", "created_at", "updated_at",
                     "reviewed_by", "reviewed_at", "review_result",
                     "before_freeze_status", "freeze_reason"],
            "nested": ["sample_labels", "temperature_records", "store_complaints", "affected_stores",
                       "status_history"]
        },
        UserRole.SUPERVISOR: {
            "base": ["id", "batch_no", "pot_no", "product_name", "production_date", "status",
                     "before_freeze_status", "freeze_reason",
                     "created_by", "created_at", "updated_at",
                     "reviewed_by", "reviewed_at", "review_result", "review_comment",
                     "settled_at", "settled_by",
                     "withdrawn_at", "withdrawn_by", "withdraw_reason",
                     "archived_at"],
            "nested": ["sample_labels", "temperature_records", "store_complaints", "affected_stores",
                       "supervisor_comments", "status_history", "dirty_records"]
        }
    }

    BATCH_LIST_FIELDS_BY_ROLE = {
        UserRole.READ_ONLY: ["id", "batch_no", "pot_no", "product_name", "production_date", "status", "created_at"],
        UserRole.DATA_ENTRY: ["id", "batch_no", "pot_no", "product_name", "production_date", "status", "created_at",
                              "sample_label_count", "temperature_record_count", "store_complaint_count"],
        UserRole.REVIEWER: ["id", "batch_no", "pot_no", "product_name", "production_date", "status", "created_at",
                            "sample_label_count", "temperature_record_count", "store_complaint_count",
                            "affected_store_count"],
        UserRole.SUPERVISOR: ["id", "batch_no", "pot_no", "product_name", "production_date", "status", "created_at",
                              "sample_label_count", "temperature_record_count", "store_complaint_count",
                              "affected_store_count"]
    }

    @classmethod
    def filter_batch_fields(cls, batch_data: Dict[str, Any], role: UserRole) -> Dict[str, Any]:
        allowed = cls.BATCH_FIELDS_BY_ROLE.get(role, cls.BATCH_FIELDS_BY_ROLE[UserRole.READ_ONLY])
        result = {}

        for field in allowed["base"]:
            if field in batch_data:
                result[field] = batch_data[field]

        for nested in allowed["nested"]:
            if nested in batch_data:
                result[nested] = batch_data[nested]

        return result

    @classmethod
    def filter_batch_list_fields(cls, batch_data: Dict[str, Any], role: UserRole) -> Dict[str, Any]:
        allowed = cls.BATCH_LIST_FIELDS_BY_ROLE.get(role, cls.BATCH_LIST_FIELDS_BY_ROLE[UserRole.READ_ONLY])
        return {k: v for k, v in batch_data.items() if k in allowed}

    @classmethod
    def get_visible_fields_for_role(cls, role: UserRole) -> Dict[str, List[str]]:
        return cls.BATCH_FIELDS_BY_ROLE.get(role, cls.BATCH_FIELDS_BY_ROLE[UserRole.READ_ONLY])
