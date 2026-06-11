from typing import List
from app.models import PlaybackBatch, PlaybackDetail, PlaybackStatus, SourceType
from datetime import datetime


def _status_val(status) -> str:
    if isinstance(status, str):
        return status
    return status.value


def _source_type_val(source_type) -> str:
    if isinstance(source_type, str):
        return source_type
    return source_type.value


class ReportService:
    """生成可直接用于沟通的Markdown报告"""

    @staticmethod
    def generate_batch_report(batch: PlaybackBatch, details: List[PlaybackDetail]) -> str:
        lines = []
        lines.append(f"# 券商适当性异常回放报告")
        lines.append("")
        lines.append(f"- **批次号**: {batch.batch_no}")
        lines.append(f"- **第 {batch.run_index} 次运行**")
        lines.append(f"- **操作人**: {batch.operator or '未填写'}")
        lines.append(f"- **生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        if batch.remark:
            lines.append(f"- **批次备注**: {batch.remark}")
        lines.append("")

        processed = [d for d in details if _status_val(d.status) == PlaybackStatus.PROCESSED.value]
        pending = [d for d in details if _status_val(d.status) == PlaybackStatus.PENDING_MATERIAL.value]
        overridden = [d for d in details if _status_val(d.status) == PlaybackStatus.MANUAL_OVERRIDDEN.value]

        lines.append("## 一、整体概览")
        lines.append("")
        lines.append("| 分类 | 数量 |")
        lines.append("|------|------|")
        lines.append(f"| 已处理 | {len(processed)} |")
        lines.append(f"| 待补材料 | {len(pending)} |")
        lines.append(f"| 人工改判 | {len(overridden)} |")
        lines.append(f"| **合计** | **{len(details)}** |")
        lines.append("")

        if pending:
            lines.append("## 二、待补材料（需重点跟进）")
            lines.append("")
            for idx, d in enumerate(pending, 1):
                lines.append(ReportService._render_detail_block(idx, d, show_need=True))
            lines.append("")

        if processed:
            lines.append("## 三、已处理（材料齐全、结论明确）")
            lines.append("")
            for idx, d in enumerate(processed, 1):
                lines.append(ReportService._render_detail_block(idx, d))
            lines.append("")

        if overridden:
            lines.append("## 四、人工改判（需重点复核）")
            lines.append("")
            for idx, d in enumerate(overridden, 1):
                lines.append(ReportService._render_detail_block(idx, d, show_override=True))
            lines.append("")

        lines.append("## 五、历史版本对照")
        lines.append("")
        lines.append("同一批次号下各次运行结论对照：")
        lines.append("")
        for d in details:
            lines.append(ReportService._render_history(d))
        lines.append("")

        lines.append("---")
        lines.append("*本报告由券商适当性异常回放系统自动生成，状态与接口查询结果保持一致。*")
        return "\n".join(lines)

    @staticmethod
    def _render_detail_block(
        idx: int, d: PlaybackDetail, show_need: bool = False, show_override: bool = False
    ) -> str:
        lines = []
        lines.append(f"### {idx}. {d.broker_name or '未知券商'} - {d.customer_name or '未知客户'}")
        lines.append("")
        lines.append(f"- **明细编号**: {d.detail_no}")
        lines.append(f"- **产品名称**: {d.product_name or '未填写'}")
        lines.append(f"- **风险等级**: {d.risk_level or '未填写'}")
        lines.append(f"- **交易金额**: {d.transaction_amount or '未填写'}")
        lines.append(f"- **当前状态**: {_status_val(d.status)}")
        lines.append("")

        lines.append("#### 结论演变链")
        lines.append("")
        history = sorted(d.conclusion_history, key=lambda h: h.sequence)
        if history:
            lines.append("| 序号 | 阶段 | 结论 | 变更原因 | 来源/操作人 | 时间 |")
            lines.append("|------|------|------|----------|-------------|------|")
            for h in history:
                stage = ReportService._get_stage_label(h, history)
                ts = h.created_at.strftime("%m-%d %H:%M") if h.created_at else "-"
                lines.append(
                    f"| {h.sequence} | {stage} | {h.conclusion or '-'} | "
                    f"{h.change_reason or '-'} | {h.changed_by or '-'} | {ts} |"
                )
        else:
            lines.append("_暂无结论记录_")
        lines.append("")

        lines.append("#### 来源材料清单（保留原始数据原貌）")
        lines.append("")
        if d.sources:
            for s in d.sources:
                lines.append(f"- **[{_source_type_val(s.source_type)}]** {s.filename or '无文件名'} "
                             f"(上传人: {s.uploaded_by or '未知'}, "
                             f"解析状态: {s.parse_status})")
                if s.parse_error:
                    lines.append(f"  - ⚠️ 解析失败原因：{s.parse_error}")
                lines.append(f"  - 原始内容摘录：{s.raw_content[:120]}{'...' if len(s.raw_content) > 120 else ''}")
        else:
            lines.append("_暂无来源材料_")
        lines.append("")

        if d.is_split_repayment and d.repayment_split_hint:
            lines.append("#### ⚠️ 回款拆行风险提示")
            lines.append("")
            lines.append("```")
            lines.append(d.repayment_split_hint)
            lines.append("```")
            lines.append("")

        if show_need:
            lines.append("#### 📋 需补充材料")
            lines.append("")
            missing = []
            source_types = set()
            for s in d.sources:
                source_types.add(_source_type_val(s.source_type))
            if SourceType.APPROVAL_EMAIL.value not in source_types:
                missing.append("- 审批邮件")
            if SourceType.SUPPLEMENT_VOUCHER.value not in source_types:
                missing.append("- 后补凭证")
            if not d.current_conclusion:
                missing.append("- 明确回放结论")
            if missing:
                lines.extend(missing)
            else:
                lines.append("_材料齐全，等待结论确认_")
            lines.append("")

        if show_override:
            last_h = history[-1] if history else None
            if last_h:
                lines.append("#### ✏️ 改判信息")
                lines.append("")
                lines.append(f"- **改判人**: {last_h.changed_by or '未知'}")
                lines.append(f"- **改判原因**: {last_h.change_reason or '未填写'}")
                lines.append(f"- **改判结论**: {last_h.conclusion or '未填写'}")
                lines.append("")

        if d.remarks:
            lines.append("#### 📝 备注")
            lines.append("")
            for r in d.remarks:
                ts = r.created_at.strftime("%Y-%m-%d %H:%M") if r.created_at else "-"
                lines.append(f"- [{ts}] {r.remarked_by or '未知'}: {r.content}")
            lines.append("")

        return "\n".join(lines)

    @staticmethod
    def _render_history(d: PlaybackDetail) -> str:
        lines = []
        lines.append(f"**{d.detail_no}** - {d.broker_name or '未知券商'} / {d.customer_name or '未知客户'}")
        lines.append("")
        history = sorted(d.conclusion_history, key=lambda h: h.sequence)
        if history:
            chain = " → ".join([f"[{h.sequence}] {h.conclusion or '-'}" for h in history])
            lines.append(f"- 结论链: {chain}")
        lines.append(f"- 当前状态: {_status_val(d.status)}")
        if d.remarks:
            rem = "; ".join([r.content for r in d.remarks[-3:]])
            lines.append(f"- 备注: {rem}")
        lines.append("")
        return "\n".join(lines)

    @staticmethod
    def _get_stage_label(h, history) -> str:
        if h.sequence == 1 and (not h.change_reason or "昨日" in h.change_reason):
            return "昨日结论"
        if h.changed_by and "人工改判" in h.changed_by:
            return "人工改判"
        if h.sequence == len(history):
            return "当前结论"
        return "中间变更"
