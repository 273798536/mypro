from datetime import datetime
from .services import UnifiedDataSource


class MarkdownReportGenerator:

    def __init__(self, plan_id: int, filters: dict = None):
        self.data_source = UnifiedDataSource(plan_id, filters)

    def generate(self) -> str:
        data = self.data_source.get_all_data()
        plan = data['plan']
        version = data['version']
        stats = data['statistics']
        detail = data['detail_table']
        filters = data['filters']

        lines = []

        lines.append(f'# {plan.title if plan else "夜市外摆方案比选"}')
        lines.append('')
        lines.append(f'**版本**: v{version.version_num if version else 1}')
        lines.append(f'**状态**: {self._status_text(plan.status if plan else "draft")}')
        lines.append(f'**生成时间**: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        lines.append('')

        if filters:
            filter_desc = self._format_filters(filters)
            if filter_desc:
                lines.append('## 筛选条件')
                lines.append('')
                lines.append(filter_desc)
                lines.append('')

        lines.append('## 统计概览')
        lines.append('')
        lines.append(f'- 点位数: **{stats["total_locations"]}** 个')
        lines.append(f'- 总摊位数: **{stats["total_booths"]}** 个')
        lines.append(f'- 总面积: **{stats["total_area"]}** ㎡')
        lines.append(f'- 平均每点摊位数: **{stats["avg_booths_per_location"]}** 个')
        lines.append('')

        if stats['status_counts']:
            lines.append('### 按状态分布')
            lines.append('')
            for status, count in stats['status_counts'].items():
                lines.append(f'- {self._status_text(status)}: {count} 个')
            lines.append('')

        if stats['business_type_counts']:
            lines.append('### 按业态分布')
            lines.append('')
            for bt, count in stats['business_type_counts'].items():
                lines.append(f'- {bt}: {count} 个')
            lines.append('')

        lines.append('## 明细表')
        lines.append('')
        lines.append(self._generate_table(detail))
        lines.append('')

        if plan and plan.remarks.count() > 0:
            lines.append('## 历史备注')
            lines.append('')
            for remark in plan.remarks:
                author = remark.author or '匿名'
                time_str = remark.created_at.strftime('%Y-%m-%d %H:%M')
                lines.append(f'### [{time_str}] {author}')
                lines.append('')
                lines.append(remark.content)
                lines.append('')
                if remark.merged_from:
                    lines.append(f'> 合并自: {remark.merged_from}')
                    lines.append('')

        if plan and plan.records.count() > 0:
            affecting = [r for r in plan.records if r.affects_conclusion]
            if affecting:
                lines.append('## 影响结论的记录')
                lines.append('')
                for record in affecting:
                    lines.append(f'### {record.title}')
                    lines.append('')
                    lines.append(f'- 类型: {self._record_type_text(record.record_type)}')
                    lines.append(f'- 来源: {record.source or "未知"}')
                    if record.is_old_version:
                        lines.append('- ⚠️ 旧版数据')
                    lines.append('')
                    lines.append(record.content)
                    lines.append('')

        return '\n'.join(lines)

    def _status_text(self, status: str) -> str:
        mapping = {
            'draft': '草稿',
            'reviewing': '复核中',
            'confirmed': '已确认',
            'pending': '待审核',
            'approved': '已通过',
            'rejected': '已驳回',
            'obsolete': '已废弃'
        }
        return mapping.get(status, status)

    def _record_type_text(self, rtype: str) -> str:
        mapping = {
            'photo': '巡检照片',
            'record': '正常记录',
            'note': '口头备注',
            'old_photo': '旧版照片'
        }
        return mapping.get(rtype, rtype)

    def _format_filters(self, filters: dict) -> str:
        parts = []
        if filters.get('status'):
            parts.append(f'状态={self._status_text(filters["status"])}')
        if filters.get('business_type'):
            parts.append(f'业态={filters["business_type"]}')
        if filters.get('location_keyword'):
            parts.append(f'点位包含={filters["location_keyword"]}')
        if filters.get('min_booth_count') is not None:
            parts.append(f'最少摊位={filters["min_booth_count"]}')
        if filters.get('max_booth_count') is not None:
            parts.append(f'最多摊位={filters["max_booth_count"]}')
        return '、'.join(parts)

    def _generate_table(self, rows: list) -> str:
        if not rows:
            return '_暂无数据_'

        headers = list(rows[0].keys())

        lines = []
        lines.append('| ' + ' | '.join(headers) + ' |')
        lines.append('| ' + ' | '.join(['---'] * len(headers)) + ' |')

        for row in rows:
            values = [str(row.get(h, '')) for h in headers]
            lines.append('| ' + ' | '.join(values) + ' |')

        return '\n'.join(lines)
