from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
from dataclasses import dataclass, field
import copy
from models import VersionSnapshot, PreOrder, VersionItem, SleeveInventory, ShippingItem, RiskAlert


@dataclass
class ChangeRecord:
    field: str
    old_value: Any
    new_value: Any
    change_type: str


class VersionHistoryManager:
    def __init__(self):
        self.snapshots: List[VersionSnapshot] = []
        self.snapshot_counter = 1

    def create_snapshot(
        self,
        version_list: List[VersionItem],
        pre_orders: List[PreOrder],
        sleeve_inventory: List[SleeveInventory],
        description: str = ""
    ) -> VersionSnapshot:
        snapshot = VersionSnapshot(
            snapshot_id=f"SNAP{self.snapshot_counter:04d}",
            snapshot_time=datetime.now(),
            version_list=copy.deepcopy(version_list),
            pre_orders=copy.deepcopy(pre_orders),
            sleeve_inventory=copy.deepcopy(sleeve_inventory),
            description=description or f"快照 {self.snapshot_counter}"
        )
        self.snapshots.append(snapshot)
        self.snapshot_counter += 1
        return snapshot

    def get_snapshot(self, snapshot_id: str) -> Optional[VersionSnapshot]:
        return next((s for s in self.snapshots if s.snapshot_id == snapshot_id), None)

    def list_snapshots(self) -> List[Dict]:
        return [s.to_dict() for s in self.snapshots]

    def compare_snapshots(
        self,
        snapshot_id_1: str,
        snapshot_id_2: str
    ) -> Dict[str, Any]:
        snap1 = self.get_snapshot(snapshot_id_1)
        snap2 = self.get_snapshot(snapshot_id_2)

        if not snap1 or not snap2:
            return {"error": "找不到指定的快照"}

        return {
            "snapshot1": snap1.to_dict(),
            "snapshot2": snap2.to_dict(),
            "version_changes": self._compare_version_lists(snap1.version_list, snap2.version_list),
            "order_changes": self._compare_pre_orders(snap1.pre_orders, snap2.pre_orders),
            "inventory_changes": self._compare_sleeve_inventory(snap1.sleeve_inventory, snap2.sleeve_inventory),
            "summary": self._generate_comparison_summary(snap1, snap2)
        }

    def _compare_version_lists(
        self,
        list1: List[VersionItem],
        list2: List[VersionItem]
    ) -> Dict[str, Any]:
        def get_key(v: VersionItem) -> str:
            return f"{v.album_name}|{v.version}|{'是' if v.is_signed else '否'}"

        dict1 = {get_key(v): v for v in list1}
        dict2 = {get_key(v): v for v in list2}

        added = [v.to_dict() for k, v in dict2.items() if k not in dict1]
        removed = [v.to_dict() for k, v in dict1.items() if k not in dict2]
        modified = []

        for key in dict1.keys() & dict2.keys():
            v1, v2 = dict1[key], dict2[key]
            changes = []
            if v1.pressing_quantity != v2.pressing_quantity:
                changes.append(ChangeRecord(
                    field="压盘数量",
                    old_value=v1.pressing_quantity,
                    new_value=v2.pressing_quantity,
                    change_type="修改"
                ))
            if v1.remarks != v2.remarks:
                changes.append(ChangeRecord(
                    field="备注",
                    old_value=v1.remarks,
                    new_value=v2.remarks,
                    change_type="修改"
                ))
            if changes:
                modified.append({
                    "key": key,
                    "album_name": v1.album_name,
                    "version": v1.version,
                    "is_signed": v1.is_signed,
                    "changes": [{"field": c.field, "old": c.old_value, "new": c.new_value} for c in changes]
                })

        return {
            "added_count": len(added),
            "removed_count": len(removed),
            "modified_count": len(modified),
            "added": added,
            "removed": removed,
            "modified": modified
        }

    def _compare_pre_orders(
        self,
        list1: List[PreOrder],
        list2: List[PreOrder]
    ) -> Dict[str, Any]:
        dict1 = {o.order_id: o for o in list1}
        dict2 = {o.order_id: o for o in list2}

        added = [o.to_dict() for k, o in dict2.items() if k not in dict1]
        removed = [o.to_dict() for k, o in dict1.items() if k not in dict2]
        modified = []

        for key in dict1.keys() & dict2.keys():
            o1, o2 = dict1[key], dict2[key]
            changes = []
            if o1.quantity != o2.quantity:
                changes.append({"field": "数量", "old": o1.quantity, "new": o2.quantity})
            if o1.status != o2.status:
                changes.append({"field": "状态", "old": o1.status.value, "new": o2.status.value})
            if changes:
                modified.append({
                    "order_id": key,
                    "changes": changes
                })

        return {
            "added_count": len(added),
            "removed_count": len(removed),
            "modified_count": len(modified),
            "added": added,
            "removed": removed,
            "modified": modified
        }

    def _compare_sleeve_inventory(
        self,
        list1: List[SleeveInventory],
        list2: List[SleeveInventory]
    ) -> Dict[str, Any]:
        def get_key(s: SleeveInventory) -> str:
            return f"{s.album_name}|{s.version}"

        dict1 = {get_key(s): s for s in list1}
        dict2 = {get_key(s): s for s in list2}

        added = [s.to_dict() for k, s in dict2.items() if k not in dict1]
        removed = [s.to_dict() for k, s in dict1.items() if k not in dict2]
        modified = []

        for key in dict1.keys() & dict2.keys():
            s1, s2 = dict1[key], dict2[key]
            changes = []
            if s1.quantity != s2.quantity:
                changes.append({"field": "库存数量", "old": s1.quantity, "new": s2.quantity})
            if s1.location != s2.location:
                changes.append({"field": "存放位置", "old": s1.location, "new": s2.location})
            if changes:
                modified.append({
                    "key": key,
                    "album_name": s1.album_name,
                    "version": s1.version,
                    "changes": changes
                })

        return {
            "added_count": len(added),
            "removed_count": len(removed),
            "modified_count": len(modified),
            "added": added,
            "removed": removed,
            "modified": modified
        }

    def _generate_comparison_summary(
        self,
        snap1: VersionSnapshot,
        snap2: VersionSnapshot
    ) -> Dict[str, Any]:
        v1_total = sum(v.pressing_quantity for v in snap1.version_list)
        v2_total = sum(v.pressing_quantity for v in snap2.version_list)

        o1_total = sum(o.quantity for o in snap1.pre_orders)
        o2_total = sum(o.quantity for o in snap2.pre_orders)

        s1_total = sum(s.quantity for s in snap1.sleeve_inventory)
        s2_total = sum(s.quantity for s in snap2.sleeve_inventory)

        return {
            "version_pressing_change": v2_total - v1_total,
            "order_quantity_change": o2_total - o1_total,
            "sleeve_inventory_change": s2_total - s1_total,
            "time_diff": (snap2.snapshot_time - snap1.snapshot_time).total_seconds()
        }

    def rollback_to_snapshot(
        self,
        snapshot_id: str
    ) -> Tuple[List[VersionItem], List[PreOrder], List[SleeveInventory]]:
        snapshot = self.get_snapshot(snapshot_id)
        if not snapshot:
            raise ValueError(f"快照 {snapshot_id} 不存在")

        return (
            copy.deepcopy(snapshot.version_list),
            copy.deepcopy(snapshot.pre_orders),
            copy.deepcopy(snapshot.sleeve_inventory)
        )

    def get_version_history(self, album_name: str, version: str) -> List[Dict]:
        history = []
        for snapshot in self.snapshots:
            for v in snapshot.version_list:
                if v.album_name == album_name and v.version == version:
                    history.append({
                        "snapshot_id": snapshot.snapshot_id,
                        "snapshot_time": snapshot.snapshot_time.strftime("%Y-%m-%d %H:%M:%S"),
                        "pressing_quantity": v.pressing_quantity,
                        "is_signed": v.is_signed,
                        "remarks": v.remarks
                    })
        return history
