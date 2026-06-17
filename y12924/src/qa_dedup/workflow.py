"""工作流管理器 - 串起样本、版本、人工修正和分组指标."""

from typing import List, Dict, Set, Optional, Tuple
from collections import defaultdict
from datetime import datetime
import json
import os

from .models import (
    QASample,
    DatasetVersion,
    GroupMetrics,
    LeakRecord,
    DedupRecord,
    WorkflowReport,
    SplitType,
)
from .detemplatizer import Detemplatizer
from .leak_detector import LeakDetector
from .deduper import SampleDeduper


class WorkflowManager:
    """问答样本去模板化工作流管理器.

    把以下环节串成一条流水线：
    1. 样本去模板化
    2. 样本去重 + 安全拦截（支持增量）
    3. 训练验证泄漏检测
    4. 版本管理
    5. 分组指标统计
    6. 人工修正记录
    7. 报告导出
    """

    def __init__(
        self,
        detemplatizer: Optional[Detemplatizer] = None,
        leak_detector: Optional[LeakDetector] = None,
        deduper: Optional[SampleDeduper] = None,
        version_tag: str = "v1",
    ):
        self.detemplatizer = detemplatizer or Detemplatizer()
        self.leak_detector = leak_detector or LeakDetector()
        self.deduper = deduper or SampleDeduper()
        self.version_tag = version_tag
        self.samples: List[QASample] = []
        self.versions: List[DatasetVersion] = []
        self._current_version: Optional[DatasetVersion] = None
        self._manual_corrections: Dict[str, List[Dict]] = defaultdict(list)

    def load_samples(self, samples: List[QASample]) -> "WorkflowManager":
        for s in samples:
            s.version_tag = self.version_tag
        self.samples = samples
        return self

    def load_samples_from_json(self, file_path: str) -> "WorkflowManager":
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        samples = [QASample.from_dict(d) for d in data]
        return self.load_samples(samples)

    def save_samples_to_json(self, file_path: str):
        data = [s.to_dict() for s in self.samples]
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def create_version(
        self,
        version_tag: str,
        description: str = "",
        parent_version: Optional[str] = None,
        change_log: Optional[List[str]] = None,
    ) -> DatasetVersion:
        train_count = sum(1 for s in self.samples if s.split == SplitType.TRAIN)
        val_count = sum(1 for s in self.samples if s.split == SplitType.VAL)
        test_count = sum(1 for s in self.samples if s.split == SplitType.TEST)
        version = DatasetVersion(
            version_tag=version_tag,
            description=description,
            parent_version=parent_version or self.version_tag,
            sample_count=len(self.samples),
            train_count=train_count,
            val_count=val_count,
            test_count=test_count,
            change_log=change_log or [],
        )
        self.versions.append(version)
        self._current_version = version
        self.version_tag = version_tag
        for s in self.samples:
            s.version_tag = version_tag
        return version

    def apply_manual_correction(
        self,
        sample_id: str,
        field: str,
        old_value: str,
        new_value: str,
        author: str = "anonymous",
        note: Optional[str] = None,
    ) -> bool:
        target = None
        for s in self.samples:
            if s.sample_id == sample_id:
                target = s
                break
        if not target:
            return False
        correction = {
            "field": field,
            "old_value": old_value,
            "new_value": new_value,
            "author": author,
            "timestamp": datetime.now().isoformat(),
        }
        if hasattr(target, field):
            setattr(target, field, new_value)
            target.updated_at = datetime.now().isoformat()
        if note:
            target.add_human_note(note, author=author)
        self._manual_corrections[sample_id].append(correction)
        return True

    def get_manual_corrections(self, sample_id: Optional[str] = None) -> Dict[str, List[Dict]]:
        if sample_id:
            return {sample_id: self._manual_corrections.get(sample_id, [])}
        return dict(self._manual_corrections)

    def run_detemplatize(self) -> Dict:
        return self.detemplatizer.process_batch(self.samples)

    def run_dedup(self, is_incremental: bool = False) -> Tuple[List[DedupRecord], Set[str]]:
        if not is_incremental:
            self.deduper.reset()
            return self.deduper.find_duplicates(self.samples, is_incremental=False)
        return self.deduper.incremental_update(self.samples)

    def run_leak_detection(self) -> List[LeakRecord]:
        return self.leak_detector.detect(self.samples)

    def compute_group_metrics(
        self,
        blocked_ids: Set[str],
        leak_records: List[LeakRecord],
        dedup_records: List[DedupRecord],
    ) -> List[GroupMetrics]:
        groups: Dict[str, List[QASample]] = defaultdict(list)
        for s in self.samples:
            g = s.group or "未分组"
            groups[g].append(s)
        leak_val_ids = {lr.val_sample_id for lr in leak_records}
        leak_train_ids = {lr.train_sample_id for lr in leak_records}
        dedup_removed_ids = {dr.removed_sample_id for dr in dedup_records}
        metrics_list: List[GroupMetrics] = []
        for group_name, group_samples in sorted(groups.items()):
            gm = GroupMetrics(group_name=group_name)
            gm.total_samples = len(group_samples)
            for s in group_samples:
                is_blocked = s.sample_id in blocked_ids or s.sample_id in leak_val_ids or s.sample_id in dedup_removed_ids
                if is_blocked:
                    gm.blocked_samples += 1
                else:
                    gm.usable_samples += 1
                if s.split == SplitType.TRAIN:
                    gm.train_count += 1
                elif s.split == SplitType.VAL:
                    gm.val_count += 1
                if s.sample_id in leak_val_ids or s.sample_id in leak_train_ids:
                    gm.leak_count += 1
                if s.sample_id in dedup_removed_ids:
                    gm.duplicate_count += 1
                if s.template_removed:
                    gm.template_count += 1
            metrics_list.append(gm)
        return metrics_list

    def run_full_workflow(self) -> WorkflowReport:
        report = WorkflowReport(version_tag=self.version_tag)
        detemp_result = self.run_detemplatize()
        report.template_removed_count = detemp_result.get("templated_count", 0)
        dedup_records, dedup_blocked = self.run_dedup(is_incremental=False)
        report.dedup_records = dedup_records
        leak_records = self.run_leak_detection()
        report.leak_records = leak_records
        leak_blocked = self.leak_detector.get_blocked_val_ids(leak_records)
        all_blocked = dedup_blocked | leak_blocked
        report.blocked_sample_ids = sorted(all_blocked)
        report.total_processed = len(self.samples)
        report.total_blocked = len(all_blocked)
        usable_ids = [s.sample_id for s in self.samples if s.sample_id not in all_blocked]
        report.usable_sample_ids = usable_ids
        report.total_usable = len(usable_ids)
        report.group_metrics = self.compute_group_metrics(
            all_blocked, leak_records, dedup_records
        )
        report.export_summary = self._build_export_summary(report)
        return report

    def run_incremental_workflow(
        self,
        new_samples: List[QASample],
    ) -> WorkflowReport:
        for s in new_samples:
            s.version_tag = self.version_tag
        self.samples.extend(new_samples)
        report = WorkflowReport(version_tag=self.version_tag)
        detemp_result = self.detemplatizer.process_batch(new_samples)
        report.template_removed_count = detemp_result.get("templated_count", 0)
        dedup_records, dedup_blocked = self.deduper.incremental_update(new_samples)
        report.dedup_records = dedup_records
        leak_records = self.leak_detector.detect(self.samples)
        report.leak_records = leak_records
        leak_blocked = self.leak_detector.get_blocked_val_ids(leak_records)
        all_blocked = dedup_blocked | leak_blocked
        report.blocked_sample_ids = sorted(all_blocked)
        report.total_processed = len(new_samples)
        report.total_blocked = len(all_blocked)
        usable_ids = [s.sample_id for s in new_samples if s.sample_id not in all_blocked]
        report.usable_sample_ids = usable_ids
        report.total_usable = len(usable_ids)
        report.group_metrics = self.compute_group_metrics(
            all_blocked, leak_records, dedup_records
        )
        report.export_summary = self._build_export_summary(report)
        return report

    @staticmethod
    def _build_export_summary(report: WorkflowReport) -> str:
        lines = [
            f"样本处理汇总（版本 {report.version_tag}）",
            f"共处理样本：{report.total_processed} 条",
            f"可用样本：{report.total_usable} 条",
            f"拦截样本：{report.total_blocked} 条",
            f"  - 训练验证泄漏：{len(report.leak_records)} 条",
            f"  - 重复样本：{len(report.dedup_records)} 条",
            f"  - 模板化清理：{report.template_removed_count} 条",
            "",
            f"分组明细：",
        ]
        for gm in report.group_metrics:
            lines.append(
                f"  [{gm.group_name}] 总计 {gm.total_samples}，可用 {gm.usable_samples}，"
                f"拦截 {gm.blocked_samples}（泄漏 {gm.leak_count}，重复 {gm.duplicate_count}）"
            )
        lines.append("")
        lines.append("详细拦截记录见下方各条目，每条均附拦截原因和人工备注原话。")
        return "\n".join(lines)
