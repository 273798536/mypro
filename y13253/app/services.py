from typing import List, Dict, Any, Optional
from datetime import datetime
from .models import db, PlanCompare, PlanVersion, PlanItem, InspectionRecord, Remark


class PlanCompareService:

    @staticmethod
    def create_plan_compare(title: str = '夜市外摆方案比选') -> PlanCompare:
        plan = PlanCompare(title=title, status='draft', current_version=1)
        db.session.add(plan)
        db.session.flush()

        version = PlanVersion(
            plan_compare_id=plan.id,
            version_num=1,
            title=f'{title} v1',
            source='current',
            description='初始版本'
        )
        db.session.add(version)
        db.session.commit()
        return plan

    @staticmethod
    def get_plan_compare(plan_id: int) -> Optional[PlanCompare]:
        return PlanCompare.query.get(plan_id)

    @staticmethod
    def list_plan_compares() -> List[PlanCompare]:
        return PlanCompare.query.order_by(PlanCompare.updated_at.desc()).all()

    @staticmethod
    def get_current_version_items(plan_id: int) -> List[PlanItem]:
        plan = PlanCompare.query.get(plan_id)
        if not plan:
            return []
        version = plan.get_current_version()
        if not version:
            return []
        return version.items.all()


class FilterService:

    @staticmethod
    def filter_items(items: List[PlanItem], filters: Dict[str, Any] = None) -> List[PlanItem]:
        if not filters:
            return items

        result = items
        if filters.get('status'):
            result = [i for i in result if i.status == filters['status']]
        if filters.get('business_type'):
            result = [i for i in result if i.business_type == filters['business_type']]
        if filters.get('min_booth_count') is not None:
            result = [i for i in result if i.booth_count >= filters['min_booth_count']]
        if filters.get('max_booth_count') is not None:
            result = [i for i in result if i.booth_count <= filters['max_booth_count']]
        if filters.get('location_keyword'):
            kw = filters['location_keyword']
            result = [i for i in result if kw in i.location]
        return result


class StatisticsService:

    @staticmethod
    def calculate(items: List[PlanItem]) -> Dict[str, Any]:
        if not items:
            return {
                'total_locations': 0,
                'total_booths': 0,
                'total_area': 0.0,
                'avg_booths_per_location': 0,
                'status_counts': {},
                'business_type_counts': {}
            }

        total_locations = len(items)
        total_booths = sum(i.booth_count for i in items)
        total_area = sum(i.area for i in items)
        avg_booths = round(total_booths / total_locations, 1) if total_locations > 0 else 0

        status_counts = {}
        for item in items:
            status_counts[item.status] = status_counts.get(item.status, 0) + 1

        business_type_counts = {}
        for item in items:
            bt = item.business_type or '未分类'
            business_type_counts[bt] = business_type_counts.get(bt, 0) + 1

        return {
            'total_locations': total_locations,
            'total_booths': total_booths,
            'total_area': round(total_area, 2),
            'avg_booths_per_location': avg_booths,
            'status_counts': status_counts,
            'business_type_counts': business_type_counts
        }


class DetailService:

    @staticmethod
    def get_detail_table(items: List[PlanItem]) -> List[Dict[str, Any]]:
        result = []
        for idx, item in enumerate(items, 1):
            result.append({
                '序号': idx,
                '点位': item.location,
                '摊位数量': item.booth_count,
                '面积(㎡)': item.area,
                '业态': item.business_type or '-',
                '营业时间': item.operating_hours or '-',
                '状态': item.status,
                '影响因素': item.impact_factor or '-',
                '数据来源': item.original_source or '-',
                '备注': item.notes or ''
            })
        return result


class UnifiedDataSource:
    """统一数据源：筛选、统计、明细、报告都从同一套结果生成"""

    def __init__(self, plan_id: int, filters: Dict[str, Any] = None):
        self.plan_id = plan_id
        self.filters = filters or {}
        self._items = None
        self._filtered_items = None
        self._statistics = None
        self._detail_table = None
        self._plan = None
        self._version = None

    def _load(self):
        if self._items is not None:
            return
        self._plan = PlanCompare.query.get(self.plan_id)
        if self._plan:
            self._version = self._plan.get_current_version()
            if self._version:
                self._items = self._version.items.all()
            else:
                self._items = []
        else:
            self._items = []

    @property
    def plan(self):
        self._load()
        return self._plan

    @property
    def version(self):
        self._load()
        return self._version

    @property
    def all_items(self):
        self._load()
        return self._items

    @property
    def filtered_items(self):
        self._load()
        if self._filtered_items is None:
            self._filtered_items = FilterService.filter_items(self._items, self.filters)
        return self._filtered_items

    @property
    def statistics(self):
        if self._statistics is None:
            self._statistics = StatisticsService.calculate(self.filtered_items)
        return self._statistics

    @property
    def detail_table(self):
        if self._detail_table is None:
            self._detail_table = DetailService.get_detail_table(self.filtered_items)
        return self._detail_table

    def get_all_data(self) -> Dict[str, Any]:
        return {
            'plan': self.plan,
            'version': self.version,
            'filters': self.filters,
            'filtered_items': self.filtered_items,
            'statistics': self.statistics,
            'detail_table': self.detail_table
        }
