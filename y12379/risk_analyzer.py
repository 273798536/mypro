from typing import List, Dict, Any
from collections import defaultdict
from models import RiskAlert, RiskType, PreOrder, VersionItem, SleeveInventory


class RiskAnalyzer:
    def __init__(self):
        self.version_mismatch_alerts: List[RiskAlert] = []
        self.signed_shortage_alerts: List[RiskAlert] = []
        self.order_split_alerts: List[RiskAlert] = []

    def analyze_all_risks(
        self,
        pre_orders: List[PreOrder],
        version_list: List[VersionItem],
        sleeve_inventory: List[SleeveInventory],
        matching_result: Dict[str, Dict]
    ) -> Dict[str, List[RiskAlert]]:
        self.version_mismatch_alerts = []
        self.signed_shortage_alerts = []
        self.order_split_alerts = []

        self._analyze_version_mismatch(pre_orders, matching_result)
        self._analyze_signed_shortage(pre_orders, matching_result)
        self._analyze_order_split(pre_orders, matching_result)

        return {
            "version_mismatch": self.version_mismatch_alerts,
            "signed_shortage": self.signed_shortage_alerts,
            "order_split": self.order_split_alerts,
            "all": self.version_mismatch_alerts + self.signed_shortage_alerts + self.order_split_alerts
        }

    def _analyze_version_mismatch(
        self,
        pre_orders: List[PreOrder],
        matching_result: Dict[str, Dict]
    ):
        risk_counter = 1
        grouped_mismatches = defaultdict(lambda: {
            "album_name": "",
            "version": "",
            "is_signed": False,
            "orders": [],
            "total_qty": 0,
            "reason": ""
        })

        for order in pre_orders:
            key = f"{order.album_name}|{order.version}|{'是' if order.is_signed else '否'}"
            match_data = matching_result.get(key, {})

            if not match_data.get("version_matched", False):
                group_key = f"{order.album_name}|{order.version}"
                grouped_mismatches[group_key]["album_name"] = order.album_name
                grouped_mismatches[group_key]["version"] = order.version
                grouped_mismatches[group_key]["is_signed"] = order.is_signed
                grouped_mismatches[group_key]["orders"].append(order.order_id)
                grouped_mismatches[group_key]["total_qty"] += order.quantity
                grouped_mismatches[group_key]["reason"] = match_data.get("mismatch_reason", "未知原因")

        for group_key, data in grouped_mismatches.items():
            alert = RiskAlert(
                risk_id=f"VM{risk_counter:04d}",
                risk_type=RiskType.VERSION_MISMATCH,
                album_name=data["album_name"],
                version=data["version"],
                description=f"版本漏配: {data['reason']}，涉及 {len(data['orders'])} 个订单",
                affected_orders=data["orders"],
                shortage_quantity=data["total_qty"]
            )
            self.version_mismatch_alerts.append(alert)
            risk_counter += 1

    def _analyze_signed_shortage(
        self,
        pre_orders: List[PreOrder],
        matching_result: Dict[str, Dict]
    ):
        risk_counter = 1
        signed_orders = [o for o in pre_orders if o.is_signed]
        grouped_shortages = defaultdict(lambda: {
            "album_name": "",
            "version": "",
            "orders": [],
            "demand_qty": 0,
            "available_qty": 0,
            "shortage_qty": 0
        })

        for order in signed_orders:
            key = f"{order.album_name}|{order.version}|是"
            match_data = matching_result.get(key, {})
            available_qty = match_data.get("available_qty", 0)
            shortage_qty = max(0, order.quantity - available_qty)

            if shortage_qty > 0:
                group_key = f"{order.album_name}|{order.version}"
                grouped_shortages[group_key]["album_name"] = order.album_name
                grouped_shortages[group_key]["version"] = order.version
                grouped_shortages[group_key]["orders"].append(order.order_id)
                grouped_shortages[group_key]["demand_qty"] += order.quantity
                grouped_shortages[group_key]["available_qty"] = available_qty
                grouped_shortages[group_key]["shortage_qty"] += shortage_qty

        for group_key, data in grouped_shortages.items():
            alert = RiskAlert(
                risk_id=f"SS{risk_counter:04d}",
                risk_type=RiskType.SIGNED_SHORTAGE,
                album_name=data["album_name"],
                version=data["version"],
                description=f"签名版缺货: 需求 {data['demand_qty']}，可用 {data['available_qty']}，缺口 {data['shortage_qty']}",
                affected_orders=data["orders"],
                shortage_quantity=data["shortage_qty"]
            )
            self.signed_shortage_alerts.append(alert)
            risk_counter += 1

    def _analyze_order_split(
        self,
        pre_orders: List[PreOrder],
        matching_result: Dict[str, Dict]
    ):
        risk_counter = 1

        for order in pre_orders:
            key = f"{order.album_name}|{order.version}|{'是' if order.is_signed else '否'}"
            match_data = matching_result.get(key, {})
            available_qty = match_data.get("available_qty", 0)

            if 0 < available_qty < order.quantity:
                alert = RiskAlert(
                    risk_id=f"OS{risk_counter:04d}",
                    risk_type=RiskType.ORDER_SPLIT,
                    album_name=order.album_name,
                    version=order.version,
                    description=f"订单 {order.order_id} 需拆分: 总量 {order.quantity}，可发 {available_qty}，剩余 {order.quantity - available_qty}",
                    affected_orders=[order.order_id],
                    shortage_quantity=order.quantity - available_qty
                )
                self.order_split_alerts.append(alert)
                risk_counter += 1

    def get_risk_summary(self) -> Dict[str, Any]:
        return {
            "total_risks": len(self.version_mismatch_alerts) + len(self.signed_shortage_alerts) + len(self.order_split_alerts),
            "version_mismatch_count": len(self.version_mismatch_alerts),
            "version_mismatch_orders": sum(len(a.affected_orders) for a in self.version_mismatch_alerts),
            "signed_shortage_count": len(self.signed_shortage_alerts),
            "signed_shortage_qty": sum(a.shortage_quantity for a in self.signed_shortage_alerts),
            "order_split_count": len(self.order_split_alerts),
            "order_split_qty": sum(a.shortage_quantity for a in self.order_split_alerts)
        }

    def get_risks_by_type(self, risk_type: RiskType) -> List[RiskAlert]:
        if risk_type == RiskType.VERSION_MISMATCH:
            return self.version_mismatch_alerts
        elif risk_type == RiskType.SIGNED_SHORTAGE:
            return self.signed_shortage_alerts
        elif risk_type == RiskType.ORDER_SPLIT:
            return self.order_split_alerts
        return []
