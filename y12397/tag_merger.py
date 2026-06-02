import uuid
import difflib
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional
from models import (
    AuditDataset,
    AudioMaterial,
    TagSimilarity,
    MergeFeedback,
    Issue,
    IssueType,
    Severity,
)


class TagMerger:
    def __init__(self, dataset: AuditDataset):
        self.dataset = dataset
        self.merge_rules: Dict[str, str] = {}
        self._build_tag_similarities()

    def _gen_id(self, prefix: str) -> str:
        return f"{prefix}_{uuid.uuid4().hex[:8]}"

    def _calc_tag_similarity(self, tag_a: str, tag_b: str) -> float:
        tag_a_low = tag_a.lower()
        tag_b_low = tag_b.lower()

        if tag_a_low == tag_b_low:
            return 1.0

        if tag_a_low in tag_b_low or tag_b_low in tag_a_low:
            return 0.85

        seq_ratio = difflib.SequenceMatcher(None, tag_a_low, tag_b_low).ratio()

        semantic_pairs = [
            ({"欢快", "愉悦", "开心", "快乐"}, 0.9),
            ({"悲伤", "伤感", "难过", "忧郁"}, 0.9),
            ({"紧张", "刺激", "悬疑", "焦虑"}, 0.85),
            ({"温馨", "温暖", "治愈", "舒缓"}, 0.85),
            ({"激昂", "振奋", "热血", "澎湃"}, 0.85),
            ({"神秘", "诡异", "空灵", "梦幻"}, 0.8),
            ({"轻松", "舒缓", "平静", "安宁"}, 0.75),
            ({"活泼", "轻快", "灵动"}, 0.8),
        ]

        for group, score in semantic_pairs:
            if tag_a_low in group and tag_b_low in group:
                return max(seq_ratio, score)

        return seq_ratio

    def _build_tag_similarities(self, threshold: float = 0.6) -> List[TagSimilarity]:
        all_tags: Set[str] = set()
        for mat in self.dataset.materials.values():
            all_tags.update(mat.source_tags)
            all_tags.update(mat.manual_tags)
            all_tags.update(mat.merged_tags)
        for report in self.dataset.reports.values():
            all_tags.update(report.auditor_tags)
            all_tags.update(report.merge_suggestions)

        tag_list = sorted(all_tags)
        similarities: List[TagSimilarity] = []

        for i in range(len(tag_list)):
            for j in range(i + 1, len(tag_list)):
                score = self._calc_tag_similarity(tag_list[i], tag_list[j])
                if score >= threshold:
                    sim = TagSimilarity(
                        tag_a=tag_list[i],
                        tag_b=tag_list[j],
                        similarity_score=round(score, 4),
                    )
                    similarities.append(sim)

        self.dataset.tag_similarities = similarities
        return similarities

    def rebuild_similarities(self, threshold: float = 0.6) -> List[TagSimilarity]:
        """相似检索变化后重新计算，并同步更新反馈追踪和异常样本"""
        old_sims = {(s.tag_a, s.tag_b): s for s in self.dataset.tag_similarities}
        new_sims = self._build_tag_similarities(threshold)

        new_sim_keys = {(s.tag_a, s.tag_b) for s in new_sims}

        for feedback in self.dataset.merge_feedbacks:
            for orig_tag in feedback.original_tags:
                for sugg_tag in feedback.suggested_tags:
                    key = (orig_tag, sugg_tag) if orig_tag < sugg_tag else (sugg_tag, orig_tag)
                    if key in new_sim_keys and key not in old_sims:
                        feedback.anomaly_sample = True

        return new_sims

    def _get_canonical_tag(self, tag: str) -> str:
        return self.merge_rules.get(tag, tag)

    def suggest_merge(self, material: AudioMaterial) -> Tuple[List[str], List[TagSimilarity]]:
        """不是一次性判断，给出归并建议和依据"""
        all_tags = list(material.all_tags())
        if not all_tags:
            return [], []

        tag_set = set(all_tags)
        used_similarities: List[TagSimilarity] = []

        for sim in self.dataset.tag_similarities:
            if sim.tag_a in tag_set and sim.tag_b in tag_set:
                used_similarities.append(sim)

        feedback_adjusted: Dict[str, float] = {}
        for feedback in self.dataset.merge_feedbacks:
            if feedback.material_id == material.material_id:
                continue
            for orig_tag in feedback.original_tags:
                for sugg_tag in feedback.suggested_tags:
                    if feedback.accepted:
                        feedback_adjusted[(orig_tag, sugg_tag)] = feedback_adjusted.get((orig_tag, sugg_tag), 0) + 0.1
                    else:
                        feedback_adjusted[(orig_tag, sugg_tag)] = feedback_adjusted.get((orig_tag, sugg_tag), 0) - 0.2

        merged_tags: List[str] = []
        processed: Set[str] = set()

        for tag in all_tags:
            if tag in processed:
                continue

            canonical = self._get_canonical_tag(tag)
            similar_group = [tag]
            processed.add(tag)

            for sim in used_similarities:
                other_tag = None
                if sim.tag_a == tag and sim.tag_b not in processed:
                    other_tag = sim.tag_b
                elif sim.tag_b == tag and sim.tag_a not in processed:
                    other_tag = sim.tag_a

                if other_tag:
                    adjustment = feedback_adjusted.get((tag, other_tag), 0)
                    adjusted_score = sim.similarity_score + adjustment
                    if adjusted_score >= 0.7:
                        similar_group.append(other_tag)
                        processed.add(other_tag)

            if canonical in similar_group:
                if canonical not in merged_tags:
                    merged_tags.append(canonical)
            else:
                rep_tag = min(similar_group, key=lambda t: (
                    -sum(1 for m in self.dataset.materials.values() if t in m.all_tags()),
                    t
                ))
                if rep_tag not in merged_tags:
                    merged_tags.append(rep_tag)

        return merged_tags, used_similarities

    def apply_merge(self, material: AudioMaterial, dry_run: bool = True) -> Dict:
        """应用归并，记录历史，不擅自替业务改口径"""
        suggested, similarities = self.suggest_merge(material)
        current_tags = list(material.all_tags())

        result = {
            "material_id": material.material_id,
            "material_title": material.title,
            "current_tags": current_tags,
            "suggested_tags": suggested,
            "differences": {
                "removed": sorted(set(current_tags) - set(suggested)),
                "added": sorted(set(suggested) - set(current_tags)),
            },
            "similarity_evidence": [
                {"tag_a": s.tag_a, "tag_b": s.tag_b, "score": s.similarity_score}
                for s in similarities
            ],
            "applied": False,
        }

        if not dry_run and set(suggested) != set(material.merged_tags):
            merge_record = {
                "merge_time": datetime.now().isoformat(),
                "previous_merged_tags": material.merged_tags.copy(),
                "new_merged_tags": suggested,
                "similarities_used": [
                    {"tag_a": s.tag_a, "tag_b": s.tag_b, "score": s.similarity_score}
                    for s in similarities
                ],
            }
            material.merged_tags = suggested
            material.merge_history.append(merge_record)
            result["applied"] = True
            result["merge_record"] = merge_record

        return result

    def record_feedback(
        self,
        material_id: str,
        original_tags: List[str],
        suggested_tags: List[str],
        accepted: bool,
        feedback_text: str,
        anomaly_sample: bool = False,
    ) -> MergeFeedback:
        """记录归并反馈，用于后续迭代"""
        feedback = MergeFeedback(
            feedback_id=self._gen_id("fb"),
            material_id=material_id,
            original_tags=original_tags,
            suggested_tags=suggested_tags,
            accepted=accepted,
            feedback_text=feedback_text,
            feedback_time=datetime.now(),
            anomaly_sample=anomaly_sample,
        )
        self.dataset.merge_feedbacks.append(feedback)

        if not accepted:
            for orig in original_tags:
                for sugg in suggested_tags:
                    if orig in self.merge_rules and self.merge_rules[orig] == sugg:
                        del self.merge_rules[orig]

        return feedback

    def check_merge_anomalies(self) -> List[Issue]:
        """检查归并异常样本"""
        issues: List[Issue] = []
        anomaly_feedbacks = [f for f in self.dataset.merge_feedbacks if f.anomaly_sample]

        if anomaly_feedbacks:
            mat_ids = list({f.material_id for f in anomaly_feedbacks})
            issue = Issue(
                issue_id=self._gen_id("issue"),
                issue_type=IssueType.MERGE_ANOMALY,
                severity=Severity.WARNING,
                title=f"发现{len(anomaly_feedbacks)}个归并异常样本",
                description=(
                    f"相似检索规则更新后，有{len(anomaly_feedbacks)}条历史反馈被标记为异常样本。"
                    f"涉及素材: {mat_ids[:5]}..." if len(mat_ids) > 5 else f"涉及素材: {mat_ids}"
                ),
                related_materials=mat_ids,
                evidence={
                    "anomaly_count": len(anomaly_feedbacks),
                    "anomalies": [
                        {
                            "feedback_id": f.feedback_id,
                            "material_id": f.material_id,
                            "original_tags": f.original_tags,
                            "suggested_tags": f.suggested_tags,
                            "feedback_text": f.feedback_text,
                            "feedback_time": f.feedback_time.isoformat(),
                        }
                        for f in anomaly_feedbacks
                    ],
                },
                suggestions=[
                    "逐一复核异常样本的标签归并是否正确",
                    "如为规则误判，调整相似检索阈值或添加排除规则",
                    "如为历史反馈有误，更新反馈状态",
                    "将异常样本加入测试集，避免后续规则退化",
                ],
            )
            issues.append(issue)

        for mat in self.dataset.materials.values():
            if not mat.merge_history:
                continue

            latest = mat.merge_history[-1]
            prev_tags = set(latest.get("previous_merged_tags", []))
            new_tags = set(latest.get("new_merged_tags", []))

            if prev_tags and not prev_tags.intersection(new_tags):
                issue = Issue(
                    issue_id=self._gen_id("issue"),
                    issue_type=IssueType.MERGE_ANOMALY,
                    severity=Severity.CRITICAL,
                    title=f"素材[{mat.title}]归并结果发生剧烈变化",
                    description=(
                        f"素材ID={mat.material_id} 最近一次归并后标签完全替换。"
                        f"归并前: {sorted(prev_tags)}, 归并后: {sorted(new_tags)}。"
                        f"这可能导致已分配项目出现用途错配。"
                    ),
                    related_materials=[mat.material_id],
                    evidence={
                        "material_id": mat.material_id,
                        "merge_time": latest.get("merge_time"),
                        "previous_tags": sorted(prev_tags),
                        "new_tags": sorted(new_tags),
                        "similarities_used": latest.get("similarities_used", []),
                    },
                    suggestions=[
                        "立即检查该规则变更的影响范围",
                        "回溯所有使用该素材的项目，确认是否需要调整",
                        "确认是否为规则错误导致的归并异常",
                        "重大归并变更建议走审批流程",
                    ],
                )
                issues.append(issue)

        return issues
