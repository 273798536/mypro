"""复核流程逻辑模块

三类复核状态（贴近日常交接的文案）：
- 安全：结果一致、数据完整、无异常，可以通过
- 待确认：有疑点但不致命，需要人工核对（如边界样本、重复样本）
- 需补材料：缺数据、校验失败、版本不对，必须补齐才能继续
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Tuple
from datetime import datetime

from .graph import Graph, CutPointResult, TarjanCutPointFinder, CutPointType
from .data import SampleRecord, SampleDataset


class ReviewStatus(Enum):
    """复核状态分类"""
    SAFE = "safe"           # 安全：通过
    PENDING = "pending"     # 待确认：需要人工核对
    MISSING = "missing"     # 需补材料：必须补齐

    @property
    def display_name(self) -> str:
        names = {
            "safe": "安全",
            "pending": "待确认",
            "missing": "需补材料",
        }
        return names[self.value]

    @property
    def description(self) -> str:
        descriptions = {
            "safe": "算法结果与预期一致，数据校验通过，无异常标记。可以直接通过。",
            "pending": "存在需要人工核对的疑点（如边界样本、重复样本、结果接近阈值）。请老叶或相关同学确认后再定。",
            "missing": "缺少必要材料或校验失败（如数据篡改、版本不匹配、关键字段缺失）。必须补齐后才能进入复核。",
        }
        return descriptions[self.value]

    @property
    def action_text(self) -> str:
        actions = {
            "safe": "请在复核表上签字确认即可。",
            "pending": "请查看下方待确认事项列表，逐一核对后在备注栏说明结论。",
            "missing": "请先按'需补材料清单'补充完整，再重新提交复核。",
        }
        return actions[self.value]


@dataclass
class ReviewIssue:
    """复核发现的问题"""
    level: ReviewStatus
    category: str
    message: str
    suggestion: str
    record_id: Optional[str] = None


@dataclass
class ReviewResult:
    """单条记录的复核结果"""
    record: SampleRecord
    status: ReviewStatus
    algorithm_result: Optional[CutPointResult] = None
    match_expected: bool = False
    issues: List[ReviewIssue] = field(default_factory=list)
    pending_items: List[str] = field(default_factory=list)
    missing_items: List[str] = field(default_factory=list)
    reviewed_at: str = field(default_factory=lambda: datetime.now().isoformat())

    def add_issue(self, issue: ReviewIssue) -> None:
        self.issues.append(issue)
        if issue.level == ReviewStatus.PENDING:
            self.pending_items.append(issue.message)
        elif issue.level == ReviewStatus.MISSING:
            self.missing_items.append(issue.message)

    def finalize(self) -> None:
        """根据问题列表确定最终状态"""
        if any(i.level == ReviewStatus.MISSING for i in self.issues):
            self.status = ReviewStatus.MISSING
        elif any(i.level == ReviewStatus.PENDING for i in self.issues):
            self.status = ReviewStatus.PENDING
        else:
            self.status = ReviewStatus.SAFE


@dataclass
class ReviewSummary:
    """整批评审摘要"""
    total: int = 0
    safe_count: int = 0
    pending_count: int = 0
    missing_count: int = 0
    results: List[ReviewResult] = field(default_factory=list)
    duplicate_groups: List[Tuple[SampleRecord, SampleRecord]] = field(default_factory=list)
    boundary_samples: List[str] = field(default_factory=list)

    @property
    def all_safe(self) -> bool:
        return self.pending_count == 0 and self.missing_count == 0


class CutPointReviewer:
    """割点边界复核主流程"""

    STATUS_MESSAGES = {
        "safe": {
            "title": "✅ 安全",
            "subtitle": "此条记录复核通过",
            "next_step": "无异常，可签字确认。",
        },
        "pending": {
            "title": "⚠️ 待确认",
            "subtitle": "请人工核对以下事项",
            "next_step": "核对后在备注栏写明：已确认/需修改/退回重算。",
        },
        "missing": {
            "title": "❌ 需补材料",
            "subtitle": "缺少必要信息，无法继续复核",
            "next_step": "请按清单补齐材料后重新提交。",
        },
    }

    def __init__(self):
        self.finder = TarjanCutPointFinder()

    def review_dataset(self, dataset: SampleDataset) -> ReviewSummary:
        """复核整个数据集"""
        summary = ReviewSummary()
        summary.total = len(dataset.records)

        for record in dataset.records:
            result = self.review_record(record)
            summary.results.append(result)

            if result.status == ReviewStatus.SAFE:
                summary.safe_count += 1
            elif result.status == ReviewStatus.PENDING:
                summary.pending_count += 1
            else:
                summary.missing_count += 1

            if record.boundary_flag:
                summary.boundary_samples.append(record.sample_id)

        summary.duplicate_groups = dataset.find_duplicates()

        for orig, dup in summary.duplicate_groups:
            for r in summary.results:
                if r.record.sample_id == dup.sample_id:
                    r.add_issue(ReviewIssue(
                        level=ReviewStatus.PENDING,
                        category="重复检测",
                        message=f"检测到此样本与 {orig.sample_id} 数据完全一致（校验和相同）",
                        suggestion=f"请确认：是重复提交？还是合作完成？还是数据录入错误？原记录来源：{orig.source}",
                        record_id=dup.sample_id,
                    ))
                    r.finalize()

        for orig, dup in summary.duplicate_groups:
            for r in summary.results:
                if r.record.sample_id == orig.sample_id and not r.record.is_duplicate:
                    r.add_issue(ReviewIssue(
                        level=ReviewStatus.PENDING,
                        category="重复检测",
                        message=f"检测到重复记录：{dup.sample_id} 与此样本数据完全一致（校验和相同）",
                        suggestion=f"请确认两条记录的关系。另一条记录来源：{dup.source}",
                        record_id=orig.sample_id,
                    ))
                    r.finalize()

        return summary

    def review_record(self, record: SampleRecord) -> ReviewResult:
        """复核单条记录"""
        result = ReviewResult(record=record, status=ReviewStatus.SAFE)

        self._check_data_integrity(record, result)

        if result.status == ReviewStatus.MISSING:
            self._run_algorithm_safely(record, result)
            result.finalize()
            return result

        self._run_algorithm(record, result)
        self._check_result_match(record, result)
        self._check_boundary_conditions(record, result)
        self._check_supplementary_notes(record, result)
        self._check_version_consistency(record, result)

        result.finalize()
        return result

    def _check_data_integrity(self, record: SampleRecord, result: ReviewResult) -> None:
        """检查数据完整性"""
        if not record.sample_id:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.MISSING,
                category="数据缺失",
                message="样本ID为空",
                suggestion="请补充样本编号（如 SAMPLE-007）",
                record_id=record.sample_id,
            ))

        if not record.graph.vertices:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.MISSING,
                category="数据缺失",
                message="图数据为空，没有顶点",
                suggestion="请补充图的顶点和边数据",
                record_id=record.sample_id,
            ))

        if not record.source or record.source == "unknown":
            result.add_issue(ReviewIssue(
                level=ReviewStatus.MISSING,
                category="数据缺失",
                message="来源信息缺失或为默认值'unknown'",
                suggestion="请补充数据来源（如'课堂作业_第3章'、'教材习题_P127'）",
                record_id=record.sample_id,
            ))

        if not record.version:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.MISSING,
                category="数据缺失",
                message="版本号缺失",
                suggestion="请补充版本号（如 1.0、1.2）。如果同学改过参数，请更新版本号并记录变更。",
                record_id=record.sample_id,
            ))

        current_checksum = record.compute_checksum()
        if record.checksum and record.checksum != current_checksum:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.MISSING,
                category="校验失败",
                message=f"数据校验和不匹配（记录：{record.checksum}，当前计算：{current_checksum}）",
                suggestion="数据可能被篡改或版本更新后未重新计算校验和。请确认数据正确性，如属正常修改请更新版本号和校验和。",
                record_id=record.sample_id,
            ))

    def _run_algorithm_safely(self, record: SampleRecord, result: ReviewResult) -> None:
        """数据不完整时尝试安全运行算法"""
        try:
            if record.graph.vertices:
                result.algorithm_result = self.finder.find_cut_points(record.graph)
        except Exception:
            pass

    def _run_algorithm(self, record: SampleRecord, result: ReviewResult) -> None:
        """运行割点检测算法"""
        try:
            result.algorithm_result = self.finder.find_cut_points(record.graph)
        except Exception as e:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.MISSING,
                category="算法错误",
                message=f"割点检测算法运行失败：{str(e)}",
                suggestion="请检查图数据格式是否正确，边是否为有效整数顶点对。",
                record_id=record.sample_id,
            ))

    def _check_result_match(self, record: SampleRecord, result: ReviewResult) -> None:
        """检查算法结果与预期是否匹配"""
        if result.algorithm_result is None:
            return

        expected = set(record.expected_cut_points)
        actual = result.algorithm_result.cut_points
        result.match_expected = expected == actual

        if not result.match_expected:
            missing = expected - actual
            extra = actual - expected

            parts = []
            if missing:
                parts.append(f"预期有但没检测到：{sorted(missing)}")
            if extra:
                parts.append(f"检测到但未预期：{sorted(extra)}")

            level = ReviewStatus.PENDING
            if len(missing) + len(extra) >= 3:
                level = ReviewStatus.MISSING

            result.add_issue(ReviewIssue(
                level=level,
                category="结果不匹配",
                message=f"算法结果与预期不一致。{'; '.join(parts)}",
                suggestion="请核对：是预期答案有误？还是算法实现问题？还是图数据录入错误？",
                record_id=record.sample_id,
            ))

    def _check_boundary_conditions(self, record: SampleRecord, result: ReviewResult) -> None:
        """检查边界条件"""
        if result.algorithm_result is None:
            return

        if record.boundary_flag:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.PENDING,
                category="边界样本",
                message=f"此条为边界样本：{record.boundary_reason or '未说明原因'}",
                suggestion="请特别关注边界割点的判定是否正确。边界情况包括：桥的端点、孤立点、单点图、星型中心等。",
                record_id=record.sample_id,
            ))

        for cp, cp_type in result.algorithm_result.cut_point_types.items():
            if cp_type in (CutPointType.BOUNDARY, CutPointType.BRIDGE_HEAD, CutPointType.ISOLATED):
                type_names = {
                    CutPointType.BOUNDARY: "边界割点（仅连接两分量）",
                    CutPointType.BRIDGE_HEAD: "桥的端点",
                    CutPointType.ISOLATED: "孤立点",
                }
                components = result.algorithm_result.component_count_after_removal.get(cp, 0)

                if not record.boundary_flag:
                    result.add_issue(ReviewIssue(
                        level=ReviewStatus.PENDING,
                        category="边界检测",
                        message=f"顶点 {cp} 被识别为{type_names[cp_type]}，移除后分裂为 {components} 个分量，但样本未标记为边界样本",
                        suggestion="请确认是否需要将此样本标记为边界样本，并补充边界原因说明。",
                        record_id=record.sample_id,
                    ))

    def _check_supplementary_notes(self, record: SampleRecord, result: ReviewResult) -> None:
        """检查补录说明"""
        if record.supplementary_note:
            result.add_issue(ReviewIssue(
                level=ReviewStatus.PENDING,
                category="补录说明",
                message=f"存在历史补录说明，请查阅：{record.supplementary_note[:100]}..."
                if len(record.supplementary_note) > 100 else f"存在历史补录说明：{record.supplementary_note}",
                suggestion="请确认补录说明中的问题是否已经解决，本次复核是否需要参考。",
                record_id=record.sample_id,
            ))
        else:
            if record.boundary_flag and not record.boundary_reason:
                result.add_issue(ReviewIssue(
                    level=ReviewStatus.PENDING,
                    category="补录建议",
                    message="此为边界样本，但缺少边界原因的详细说明",
                    suggestion="建议补充边界原因说明，方便后续复核时不用再翻代码。",
                    record_id=record.sample_id,
                ))

    def _check_version_consistency(self, record: SampleRecord, result: ReviewResult) -> None:
        """检查版本一致性"""
        if record.created_at and record.updated_at and record.created_at != record.updated_at:
            created = record.created_at[:10]
            updated = record.updated_at[:10]
            if created != updated:
                result.add_issue(ReviewIssue(
                    level=ReviewStatus.PENDING,
                    category="版本变更",
                    message=f"此记录曾被修改（创建：{created}，更新：{updated}），当前版本号：{record.version}",
                    suggestion="请确认修改内容是否有记录，版本号是否正确递增。如果同学改过参数但没改版本号，这里会有问题。",
                    record_id=record.sample_id,
                ))

    def format_result(self, result: ReviewResult) -> str:
        """格式化输出复核结果（贴近日常交接的文案）"""
        info = self.STATUS_MESSAGES[result.status.value]
        lines = [
            "=" * 60,
            f"样本编号：{result.record.sample_id}",
            f"数据来源：{result.record.source}",
            f"当前状态：{info['title']} - {info['subtitle']}",
            "-" * 40,
        ]

        if result.algorithm_result:
            actual_cps = sorted(result.algorithm_result.cut_points)
            expected_cps = sorted(result.record.expected_cut_points)
            lines.append(f"预期割点：{expected_cps if expected_cps else '无'}")
            lines.append(f"实际割点：{actual_cps if actual_cps else '无'}")
            lines.append(f"结果匹配：{'✅ 是' if result.match_expected else '❌ 否'}")

            if actual_cps:
                lines.append("割点详情：")
                for cp in actual_cps:
                    cp_type = result.algorithm_result.get_type(cp)
                    type_names = {
                        "normal": "普通割点",
                        "boundary": "边界割点",
                        "isolated": "孤立点",
                        "bridge_head": "桥端点",
                    }
                    components = result.algorithm_result.component_count_after_removal.get(cp, 0)
                    lines.append(f"  顶点 {cp}：{type_names.get(cp_type.value, cp_type.value)}，移除后分裂为 {components} 个分量")

        lines.append("-" * 40)

        if result.missing_items:
            lines.append("📋 需补材料清单：")
            for i, item in enumerate(result.missing_items, 1):
                lines.append(f"   {i}. {item}")

        if result.pending_items:
            lines.append("🔍 待确认事项：")
            for i, item in enumerate(result.pending_items, 1):
                lines.append(f"   {i}. {item}")

        suggestions = [issue.suggestion for issue in result.issues if issue.suggestion]
        if suggestions:
            lines.append("💡 处理建议：")
            for i, s in enumerate(suggestions, 1):
                lines.append(f"   {i}. {s}")

        lines.append("-" * 40)
        lines.append(f"下一步操作：{info['next_step']}")
        lines.append(f"复核时间：{result.reviewed_at[:19].replace('T', ' ')}")
        lines.append("=" * 60)
        lines.append("")

        return "\n".join(lines)

    def format_summary(self, summary: ReviewSummary) -> str:
        """格式化输出复核摘要"""
        lines = [
            "",
            "╔" + "═" * 58 + "╗",
            "║" + " " * 15 + "📊 图论割点边界复核摘要" + " " * 17 + "║",
            "╠" + "═" * 58 + "╣",
            f"║  样本总数：{summary.total:<45}║",
            f"║  ✅ 安全：{summary.safe_count:<45}║",
            f"║  ⚠️  待确认：{summary.pending_count:<45}║",
            f"║  ❌ 需补材料：{summary.missing_count:<45}║",
            "╠" + "═" * 58 + "╣",
        ]

        if summary.duplicate_groups:
            lines.append("║  🔍 重复样本检测：" + " " * 37 + "║")
            for orig, dup in summary.duplicate_groups:
                lines.append(f"║    {orig.sample_id} ↔ {dup.sample_id}" + " " * (38 - len(orig.sample_id) - len(dup.sample_id)) + "║")

        if summary.boundary_samples:
            lines.append("║  📐 边界样本：" + " " * 40 + "║")
            boundary_str = ", ".join(summary.boundary_samples)
            lines.append(f"║    {boundary_str}" + " " * (54 - len(boundary_str)) + "║")

        lines.append("╠" + "═" * 58 + "╣")

        if summary.all_safe:
            lines.append("║  🎉 全部样本复核通过！" + " " * 32 + "║")
        else:
            lines.append("║  ⚠️  存在需要人工处理的样本" + " " * 28 + "║")
            lines.append("║  请查看下方详细报告逐一处理。" + " " * 27 + "║")

        lines.append("╚" + "═" * 58 + "╝")
        lines.append("")

        return "\n".join(lines)
