import uuid
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import defaultdict

from models import (
    Order, OrderItem, IssueRecord, IssueType,
    InventoryLock, BatchTracking, ShippingReview,
    TraceRecord, GiftStatus, OrderStatus, InventoryItem
)


class SignatureTracker:
    def __init__(self):
        self.signature_map: Dict[str, List[Dict]] = defaultdict(list)
        self.duplicate_signatures: List[IssueRecord] = []
        self.inventory_items: Dict[str, InventoryItem] = {}
        self.inventory_locks: List[InventoryLock] = []
        self.batch_trackings: List[BatchTracking] = []
        self.shipping_reviews: List[ShippingReview] = []

    def track_order_signatures(self, order: Order) -> List[IssueRecord]:
        issues = []
        
        for item in order.items:
            if item.signature_number:
                key = f"{item.sku}:{item.signature_number}"
                
                existing_entries = self.signature_map[key]
                
                self.signature_map[key].append({
                    'order_id': order.order_id,
                    'order_item_id': item.order_item_id,
                    'sku': item.sku,
                    'signature_number': item.signature_number,
                    'customer_name': order.customer.name,
                    'order_date': order.order_date
                })
                
                if len(self.signature_map[key]) > 1:
                    for entry in self.signature_map[key]:
                        duplicate_issue = IssueRecord(
                            issue_id=str(uuid.uuid4()),
                            issue_type=IssueType.SIGNATURE_DUPLICATE,
                            order_id=entry['order_id'],
                            sku=entry['sku'],
                            signature_number=entry['signature_number'],
                            description=f"签名号重复: SKU {item.sku} 的签名号 #{item.signature_number} 已被多个订单使用",
                            source_data={
                                'duplicate_count': len(self.signature_map[key]),
                                'all_orders': [e['order_id'] for e in self.signature_map[key]],
                                'customer_names': [e['customer_name'] for e in self.signature_map[key]]
                            }
                        )
                        issues.append(duplicate_issue)
                        self.duplicate_signatures.append(duplicate_issue)
        
        return issues

    def detect_duplicates(self, orders: List[Order]) -> List[IssueRecord]:
        self.signature_map.clear()
        self.duplicate_signatures.clear()
        
        all_issues = []
        for order in orders:
            issues = self.track_order_signatures(order)
            all_issues.extend(issues)
        
        return all_issues

    def get_duplicate_groups(self) -> Dict[str, List[Dict]]:
        return {k: v for k, v in self.signature_map.items() if len(v) > 1}


class GiftTracker:
    def __init__(self):
        self.gift_issues: List[IssueRecord] = []

    def check_gift_status(self, order: Order) -> List[IssueRecord]:
        issues = []
        
        for item in order.items:
            for gift in item.gifts:
                if gift.status == GiftStatus.OUT_OF_STOCK:
                    issue = IssueRecord(
                        issue_id=str(uuid.uuid4()),
                        issue_type=IssueType.GIFT_OUT_OF_STOCK,
                        order_id=order.order_id,
                        sku=item.sku,
                        description=f"赠品缺货: 订单 {order.order_id} 中商品 {item.title} 的赠品 {gift.name} 缺货",
                        source_data={
                            'gift_name': gift.name,
                            'gift_sku': gift.sku,
                            'gift_quantity': gift.quantity
                        }
                    )
                    issues.append(issue)
                    self.gift_issues.append(issue)
        
        return issues

    def detect_gift_issues(self, orders: List[Order]) -> List[IssueRecord]:
        self.gift_issues.clear()
        
        all_issues = []
        for order in orders:
            issues = self.check_gift_status(order)
            all_issues.extend(issues)
        
        return all_issues


class AddressChangeTracker:
    def __init__(self):
        self.address_issues: List[IssueRecord] = []

    def check_address_changes(self, order: Order) -> List[IssueRecord]:
        issues = []
        
        if order.status == OrderStatus.ADDRESS_CHANGED or order.original_address:
            original_addr = order.original_address or order.shipping_address
            issue = IssueRecord(
                issue_id=str(uuid.uuid4()),
                issue_type=IssueType.ADDRESS_CHANGED,
                order_id=order.order_id,
                description=f"订单改址: 订单 {order.order_id} 的收货地址已变更",
                source_data={
                    'original_address': {
                        'street': original_addr.street,
                        'city': original_addr.city,
                        'state': original_addr.state,
                        'zip_code': original_addr.zip_code,
                        'country': original_addr.country
                    },
                    'new_address': {
                        'street': order.shipping_address.street,
                        'city': order.shipping_address.city,
                        'state': order.shipping_address.state,
                        'zip_code': order.shipping_address.zip_code,
                        'country': order.shipping_address.country
                    },
                    'customer_name': order.customer.name
                }
            )
            issues.append(issue)
            self.address_issues.append(issue)
        
        return issues

    def detect_address_changes(self, orders: List[Order]) -> List[IssueRecord]:
        self.address_issues.clear()
        
        all_issues = []
        for order in orders:
            issues = self.check_address_changes(order)
            all_issues.extend(issues)
        
        return all_issues


class TraceabilityManager:
    def __init__(self):
        self.traces: Dict[str, TraceRecord] = {}

    def create_inventory_lock(self, order: Order, item: OrderItem) -> InventoryLock:
        lock = InventoryLock(
            lock_id=str(uuid.uuid4()),
            order_id=order.order_id,
            sku=item.sku,
            signature_number=item.signature_number,
            quantity=item.quantity,
            locked_at=datetime.now(),
            locked_by="System",
            notes=f"为订单 {order.order_id} 锁定库存: {item.title}"
        )
        return lock

    def create_batch_tracking(self, sku: str, signature_numbers: List[str]) -> BatchTracking:
        batch = BatchTracking(
            batch_id=str(uuid.uuid4()),
            sku=sku,
            signature_numbers=signature_numbers,
            received_date=datetime.now(),
            supplier="Default Supplier",
            total_quantity=len(signature_numbers),
            quality_check_passed=True
        )
        return batch

    def create_shipping_review(self, order: Order, approver: str = "Store Owner") -> ShippingReview:
        items_verified = [item.sku for item in order.items]
        signature_numbers_verified = [
            item.signature_number for item in order.items 
            if item.signature_number
        ]
        gifts_verified = [
            gift.name for item in order.items 
            for gift in item.gifts
        ]
        
        issues_found = []
        for item in order.items:
            for gift in item.gifts:
                if gift.status == GiftStatus.OUT_OF_STOCK:
                    issues_found.append(f"赠品缺货: {gift.name}")
        
        review = ShippingReview(
            review_id=str(uuid.uuid4()),
            order_id=order.order_id,
            reviewer=approver,
            review_date=datetime.now(),
            items_verified=items_verified,
            gifts_verified=gifts_verified,
            signature_numbers_verified=signature_numbers_verified,
            issues_found=issues_found,
            approved=len(issues_found) == 0
        )
        return review

    def build_trace(self, order: Order, issues: List[IssueRecord]) -> TraceRecord:
        inventory_locks = []
        batch_tracking = []
        
        signature_batches: Dict[str, List[str]] = defaultdict(list)
        
        for item in order.items:
            lock = self.create_inventory_lock(order, item)
            inventory_locks.append(lock)
            
            if item.signature_number:
                signature_batches[item.sku].append(item.signature_number)
        
        for sku, sigs in signature_batches.items():
            batch = self.create_batch_tracking(sku, sigs)
            batch_tracking.append(batch)
        
        shipping_review = self.create_shipping_review(order)
        
        order_issues = [i for i in issues if i.order_id == order.order_id]
        
        trace = TraceRecord(
            order_id=order.order_id,
            order=order,
            inventory_locks=inventory_locks,
            batch_tracking=batch_tracking,
            shipping_review=shipping_review,
            issues=order_issues
        )
        
        self.traces[order.order_id] = trace
        return trace

    def get_trace(self, order_id: str) -> Optional[TraceRecord]:
        return self.traces.get(order_id)


class RecordStoreTracker:
    def __init__(self):
        self.signature_tracker = SignatureTracker()
        self.gift_tracker = GiftTracker()
        self.address_tracker = AddressChangeTracker()
        self.trace_manager = TraceabilityManager()
        self.all_issues: List[IssueRecord] = []

    def process_orders(self, orders: List[Order]) -> Dict:
        self.all_issues.clear()
        
        signature_issues = self.signature_tracker.detect_duplicates(orders)
        self.all_issues.extend(signature_issues)
        
        gift_issues = self.gift_tracker.detect_gift_issues(orders)
        self.all_issues.extend(gift_issues)
        
        address_issues = self.address_tracker.detect_address_changes(orders)
        self.all_issues.extend(address_issues)
        
        traces = []
        for order in orders:
            trace = self.trace_manager.build_trace(order, self.all_issues)
            traces.append(trace)
        
        return {
            'total_orders': len(orders),
            'total_issues': len(self.all_issues),
            'signature_duplicates': len(signature_issues),
            'gift_out_of_stock': len(gift_issues),
            'address_changes': len(address_issues),
            'traces': traces,
            'issues': self.all_issues
        }

    def filter_issues(self, issue_type: Optional[IssueType] = None, 
                     sku: Optional[str] = None, 
                     reviewed: Optional[bool] = None) -> List[IssueRecord]:
        filtered = self.all_issues
        
        if issue_type:
            filtered = [i for i in filtered if i.issue_type == issue_type]
        
        if sku:
            filtered = [i for i in filtered if i.sku == sku]
        
        if reviewed is not None:
            filtered = [i for i in filtered if i.reviewed == reviewed]
        
        return filtered

    def get_orders_with_issues(self, issue_type: IssueType) -> List[str]:
        return list(set(
            i.order_id for i in self.all_issues 
            if i.issue_type == issue_type and i.order_id
        ))

    def mark_issue_reviewed(self, issue_id: str, reviewer: str, resolution: str) -> bool:
        for issue in self.all_issues:
            if issue.issue_id == issue_id:
                issue.reviewed = True
                issue.reviewer = reviewer
                issue.resolution = resolution
                return True
        return False

    def get_duplicate_details(self) -> Dict[str, List[Dict]]:
        return self.signature_tracker.get_duplicate_groups()
