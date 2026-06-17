import re
import math
import uuid
from datetime import datetime
from typing import List, Tuple, Dict, Optional
from collections import defaultdict

from models import (
    RawPointRecord,
    MergedPointGroup,
    MergeStatus,
    ComplaintStatus,
    FilterCriteria,
    Statistics,
    ProcessingResult,
    DataSource,
)


class LocationNormalizer:
    STREET_SUFFIXES = ['路', '街', '道', '巷', '弄', '大道', '大街', '胡同', '里', '坊']
    PARK_KEYWORDS = ['公园', '广场', '绿地', '口袋公园', '小游园']
    DIRECTION_WORDS = ['东', '西', '南', '北', '中', '内', '外', '旁', '侧', '对面', '附近', '路口', '交叉口']
    NOISE_WORDS = ['的', '了', '在', '处', '位置', '地点', '大概', '差不多', '左右', '那里', '这边', '那边']

    @classmethod
    def normalize(cls, text: str) -> str:
        if not text:
            return ""
        result = text.strip()
        for nw in cls.NOISE_WORDS:
            result = result.replace(nw, "")
        result = re.sub(r'\s+', "", result)
        result = re.sub(r'[，,。.、；;：:！!？?""''（）()\[\]【】]', "", result)
        result = cls._normalize_numbers(result)
        return result

    @staticmethod
    def _normalize_numbers(text: str) -> str:
        cn_num = {'一': '1', '二': '2', '三': '3', '四': '4', '五': '5',
                  '六': '6', '七': '7', '八': '8', '九': '9', '十': '10',
                  '百': '00', '千': '000'}
        result = text
        for cn, num in cn_num.items():
            result = result.replace(cn, num)
        return result

    @classmethod
    def extract_key_terms(cls, text: str) -> List[str]:
        if not text:
            return []
        terms = []
        for kw in cls.PARK_KEYWORDS:
            if kw in text:
                idx = text.rfind(kw)
                start = max(0, idx - 8)
                terms.append(text[start:idx + len(kw)])
        for suffix in cls.STREET_SUFFIXES:
            pattern = rf'[\u4e00-\u9fa50-9]+{re.escape(suffix)}'
            matches = re.findall(pattern, text)
            terms.extend(matches)
        for dw in cls.DIRECTION_WORDS:
            if dw in text:
                terms.append(dw)
        return list(set(terms))


class GeoCalculator:
    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        R = 6371000
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)
        a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return R * c


class TextSimilarity:
    @staticmethod
    def char_overlap_ratio(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        set_a = set(a)
        set_b = set(b)
        if not set_a or not set_b:
            return 0.0
        intersection = set_a & set_b
        union = set_a | set_b
        return len(intersection) / len(union)

    @staticmethod
    def lcs_length(a: str, b: str) -> int:
        if not a or not b:
            return 0
        m, n = len(a), len(b)
        dp = [[0] * (n + 1) for _ in range(m + 1)]
        for i in range(1, m + 1):
            for j in range(1, n + 1):
                if a[i - 1] == b[j - 1]:
                    dp[i][j] = dp[i - 1][j - 1] + 1
                else:
                    dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
        return dp[m][n]

    @classmethod
    def lcs_similarity(cls, a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        lcs_len = cls.lcs_length(a, b)
        min_len = min(len(a), len(b))
        return lcs_len / min_len if min_len > 0 else 0.0


class PointMergeEngine:
    TEXT_SIMILARITY_THRESHOLD = 0.6
    GEO_DISTANCE_THRESHOLD_METERS = 50.0
    COMBINED_SCORE_THRESHOLD = 0.65
    ADJACENT_POINT_MIN_DISTANCE = 20.0

    def __init__(self):
        self.normalizer = LocationNormalizer()
        self.geo_calc = GeoCalculator()
        self.similarity = TextSimilarity()

    def merge(self, records: List[RawPointRecord], criteria: FilterCriteria = None) -> ProcessingResult:
        filtered_records = self._apply_filter(records, criteria)
        normalized_records = self._normalize_records(filtered_records)
        merged_groups = self._cluster_records(normalized_records)
        self._analyze_complaints(merged_groups)
        self._generate_next_steps(merged_groups)
        statistics = self._compute_statistics(filtered_records, merged_groups)

        return ProcessingResult(
            filter_criteria=criteria or FilterCriteria(),
            raw_records=filtered_records,
            merged_groups=merged_groups,
            statistics=statistics,
        )

    def _apply_filter(self, records: List[RawPointRecord], criteria: FilterCriteria = None) -> List[RawPointRecord]:
        if not criteria:
            return list(records)

        result = []
        for r in records:
            if criteria.start_date and r.complaint_time and r.complaint_time < criteria.start_date:
                continue
            if criteria.end_date and r.complaint_time and r.complaint_time > criteria.end_date:
                continue
            if criteria.data_sources and r.source not in criteria.data_sources:
                continue
            if criteria.location_keywords:
                found = any(kw in (r.original_location_text or "") for kw in criteria.location_keywords)
                if not found:
                    continue
            result.append(r)
        return result

    def _normalize_records(self, records: List[RawPointRecord]) -> List[RawPointRecord]:
        for r in records:
            if not r.normalized_location:
                r.normalized_location = self.normalizer.normalize(r.original_location_text)
        return records

    def _compute_merge_score(self, a: RawPointRecord, b: RawPointRecord) -> Tuple[float, List[str]]:
        scores = []
        evidence = []

        norm_a = a.normalized_location or ""
        norm_b = b.normalized_location or ""

        if norm_a and norm_b:
            overlap_score = self.similarity.char_overlap_ratio(norm_a, norm_b)
            scores.append(overlap_score)
            if overlap_score >= self.TEXT_SIMILARITY_THRESHOLD:
                evidence.append(f"文本字符重叠度 {overlap_score:.2f} >= {self.TEXT_SIMILARITY_THRESHOLD}")

            lcs_score = self.similarity.lcs_similarity(norm_a, norm_b)
            scores.append(lcs_score)
            if lcs_score >= self.TEXT_SIMILARITY_THRESHOLD:
                evidence.append(f"最长公共子序列相似度 {lcs_score:.2f} >= {self.TEXT_SIMILARITY_THRESHOLD}")

        terms_a = self.normalizer.extract_key_terms(norm_a)
        terms_b = self.normalizer.extract_key_terms(norm_b)
        if terms_a and terms_b:
            common_terms = set(terms_a) & set(terms_b)
            if common_terms:
                term_score = len(common_terms) / max(len(terms_a), len(terms_b))
                scores.append(term_score)
                evidence.append(f"关键词匹配: {', '.join(common_terms)}")

        geo_score = 0.0
        if a.latitude and a.longitude and b.latitude and b.longitude:
            dist = self.geo_calc.haversine_distance(a.latitude, a.longitude, b.latitude, b.longitude)
            if dist <= self.GEO_DISTANCE_THRESHOLD_METERS:
                geo_score = 1.0 - (dist / self.GEO_DISTANCE_THRESHOLD_METERS)
                scores.append(geo_score)
                evidence.append(f"坐标距离 {dist:.1f}米 <= {self.GEO_DISTANCE_THRESHOLD_METERS}米")
                if dist <= self.ADJACENT_POINT_MIN_DISTANCE:
                    evidence.append(f"⚠️ 距离极近({dist:.1f}米)，需人工确认是否为相邻不同点位")

        if not scores:
            return 0.0, evidence

        final_score = sum(scores) / len(scores)
        return final_score, evidence

    def _should_merge(self, a: RawPointRecord, b: RawPointRecord) -> Tuple[bool, float, List[str]]:
        score, evidence = self._compute_merge_score(a, b)
        should = score >= self.COMBINED_SCORE_THRESHOLD
        return should, score, evidence

    def _cluster_records(self, records: List[RawPointRecord]) -> List[MergedPointGroup]:
        if not records:
            return []

        n = len(records)
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x, y):
            px, py = find(x), find(y)
            if px != py:
                parent[px] = py

        merge_evidence_map: Dict[Tuple[int, int], Tuple[float, List[str]]] = {}
        for i in range(n):
            for j in range(i + 1, n):
                should, score, evidence = self._should_merge(records[i], records[j])
                if should:
                    union(i, j)
                    merge_evidence_map[(i, j)] = (score, evidence)

        clusters: Dict[int, List[int]] = defaultdict(list)
        for i in range(n):
            clusters[find(i)].append(i)

        groups = []
        for cluster_idx, record_indices in clusters.items():
            cluster_records = [records[i] for i in record_indices]

            canonical = self._choose_canonical_location(cluster_records)

            all_evidence = []
            for i_idx in range(len(record_indices)):
                for j_idx in range(i_idx + 1, len(record_indices)):
                    ri, rj = record_indices[i_idx], record_indices[j_idx]
                    key = (min(ri, rj), max(ri, rj))
                    if key in merge_evidence_map:
                        score, evs = merge_evidence_map[key]
                        r1 = records[ri].record_id
                        r2 = records[rj].record_id
                        for ev in evs:
                            all_evidence.append(f"[{r1}]↔[{r2}] {ev} (综合分={score:.2f})")

            if len(record_indices) == 1:
                all_evidence.append("单条记录，无可对比归并对象")

            status = MergeStatus.MERGED if len(cluster_records) > 1 else MergeStatus.PENDING
            if len(cluster_records) > 1 and not all_evidence:
                status = MergeStatus.NEEDS_EVIDENCE

            group = MergedPointGroup(
                group_id=f"GRP{datetime.now().strftime('%Y%m%d')}{uuid.uuid4().hex[:6].upper()}",
                canonical_location=canonical,
                merged_records=cluster_records,
                merge_status=status,
                complaint_status=ComplaintStatus.SINGLE,
                merge_evidence=all_evidence,
                duplicate_count=0,
                merged_at=datetime.now(),
            )
            groups.append(group)

        return sorted(groups, key=lambda g: (-g.record_count, g.group_id))

    def _choose_canonical_location(self, records: List[RawPointRecord]) -> str:
        if not records:
            return ""
        approval_records = [r for r in records if r.source == DataSource.APPROVAL_LEDGER]
        if approval_records:
            best = max(approval_records, key=lambda r: len(r.original_location_text or ""))
            return best.original_location_text

        best = max(records, key=lambda r: len(r.original_location_text or ""))
        return best.original_location_text

    def _analyze_complaints(self, groups: List[MergedPointGroup]):
        for group in groups:
            if group.record_count <= 1:
                continue

            complainants = set()
            contents = []
            for r in group.merged_records:
                if r.complainant:
                    complainants.add(r.complainant)
                if r.complaint_content:
                    contents.append(self.normalizer.normalize(r.complaint_content))

            duplicate_count = group.record_count - 1

            if duplicate_count >= 2:
                group.complaint_status = ComplaintStatus.DUPLICATE
                group.duplicate_count = duplicate_count
            elif duplicate_count == 1:
                if len(complainants) == 1 and contents:
                    content_sim = self.similarity.lcs_similarity(contents[0], contents[1]) if len(contents) >= 2 else 0
                    if content_sim >= 0.7:
                        group.complaint_status = ComplaintStatus.DUPLICATE
                        group.duplicate_count = duplicate_count
                    else:
                        group.complaint_status = ComplaintStatus.NEEDS_REVIEW
                else:
                    group.complaint_status = ComplaintStatus.NEEDS_REVIEW

    def _generate_next_steps(self, groups: List[MergedPointGroup]):
        for group in groups:
            hints = []

            if group.merge_status == MergeStatus.NEEDS_EVIDENCE:
                hints.append("1. 补充审批台账原始记录或聊天记录截图作为归并依据")
                hints.append("2. 如该点位有明确审批编号，请在原始记录中录入审批编号")
                hints.append("3. 现场核实该点位具体位置，拍照留存")

            if group.merge_status == MergeStatus.PENDING and group.record_count == 1:
                hints.append("1. 确认该点位是否有其他来源的投诉或记录")
                hints.append("2. 如确认为独立点位，可标记为'已归并（单点位）'")

            if group.complaint_status == ComplaintStatus.DUPLICATE:
                hints.append(f"1. 检测到该点位存在 {group.duplicate_count} 条重复投诉")
                hints.append("2. 与首位投诉人联系，告知处理进度")
                hints.append("3. 将重复投诉合并处理，统一回复所有投诉人")
                hints.append("4. 在系统中标记重复投诉关联关系")

            if group.complaint_status == ComplaintStatus.NEEDS_REVIEW:
                hints.append("1. 人工复核该点位下多条投诉是否属于同一事项")
                hints.append("2. 联系投诉人确认具体位置和问题")
                hints.append("3. 如为不同问题，拆分为不同归并组；如为同一问题，标记为重复投诉")

            if any("相邻不同点位" in ev for ev in group.merge_evidence):
                hints.append("⚠️ 该组包含距离极近的点位，需现场核实是否为同一座椅位置")
                hints.append("   - 如为同一座椅：确认归并，补充现场照片证据")
                hints.append("   - 如为相邻不同座椅：拆分为独立归并组，分别处理")

            group.next_step_hint = "\n".join(hints) if hints else "无特殊处理要求，按正常流程办理"

    def _compute_statistics(self, records: List[RawPointRecord], groups: List[MergedPointGroup]) -> Statistics:
        stats = Statistics()
        stats.total_raw_records = len(records)
        stats.total_merged_groups = len(groups)

        for r in records:
            key = r.source.value
            stats.by_source[key] = stats.by_source.get(key, 0) + 1

        for g in groups:
            ms = g.merge_status.value
            stats.by_merge_status[ms] = stats.by_merge_status.get(ms, 0) + 1

            cs = g.complaint_status.value
            stats.by_complaint_status[cs] = stats.by_complaint_status.get(cs, 0) + 1

            if g.has_duplicate_complaints:
                stats.duplicate_complaint_groups += 1
            if g.merge_status == MergeStatus.NEEDS_EVIDENCE:
                stats.needs_evidence_groups += 1
            if g.merge_status == MergeStatus.PENDING:
                stats.pending_groups += 1
            if g.merge_status == MergeStatus.REVIEWED:
                stats.reviewed_groups += 1

        return stats
