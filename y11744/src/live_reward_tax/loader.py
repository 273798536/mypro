"""数据加载模块"""
import os
import csv
from pathlib import Path
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Tuple, Optional, Any
import pandas as pd

from .models import (
    SourceTrace, Streamer, RewardRecord, PlatformShareVersion,
    RefundRecord, TaxRule
)


class DataLoadError(Exception):
    """数据加载错误，包含来源位置信息"""
    def __init__(self, message: str, source_file: str,
                 line_number: Optional[int] = None,
                 sheet_name: Optional[str] = None,
                 raw_data: Optional[Dict] = None):
        self.source_file = source_file
        self.line_number = line_number
        self.sheet_name = sheet_name
        self.raw_data = raw_data or {}
        loc_parts = []
        if sheet_name:
            loc_parts.append(f"Sheet:{sheet_name}")
        if line_number:
            loc_parts.append(f"行{line_number}")
        loc_str = f"[{', '.join(loc_parts)}]" if loc_parts else ""
        super().__init__(f"{source_file}{loc_str}: {message}")


def _parse_decimal(value: Any, field_name: str) -> Decimal:
    """解析Decimal，处理空值和格式问题"""
    if value is None or value == '':
        raise ValueError(f"{field_name}不能为空")
    if isinstance(value, Decimal):
        return value
    try:
        return Decimal(str(value).replace(',', '').strip())
    except (ValueError, ArithmeticError):
        raise ValueError(f"{field_name}格式无效: {value}")


def _parse_date(value: Any, field_name: str) -> date:
    """解析日期"""
    if value is None or value == '':
        raise ValueError(f"{field_name}不能为空")
    if isinstance(value, date):
        return value
    try:
        if isinstance(value, datetime):
            return value.date()
        return datetime.strptime(str(value).strip(), '%Y-%m-%d').date()
    except ValueError:
        try:
            return datetime.strptime(str(value).strip(), '%Y/%m/%d').date()
        except ValueError:
            raise ValueError(f"{field_name}格式无效，请使用YYYY-MM-DD: {value}")


def _parse_datetime(value: Any, field_name: str) -> datetime:
    """解析日期时间"""
    if value is None or value == '':
        raise ValueError(f"{field_name}不能为空")
    if isinstance(value, datetime):
        return value
    try:
        return datetime.strptime(str(value).strip(), '%Y-%m-%d %H:%M:%S')
    except ValueError:
        try:
            return datetime.strptime(str(value).strip(), '%Y-%m-%d %H:%M')
        except ValueError:
            try:
                return datetime.strptime(str(value).strip(), '%Y-%m-%d')
            except ValueError:
                raise ValueError(f"{field_name}格式无效，请使用YYYY-MM-DD HH:MM:SS: {value}")


class DataLoader:
    """数据加载器"""
    
    REQUIRED_FILES = {
        'streamers': ['streamers.csv', 'streamers.xlsx'],
        'rewards': ['rewards.csv', 'rewards.xlsx'],
        'platform_shares': ['platform_shares.csv', 'platform_shares.xlsx'],
        'refunds': ['refunds.csv', 'refunds.xlsx'],
        'tax_rules': ['tax_rules.csv', 'tax_rules.xlsx'],
    }
    
    def __init__(self, input_dir: str):
        self.input_dir = Path(input_dir)
        if not self.input_dir.exists():
            raise FileNotFoundError(f"输入目录不存在: {input_dir}")
        self.errors: List[DataLoadError] = []
        self.warnings: List[str] = []
    
    def _find_file(self, file_type: str) -> Optional[Path]:
        """查找指定类型的文件"""
        for filename in self.REQUIRED_FILES[file_type]:
            filepath = self.input_dir / filename
            if filepath.exists():
                return filepath
        return None
    
    def _read_file(self, filepath: Path) -> Tuple[List[Dict], str]:
        """读取CSV或Excel文件，返回数据行列表和sheet名(Excel)"""
        ext = filepath.suffix.lower()
        if ext == '.csv':
            with open(filepath, 'r', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f)
                return list(reader), None
        elif ext in ('.xlsx', '.xls'):
            df = pd.read_excel(filepath)
            return df.to_dict('records'), filepath.stem
        else:
            raise DataLoadError(f"不支持的文件格式: {ext}", str(filepath))
    
    def load_streamers(self) -> List[Streamer]:
        """加载主播信息"""
        filepath = self._find_file('streamers')
        if not filepath:
            raise DataLoadError("缺少主播信息文件(streamers.csv/xlsx)", str(self.input_dir))
        
        rows, sheet_name = self._read_file(filepath)
        streamers: List[Streamer] = []
        
        for idx, row in enumerate(rows, start=2):
            try:
                source = SourceTrace(
                    source_file=str(filepath),
                    line_number=idx,
                    sheet_name=sheet_name,
                    raw_data=row.copy()
                )
                
                streamer = Streamer(
                    streamer_id=str(row.get('streamer_id', '')).strip(),
                    name=str(row.get('name', '')).strip(),
                    id_card=str(row.get('id_card', '')).strip() or None,
                    bank_account=str(row.get('bank_account', '')).strip() or None,
                    contract_start=_parse_date(row.get('contract_start'), 'contract_start') if row.get('contract_start') else None,
                    contract_end=_parse_date(row.get('contract_end'), 'contract_end') if row.get('contract_end') else None,
                    tax_type=str(row.get('tax_type', 'individual')).strip(),
                    status=str(row.get('status', 'active')).strip(),
                )
                streamer._source = source
                streamers.append(streamer)
            except Exception as e:
                self.errors.append(DataLoadError(
                    f"主播信息加载失败: {str(e)}",
                    str(filepath), line_number=idx, sheet_name=sheet_name, raw_data=row
                ))
        
        return streamers
    
    def load_rewards(self) -> List[RewardRecord]:
        """加载打赏流水"""
        filepath = self._find_file('rewards')
        if not filepath:
            raise DataLoadError("缺少打赏流水文件(rewards.csv/xlsx)", str(self.input_dir))
        
        rows, sheet_name = self._read_file(filepath)
        rewards: List[RewardRecord] = []
        
        for idx, row in enumerate(rows, start=2):
            try:
                source = SourceTrace(
                    source_file=str(filepath),
                    line_number=idx,
                    sheet_name=sheet_name,
                    raw_data=row.copy()
                )
                
                reward = RewardRecord(
                    reward_id=str(row.get('reward_id', '')).strip(),
                    streamer_id=str(row.get('streamer_id', '')).strip(),
                    reward_time=_parse_datetime(row.get('reward_time'), 'reward_time'),
                    amount=_parse_decimal(row.get('amount'), 'amount'),
                    gift_name=str(row.get('gift_name', '')).strip() or None,
                    sender_id=str(row.get('sender_id', '')).strip() or None,
                    room_id=str(row.get('room_id', '')).strip() or None,
                    settlement_period=str(row.get('settlement_period', '')).strip(),
                    is_refunded=str(row.get('is_refunded', 'false')).strip().lower() in ('true', '1', 'yes'),
                    refund_id=str(row.get('refund_id', '')).strip() or None,
                )
                reward._source = source
                rewards.append(reward)
            except Exception as e:
                self.errors.append(DataLoadError(
                    f"打赏流水加载失败: {str(e)}",
                    str(filepath), line_number=idx, sheet_name=sheet_name, raw_data=row
                ))
        
        return rewards
    
    def load_platform_shares(self) -> List[PlatformShareVersion]:
        """加载平台分成版本"""
        filepath = self._find_file('platform_shares')
        if not filepath:
            raise DataLoadError("缺少平台分成文件(platform_shares.csv/xlsx)", str(self.input_dir))
        
        rows, sheet_name = self._read_file(filepath)
        shares: List[PlatformShareVersion] = []
        
        for idx, row in enumerate(rows, start=2):
            try:
                source = SourceTrace(
                    source_file=str(filepath),
                    line_number=idx,
                    sheet_name=sheet_name,
                    raw_data=row.copy()
                )
                
                share = PlatformShareVersion(
                    version_id=str(row.get('version_id', '')).strip(),
                    version_name=str(row.get('version_name', '')).strip(),
                    effective_date=_parse_date(row.get('effective_date'), 'effective_date'),
                    expire_date=_parse_date(row.get('expire_date'), 'expire_date') if row.get('expire_date') else None,
                    platform_ratio=_parse_decimal(row.get('platform_ratio'), 'platform_ratio'),
                    streamer_ratio=_parse_decimal(row.get('streamer_ratio'), 'streamer_ratio'),
                    guild_ratio=_parse_decimal(row.get('guild_ratio', '0'), 'guild_ratio'),
                    description=str(row.get('description', '')).strip() or None,
                )
                share._source = source
                shares.append(share)
            except Exception as e:
                self.errors.append(DataLoadError(
                    f"平台分成加载失败: {str(e)}",
                    str(filepath), line_number=idx, sheet_name=sheet_name, raw_data=row
                ))
        
        return shares
    
    def load_refunds(self) -> List[RefundRecord]:
        """加载退款记录"""
        filepath = self._find_file('refunds')
        if not filepath:
            self.warnings.append("未找到退款记录文件(refunds.csv/xlsx)，将视为无退款")
            return []
        
        rows, sheet_name = self._read_file(filepath)
        refunds: List[RefundRecord] = []
        
        for idx, row in enumerate(rows, start=2):
            try:
                source = SourceTrace(
                    source_file=str(filepath),
                    line_number=idx,
                    sheet_name=sheet_name,
                    raw_data=row.copy()
                )
                
                refund = RefundRecord(
                    refund_id=str(row.get('refund_id', '')).strip(),
                    reward_id=str(row.get('reward_id', '')).strip(),
                    streamer_id=str(row.get('streamer_id', '')).strip(),
                    refund_time=_parse_datetime(row.get('refund_time'), 'refund_time'),
                    refund_amount=_parse_decimal(row.get('refund_amount'), 'refund_amount'),
                    reason=str(row.get('reason', '')).strip() or None,
                    original_settlement_period=str(row.get('original_settlement_period', '')).strip(),
                    refund_processed_period=str(row.get('refund_processed_period', '')).strip() or None,
                    is_cross_period=str(row.get('is_cross_period', 'false')).strip().lower() in ('true', '1', 'yes'),
                )
                refund._source = source
                refunds.append(refund)
            except Exception as e:
                self.errors.append(DataLoadError(
                    f"退款记录加载失败: {str(e)}",
                    str(filepath), line_number=idx, sheet_name=sheet_name, raw_data=row
                ))
        
        return refunds
    
    def load_tax_rules(self) -> List[TaxRule]:
        """加载税率规则"""
        filepath = self._find_file('tax_rules')
        if not filepath:
            raise DataLoadError("缺少税率规则文件(tax_rules.csv/xlsx)", str(self.input_dir))
        
        rows, sheet_name = self._read_file(filepath)
        rules: List[TaxRule] = []
        
        for idx, row in enumerate(rows, start=2):
            try:
                source = SourceTrace(
                    source_file=str(filepath),
                    line_number=idx,
                    sheet_name=sheet_name,
                    raw_data=row.copy()
                )
                
                rule = TaxRule(
                    rule_id=str(row.get('rule_id', '')).strip(),
                    tax_type=str(row.get('tax_type', '')).strip(),
                    income_min=_parse_decimal(row.get('income_min'), 'income_min'),
                    income_max=_parse_decimal(row.get('income_max'), 'income_max') if row.get('income_max') else None,
                    tax_rate=_parse_decimal(row.get('tax_rate'), 'tax_rate'),
                    quick_deduction=_parse_decimal(row.get('quick_deduction', '0'), 'quick_deduction'),
                    effective_date=_parse_date(row.get('effective_date'), 'effective_date'),
                    expire_date=_parse_date(row.get('expire_date'), 'expire_date') if row.get('expire_date') else None,
                    description=str(row.get('description', '')).strip() or None,
                )
                rule._source = source
                rules.append(rule)
            except Exception as e:
                self.errors.append(DataLoadError(
                    f"税率规则加载失败: {str(e)}",
                    str(filepath), line_number=idx, sheet_name=sheet_name, raw_data=row
                ))
        
        return rules
    
    def load_all(self) -> Dict[str, Any]:
        """加载所有数据"""
        result = {
            'streamers': self.load_streamers(),
            'rewards': self.load_rewards(),
            'platform_shares': self.load_platform_shares(),
            'refunds': self.load_refunds(),
            'tax_rules': self.load_tax_rules(),
            'errors': self.errors,
            'warnings': self.warnings,
        }
        return result
