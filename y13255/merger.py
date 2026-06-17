import re
from difflib import SequenceMatcher
from typing import List, Tuple, Optional, Dict
from models import (
    ResidentFeedback,
    MergedPoint,
    PointAlias,
    MergeRule,
    HistoryRecord,
    MergeSession,
)


class PointMerger:
    ROAD_SUFFIXES = ["路", "街", "道", "巷", "弄", "大道", "大街", "支路"]
    ORIENTATION_WORDS = ["东", "南", "西", "北", "前", "后", "左", "右", "侧", "旁"]
    LOCATION_MARKERS = ["门口", "校门", "大门口", "正门", "侧门", "后门", "路口", "交叉口", "红绿灯"]

    def __init__(self, session: MergeSession):
        self.session = session

    @staticmethod
    def build_adjacent_next_steps(name_a: str, name_b: str, scenario: str = "同点位内") -> List[str]:
        if scenario == "cross_point":
            return [
                f"第1步：打开地图APP，分别搜索「{name_a}」和「{name_b}」，观察两个位置的实际距离与方位关系",
                f"第2步：若地图显示两点距离≤50米或街景为同一物理位置（同一校门/同一路口对角）→ 判定为同一地点，走第3步；否则判定为不同路口，走第4步",
                f"第3步（同一地点需合并）：调用 ManualOperator.merge_two_points(keep_id='保留点位的ID', remove_id='被合并点位的ID', reason='地图核实为同一接送点')，合并后两个点位名会同时保存在别名区",
                f"第4步（不同路口需拆分维持）：分别给两个点位名补上方位词（如「{name_a}(东侧)」「{name_b}(西侧)」），调用 ManualOperator.rename_canonical 逐个重命名，并分别对两条记录调用 confirm_point 确认",
                "第5步：处理完成后检查点位的异常提示是否被清除，如仍残留旧提示可忽略（历史已记录，新的归并会话不会再触发）",
            ]
        return [
            f"第1步：打开地图APP，分别搜索「{name_a}」和「{name_b}」，对比卫星图和街景判断是否同一个接送位置",
            f"第2步：若为同一地点（距离≤50米 / 同一路口不同表述 / 指向同一个校门）→ 无需拆分，将两个名称都保留为别名，然后调用 ManualOperator.confirm_point 标记确认",
            f"第3步：若为不同路口（隔了一条路、或方位明显不同，如一个东门一个西门）→ 需要拆分：先整理两组居民反馈各自的 feedback_id 清单",
            f"第4步（拆分操作）：调用 ManualOperator.split_point(point_id='当前点位ID', keep_feedback_ids=['保留在本点位的反馈ID列表'], split_name='拆出点位的新名称（带方位词）', reason='地图核实为两个不同接送路口')",
            f"第5步：拆分完成后，对两个新点位分别调用 confirm_point，确认拆分结果正确",
            f"第6步：将新点位名（带方位词）同步反馈给排班同事，避免车辆走错位置",
        ]

    def normalize_text(self, text: str) -> str:
        if not text:
            return ""
        t = text.strip()
        t = re.sub(r"[\s\-_，,。.、/\\\\]", "", t)
        t = t.replace("号", "")
        for suf in sorted(self.ROAD_SUFFIXES, key=len, reverse=True):
            t = t.replace(suf, "@")
        return t

    def similarity(self, a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        na = self.normalize_text(a)
        nb = self.normalize_text(b)
        if na == nb:
            return 1.0
        return SequenceMatcher(None, na, nb).ratio()

    def is_adjacent_intersection(self, desc_a: str, desc_b: str) -> Tuple[bool, str]:
        if not desc_a or not desc_b:
            return False, ""
        a_has = any(w in desc_a for w in self.LOCATION_MARKERS)
        b_has = any(w in desc_b for w in self.LOCATION_MARKERS)
        if not (a_has and b_has):
            return False, ""
        diff_orient = set()
        for w in self.ORIENTATION_WORDS:
            in_a = w in desc_a
            in_b = w in desc_b
            if in_a != in_b:
                diff_orient.add(w)
        sim = self.similarity(desc_a, desc_b)
        if diff_orient and 0.5 <= sim < 0.92:
            hint = "检测到方位词差异(" + "/".join(diff_orient) + ")且相似度=" + f"{sim:.2f}"
            return True, hint
        return False, ""

    def extract_school_and_point(self, fb: ResidentFeedback) -> Tuple[str, str]:
        school = fb.school_name.strip()
        point = fb.point_description.strip() if fb.point_description else fb.raw_text.strip()
        if not school:
            m = re.search(r"(.*?(小学|中学|学校|幼儿园))", fb.raw_text)
            if m:
                school = m.group(1)
        return school, point

    def get_peak_count_key(self, peak_type: str) -> Optional[str]:
        pt = (peak_type or "").strip()
        if pt in ["早高峰", "早", "morning", "上午", "送学"]:
            return "peak_morning_count"
        if pt in ["晚高峰", "晚", "evening", "下午", "接学"]:
            return "peak_evening_count"
        return None

    def run_merge(self) -> List[str]:
        anomalies: List[str] = []
        by_school: Dict[str, List[ResidentFeedback]] = {}
        for fb in self.session.feedbacks:
            school, _ = self.extract_school_and_point(fb)
            by_school.setdefault(school or "未注明学校", []).append(fb)

        for school, feedbacks in by_school.items():
            self._merge_school_points(school, feedbacks, anomalies)

        self._detect_cross_point_anomalies(anomalies)
        return anomalies

    def _merge_school_points(
        self, school: str, feedbacks: List[ResidentFeedback], anomalies: List[str]
    ) -> None:
        unassigned = list(feedbacks)
        while unassigned:
            fb = unassigned.pop(0)
            _, point_desc = self.extract_school_and_point(fb)
            matched = self._find_or_create_point(school, point_desc, fb, anomalies)
            remaining: List[ResidentFeedback] = []
            for other in unassigned:
                _, other_desc = self.extract_school_and_point(other)
                sim = self.similarity(point_desc, other_desc)
                is_adj, adj_hint = self.is_adjacent_intersection(point_desc, other_desc)
                if is_adj:
                    reason = (
                        f"相邻路口风险：「{point_desc}」与「{other_desc}」"
                        f"{adj_hint}，疑似不同路口，需要人工确认"
                    )
                    matched.anomaly_flags.append(reason)
                    for step in self.build_adjacent_next_steps(point_desc, other_desc):
                        if step not in matched.next_steps:
                            matched.next_steps.append(step)
                    anomalies.append(reason)
                    remaining.append(other)
                    continue
                if sim >= 0.72 or self._is_alias_match(other_desc, matched):
                    self._attach_feedback(matched, other, sim)
                else:
                    remaining.append(other)
            unassigned = remaining

    def _find_or_create_point(
        self, school: str, point_desc: str, fb: ResidentFeedback, anomalies: List[str]
    ) -> MergedPoint:
        for existing in self.session.merged_points:
            if existing.school_name != school:
                continue
            if existing.canonical_name == point_desc:
                self._attach_feedback(existing, fb, 1.0)
                return existing
            sim = self.similarity(existing.canonical_name, point_desc)
            is_adj, adj_hint = self.is_adjacent_intersection(existing.canonical_name, point_desc)
            if is_adj:
                flag = (
                    f"相邻路口风险：「{existing.canonical_name}」与「{point_desc}」{adj_hint}"
                )
                existing.anomaly_flags.append(flag)
                for step in self.build_adjacent_next_steps(existing.canonical_name, point_desc):
                    if step not in existing.next_steps:
                        existing.next_steps.append(step)
                anomalies.append(flag)
            if sim >= 0.72 and not is_adj:
                self._attach_feedback(existing, fb, sim)
                return existing
            alias_texts = [a.alias_text for a in existing.aliases]
            if any(self.similarity(point_desc, at) >= 0.8 for at in alias_texts):
                self._attach_feedback(existing, fb, sim)
                return existing
        new_point = MergedPoint(
            canonical_name=point_desc,
            school_name=school,
            location_hint=point_desc,
        )
        self._attach_feedback(new_point, fb, 1.0)
        self.session.merged_points.append(new_point)
        return new_point

    def _is_alias_match(self, desc: str, point: MergedPoint) -> bool:
        return any(self.similarity(desc, a.alias_text) >= 0.8 for a in point.aliases)

    def _attach_feedback(self, point: MergedPoint, fb: ResidentFeedback, sim: float) -> None:
        if fb.feedback_id not in point.feedback_refs:
            point.feedback_refs.append(fb.feedback_id)
        _, desc = self.extract_school_and_point(fb)
        if desc and desc != point.canonical_name:
            if not any(a.alias_text == desc for a in point.aliases):
                point.aliases.append(
                    PointAlias(alias_text=desc, source_feedback_id=fb.feedback_id)
                )
        peak_key = self.get_peak_count_key(fb.peak_type)
        if peak_key == "peak_morning_count":
            point.peak_morning_count += 1
        elif peak_key == "peak_evening_count":
            point.peak_evening_count += 1
        else:
            point.peak_morning_count += 1
            point.peak_evening_count += 1
        point.merge_evidence.append(
            {
                "feedback_id": fb.feedback_id,
                "raw_text": fb.raw_text,
                "peak_type": fb.peak_type,
                "similarity": round(sim, 3),
                "attached_at": fb.submitted_at,
            }
        )

    def _detect_cross_point_anomalies(self, anomalies: List[str]) -> None:
        n = len(self.session.merged_points)
        for i in range(n):
            for j in range(i + 1, n):
                a = self.session.merged_points[i]
                b = self.session.merged_points[j]
                if a.school_name != b.school_name:
                    continue
                is_adj, adj_hint = self.is_adjacent_intersection(a.canonical_name, b.canonical_name)
                if is_adj:
                    cross_steps = self.build_adjacent_next_steps(
                        a.canonical_name, b.canonical_name, scenario="cross_point"
                    )
                    for p in (a, b):
                        flag = (
                            f"跨点位相邻路口风险：「{a.canonical_name}」与「{b.canonical_name}」"
                            f"{adj_hint}，可能被错误拆分或错误合并"
                        )
                        if flag not in p.anomaly_flags:
                            p.anomaly_flags.append(flag)
                        for step in cross_steps:
                            if step not in p.next_steps:
                                p.next_steps.append(step)
                    anomalies.append(flag)


class ManualOperator:
    def __init__(self, session: MergeSession, operator: str = "社区运营-阿宁"):
        self.session = session
        self.operator = operator

    def _snapshot_point(self, point: MergedPoint) -> dict:
        return point.to_dict()

    def confirm_point(self, point_id: str, reason: str = "") -> bool:
        for p in self.session.merged_points:
            if p.point_id == point_id:
                before = self._snapshot_point(p)
                p.is_manual_confirmed = True
                after = self._snapshot_point(p)
                self.session.history.append(
                    HistoryRecord(
                        point_id=point_id,
                        action="人工确认",
                        before=before,
                        after=after,
                        operator=self.operator,
                        reason=reason or "核对居民反馈与现场一致",
                    )
                )
                return True
        return False

    def rename_canonical(self, point_id: str, new_name: str, reason: str = "") -> bool:
        for p in self.session.merged_points:
            if p.point_id == point_id:
                before = self._snapshot_point(p)
                if p.canonical_name != new_name:
                    p.aliases.append(
                        PointAlias(alias_text=p.canonical_name, note="重命名前的标准名")
                    )
                p.canonical_name = new_name
                after = self._snapshot_point(p)
                self.session.history.append(
                    HistoryRecord(
                        point_id=point_id,
                        action="重命名标准点位名",
                        before=before,
                        after=after,
                        operator=self.operator,
                        reason=reason or "根据居民反馈统一口径",
                    )
                )
                return True
        return False

    def split_point(self, point_id: str, keep_feedback_ids: List[str],
                    split_name: str, reason: str = "") -> Optional[str]:
        for idx, p in enumerate(self.session.merged_points):
            if p.point_id == point_id:
                before = self._snapshot_point(p)
                new_point = MergedPoint(
                    canonical_name=split_name,
                    school_name=p.school_name,
                    location_hint=split_name,
                )
                kept_feedbacks: List[str] = []
                moved_feedbacks: List[str] = []
                for fid in p.feedback_refs:
                    if fid in keep_feedback_ids:
                        kept_feedbacks.append(fid)
                    else:
                        moved_feedbacks.append(fid)
                moved_aliases: List[PointAlias] = []
                kept_aliases: List[PointAlias] = []
                for a in p.aliases:
                    if a.source_feedback_id and a.source_feedback_id in moved_feedbacks:
                        moved_aliases.append(a)
                    else:
                        kept_aliases.append(a)
                moved_evidence: List[dict] = []
                kept_evidence: List[dict] = []
                for ev in p.merge_evidence:
                    if ev.get("feedback_id") in moved_feedbacks:
                        moved_evidence.append(ev)
                    else:
                        kept_evidence.append(ev)
                p.feedback_refs = kept_feedbacks
                p.aliases = kept_aliases
                p.merge_evidence = kept_evidence
                p.peak_morning_count = sum(
                    1 for ev in kept_evidence if self._is_morning(ev.get("peak_type", ""))
                )
                p.peak_evening_count = sum(
                    1 for ev in kept_evidence if not self._is_morning(ev.get("peak_type", ""))
                )
                new_point.feedback_refs = moved_feedbacks
                new_point.aliases = moved_aliases
                new_point.merge_evidence = moved_evidence
                new_point.peak_morning_count = sum(
                    1 for ev in moved_evidence if self._is_morning(ev.get("peak_type", ""))
                )
                new_point.peak_evening_count = sum(
                    1 for ev in moved_evidence if not self._is_morning(ev.get("peak_type", ""))
                )
                self.session.merged_points.append(new_point)
                after = self._snapshot_point(p)
                self.session.history.append(
                    HistoryRecord(
                        point_id=point_id,
                        action="拆分配对",
                        before=before,
                        after=after,
                        operator=self.operator,
                        reason=reason or f"相邻路口拆分，新建点位「{split_name}」",
                    )
                )
                self.session.history.append(
                    HistoryRecord(
                        point_id=new_point.point_id,
                        action="由拆分产生新点位",
                        before=None,
                        after=new_point.to_dict(),
                        operator=self.operator,
                        reason=reason or f"从「{before.get('canonical_name')}」拆分",
                    )
                )
                return new_point.point_id
        return None

    @staticmethod
    def _is_morning(peak_type: str) -> bool:
        return peak_type in ["早高峰", "早", "morning", "上午", "送学"]

    def merge_two_points(self, keep_id: str, remove_id: str, reason: str = "") -> bool:
        keep_point = None
        remove_point = None
        for p in self.session.merged_points:
            if p.point_id == keep_id:
                keep_point = p
            if p.point_id == remove_id:
                remove_point = p
        if not keep_point or not remove_point:
            return False
        before_keep = self._snapshot_point(keep_point)
        before_remove = self._snapshot_point(remove_point)
        if remove_point.canonical_name != keep_point.canonical_name:
            keep_point.aliases.append(
                PointAlias(alias_text=remove_point.canonical_name, note="合并来源点位名")
            )
        for a in remove_point.aliases:
            if not any(x.alias_text == a.alias_text for x in keep_point.aliases):
                keep_point.aliases.append(a)
        for fid in remove_point.feedback_refs:
            if fid not in keep_point.feedback_refs:
                keep_point.feedback_refs.append(fid)
        for ev in remove_point.merge_evidence:
            keep_point.merge_evidence.append(ev)
        keep_point.peak_morning_count += remove_point.peak_morning_count
        keep_point.peak_evening_count += remove_point.peak_evening_count
        keep_point.anomaly_flags = [
            f for f in keep_point.anomaly_flags
            if remove_point.canonical_name not in f and keep_point.canonical_name not in f
        ]
        keep_point.next_steps = [
            s for s in keep_point.next_steps
            if remove_point.canonical_name not in s and keep_point.canonical_name not in s
        ]
        self.session.merged_points = [
            p for p in self.session.merged_points if p.point_id != remove_id
        ]
        self.session.history.append(
            HistoryRecord(
                point_id=keep_id,
                action="合并点位",
                before=before_keep,
                after=keep_point.to_dict(),
                operator=self.operator,
                reason=reason or f"与「{before_remove.get('canonical_name')}」确认为同一地点",
            )
        )
        self.session.history.append(
            HistoryRecord(
                point_id=remove_id,
                action="点位被合并",
                before=before_remove,
                after=None,
                operator=self.operator,
                reason=reason or f"合并入「{keep_point.canonical_name}」",
            )
        )
        return True
