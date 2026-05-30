import pandas as pd
from typing import Dict, List, Tuple
from dataclasses import dataclass
from enum import Enum


class ConflictType(Enum):
    EXACT_COORDINATE = "坐标完全相同"
    NEAR_COORDINATE = "坐标非常接近"
    ID_CONFLICT = "编号重复"


class Severity(Enum):
    HIGH = "高风险"
    MEDIUM = "中风险"
    LOW = "低风险"


@dataclass
class ConflictRecord:
    conflict_type: ConflictType
    severity: Severity
    human_reason: str
    records: List[Dict]
    suggestion: str


class DuplicateDetector:
    def __init__(self, distance_threshold_meters: float = 50.0):
        self.distance_threshold_meters = distance_threshold_meters

    def haversine_distance(self, lng1: float, lat1: float, lng2: float, lat2: float) -> float:
        import math
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lng2 - lng1)
        
        a = math.sin(delta_phi / 2) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        
        return R * c

    def detect_all_conflicts(self, all_points: pd.DataFrame) -> Dict:
        conflicts = {
            'exact_duplicates': self._detect_exact_duplicates(all_points),
            'near_duplicates': self._detect_near_duplicates(all_points),
            'id_conflicts': self._detect_id_conflicts(all_points),
            'summary': {}
        }
        
        total_conflicts = (
            len(conflicts['exact_duplicates']) +
            len(conflicts['near_duplicates']) +
            len(conflicts['id_conflicts'])
        )
        
        conflicts['summary'] = {
            'total_conflicts': total_conflicts,
            'exact_duplicate_count': len(conflicts['exact_duplicates']),
            'near_duplicate_count': len(conflicts['near_duplicates']),
            'id_conflict_count': len(conflicts['id_conflicts']),
            'has_high_risk': any(c.severity == Severity.HIGH for c in conflicts['exact_duplicates'])
        }
        
        return conflicts

    def _detect_exact_duplicates(self, df: pd.DataFrame) -> List[ConflictRecord]:
        results = []
        
        grouped = df.groupby(['lng', 'lat'])
        for (lng, lat), group in grouped:
            if len(group) > 1:
                sources = group['source'].unique().tolist()
                has_cross_source = '小区' in sources and '仓库候选' in sources
                
                human_reason = self._generate_exact_duplicate_reason(group, has_cross_source)
                suggestion = self._generate_suggestion(has_cross_source)
                
                severity = Severity.HIGH if has_cross_source else Severity.MEDIUM
                
                results.append(ConflictRecord(
                    conflict_type=ConflictType.EXACT_COORDINATE,
                    severity=severity,
                    human_reason=human_reason,
                    records=group[['id', 'name', 'source', 'lng', 'lat']].to_dict('records'),
                    suggestion=suggestion
                ))
        
        return results

    def _detect_near_duplicates(self, df: pd.DataFrame) -> List[ConflictRecord]:
        results = []
        processed_pairs = set()
        
        for i, row1 in df.iterrows():
            for j, row2 in df.iterrows():
                if i >= j:
                    continue
                
                pair_key = tuple(sorted([row1['id'], row2['id']]))
                if pair_key in processed_pairs:
                    continue
                
                distance = self.haversine_distance(
                    row1['lng'], row1['lat'],
                    row2['lng'], row2['lat']
                )
                
                if 0 < distance <= self.distance_threshold_meters:
                    processed_pairs.add(pair_key)
                    
                    has_cross_source = row1['source'] != row2['source']
                    
                    human_reason = self._generate_near_duplicate_reason(
                        row1, row2, distance, has_cross_source
                    )
                    suggestion = "建议人工核实这两个地点是否指的是同一个位置，如果是请统一坐标；如果不是请保留并注明原因。"
                    
                    severity = Severity.MEDIUM if has_cross_source else Severity.LOW
                    
                    results.append(ConflictRecord(
                        conflict_type=ConflictType.NEAR_COORDINATE,
                        severity=severity,
                        human_reason=human_reason,
                        records=[
                            row1[['id', 'name', 'source', 'lng', 'lat']].to_dict(),
                            row2[['id', 'name', 'source', 'lng', 'lat']].to_dict()
                        ],
                        suggestion=suggestion
                    ))
        
        return results

    def _detect_id_conflicts(self, df: pd.DataFrame) -> List[ConflictRecord]:
        results = []
        
        grouped = df.groupby('id')
        for id_val, group in grouped:
            if len(group['source'].unique()) > 1:
                human_reason = f"编号 '{id_val}' 同时出现在小区数据和仓库候选数据中。"
                suggestion = "请确认是否是编号重复，如果是请修改其中一方的编号；如果确实是不同地点，请保留但建议区分命名。"
                
                results.append(ConflictRecord(
                    conflict_type=ConflictType.ID_CONFLICT,
                    severity=Severity.MEDIUM,
                    human_reason=human_reason,
                    records=group[['id', 'name', 'source', 'lng', 'lat']].to_dict('records'),
                    suggestion=suggestion
                ))
        
        return results

    def _generate_exact_duplicate_reason(self, group: pd.DataFrame, has_cross_source: bool) -> str:
        if has_cross_source:
            communities = group[group['source'] == '小区']['name'].tolist()
            warehouses = group[group['source'] == '仓库候选']['name'].tolist()
            
            reason = f"发现坐标完全重合的跨类型冲突！\n"
            reason += f"  - 小区数据中的：{', '.join(communities)}\n"
            reason += f"  - 仓库候选中的：{', '.join(warehouses)}\n"
            reason += "  这两组数据用了完全相同的经纬度坐标。"
            reason += "\n\n【为什么会被拦住？】"
            reason += "\n小区和仓库不可能在同一个点上——"
            reason += "小区是需要被服务的对象，仓库是提供服务的站点。"
            reason += "如果坐标真的一样，那要么是小区数据写错了（把小区写成了仓库），"
            reason += "要么是仓库候选选错了位置（选在小区楼里了）。"
            reason += "不管哪种情况，后续算配送距离、画服务范围时都会出大问题。"
        else:
            names = group['name'].tolist()
            source = group['source'].iloc[0]
            reason = f"发现{source}数据内部有 {len(group)} 条记录坐标完全相同：{', '.join(names)}。"
            reason += "\n\n【为什么会被拦住？】"
            reason += "\n同一个来源的数据里出现坐标重复，大概率是复制粘贴时忘了改，"
            reason += "或者是同一个地点录入了多次。如果不处理，后续统计覆盖人数时会重复计算。"
        
        return reason

    def _generate_near_duplicate_reason(self, row1: pd.Series, row2: pd.Series, 
                                        distance: float, has_cross_source: bool) -> str:
        distance_str = f"{distance:.1f}米"
        
        if has_cross_source:
            reason = f"{row1['source']}「{row1['name']}」和{row2['source']}「{row2['name']}」的坐标相距仅{distance_str}。"
            reason += "\n\n【为什么需要关注？】"
            reason += "\n这么近的距离，很可能是指同一个地点但两边维护时坐标有微小差异，"
            reason += "也可能是仓库真的设在小区旁边（这个是允许的，但最好确认一下）。"
        else:
            reason = f"{row1['source']}数据中「{row1['name']}」和「{row2['name']}」相距仅{distance_str}。"
            reason += "\n\n【为什么需要关注？】"
            reason += "\n同一类型的地点挨这么近，可能是重复录入，也可能是两个相邻的小区/仓库。"
        
        return reason

    def _generate_suggestion(self, has_cross_source: bool) -> str:
        if has_cross_source:
            return "【必须处理】请找数据录入的同事确认：到底是哪条数据坐标写错了？修改后才能继续分析。"
        else:
            return "请确认是否为重复录入，如果是请删除重复项；如果是不同地点，请保留。"

    def format_conflicts_for_report(self, conflicts: Dict) -> str:
        report_parts = []
        
        report_parts.append("# 坐标重复检测报告\n")
        
        summary = conflicts['summary']
        report_parts.append("## 检测概览")
        report_parts.append(f"- 总冲突数：{summary['total_conflicts']} 处")
        report_parts.append(f"- 坐标完全重复：{summary['exact_duplicate_count']} 处")
        report_parts.append(f"- 坐标接近（{self.distance_threshold_meters}米内）：{summary['near_duplicate_count']} 处")
        report_parts.append(f"- 编号冲突：{summary['id_conflict_count']} 处")
        if summary['has_high_risk']:
            report_parts.append("- ⚠️ **存在高风险冲突，必须先处理才能继续分析**")
        report_parts.append("")
        
        if conflicts['exact_duplicates']:
            report_parts.append("## 一、坐标完全重复（最严重）")
            for i, conflict in enumerate(conflicts['exact_duplicates'], 1):
                report_parts.append(f"\n### 冲突 #{i} - {conflict.severity.value}")
                report_parts.append(f"\n**问题说明：**")
                report_parts.append(conflict.human_reason)
                report_parts.append(f"\n**涉及记录：**")
                for record in conflict.records:
                    report_parts.append(f"  - [{record['source']}] {record['id']} - {record['name']}")
                    report_parts.append(f"    坐标：{record['lng']}, {record['lat']}")
                report_parts.append(f"\n**处理建议：** {conflict.suggestion}")
                report_parts.append("---")
        
        if conflicts['near_duplicates']:
            report_parts.append("\n## 二、坐标非常接近")
            for i, conflict in enumerate(conflicts['near_duplicates'], 1):
                report_parts.append(f"\n### 冲突 #{i} - {conflict.severity.value}")
                report_parts.append(f"\n**问题说明：**")
                report_parts.append(conflict.human_reason)
                report_parts.append(f"\n**涉及记录：**")
                for record in conflict.records:
                    report_parts.append(f"  - [{record['source']}] {record['id']} - {record['name']}")
                    report_parts.append(f"    坐标：{record['lng']}, {record['lat']}")
                report_parts.append(f"\n**处理建议：** {conflict.suggestion}")
                report_parts.append("---")
        
        if conflicts['id_conflicts']:
            report_parts.append("\n## 三、编号重复")
            for i, conflict in enumerate(conflicts['id_conflicts'], 1):
                report_parts.append(f"\n### 冲突 #{i} - {conflict.severity.value}")
                report_parts.append(f"\n**问题说明：** {conflict.human_reason}")
                report_parts.append(f"\n**涉及记录：**")
                for record in conflict.records:
                    report_parts.append(f"  - [{record['source']}] {record['id']} - {record['name']}")
                    report_parts.append(f"    坐标：{record['lng']}, {record['lat']}")
                report_parts.append(f"\n**处理建议：** {conflict.suggestion}")
                report_parts.append("---")
        
        return "\n".join(report_parts)
