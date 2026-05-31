import csv
import re
from datetime import datetime
from typing import List, Tuple, Dict, Optional, Any
import uuid

from models import (
    Order, OrderItem, Customer, Address, GiftItem, GiftStatus,
    BadRowRecord, IssueRecord, IssueType, OrderStatus
)


class DataImporter:
    REQUIRED_COLUMNS = [
        'order_id', 'customer_name', 'sku', 'title', 'quantity'
    ]
    
    OPTIONAL_COLUMNS = [
        'signature_number', 'gift_name', 'gift_sku', 'gift_quantity',
        'street', 'city', 'state', 'zip_code', 'country',
        'customer_id', 'email', 'phone', 'order_date', 'notes',
        'original_street', 'original_city', 'original_state',
        'original_zip_code', 'original_country'
    ]

    def __init__(self):
        self.bad_rows: List[BadRowRecord] = []
        self.issues: List[IssueRecord] = []
        self.orders: List[Order] = []

    def is_empty_row(self, row: Dict[str, str]) -> bool:
        return not any(value.strip() for value in row.values() if value)

    def is_comment_row(self, row: Dict[str, str]) -> bool:
        first_key = next(iter(row.keys()), '')
        first_value = row.get(first_key, '').strip()
        return first_value.startswith('#') or first_value.startswith('//') or first_value.startswith('--')

    def validate_row(self, row: Dict[str, str], row_number: int) -> Tuple[bool, List[str]]:
        issues = []
        
        for col in self.REQUIRED_COLUMNS:
            if col not in row or not row.get(col, '').strip():
                issues.append(f"缺失必需列: {col}")
        
        if row.get('signature_number') and not row.get('signature_number').strip():
            issues.append("签名编号为空")
        
        return len(issues) == 0, issues

    def parse_date(self, date_str: str) -> Optional[datetime]:
        if not date_str or not date_str.strip():
            return None
        
        formats = [
            '%Y-%m-%d', '%Y/%m/%d', '%m/%d/%Y', '%d/%m/%Y',
            '%Y-%m-%d %H:%M:%S', '%Y/%m/%d %H:%M:%S'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str.strip(), fmt)
            except ValueError:
                continue
        
        return None

    def extract_signature_number(self, value: str) -> Optional[str]:
        if not value or not value.strip():
            return None
        
        cleaned = value.strip()
        
        patterns = [
            r'[#№]?\s*(\d{1,8})',
            r'SIG\s*[:-]?\s*(\w+)',
            r'Signature\s*[:-]?\s*(\w+)',
            r'签名\s*[:：]?\s*(\w+)'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, cleaned, re.IGNORECASE)
            if match:
                return match.group(1)
        
        return cleaned if cleaned else None

    def parse_gift_info(self, row: Dict[str, str]) -> List[GiftItem]:
        gifts = []
        
        gift_name = row.get('gift_name', '').strip()
        gift_sku = row.get('gift_sku', '').strip()
        
        if gift_name or gift_sku:
            gift_status = GiftStatus.INCLUDED
            
            if '缺货' in gift_name or 'out of stock' in gift_name.lower() or '缺货' in row.get('notes', ''):
                gift_status = GiftStatus.OUT_OF_STOCK
            
            try:
                quantity = int(row.get('gift_quantity', '1'))
            except (ValueError, TypeError):
                quantity = 1
            
            gifts.append(GiftItem(
                gift_id=str(uuid.uuid4()),
                name=gift_name or '未知赠品',
                sku=gift_sku or 'UNKNOWN-GIFT',
                quantity=quantity,
                status=gift_status
            ))
        
        return gifts

    def parse_address(self, row: Dict[str, str], prefix: str = '') -> Optional[Address]:
        street_key = f'{prefix}street' if prefix else 'street'
        city_key = f'{prefix}city' if prefix else 'city'
        state_key = f'{prefix}state' if prefix else 'state'
        zip_key = f'{prefix}zip_code' if prefix else 'zip_code'
        country_key = f'{prefix}country' if prefix else 'country'
        
        street = row.get(street_key, '').strip()
        city = row.get(city_key, '').strip()
        
        if not street or not city:
            return None
        
        return Address(
            address_id=str(uuid.uuid4()),
            street=street,
            city=city,
            state=row.get(state_key, '').strip(),
            zip_code=row.get(zip_key, '').strip(),
            country=row.get(country_key, '').strip(),
            is_original=(prefix == 'original_')
        )

    def parse_order_from_row(self, row: Dict[str, str], row_number: int) -> Optional[Order]:
        try:
            order_id = row['order_id'].strip()
            customer_name = row['customer_name'].strip()
            sku = row['sku'].strip()
            title = row['title'].strip()
            
            try:
                quantity = int(row.get('quantity', '1'))
            except (ValueError, TypeError):
                quantity = 1
            
            customer = Customer(
                customer_id=row.get('customer_id', '').strip() or f"CUST-{order_id}",
                name=customer_name,
                email=row.get('email', '').strip() or None,
                phone=row.get('phone', '').strip() or None
            )
            
            signature_number = self.extract_signature_number(row.get('signature_number', ''))
            
            gifts = self.parse_gift_info(row)
            
            order_item = OrderItem(
                order_item_id=str(uuid.uuid4()),
                sku=sku,
                title=title,
                quantity=quantity,
                unit_price=0.0,
                signature_number=signature_number,
                gifts=gifts
            )
            
            shipping_address = self.parse_address(row)
            if not shipping_address:
                shipping_address = Address(
                    address_id=str(uuid.uuid4()),
                    street='未知地址',
                    city='未知城市',
                    state='',
                    zip_code='',
                    country=''
                )
            
            original_address = self.parse_address(row, 'original_')
            
            status = OrderStatus.PENDING
            if original_address:
                status = OrderStatus.ADDRESS_CHANGED
            
            order_date = self.parse_date(row.get('order_date', ''))
            
            return Order(
                order_id=order_id,
                customer=customer,
                items=[order_item],
                shipping_address=shipping_address,
                original_address=original_address,
                status=status,
                order_date=order_date,
                notes=row.get('notes', '').strip() or None
            )
            
        except Exception as e:
            self.issues.append(IssueRecord(
                issue_id=str(uuid.uuid4()),
                issue_type=IssueType.BAD_ROW,
                order_id=row.get('order_id'),
                sku=row.get('sku'),
                signature_number=row.get('signature_number'),
                description=f"解析行失败: {str(e)}",
                source_row=row_number,
                source_data=row
            ))
            return None

    def import_csv(self, file_path: str) -> Tuple[List[Order], List[BadRowRecord], List[IssueRecord]]:
        self.bad_rows = []
        self.issues = []
        self.orders = []
        
        order_map: Dict[str, Order] = {}
        
        with open(file_path, 'r', encoding='utf-8-sig') as f:
            content = f.read()
        
        lines = content.splitlines()
        
        if not lines:
            return self.orders, self.bad_rows, self.issues
        
        header = lines[0].split(',')
        header = [h.strip().strip('"\'') for h in header]
        
        for row_num, line in enumerate(lines[1:], start=2):
            if not line.strip():
                self.bad_rows.append(BadRowRecord(
                    row_number=row_num,
                    raw_data=line,
                    issues=["空行"],
                    source_file=file_path
                ))
                continue
            
            try:
                reader = csv.DictReader([line], fieldnames=header)
                row = next(reader)
                
                row = {k: (v.strip('"\'') if v else '') for k, v in row.items()}
                
                if self.is_empty_row(row):
                    self.bad_rows.append(BadRowRecord(
                        row_number=row_num,
                        raw_data=line,
                        issues=["空数据行"],
                        source_file=file_path
                    ))
                    continue
                
                if self.is_comment_row(row):
                    self.bad_rows.append(BadRowRecord(
                        row_number=row_num,
                        raw_data=line,
                        issues=["备注/注释行"],
                        source_file=file_path
                    ))
                    continue
                
                is_valid, row_issues = self.validate_row(row, row_num)
                if not is_valid:
                    self.bad_rows.append(BadRowRecord(
                        row_number=row_num,
                        raw_data=line,
                        issues=row_issues,
                        source_file=file_path
                    ))
                    for issue in row_issues:
                        self.issues.append(IssueRecord(
                            issue_id=str(uuid.uuid4()),
                            issue_type=IssueType.MISSING_COLUMN,
                            order_id=row.get('order_id'),
                            sku=row.get('sku'),
                            description=issue,
                            source_row=row_num,
                            source_data=row
                        ))
                    continue
                
                order = self.parse_order_from_row(row, row_num)
                if order:
                    if order.order_id in order_map:
                        existing_order = order_map[order.order_id]
                        existing_order.items.extend(order.items)
                        if order.original_address and not existing_order.original_address:
                            existing_order.original_address = order.original_address
                            existing_order.status = OrderStatus.ADDRESS_CHANGED
                    else:
                        order_map[order.order_id] = order
                
            except Exception as e:
                self.bad_rows.append(BadRowRecord(
                    row_number=row_num,
                    raw_data=line,
                    issues=[f"解析错误: {str(e)}"],
                    source_file=file_path
                ))
        
        self.orders = list(order_map.values())
        return self.orders, self.bad_rows, self.issues
