"""数据加载模块 - 支持CSV/JSON格式，保留所有原始名称"""

import csv
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime

from .models import (
    QuoteItem, DiscountTier, CustomerLevel, ApprovalLevel
)


class DataLoader:
    """数据加载器 - 保留原始字段名便于后续核对"""

    @staticmethod
    def load_quote_items(file_path: str) -> List[QuoteItem]:
        """加载报价单数据"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"报价单文件不存在: {file_path}")

        if path.suffix.lower() == ".csv":
            return DataLoader._load_quote_items_csv(path)
        elif path.suffix.lower() == ".json":
            return DataLoader._load_quote_items_json(path)
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}，请使用CSV或JSON")

    @staticmethod
    def _load_quote_items_csv(path: Path) -> List[QuoteItem]:
        """从CSV加载报价单"""
        items = []
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                original_record = dict(row)
                item = QuoteItem(
                    original_record=original_record,
                    item_name=str(row.get("item_name", row.get("产品名称", ""))),
                    item_code=str(row.get("item_code", row.get("产品编码", ""))),
                    list_price=float(row.get("list_price", row.get("标准价", row.get("目录价", 0)))),
                    final_price=float(row.get("final_price", row.get("最终价", row.get("成交价", 0)))),
                    quantity=int(row.get("quantity", row.get("数量", 1))),
                    customer_name=str(row.get("customer_name", row.get("客户名称", ""))),
                    customer_level_raw=str(row.get("customer_level_raw", row.get("客户等级", ""))),
                    salesperson=str(row.get("salesperson", row.get("销售人员", ""))),
                    approval_level_raw=row.get("approval_level_raw", row.get("审批级别", None)),
                    quoted_discount=float(row.get("quoted_discount", row.get("报价折扣", 0))) if row.get("quoted_discount", row.get("报价折扣")) else None,
                    quote_date=datetime.fromisoformat(row["quote_date"]) if row.get("quote_date") else None,
                    notes=row.get("notes", row.get("备注", None))
                )
                items.append(item)
        return items

    @staticmethod
    def _load_quote_items_json(path: Path) -> List[QuoteItem]:
        """从JSON加载报价单"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        items = []
        for row in data:
            original_record = dict(row)
            item = QuoteItem(
                original_record=original_record,
                item_name=str(row.get("item_name", row.get("产品名称", ""))),
                item_code=str(row.get("item_code", row.get("产品编码", ""))),
                list_price=float(row.get("list_price", row.get("标准价", row.get("目录价", 0)))),
                final_price=float(row.get("final_price", row.get("最终价", row.get("成交价", 0)))),
                quantity=int(row.get("quantity", row.get("数量", 1))),
                customer_name=str(row.get("customer_name", row.get("客户名称", ""))),
                customer_level_raw=str(row.get("customer_level_raw", row.get("客户等级", ""))),
                salesperson=str(row.get("salesperson", row.get("销售人员", ""))),
                approval_level_raw=row.get("approval_level_raw", row.get("审批级别", None)),
                quoted_discount=float(row.get("quoted_discount", row.get("报价折扣", 0))) if row.get("quoted_discount", row.get("报价折扣")) else None,
                quote_date=datetime.fromisoformat(row["quote_date"]) if row.get("quote_date") else None,
                notes=row.get("notes", row.get("备注", None))
            )
            items.append(item)
        return items

    @staticmethod
    def load_discount_tiers(file_path: str) -> List[DiscountTier]:
        """加载折扣阶梯配置"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"折扣阶梯文件不存在: {file_path}")

        if path.suffix.lower() == ".csv":
            return DataLoader._load_discount_tiers_csv(path)
        elif path.suffix.lower() == ".json":
            return DataLoader._load_discount_tiers_json(path)
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}")

    @staticmethod
    def _load_discount_tiers_csv(path: Path) -> List[DiscountTier]:
        """从CSV加载折扣阶梯"""
        tiers = []
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                original_record = dict(row)
                
                applicable_levels_str = row.get("applicable_customer_levels", row.get("适用客户等级", ""))
                applicable_levels = [s.strip() for s in applicable_levels_str.split(",") if s.strip()]
                
                max_amount = row.get("max_amount", row.get("金额上限", None))
                max_amount = float(max_amount) if max_amount and max_amount.lower() not in ["inf", "infinity", "∞", ""] else None
                
                tier = DiscountTier(
                    original_record=original_record,
                    tier_name=str(row.get("tier_name", row.get("阶梯名称", ""))),
                    min_amount=float(row.get("min_amount", row.get("金额下限", 0))),
                    max_amount=max_amount,
                    discount_rate=float(row.get("discount_rate", row.get("折扣率", 0))),
                    required_approval_level=str(row.get("required_approval_level", row.get("所需审批级别", ""))),
                    applicable_customer_levels=applicable_levels,
                    is_active=row.get("is_active", row.get("是否生效", "true")).lower() in ["true", "1", "yes", "是"]
                )
                tiers.append(tier)
        return tiers

    @staticmethod
    def _load_discount_tiers_json(path: Path) -> List[DiscountTier]:
        """从JSON加载折扣阶梯"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        tiers = []
        for row in data:
            original_record = dict(row)
            
            applicable_levels = row.get("applicable_customer_levels", row.get("适用客户等级", []))
            if isinstance(applicable_levels, str):
                applicable_levels = [s.strip() for s in applicable_levels.split(",") if s.strip()]
            
            max_amount = row.get("max_amount", row.get("金额上限", None))
            max_amount = float(max_amount) if max_amount and str(max_amount).lower() not in ["inf", "infinity", "∞", ""] else None
            
            tier = DiscountTier(
                original_record=original_record,
                tier_name=str(row.get("tier_name", row.get("阶梯名称", ""))),
                min_amount=float(row.get("min_amount", row.get("金额下限", 0))),
                max_amount=max_amount,
                discount_rate=float(row.get("discount_rate", row.get("折扣率", 0))),
                required_approval_level=str(row.get("required_approval_level", row.get("所需审批级别", ""))),
                applicable_customer_levels=applicable_levels,
                is_active=row.get("is_active", row.get("是否生效", True))
            )
            tiers.append(tier)
        return tiers

    @staticmethod
    def load_customer_levels(file_path: str) -> List[CustomerLevel]:
        """加载客户等级配置"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"客户等级文件不存在: {file_path}")

        if path.suffix.lower() == ".csv":
            return DataLoader._load_customer_levels_csv(path)
        elif path.suffix.lower() == ".json":
            return DataLoader._load_customer_levels_json(path)
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}")

    @staticmethod
    def _load_customer_levels_csv(path: Path) -> List[CustomerLevel]:
        """从CSV加载客户等级"""
        levels = []
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                original_record = dict(row)
                level = CustomerLevel(
                    original_record=original_record,
                    level_name=str(row.get("level_name", row.get("等级名称", ""))),
                    level_code=str(row.get("level_code", row.get("等级编码", ""))),
                    base_discount_rate=float(row.get("base_discount_rate", row.get("基础折扣率", 0))),
                    max_allowed_discount_rate=float(row.get("max_allowed_discount_rate", row.get("最大折扣率", 0))),
                    description=row.get("description", row.get("说明", None))
                )
                levels.append(level)
        return levels

    @staticmethod
    def _load_customer_levels_json(path: Path) -> List[CustomerLevel]:
        """从JSON加载客户等级"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        levels = []
        for row in data:
            original_record = dict(row)
            level = CustomerLevel(
                original_record=original_record,
                level_name=str(row.get("level_name", row.get("等级名称", ""))),
                level_code=str(row.get("level_code", row.get("等级编码", ""))),
                base_discount_rate=float(row.get("base_discount_rate", row.get("基础折扣率", 0))),
                max_allowed_discount_rate=float(row.get("max_allowed_discount_rate", row.get("最大折扣率", 0))),
                description=row.get("description", row.get("说明", None))
            )
            levels.append(level)
        return levels

    @staticmethod
    def load_approval_levels(file_path: str) -> List[ApprovalLevel]:
        """加载审批级别配置"""
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"审批级别文件不存在: {file_path}")

        if path.suffix.lower() == ".csv":
            return DataLoader._load_approval_levels_csv(path)
        elif path.suffix.lower() == ".json":
            return DataLoader._load_approval_levels_json(path)
        else:
            raise ValueError(f"不支持的文件格式: {path.suffix}")

    @staticmethod
    def _load_approval_levels_csv(path: Path) -> List[ApprovalLevel]:
        """从CSV加载审批级别"""
        levels = []
        with open(path, "r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                original_record = dict(row)
                
                max_amount = row.get("max_amount_allowed", row.get("最大审批金额", None))
                max_amount = float(max_amount) if max_amount and str(max_amount).lower() not in ["inf", "infinity", "∞", ""] else None
                
                level = ApprovalLevel(
                    original_record=original_record,
                    level_name=str(row.get("level_name", row.get("级别名称", ""))),
                    level_order=int(row.get("level_order", row.get("级别顺序", 0))),
                    max_discount_allowed=float(row.get("max_discount_allowed", row.get("最大折扣", 0))),
                    max_amount_allowed=max_amount,
                    approver_title=str(row.get("approver_title", row.get("审批人职位", "")))
                )
                levels.append(level)
        return levels

    @staticmethod
    def _load_approval_levels_json(path: Path) -> List[ApprovalLevel]:
        """从JSON加载审批级别"""
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        levels = []
        for row in data:
            original_record = dict(row)
            
            max_amount = row.get("max_amount_allowed", row.get("最大审批金额", None))
            max_amount = float(max_amount) if max_amount and str(max_amount).lower() not in ["inf", "infinity", "∞", ""] else None
            
            level = ApprovalLevel(
                original_record=original_record,
                level_name=str(row.get("level_name", row.get("级别名称", ""))),
                level_order=int(row.get("level_order", row.get("级别顺序", 0))),
                max_discount_allowed=float(row.get("max_discount_allowed", row.get("最大折扣", 0))),
                max_amount_allowed=max_amount,
                approver_title=str(row.get("approver_title", row.get("审批人职位", "")))
            )
            levels.append(level)
        return levels
