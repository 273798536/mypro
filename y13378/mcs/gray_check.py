"""灰度比例校验 - 发现问题并给出人能照着处理的下一步"""
from typing import List, Dict, Any, Optional

from .models import Sample, GrayIssue, _new_id
from .storage import Storage


class GrayRatioChecker:
    """灰度比例检查器

    发现以下问题并给出可操作的下一步：
    1. 灰度比例缺失
    2. 灰度比例超出合理范围 (0-1)
    3. 灰度比例明显异常（如全为 1.0 或全为 0.0）
    4. 灰度比例写错（如写成百分数 80 而不是 0.8）
    """

    def __init__(self, storage: Storage):
        self.storage = storage

    def check_snapshot(self, snapshot_id: str,
                       expected_range: tuple = (0.0, 1.0)) -> List[GrayIssue]:
        """检查快照中所有样本的灰度比例"""
        snapshot = self.storage.load_snapshot(snapshot_id)
        if not snapshot:
            return []

        issues = []
        samples = []
        for sid in snapshot.sample_ids:
            s = self.storage.load_sample(sid)
            if s:
                samples.append(s)

        # 逐条检查
        for s in samples:
            issue = self._check_sample(s, snapshot_id, expected_range)
            if issue:
                issues.append(issue)
                self.storage.save_gray_issue(issue)

        # 整体统计层面的检查
        global_issues = self._check_global_pattern(samples, snapshot_id)
        for gi in global_issues:
            self.storage.save_gray_issue(gi)
        issues.extend(global_issues)

        return issues

    def _check_sample(self, sample: Sample, snapshot_id: str,
                      expected_range: tuple) -> Optional[GrayIssue]:
        gray = sample.gray_ratio

        # 缺失
        if gray is None:
            return GrayIssue(
                issue_id=_new_id("gi"),
                snapshot_id=snapshot_id,
                sample_id=sample.sample_id,
                gray_ratio_value=None,
                issue_type="missing",
                detail=f"样本 {sample.sample_id} 缺少 gray_ratio 字段，原始来源: {sample.raw_source}",
                next_step=(
                    "下一步操作：\n"
                    "1. 打开原始日志文件查看该样本行：samples/raw/{source}\n"
                    "2. 确认是否为训练日志格式不标准导致解析失败\n"
                    "3. 如果是日志格式问题，联系数据组补充 gray_ratio 字段\n"
                    "4. 如果该样本确实不涉及灰度，可在快照中标记为 non-gray 样本"
                ).format(source=sample.raw_source),
            )

        # 超出范围
        if gray < expected_range[0] or gray > expected_range[1]:
            # 可能是写成了百分数（如 80 而不是 0.8）
            probably_percent = gray > 1.0 and gray <= 100.0
            if probably_percent:
                return GrayIssue(
                    issue_id=_new_id("gi"),
                    snapshot_id=snapshot_id,
                    sample_id=sample.sample_id,
                    gray_ratio_value=gray,
                    issue_type="out_of_range",
                    detail=(
                        f"样本 {sample.sample_id} 的 gray_ratio={gray} "
                        f"超出预期范围 {expected_range}，"
                        f"疑似写成百分数形式（应为 {gray/100}）"
                    ),
                    next_step=(
                        "下一步操作：\n"
                        "1. 该值疑似百分数，请确认原始数据中 gray_ratio 的单位\n"
                        "2. 如果确实是百分数，需统一除以 100 转换为比例值\n"
                        "3. 联系数据提供方确认格式标准，避免后续再出现类似问题\n"
                        "4. 修正后重新导入，或使用人工修正功能更新该字段"
                    ),
                )
            else:
                return GrayIssue(
                    issue_id=_new_id("gi"),
                    snapshot_id=snapshot_id,
                    sample_id=sample.sample_id,
                    gray_ratio_value=gray,
                    issue_type="out_of_range",
                    detail=(
                        f"样本 {sample.sample_id} 的 gray_ratio={gray} "
                        f"超出预期范围 {expected_range}"
                    ),
                    next_step=(
                        "下一步操作：\n"
                        "1. 检查原始数据来源，确认 gray_ratio 取值范围的定义\n"
                        "2. 如果是数据错误，联系数据提供方修正后重新导入\n"
                        "3. 如果业务上确实存在超出范围的情况，调整预期范围参数"
                    ),
                )

        return None

    def _check_global_pattern(self, samples: List[Sample],
                              snapshot_id: str) -> List[GrayIssue]:
        """整体模式层面的检查"""
        issues = []
        gray_values = [s.gray_ratio for s in samples if s.gray_ratio is not None]

        if not gray_values:
            return issues

        # 全部相同（可疑）
        all_same = len(set(gray_values)) == 1
        if all_same and len(gray_values) > 1:
            issues.append(GrayIssue(
                issue_id=_new_id("gi"),
                snapshot_id=snapshot_id,
                sample_id="GLOBAL",
                gray_ratio_value=gray_values[0],
                issue_type="all_same",
                detail=(
                    f"快照中所有 {len(gray_values)} 条样本的 gray_ratio 均为 {gray_values[0]}，"
                    f"可能是配置错误或字段填充错误"
                ),
                next_step=(
                    "下一步操作：\n"
                    "1. 检查数据生成脚本，确认 gray_ratio 是否被硬编码\n"
                    "2. 如果是灰度实验，应有不同比例的分流，全部相同不合理\n"
                    "3. 确认模型配置文件中的 gray_ratio 设置是否正确\n"
                    "4. 排查数据源是否使用了错误的字段映射"
                ),
            ))

        # 缺失过多
        missing_count = sum(1 for s in samples if s.gray_ratio is None)
        if missing_count > len(samples) * 0.3 and missing_count > 0:
            issues.append(GrayIssue(
                issue_id=_new_id("gi"),
                snapshot_id=snapshot_id,
                sample_id="GLOBAL",
                gray_ratio_value=None,
                issue_type="high_missing_rate",
                detail=(
                    f"快照中有 {missing_count}/{len(samples)} 条样本缺少 gray_ratio "
                    f"（缺失率 {missing_count/len(samples)*100:.1f}%），"
                    f"超过 30% 警戒线"
                ),
                next_step=(
                    "下一步操作：\n"
                    "1. 检查日志解析规则是否覆盖了 gray_ratio 字段\n"
                    "2. 如果是多数据源，确认是否部分数据源不提供 gray_ratio\n"
                    "3. 联系数据工程组确认数据完整性\n"
                    "4. 对于确实没有灰度属性的样本，可单独标记处理"
                ),
            ))

        return issues

    def get_issues(self, snapshot_id: str) -> List[GrayIssue]:
        return self.storage.list_gray_issues(snapshot_id=snapshot_id)
