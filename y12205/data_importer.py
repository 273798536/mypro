import csv
from datetime import datetime
from typing import List, Dict, Any, Optional
from models import (
    Order, OrderItem, GroupOwner, SubsidyRule, OrderStatus,
    generate_id
)


class DataImporter:
    def __init__(self):
        self.orders: List[Order] = []
        self.group_owners: List[GroupOwner] = []
        self.subsidy_rules: List[SubsidyRule] = []
        self.import_logs: List[Dict[str, Any]] = []

    def _safe_float(self, value, default=0.0):
        if value is None or value == '' or value == '0.0':
            return default
        try:
            return float(value)
        except (ValueError, TypeError):
            return default

    def _safe_str(self, value):
        if value is None or value == '':
            return None
        return value

    def _safe_datetime(self, value):
        if value is None or value == '' or value == '0.0':
            return None
        try:
            return datetime.fromisoformat(value)
        except (ValueError, TypeError):
            return None

    def import_orders_from_csv(self, filepath: str) -> List[Order]:
        orders = []
        order_items_map: Dict[str, List[OrderItem]] = {}
        order_base_data: Dict[str, Dict[str, Any]] = {}

        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                order_id = row['order_id']
                if order_id not in order_base_data:
                    order_base_data[order_id] = {
                        'user_id': row['user_id'],
                        'group_id': row['group_id'],
                        'order_time': datetime.fromisoformat(row['order_time']),
                        'total_amount': float(row['total_amount']),
                        'status': OrderStatus(row['status']),
                        'trace_link': self._safe_str(row.get('trace_link')),
                        'refund_amount': self._safe_float(row.get('refund_amount'), 0.0),
                        'refund_time': self._safe_datetime(row.get('refund_time')),
                        'original_group_id': self._safe_str(row.get('original_group_id')),
                    }
                    order_items_map[order_id] = []

                item = OrderItem(
                    item_id=row['item_id'],
                    product_id=row['product_id'],
                    product_name=row['product_name'],
                    product_category=row['product_category'],
                    quantity=int(row['quantity']),
                    unit_price=float(row['unit_price']),
                    subsidy_applied=self._safe_float(row.get('subsidy_applied'), 0.0),
                    trace_id=row.get('trace_id') if row.get('trace_id') else None
                )
                order_items_map[order_id].append(item)

        for order_id, base_data in order_base_data.items():
            order = Order(
                order_id=order_id,
                items=order_items_map[order_id],
                **base_data
            )
            orders.append(order)

        self.orders.extend(orders)
        self._log_import('orders', len(orders), filepath)
        return orders

    def import_group_owners_from_csv(self, filepath: str) -> List[GroupOwner]:
        owners = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                owner = GroupOwner(
                    owner_id=row['owner_id'],
                    name=row['name'],
                    group_id=row['group_id'],
                    group_name=row['group_name'],
                    commission_rate=float(row['commission_rate']),
                    join_date=datetime.fromisoformat(row['join_date']),
                    is_active=row.get('is_active', 'true').lower() == 'true'
                )
                owners.append(owner)

        self.group_owners.extend(owners)
        self._log_import('group_owners', len(owners), filepath)
        return owners

    def import_subsidy_rules_from_csv(self, filepath: str) -> List[SubsidyRule]:
        rules = []
        with open(filepath, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                rule = SubsidyRule(
                    rule_id=row['rule_id'],
                    rule_name=row['rule_name'],
                    product_category=row.get('product_category'),
                    min_order_amount=float(row.get('min_order_amount', 0)),
                    subsidy_type=row['subsidy_type'],
                    subsidy_value=float(row['subsidy_value']),
                    effective_date=datetime.fromisoformat(row['effective_date']),
                    expiry_date=datetime.fromisoformat(row['expiry_date']) if row.get('expiry_date') else None,
                    version=int(row.get('version', 1)),
                    is_active=row.get('is_active', 'true').lower() == 'true',
                    parent_rule_id=row.get('parent_rule_id')
                )
                rules.append(rule)

        self.subsidy_rules.extend(rules)
        self._log_import('subsidy_rules', len(rules), filepath)
        return rules

    def _log_import(self, data_type: str, count: int, filepath: str):
        self.import_logs.append({
            'timestamp': datetime.now(),
            'data_type': data_type,
            'count': count,
            'filepath': filepath
        })

    def get_import_summary(self) -> Dict[str, int]:
        return {
            'orders': len(self.orders),
            'group_owners': len(self.group_owners),
            'subsidy_rules': len(self.subsidy_rules)
        }

    def get_owner_by_group(self, group_id: str) -> Optional[GroupOwner]:
        for owner in self.group_owners:
            if owner.group_id == group_id and owner.is_active:
                return owner
        return None

    def get_applicable_rules(self, order_time: datetime, category: str = None) -> List[SubsidyRule]:
        applicable = []
        for rule in self.subsidy_rules:
            if not rule.is_active:
                continue
            if rule.effective_date > order_time:
                continue
            if rule.expiry_date and rule.expiry_date < order_time:
                continue
            if category and rule.product_category and rule.product_category != category:
                continue
            applicable.append(rule)
        return applicable
