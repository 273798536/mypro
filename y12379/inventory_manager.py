from typing import List, Dict, Tuple, Optional
from datetime import datetime
from collections import defaultdict
from models import (
    PreOrder, VersionItem, SleeveInventory, ShippingItem,
    RiskAlert, RiskType, OrderStatus
)


class InventoryManager:
    def __init__(self):
        self.pre_orders: List[PreOrder] = []
        self.version_list: List[VersionItem] = []
        self.sleeve_inventory: List[SleeveInventory] = []
        self.shipping_items: List[ShippingItem] = []
        self.risk_alerts: List[RiskAlert] = []
        self._version_cache: Dict[str, Dict] = {}
        self._last_update: Optional[datetime] = None

    def load_pre_orders(self, orders: List[PreOrder]):
        self.pre_orders = orders
        self._invalidate_cache()

    def load_version_list(self, versions: List[VersionItem]):
        self.version_list = versions
        self._invalidate_cache()

    def load_sleeve_inventory(self, inventory: List[SleeveInventory]):
        self.sleeve_inventory = inventory
        self._invalidate_cache()

    def _invalidate_cache(self):
        self._version_cache = {}
        self._last_update = datetime.now()

    def _get_version_key(self, album_name: str, version: str, is_signed: bool) -> str:
        return f"{album_name}|{version}|{'是' if is_signed else '否'}"

    def aggregate_inventory(self) -> Dict[str, Dict]:
        cache_key = "aggregate"
        if cache_key in self._version_cache:
            return self._version_cache[cache_key]

        result = defaultdict(lambda: {
            "album_name": "",
            "version": "",
            "is_signed": False,
            "pre_order_qty": 0,
            "pressing_qty": 0,
            "sleeve_qty": 0,
            "available_qty": 0,
            "shortage_qty": 0,
            "orders": []
        })

        sleeve_inventory_map = {}
        for sleeve in self.sleeve_inventory:
            sleeve_key = f"{sleeve.album_name}|{sleeve.version}"
            sleeve_inventory_map[sleeve_key] = sleeve_inventory_map.get(sleeve_key, 0) + sleeve.quantity

        for order in self.pre_orders:
            key = self._get_version_key(order.album_name, order.version, order.is_signed)
            result[key]["album_name"] = order.album_name
            result[key]["version"] = order.version
            result[key]["is_signed"] = order.is_signed
            result[key]["pre_order_qty"] += order.quantity
            result[key]["orders"].append(order.order_id)

            sleeve_key = f"{order.album_name}|{order.version}"
            result[key]["sleeve_qty"] = sleeve_inventory_map.get(sleeve_key, 0)

        for version in self.version_list:
            key = self._get_version_key(version.album_name, version.version, version.is_signed)
            result[key]["album_name"] = version.album_name
            result[key]["version"] = version.version
            result[key]["is_signed"] = version.is_signed
            result[key]["pressing_qty"] += version.pressing_quantity

            sleeve_key = f"{version.album_name}|{version.version}"
            result[key]["sleeve_qty"] = sleeve_inventory_map.get(sleeve_key, 0)

        for key, data in result.items():
            data["available_qty"] = min(data["pressing_qty"], data["sleeve_qty"])
            data["shortage_qty"] = max(0, data["pre_order_qty"] - data["available_qty"])

        self._version_cache[cache_key] = dict(result)
        return dict(result)

    def match_versions(self) -> Dict[str, Dict]:
        cache_key = "matching"
        if cache_key in self._version_cache:
            return self._version_cache[cache_key]

        aggregated = self.aggregate_inventory()
        matching_result = {}

        for key, data in aggregated.items():
            can_fulfill = data["pressing_qty"] > 0 and data["sleeve_qty"] > 0
            matching_result[key] = {
                **data,
                "version_matched": can_fulfill,
                "has_pressing": data["pressing_qty"] > 0,
                "has_sleeve": data["sleeve_qty"] > 0,
                "mismatch_reason": self._get_mismatch_reason(data)
            }

        self._version_cache[cache_key] = matching_result
        return matching_result

    def _get_mismatch_reason(self, data: Dict) -> str:
        reasons = []
        if data["pressing_qty"] == 0:
            reasons.append("无压盘记录")
        if data["sleeve_qty"] == 0:
            reasons.append("无封套库存")
        return "; ".join(reasons) if reasons else ""

    def calculate_available_to_ship(self) -> Dict[str, int]:
        matching = self.match_versions()
        available = {}
        for key, data in matching.items():
            if data["version_matched"]:
                available[key] = min(
                    data["pressing_qty"],
                    data["sleeve_qty"],
                    data["pre_order_qty"] if data["pre_order_qty"] > 0 else float('inf')
                )
        return available

    def get_order_allocation_details(self) -> List[Dict]:
        matching = self.match_versions()
        details = []

        for order in self.pre_orders:
            key = self._get_version_key(order.album_name, order.version, order.is_signed)
            match_data = matching.get(key, {})

            detail = {
                "order_id": order.order_id,
                "customer_name": order.customer_name,
                "album_name": order.album_name,
                "version": order.version,
                "is_signed": order.is_signed,
                "order_qty": order.quantity,
                "pressing_available": match_data.get("pressing_qty", 0),
                "sleeve_available": match_data.get("sleeve_qty", 0),
                "can_ship": match_data.get("version_matched", False),
                "mismatch_reason": match_data.get("mismatch_reason", ""),
                "shortage_qty": max(0, order.quantity - match_data.get("available_qty", 0))
            }
            details.append(detail)

        return details

    def generate_shipping_plan(self) -> Tuple[List[ShippingItem], List[RiskAlert]]:
        self.risk_alerts = []
        self.shipping_items = []
        shipping_counter = 1
        risk_counter = 1

        matching = self.match_versions()
        allocation_details = self.get_order_allocation_details()

        for detail in allocation_details:
            order = next((o for o in self.pre_orders if o.order_id == detail["order_id"]), None)
            if not order:
                continue

            key = self._get_version_key(order.album_name, order.version, order.is_signed)
            match_data = matching.get(key, {})

            if detail["can_ship"] and detail["shortage_qty"] == 0:
                shipping_item = ShippingItem(
                    shipping_id=f"SH{shipping_counter:04d}",
                    order_id=order.order_id,
                    customer_name=order.customer_name,
                    album_name=order.album_name,
                    version=order.version,
                    quantity=order.quantity,
                    is_signed=order.is_signed,
                    source_records={
                        "预售订单": order.order_id,
                        "版本清单匹配": "成功",
                        "封套库存": "充足",
                        "匹配数量": order.quantity
                    }
                )
                self.shipping_items.append(shipping_item)
                shipping_counter += 1

            elif detail["shortage_qty"] > 0 and detail["can_ship"]:
                available_qty = min(match_data.get("available_qty", 0), order.quantity)
                if available_qty > 0:
                    shipping_item = ShippingItem(
                        shipping_id=f"SH{shipping_counter:04d}",
                        order_id=order.order_id,
                        customer_name=order.customer_name,
                        album_name=order.album_name,
                        version=order.version,
                        quantity=available_qty,
                        is_signed=order.is_signed,
                        status="部分发货",
                        source_records={
                            "预售订单": order.order_id,
                            "版本清单匹配": "成功",
                            "封套库存": "部分充足",
                            "匹配数量": available_qty,
                            "缺货数量": detail["shortage_qty"]
                        }
                    )
                    self.shipping_items.append(shipping_item)
                    shipping_counter += 1

                if order.is_signed:
                    risk = RiskAlert(
                        risk_id=f"RK{risk_counter:04d}",
                        risk_type=RiskType.SIGNED_SHORTAGE,
                        album_name=order.album_name,
                        version=order.version,
                        description=f"签名版缺货，订单 {order.order_id} 需求 {order.quantity}，可用 {available_qty}",
                        affected_orders=[order.order_id],
                        shortage_quantity=detail["shortage_qty"]
                    )
                    self.risk_alerts.append(risk)
                    risk_counter += 1

                if order.quantity > available_qty > 0:
                    risk = RiskAlert(
                        risk_id=f"RK{risk_counter:04d}",
                        risk_type=RiskType.ORDER_SPLIT,
                        album_name=order.album_name,
                        version=order.version,
                        description=f"订单 {order.order_id} 需拆分发货，先发 {available_qty}，剩余 {order.quantity - available_qty}",
                        affected_orders=[order.order_id],
                        shortage_quantity=order.quantity - available_qty
                    )
                    self.risk_alerts.append(risk)
                    risk_counter += 1

            else:
                if not match_data.get("version_matched", False):
                    risk = RiskAlert(
                        risk_id=f"RK{risk_counter:04d}",
                        risk_type=RiskType.VERSION_MISMATCH,
                        album_name=order.album_name,
                        version=order.version,
                        description=f"版本漏配: {match_data.get('mismatch_reason', '未知原因')}",
                        affected_orders=[order.order_id],
                        shortage_quantity=order.quantity
                    )
                    self.risk_alerts.append(risk)
                    risk_counter += 1

        return self.shipping_items, self.risk_alerts

    def get_inventory_summary(self) -> Dict:
        aggregated = self.aggregate_inventory()
        return {
            "total_pre_orders": len(self.pre_orders),
            "total_pre_order_qty": sum(o.quantity for o in self.pre_orders),
            "total_versions": len(self.version_list),
            "total_pressing_qty": sum(v.pressing_quantity for v in self.version_list),
            "total_sleeve_qty": sum(s.quantity for s in self.sleeve_inventory),
            "total_shortage_qty": sum(d["shortage_qty"] for d in aggregated.values()),
            "matched_versions": sum(1 for d in aggregated.values() if d["pressing_qty"] > 0 and d["sleeve_qty"] > 0),
            "unmatched_versions": sum(1 for d in aggregated.values() if not (d["pressing_qty"] > 0 and d["sleeve_qty"] > 0)),
            "last_update": self._last_update.strftime("%Y-%m-%d %H:%M:%S") if self._last_update else None
        }
