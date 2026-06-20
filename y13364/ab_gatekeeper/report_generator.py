from typing import Dict, Any, List
from datetime import datetime

from .models import GatekeeperResult, Sample, SampleSource, DecisionReason, ManualAction


class MarkdownReportGenerator:
    STATUS_EMOJI = {
        True: "✅",
        False: "❌",
    }
    SEVERITY_COLOR = {
        "critical": "🔴",
        "high": "🟠",
        "medium": "🟡",
        "low": "🟢",
        "unknown": "⚪",
    }

    def __init__(self):
        self.lines: List[str] = []

    def _add(self, text: str = ""):
        self.lines.append(text)

    def _h1(self, text: str):
        self._add(f"# {text}")
        self._add()

    def _h2(self, text: str):
        self._add(f"## {text}")
        self._add()

    def _h3(self, text: str):
        self._add(f"### {text}")
        self._add()

    def _bold(self, text: str) -> str:
        return f"**{text}**"

    def _code(self, text: str) -> str:
        return f"`{text}`"

    def _quote(self, text: str):
        for line in text.split("\n"):
            self._add(f"> {line}")
        self._add()

    def _table(self, headers: List[str], rows: List[List[Any]]):
        self._add("| " + " | ".join(str(h) for h in headers) + " |")
        self._add("| " + " | ".join(["---"] * len(headers)) + " |")
        for row in rows:
            self._add("| " + " | ".join(str(c) for c in row) + " |")
        self._add()

    def _ul(self, items: List[str], indent: int = 0):
        prefix = "  " * indent + "- "
        for it in items:
            self._add(f"{prefix}{it}")
        self._add()

    def generate(self, result: GatekeeperResult) -> str:
        self.lines = []
        self._generate_header(result)
        self._generate_executive_summary(result)
        self._generate_source_distribution(result)
        self._generate_contamination_section(result)
        self._generate_misclassified_section(result)
        self._generate_decisions_section(result)
        self._generate_manual_confirmation_section(result)
        self._generate_audit_history_section(result)
        self._generate_appendix(result)
        return "\n".join(self.lines)

    def _generate_header(self, result: GatekeeperResult):
        mv = result.model_version
        overall = self.STATUS_EMOJI.get(result.overall_pass, "⚪")
        self._h1(f"{overall} AB实验上线守门报告")
        self._add(f"- **实验名称**: {mv.model_name}")
        self._add(f"- **模型版本**: {self._code(mv.version_id)}")
        if mv.parent_version:
            self._add(f"- **父版本**: {self._code(mv.parent_version)}")
        self._add(f"- **训练时间**: {mv.training_time}")
        self._add(f"- **报告生成时间**: {result.generated_at}")
        self._add()
        if mv.changelog:
            self._h3("版本变更摘要")
            self._quote(mv.changelog)

    def _generate_executive_summary(self, result: GatekeeperResult):
        self._h2("一、结论摘要")
        if result.overall_pass:
            verdict = "通过"
            verdict_color = "✅ 可进入上线流程"
        elif result.manual_confirmation_required:
            verdict = "待人工确认"
            verdict_color = "🟡 需人工确认后决定"
        else:
            verdict = "不通过"
            verdict_color = "❌ 暂不可上线"
        self._add(f"- **最终结论**: {self._bold(verdict)} {verdict_color}")
        self._add()

        if result.blocking_reasons:
            self._add(self._bold("🔴 阻断原因:"))
            self._ul([f"{i+1}. {r}" for i, r in enumerate(result.blocking_reasons)])
        if result.warning_reasons:
            self._add(self._bold("🟡 告警提示:"))
            self._ul([f"{i+1}. {w}" for i, w in enumerate(result.warning_reasons)])
        if not result.blocking_reasons and not result.warning_reasons:
            self._add("无阻断与告警。")
            self._add()

        self._h3("样本判定分布")
        rows = [[k, v] for k, v in result.sample_summary.items()]
        self._table(["状态", "样本数"], rows)

    def _generate_source_distribution(self, result: GatekeeperResult):
        self._h2("二、数据来源识别")
        self._add("守门流程自动识别并区分以下6类来源，避免旧版日志、撤回记录、口头备注对结论的干扰：")
        self._add()
        source_info = {
            SampleSource.TRAIN_LOG_CURRENT.value: ("当前版训练日志", "本次实验的有效训练输出"),
            SampleSource.TRAIN_LOG_OLD.value: ("旧版训练日志", "历史版本遗留，需对照是否影响当前结论"),
            SampleSource.WITHDRAW_RECORD.value: ("撤回记录", "实验回滚，需核查是否关联当前任务"),
            SampleSource.VERBAL_NOTE.value: ("口头备注", "算法同学临时说明，不构成证据链核心"),
            SampleSource.VALIDATION_SET.value: ("验证集", "上线评估基准，需排查污染"),
            SampleSource.MISCLASSIFIED_RETURN.value: ("旧模型误判回检", "改判样本，用于验证新模型纠错能力"),
        }
        rows = []
        for src_val, (name, desc) in source_info.items():
            cnt = 0
            for d in result.decisions:
                if any(s.value == src_val for s in d.affected_by_sources):
                    cnt += 1
            rows.append([name, src_val, cnt, desc])
        self._table(["来源名称", "来源标识", "关联决策数", "说明"], rows)

        cross_influence = self._build_source_influence(result)
        if cross_influence:
            self._add(self._bold("⚠️  来源交叉影响（谁影响了结论）:"))
            self._ul(cross_influence)

    def _build_source_influence(self, result: GatekeeperResult) -> List[str]:
        influences = []
        for d in result.decisions:
            if len(d.affected_by_sources) > 1:
                srcs = " + ".join(s.value for s in d.affected_by_sources)
                influences.append(
                    f"样本{d.sample_id}: {srcs} 共同作用 → "
                    f"{'通过' if d.passed else '不通过'}（{d.reason.value}）"
                )
        if result.contamination_report.get("contaminated_count", 0) > 0:
            influences.append(
                f"验证集污染影响: {result.contamination_report['contaminated_count']}条样本"
                f"（来自样本与训练集重复/关键词/泄露），直接触发阻断"
            )
        if result.misclassified_report.get("needs_manual_review"):
            influences.append(
                f"误判回检未解释: {result.misclassified_report.get('needs_manual_review_count', 0)}条"
                f"样本改判原因暂无法自动归因，需人工介入"
            )
        return influences

    def _generate_contamination_section(self, result: GatekeeperResult):
        self._h2("三、验证集污染检测")
        cr = result.contamination_report
        if not cr:
            self._add("无验证集样本。")
            self._add()
            return
        total = cr.get("total_validation_samples", 0)
        contaminated = cr.get("contaminated_count", 0)
        rate = cr.get("contamination_rate", 0) * 100
        self._add(f"- **验证集总数**: {total}")
        self._add(f"- **污染样本数**: {contaminated} ({rate:.2f}%)")
        self._add(f"- **是否阻断**: {'🔴 是' if cr.get('is_blocking') else '🟢 否'}")
        self._add(f"- **需人工确认**: {'🟡 是' if cr.get('needs_manual_confirmation') else '🟢 否'}")
        self._add()

        if cr.get("manual_confirmation_reason"):
            self._add(self._bold("确认原因:"))
            self._quote(cr["manual_confirmation_reason"])
        if cr.get("next_steps"):
            self._add(self._bold("下一步建议:"))
            self._ul([f"{i+1}. {s}" for i, s in enumerate(cr["next_steps"])])

        sev_dist = cr.get("severity_distribution", {})
        type_dist = cr.get("type_distribution", {})
        if sev_dist or type_dist:
            self._h3("污染问题分布")
            rows = []
            for sev, cnt in sev_dist.items():
                icon = self.SEVERITY_COLOR.get(sev, "⚪")
                rows.append([f"{icon} {sev}", cnt])
            if rows:
                self._table(["严重程度", "数量"], rows)
            rows2 = [[k, v] for k, v in type_dist.items()]
            if rows2:
                self._table(["问题类型", "数量"], rows2)

        details = cr.get("contamination_details", [])
        if details:
            self._h3("污染明细")
            rows = []
            for idx, d in enumerate(details[:10], 1):
                icon = self.SEVERITY_COLOR.get(d.get("severity", "unknown"), "⚪")
                rows.append([
                    idx,
                    icon,
                    d.get("type", ""),
                    d.get("validation_sample_id", ""),
                    d.get("training_sample_id", d.get("task_id", "")),
                    d.get("detail", ""),
                ])
            self._table(["#", "级", "类型", "验证样本ID", "关联训练样本/任务", "详情"], rows)
            if len(details) > 10:
                self._add(f"*（仅展示前10条，共{len(details)}条）*")
                self._add()

    def _generate_misclassified_section(self, result: GatekeeperResult):
        self._h2("四、旧模型误判回检分析")
        mr = result.misclassified_report
        if not mr or mr.get("total_misclassified_samples", 0) == 0:
            self._add("无旧模型误判回检样本。")
            self._add()
            return

        self._add(self._bold("概览:"))
        self._add(f"- **回检样本数**: {mr['total_misclassified_samples']}")
        self._add(f"- **成功改判**: {mr.get('corrected_count', 0)}（{mr.get('correction_rate', 0) * 100:.1f}%）")
        self._add(f"- **引入新错误**: {mr.get('introduced_error_count', 0)}")
        self._add(f"- **可自动解释**: {mr.get('explained_count', 0)}（{mr.get('explanation_rate', 0) * 100:.1f}%）")
        self._add(f"- **需人工复核**: {mr.get('needs_manual_review_count', 0)}")
        self._add()

        self._quote(mr.get("summary", ""))

        cats = mr.get("category_distribution", {})
        if cats:
            self._h3("改判归因分布")
            rows = [[k, v] for k, v in cats.items()]
            self._table(["归因维度", "样本数"], rows)

        individuals = mr.get("individual_analysis", [])
        if individuals:
            self._h3("样本级改判解释")
            rows = []
            for idx, a in enumerate(individuals[:8], 1):
                sa = a.get("score_analysis", {})
                rows.append([
                    idx,
                    a["sample_id"],
                    a.get("true_label", "-"),
                    f"{a.get('old_model', {}).get('prediction', '-')} ({a.get('old_model', {}).get('score', '-')})",
                    f"{a.get('new_model', {}).get('prediction', '-')} ({a.get('new_model', {}).get('score', '-')})",
                    "✅已解释" if a.get("explained") else "❓待复核",
                    a.get("explanation_text", "")[:60],
                ])
            self._table([
                "#", "样本ID", "真实标签", "旧模型预测(置信度)", "新模型预测(置信度)", "解释状态", "归因摘要"
            ], rows)
            if len(individuals) > 8:
                self._add(f"*（仅展示前8条，共{len(individuals)}条）*")
                self._add()

    def _generate_decisions_section(self, result: GatekeeperResult):
        self._h2("五、判定明细与证据链")
        decs = result.decisions
        if not decs:
            self._add("无算法判定记录。")
            self._add()
            return
        self._h3("判定汇总")
        passed = sum(1 for d in decs if d.passed)
        failed = len(decs) - passed
        self._table(
            ["通过", "不通过", "合计"],
            [[passed, failed, len(decs)]],
        )
        reason_stats: Dict[str, int] = {}
        for d in decs:
            k = d.reason.value
            reason_stats[k] = reason_stats.get(k, 0) + 1
        rows = [[k, v] for k, v in reason_stats.items()]
        self._table(["判定原因", "样本数"], rows)

        self._h3("判定与证据链详情")
        rows = []
        for idx, d in enumerate(decs[:10], 1):
            rows.append([
                idx,
                d.sample_id,
                "✅" if d.passed else "❌",
                d.reason.value,
                " + ".join(s.value for s in d.affected_by_sources) if d.affected_by_sources else "-",
                d.detail[:80],
            ])
        self._table(["#", "样本ID", "结论", "原因", "影响来源", "详情摘要"], rows)
        if len(decs) > 10:
            self._add(f"*（仅展示前10条，共{len(decs)}条）*")
            self._add()

    def _generate_manual_confirmation_section(self, result: GatekeeperResult):
        self._h2("六、人工确认与排班复盘")
        if result.manual_confirmation_required:
            self._add("🔴 " + self._bold("需要人工确认"))
            self._add()
            details = result.manual_confirmation_details
            if details:
                self._h3("待确认清单")
                rows = []
                for idx, d in enumerate(details[:10], 1):
                    rows.append([
                        idx,
                        d["sample_id"],
                        d["task_id"],
                        d["source"],
                        d["current_status"],
                        "；".join(d.get("reasons", []))[:80],
                    ])
                self._table(["#", "样本ID", "任务ID", "来源", "当前状态", "待确认原因"], rows)
                for d in details[:5]:
                    self._h3(f"样本 {d['sample_id']} 确认指南")
                    self._add(self._bold("原因:"))
                    self._ul(d.get("reasons", []))
                    self._add(self._bold("建议下一步:"))
                    self._ul(d.get("next_steps", []))
                    alg = d.get("algorithm_decision") or {}
                    if alg:
                        self._add(
                            f"算法判定: {'通过' if alg.get('passed') else '不通过'}"
                            f" ({alg.get('reason', '-')}): {alg.get('detail', '-')}"
                        )
                        self._add()

        corrections = result.corrections
        if corrections:
            self._h3("本月人工确认记录（供月底排班复盘）")
            rows = []
            for idx, c in enumerate(corrections, 1):
                rows.append([
                    idx,
                    c.timestamp,
                    c.sample_id,
                    c.operator,
                    c.action.value,
                    f"{c.before_status.value} → {c.after_status.value}",
                    c.comment[:60],
                ])
            self._table(["#", "时间", "样本ID", "操作人", "操作", "状态流转", "备注摘要"], rows)

            scheduling_data = self._extract_scheduling_data(result)
            if scheduling_data:
                self._h3("月底封账复盘话术")
                self._quote(scheduling_data)

    def _extract_scheduling_data(self, result: GatekeeperResult) -> str:
        lines = []
        month = datetime.now().strftime("%Y-%m")
        lines.append(f"【{month}月AB守门人工确认复盘摘要】")
        lines.append(f"排班同学你好，本月共发生{len(result.corrections)}次人工确认：")
        for idx, c in enumerate(result.corrections, 1):
            lines.append(
                f"  {idx}. [{c.timestamp}] {c.operator} → {c.action.value}"
                f"（样本{c.sample_id}：{c.before_status.value}→{c.after_status.value}）"
            )
            if c.comment:
                lines.append(f"     说明：{c.comment}")
            if c.scheduling_note:
                lines.append(f"     排班备注：{c.scheduling_note}")
        lines.append("以上操作均已写入审计历史，封账无异议请回复确认。")
        return "\n".join(lines)

    def _generate_audit_history_section(self, result: GatekeeperResult):
        if not result.history:
            return
        self._h2("七、审计历史（可回溯）")
        self._add(f"共记录 {len(result.history)} 条审计事件。")
        self._add()
        rows = []
        for idx, h in enumerate(result.history[-15:], 1):
            rows.append([
                idx,
                h.timestamp,
                h.event_type,
                h.target_id,
                h.operator,
                h.comment[:60],
            ])
        self._table(["#", "时间", "事件类型", "目标ID", "操作人", "摘要"], rows)
        if len(result.history) > 15:
            self._add(f"*（仅展示最近15条，共{len(result.history)}条）*")
            self._add()

    def _generate_appendix(self, result: GatekeeperResult):
        self._h2("附录A：模型超参数")
        hp = result.model_version.hyperparams
        if hp:
            rows = [[k, v] for k, v in hp.items()]
            self._table(["参数", "值"], rows)
        else:
            self._add("无超参数记录。")
            self._add()


class ReportExporter:
    @staticmethod
    def export(result: GatekeeperResult, output_path: str) -> str:
        generator = MarkdownReportGenerator()
        content = generator.generate(result)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(content)
        return output_path

    @staticmethod
    def to_string(result: GatekeeperResult) -> str:
        generator = MarkdownReportGenerator()
        return generator.generate(result)
