import pandas as pd
from datetime import datetime
from typing import List, Tuple
from .models import (
    OrderRecord, ChannelContract, DailyRate, ValidationIssue,
    OrderType, ChannelType
)


class DataImporter:
    def __init__(self):
        self.issues: List[ValidationIssue] = []
    
    def _parse_date(self, date_str: str) -> datetime.date:
        for fmt in ['%Y-%m-%d', '%Y/%m/%d', '%d-%m-%Y', '%d/%m/%Y']:
            try:
                return datetime.strptime(str(date_str).strip(), fmt).date()
            except ValueError:
                continue
        raise ValueError(f"无法解析日期: {date_str}")
    
    def _parse_order_type(self, type_str: str) -> OrderType:
        type_map = {
            'full_day': OrderType.FULL_DAY,
            'full': OrderType.FULL_DAY,
            '全日房': OrderType.FULL_DAY,
            'half_day': OrderType.HALF_DAY,
            'half': OrderType.HALF_DAY,
            '半日房': OrderType.HALF_DAY,
            'hour_room': OrderType.HOUR_ROOM,
            'hour': OrderType.HOUR_ROOM,
            '钟点房': OrderType.HOUR_ROOM,
        }
        return type_map.get(str(type_str).strip().lower(), OrderType.FULL_DAY)
    
    def _parse_channel_type(self, type_str: str) -> ChannelType:
        type_map = {
            'ota': ChannelType.OTA,
            '团购': ChannelType.GROUPON,
            'groupon': ChannelType.GROUPON,
            '会员': ChannelType.MEMBER_DIRECT,
            'member': ChannelType.MEMBER_DIRECT,
            'member_direct': ChannelType.MEMBER_DIRECT,
            '直销': ChannelType.MEMBER_DIRECT,
        }
        return type_map.get(str(type_str).strip().lower(), ChannelType.OTA)
    
    def import_orders(self, filepath: str) -> Tuple[List[OrderRecord], List[ValidationIssue]]:
        self.issues = []
        orders = []
        
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"无法读取订单文件: {str(e)}",
                source_file=filepath
            ))
            return [], self.issues
        
        required_columns = ['order_id', 'channel', 'checkin_date', 'checkout_date', 'total_amount']
        missing_cols = [col for col in required_columns if col not in df.columns]
        
        if missing_cols:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"订单文件缺少必要列: {', '.join(missing_cols)}",
                source_file=filepath
            ))
            return [], self.issues
        
        for idx, row in df.iterrows():
            try:
                checkin = self._parse_date(row['checkin_date'])
                checkout = self._parse_date(row['checkout_date'])
                
                room_nights = float(row.get('room_nights', 0))
                if room_nights == 0:
                    room_nights = (checkout - checkin).days or 1
                
                order = OrderRecord(
                    order_id=str(row['order_id']),
                    channel=str(row['channel']),
                    channel_type=self._parse_channel_type(row.get('channel_type', 'ota')),
                    guest_name=str(row.get('guest_name', '')),
                    checkin_date=checkin,
                    checkout_date=checkout,
                    room_nights=room_nights,
                    order_type=self._parse_order_type(row.get('order_type', 'full_day')),
                    room_rate=float(row.get('room_rate', 0)),
                    total_amount=float(row.get('total_amount', 0)),
                    refund_amount=float(row.get('refund_amount', 0)),
                    refund_date=self._parse_date(row['refund_date']) if pd.notna(row.get('refund_date')) else None,
                    notes=str(row.get('notes', ''))
                )
                orders.append(order)
            except Exception as e:
                self.issues.append(ValidationIssue(
                    severity="warning",
                    message=f"第 {idx + 2} 行解析失败: {str(e)}",
                    source_file=filepath,
                    row_number=idx + 2,
                    order_id=str(row.get('order_id')) if 'order_id' in row else None
                ))
        
        return orders, self.issues
    
    def import_contracts(self, filepath: str) -> Tuple[List[ChannelContract], List[ValidationIssue]]:
        self.issues = []
        contracts = []
        
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"无法读取合同文件: {str(e)}",
                source_file=filepath
            ))
            return [], self.issues
        
        required_columns = ['channel', 'commission_rate']
        missing_cols = [col for col in required_columns if col not in df.columns]
        
        if missing_cols:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"合同文件缺少必要列: {', '.join(missing_cols)}",
                source_file=filepath
            ))
            return [], self.issues
        
        for idx, row in df.iterrows():
            try:
                contract = ChannelContract(
                    channel=str(row['channel']),
                    channel_type=self._parse_channel_type(row.get('channel_type', 'ota')),
                    commission_rate=float(row['commission_rate']),
                    half_day_commission_rate=float(row['half_day_commission_rate']) if pd.notna(row.get('half_day_commission_rate')) else None,
                    weekend_surcharge=float(row.get('weekend_surcharge', 0)),
                    holiday_surcharge=float(row.get('holiday_surcharge', 0)),
                    effective_from=self._parse_date(row['effective_from']) if pd.notna(row.get('effective_from')) else None,
                    effective_to=self._parse_date(row['effective_to']) if pd.notna(row.get('effective_to')) else None,
                    notes=str(row.get('notes', ''))
                )
                contracts.append(contract)
            except Exception as e:
                self.issues.append(ValidationIssue(
                    severity="warning",
                    message=f"第 {idx + 2} 行解析失败: {str(e)}",
                    source_file=filepath,
                    row_number=idx + 2
                ))
        
        return contracts, self.issues
    
    def import_rates(self, filepath: str) -> Tuple[List[DailyRate], List[ValidationIssue]]:
        self.issues = []
        rates = []
        
        try:
            df = pd.read_csv(filepath)
        except Exception as e:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"无法读取房价日历文件: {str(e)}",
                source_file=filepath
            ))
            return [], self.issues
        
        required_columns = ['rate_date', 'base_rate']
        missing_cols = [col for col in required_columns if col not in df.columns]
        
        if missing_cols:
            self.issues.append(ValidationIssue(
                severity="error",
                message=f"房价日历文件缺少必要列: {', '.join(missing_cols)}",
                source_file=filepath
            ))
            return [], self.issues
        
        for idx, row in df.iterrows():
            try:
                rate_date = self._parse_date(row['rate_date'])
                rates.append(DailyRate(
                    rate_date=rate_date,
                    base_rate=float(row['base_rate']),
                    is_weekend=bool(row.get('is_weekend', False)),
                    is_holiday=bool(row.get('is_holiday', False)),
                    holiday_name=str(row.get('holiday_name', ''))
                ))
            except Exception as e:
                self.issues.append(ValidationIssue(
                    severity="warning",
                    message=f"第 {idx + 2} 行解析失败: {str(e)}",
                    source_file=filepath,
                    row_number=idx + 2
                ))
        
        return rates, self.issues
