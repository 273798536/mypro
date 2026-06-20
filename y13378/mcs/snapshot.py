"""版本快照与人工修正"""
from typing import List, Dict, Optional, Any
from collections import Counter

from .models import (
    Sample, Correction, VersionSnapshot, _new_id
)
from .storage import Storage


class SnapshotManager:
    """版本快照管理器"""

    def __init__(self, storage: Storage):
        self.storage = storage

    def create_snapshot(self, snapshot_name: str, model_version: str,
                        sample_ids: Optional[List[str]] = None,
                        description: str = "",
                        created_by: str = "",
                        parent_snapshot_id: Optional[str] = None) -> VersionSnapshot:
        """创建新版本快照

        如果不指定 sample_ids，则使用当前所有样本
        """
        if sample_ids is None:
            all_samples = self.storage.list_samples()
            sample_ids = [s.sample_id for s in all_samples]

        # 计算统计摘要
        summary = self._compute_summary(sample_ids)

        # 自动收集已有修正记录
        correction_ids = []
        for sid in sample_ids:
            corrs = self.storage.list_corrections(sample_id=sid)
            for c in corrs:
                if c.correction_id not in correction_ids:
                    correction_ids.append(c.correction_id)

        snapshot = VersionSnapshot(
            snapshot_id=_new_id("snap"),
            snapshot_name=snapshot_name,
            model_version=model_version,
            sample_ids=sample_ids,
            correction_ids=correction_ids,
            summary=summary,
            description=description,
            created_by=created_by,
            parent_snapshot_id=parent_snapshot_id,
        )

        self.storage.save_snapshot(snapshot)
        return snapshot

    def add_samples_to_snapshot(self, snapshot_id: str,
                                new_sample_ids: List[str]) -> Optional[VersionSnapshot]:
        """向已有快照追加样本（返回更新后的快照）"""
        snapshot = self.storage.load_snapshot(snapshot_id)
        if not snapshot:
            return None

        # 去重
        existing = set(snapshot.sample_ids)
        for sid in new_sample_ids:
            if sid not in existing:
                snapshot.sample_ids.append(sid)
                existing.add(sid)

        # 重新计算摘要
        snapshot.summary = self._compute_summary(snapshot.sample_ids)

        self.storage.save_snapshot(snapshot)
        return snapshot

    def add_correction_to_snapshot(self, snapshot_id: str,
                                   correction_id: str) -> Optional[VersionSnapshot]:
        snapshot = self.storage.load_snapshot(snapshot_id)
        if not snapshot:
            return None
        if correction_id not in snapshot.correction_ids:
            snapshot.correction_ids.append(correction_id)
        self.storage.save_snapshot(snapshot)
        return snapshot

    def _compute_summary(self, sample_ids: List[str]) -> Dict[str, Any]:
        """计算快照摘要统计"""
        samples = [self.storage.load_sample(sid) for sid in sample_ids]
        samples = [s for s in samples if s is not None]

        total = len(samples)
        pred_counter = Counter(s.predicted_label for s in samples if s.predicted_label)
        true_counter = Counter(s.true_label for s in samples if s.true_label)

        # 误判数（有真实标签且与预测不一致）
        misjudged = [s for s in samples
                     if s.true_label and s.predicted_label
                     and s.true_label != s.predicted_label]

        # 小样本类别（样本数 < 5 的类别）
        label_counts = pred_counter.most_common()
        small_categories = [(label, cnt) for label, cnt in label_counts if cnt < 5]

        # 平均置信度
        confidences = [s.confidence for s in samples if s.confidence > 0]
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # 灰度比例有值的数量
        has_gray = sum(1 for s in samples if s.gray_ratio is not None)

        return {
            "total_samples": total,
            "predicted_distribution": dict(pred_counter),
            "true_distribution": dict(true_counter),
            "misjudged_count": len(misjudged),
            "misjudged_ids": [s.sample_id for s in misjudged],
            "small_categories": small_categories,
            "avg_confidence": round(avg_confidence, 4),
            "has_gray_ratio_count": has_gray,
            "missing_gray_ratio_count": total - has_gray,
        }

    def get_snapshot_samples(self, snapshot_id: str) -> List[Sample]:
        """获取快照包含的所有样本"""
        snapshot = self.storage.load_snapshot(snapshot_id)
        if not snapshot:
            return []
        samples = []
        for sid in snapshot.sample_ids:
            s = self.storage.load_sample(sid)
            if s:
                samples.append(s)
        return samples

    def compare_snapshots(self, snap_id_a: str, snap_id_b: str) -> Dict[str, Any]:
        """对比两个快照的差异"""
        snap_a = self.storage.load_snapshot(snap_id_a)
        snap_b = self.storage.load_snapshot(snap_id_b)
        if not snap_a or not snap_b:
            return {}

        set_a = set(snap_a.sample_ids)
        set_b = set(snap_b.sample_ids)

        added = set_b - set_a
        removed = set_a - set_b
        common = set_a & set_b

        # 检查共同样本中标签变化（由修正导致）
        changed_labels = []
        for sid in common:
            sa = self.storage.load_sample(sid)
            # 注意：样本本身可能已被修正更新，需要看修正记录
            corrections = self.storage.list_corrections(sample_id=sid)
            if corrections:
                # 取最新一次修正
                latest = corrections[-1]
                changed_labels.append({
                    "sample_id": sid,
                    "before": latest.before_label,
                    "after": latest.after_label,
                    "reason": latest.reason,
                    "operator": latest.operator,
                })

        return {
            "snapshot_a": snap_a.snapshot_name,
            "snapshot_b": snap_b.snapshot_name,
            "added_count": len(added),
            "added_ids": sorted(list(added)),
            "removed_count": len(removed),
            "removed_ids": sorted(list(removed)),
            "common_count": len(common),
            "label_changed_count": len(changed_labels),
            "label_changed": changed_labels,
            "summary_a": snap_a.summary,
            "summary_b": snap_b.summary,
        }


class CorrectionManager:
    """人工修正管理器"""

    def __init__(self, storage: Storage):
        self.storage = storage

    def correct_sample(self, sample_id: str, new_label: str,
                       operator: str = "", reason: str = "",
                       new_note: str = "") -> Optional[Correction]:
        """人工修正样本标签（修正真实标签/最终判定，模型预测保持不变）

        保留修正前后的完整记录，样本的 true_label 会更新
        predicted_label 保留模型原始预测，用于统计误判
        """
        sample = self.storage.load_sample(sample_id)
        if not sample:
            return None

        before_label = sample.true_label or "(未标注)"
        before_note = sample.note

        # 创建修正记录
        correction = Correction(
            correction_id=_new_id("corr"),
            sample_id=sample_id,
            operator=operator,
            before_label=before_label,
            after_label=new_label,
            before_note=before_note,
            after_note=new_note,
            reason=reason,
        )

        self.storage.save_correction(correction)

        # 更新样本的真实标签（不修改模型预测值）
        sample.true_label = new_label
        if new_note:
            sample.note = new_note
        sample.is_misjudged = (sample.predicted_label != new_label)

        self.storage.save_sample(sample)

        return correction

    def revert_correction(self, correction_id: str) -> bool:
        """回滚一次修正"""
        # 暂不实现复杂回滚，保留接口
        return False

    def get_sample_history(self, sample_id: str) -> List[Correction]:
        """获取样本的所有修正历史"""
        return self.storage.list_corrections(sample_id=sample_id)
