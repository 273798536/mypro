import yaml
import json
import os
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .models import (
    DiscountTier,
    ApprovalLevel,
    CustomerLevel,
    Product,
    QuotationItem,
    DataSourceInfo,
    DataSource,
    ApprovalStatus
)


class ConfigLoader:
    def __init__(self, config_path: str):
        self.config_path = config_path
        self.discount_tiers: Dict[str, DiscountTier] = {}
        self.approval_levels: Dict[int, ApprovalLevel] = {}
        self.customer_levels: Dict[str, CustomerLevel] = {}
        self.products: Dict[str, Product] = {}
        self.system_config: Dict = {}
        self.data_sources: List[DataSourceInfo] = []
        self._load_config()

    def _load_config(self):
        with open(self.config_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)

        for tier_data in config.get('discount_tiers', []):
            tier = DiscountTier(
                tier_id=tier_data['tier_id'],
                tier_name=tier_data['tier_name'],
                min_quantity=tier_data['min_quantity'],
                max_quantity=tier_data['max_quantity'],
                discount_rate=tier_data['discount_rate'],
                approval_level_required=tier_data['approval_level_required'],
                description=tier_data.get('description', '')
            )
            self.discount_tiers[tier.tier_id] = tier
            self.data_sources.append(DataSourceInfo(
                source=DataSource.DISCOUNT_TIER,
                file_name=os.path.basename(self.config_path),
                record_id=tier.tier_id
            ))

        for level_data in config.get('approval_levels', []):
            level = ApprovalLevel(
                level=level_data['level'],
                name=level_data['name'],
                max_discount_allowed=level_data['max_discount_allowed'],
                approvers=level_data['approvers'],
                description=level_data.get('description', '')
            )
            self.approval_levels[level.level] = level
            self.data_sources.append(DataSourceInfo(
                source=DataSource.APPROVAL_LEVEL,
                file_name=os.path.basename(self.config_path),
                record_id=f"LEVEL-{level.level}"
            ))

        for cust_data in config.get('customer_levels', []):
            cust_level = CustomerLevel(
                level_id=cust_data['level_id'],
                level_name=cust_data['level_name'],
                base_discount_rate=cust_data['base_discount_rate'],
                priority=cust_data['priority'],
                description=cust_data.get('description', '')
            )
            self.customer_levels[cust_level.level_id] = cust_level
            self.data_sources.append(DataSourceInfo(
                source=DataSource.CUSTOMER_LEVEL,
                file_name=os.path.basename(self.config_path),
                record_id=cust_level.level_id
            ))

        for prod_data in config.get('products', []):
            product = Product(
                product_id=prod_data['product_id'],
                product_name=prod_data['product_name'],
                standard_price=prod_data['standard_price'],
                unit=prod_data.get('unit', '个')
            )
            self.products[product.product_id] = product
            self.data_sources.append(DataSourceInfo(
                source=DataSource.PRICE_LIST,
                file_name=os.path.basename(self.config_path),
                record_id=product.product_id
            ))

        self.system_config = config.get('system', {})

    def load_quotation(self, quotation_path: str) -> Tuple[str, str, List[QuotationItem]]:
        with open(quotation_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        quotation_data = data['quotation']
        quotation_id = quotation_data['quotation_id']
        customer_id = quotation_data['customer_id']
        customer_level_id = quotation_data['customer_level_id']

        items: List[QuotationItem] = []
        for item_data in quotation_data['items']:
            status_map = {
                '待审批': ApprovalStatus.PENDING,
                '已通过': ApprovalStatus.APPROVED,
                '已驳回': ApprovalStatus.REJECTED,
                '已升级': ApprovalStatus.ESCALATED
            }

            item = QuotationItem(
                quotation_id=quotation_id,
                product_id=item_data['product_id'],
                product_name=item_data['product_name'],
                quantity=item_data['quantity'],
                final_unit_price=item_data['final_unit_price'],
                standard_price=item_data['standard_price'],
                customer_id=customer_id,
                customer_level_id=customer_level_id,
                approval_level=item_data.get('approval_level'),
                approver=item_data.get('approver'),
                approval_status=status_map.get(item_data.get('approval_status', '待审批'), ApprovalStatus.PENDING),
                remark=item_data.get('remark', '')
            )
            items.append(item)

            self.data_sources.append(DataSourceInfo(
                source=DataSource.QUOTATION_SHEET,
                file_name=os.path.basename(quotation_path),
                record_id=f"{quotation_id}-{item_data['product_id']}"
            ))

        return quotation_id, customer_id, items

    def get_tier_list(self) -> List[DiscountTier]:
        return sorted(self.discount_tiers.values(), key=lambda t: t.min_quantity)

    def get_approval_level(self, level: int) -> Optional[ApprovalLevel]:
        return self.approval_levels.get(level)

    def get_customer_level(self, level_id: str) -> Optional[CustomerLevel]:
        return self.customer_levels.get(level_id)

    def get_product(self, product_id: str) -> Optional[Product]:
        return self.products.get(product_id)

    def get_rounding_tolerance(self) -> float:
        return self.system_config.get('rounding_tolerance', 0.01)

    def get_rounding_precision(self) -> int:
        return self.system_config.get('rounding_precision', 2)

    def get_discount_combine_method(self) -> str:
        return self.system_config.get('discount_combine_method', 'additive')

    def get_max_discount_rate(self) -> float:
        return self.system_config.get('max_discount_rate', 0.50)
