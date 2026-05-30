"""

变更追踪器

记录人工修正的痕迹，保留修改历史和原因

"""

from datetime import datetime

from typing import List, Dict, Any, Optional

from dataclasses import dataclass, field

from enum import Enum

import json

class ActionType(Enum):

    CREATE = "创建"

    MODIFY = "修改"

    DELETE = "删除"

    MANUAL_EDIT = "人工调整"

    PARAMETER_CHANGE = "参数变更"

    INVENTORY_ADJUST = "库存调整"

    DUE_DATE_CHANGE = "交期变更"

@dataclass

class ChangeRecord:

    record_id: str

    action_type: ActionType

    timestamp: datetime

    user: str

    entity_type: str

    entity_id: str

    field_name: Optional[str]

    old_value: Optional[Any]

    new_value: Optional[Any]

    reason: str

    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:

        def serialize_value(v):

            if hasattr(v, "isoformat"):

                return v.isoformat()

            if hasattr(v, "to_dict"):

                return v.to_dict()

            return v

        return {

            "record_id": self.record_id,

            "action_type": self.action_type.value,

            "timestamp": self.timestamp.isoformat(),

            "user": self.user,

            "entity_type": self.entity_type,

            "entity_id": self.entity_id,

            "field_name": self.field_name,

            "old_value": serialize_value(self.old_value),

            "new_value": serialize_value(self.new_value),

            "reason": self.reason,

            "metadata": self.metadata,

        }

class ChangeTracer:

    def __init__(self):

        self._records: List[ChangeRecord] = []

        self._counter = 0

    def log_change(

        self,

        action_type: ActionType,

        entity_type: str,

        entity_id: str,

        field_name: Optional[str],

        old_value: Optional[Any],

        new_value: Optional[Any],

        reason: str = "",

        user: str = "system",

        metadata: Optional[Dict[str, Any]] = None,

    ) -> ChangeRecord:

        self._counter += 1

        record = ChangeRecord(

            record_id=f"CHG_{datetime.now().strftime('%Y%m%d')}_{self._counter:04d}",

            action_type=action_type,

            timestamp=datetime.now(),

            user=user,

            entity_type=entity_type,

            entity_id=entity_id,

            field_name=field_name,

            old_value=old_value,

            new_value=new_value,

            reason=reason,

            metadata=metadata or {},

        )

        self._records.append(record)

        return record

    def log_inventory_adjust(

        self,

        material_id: str,

        old_quantity: float,

        new_quantity: float,

        reason: str,

        user: str = "system",

    ) -> ChangeRecord:

        return self.log_change(

            action_type=ActionType.INVENTORY_ADJUST,

            entity_type="inventory",

            entity_id=material_id,

            field_name="quantity",

            old_value=old_quantity,

            new_value=new_quantity,

            reason=reason,

            user=user,

            metadata={

                "adjustment": new_quantity - old_quantity,

            },

        )

    def log_due_date_change(

        self,

        order_id: str,

        old_date: Any,

        new_date: Any,

        reason: str,

        user: str = "system",

    ) -> ChangeRecord:

        return self.log_change(

            action_type=ActionType.DUE_DATE_CHANGE,

            entity_type="order",

            entity_id=order_id,

            field_name="due_date",

            old_value=old_date,

            new_value=new_date,

            reason=reason,

            user=user,

        )

    def log_manual_edit(

        self,

        entity_type: str,

        entity_id: str,

        field_name: str,

        old_value: Any,

        new_value: Any,

        reason: str,

        user: str = "system",

    ) -> ChangeRecord:

        return self.log_change(

            action_type=ActionType.MANUAL_EDIT,

            entity_type=entity_type,

            entity_id=entity_id,

            field_name=field_name,

            old_value=old_value,

            new_value=new_value,

            reason=reason,

            user=user,

        )

    def get_records(

        self,

        entity_type: Optional[str] = None,

        entity_id: Optional[str] = None,

        action_type: Optional[ActionType] = None,

    ) -> List[ChangeRecord]:

        results = self._records

        if entity_type:

            results = [r for r in results if r.entity_type == entity_type]

        if entity_id:

            results = [r for r in results if r.entity_id == entity_id]

        if action_type:

            results = [r for r in results if r.action_type == action_type]

        return results

    def get_history(self) -> List[Dict[str, Any]]:

        return [r.to_dict() for r in self._records]

    def export_json(self, filepath: str):

        with open(filepath, "w", encoding="utf-8") as f:

            json.dump(self.get_history(), f, ensure_ascii=False, indent=2)

    def summarize(self) -> Dict[str, Any]:

        action_counts: Dict[str, int] = {}

        entity_counts: Dict[str, int] = {}

        user_counts: Dict[str, int] = {}

        for record in self._records:

            action_name = record.action_type.value

            action_counts[action_name] = action_counts.get(action_name, 0) + 1

            entity_counts[record.entity_type] = entity_counts.get(record.entity_type, 0) + 1

            user_counts[record.user] = user_counts.get(record.user, 0) + 1

        return {

            "total_changes": len(self._records),

            "action_counts": action_counts,

            "entity_counts": entity_counts,

            "user_counts": user_counts,

            "last_change": self._records[-1].timestamp.isoformat() if self._records else None,

        }

