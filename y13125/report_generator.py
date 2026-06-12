from typing import List, Dict, Any
from datetime import datetime

from models import ProcessingResult, RecordStatus
from history_processor import HistoryProcessor


class ReportGenerator:
    STATUS_LABELS = {
        "processed": "已处理",
        "pending_material": "待补材料",
        "manual_overridden": "人工改判",
        "empty_set": "空集合",
        "extrapolation_out_of_bounds": "外推越界",
    }

    STATUS_ICONS = {
        "processed": "✅",
        "pending_material": "⏳",
        "manual_overridden": "✋",
        "empty_set": "∅",
        "extrapolation_out_of_bounds": "⚠️",
    }

    def __init__(self):
        self.processor = HistoryProcessor()

    def generate_markdown(
        self,
        results: List[ProcessingResult],
        report_title: str = "贝叶斯先验错题复盘报告",
    ) -> str:
        processed = [r for r in results if r.status == "processed"]
        pending = [r for r in results if r.status == "pending_material"]
        manual = [r for r in results if r.status == "manual_overridden"]
        empty = [r for r in results if r.status == "empty_set"]
        extrapolation = [r for r in results if r.status == "extrapolation_out_of_bounds"]

        md = []
        md.append(f"# {report_title}")
        md.append("")
        md.append(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        md.append("")
        md.append("## 概览")
        md.append("")
        md.append("| 状态 | 数量 | 说明 |")
        md.append("|------|------|------|")
        md.append(f"| 已处理 | {len(processed)} | 计算完成且口径一致 |")
        md.append(f"| 待补材料 | {len(pending)} | 缺少必要数据或参数 |")
        md.append(f"| 人工改判 | {len(manual)} | 有人工覆盖标记 |")
        md.append(f"| 空集合 | {len(empty)} | 空输入或无数据 |")
        md.append(f"| 外推越界 | {len(extrapolation)} | 参数超出概率范围 |")
        md.append(f"| **合计** | **{len(results)}** | |")
        md.append("")

        if processed:
            md.append("## 一、已处理记录")
            md.append("")
            for result in processed:
                md.extend(self._render_processed_record(result))
                md.append("")
                md.append("---")
                md.append("")

        if pending:
            md.append("## 二、待补材料记录")
            md.append("")
            for result in pending:
                md.extend(self._render_pending_record(result))
                md.append("")
                md.append("---")
                md.append("")

        if manual:
            md.append("## 三、人工改判记录")
            md.append("")
            for result in manual:
                md.extend(self._render_manual_record(result))
                md.append("")
                md.append("---")
                md.append("")

        if empty:
            md.append("## 四、空集合记录")
            md.append("")
            for result in empty:
                md.extend(self._render_empty_record(result))
                md.append("")
                md.append("---")
                md.append("")

        if extrapolation:
            md.append("## 五、外推越界记录")
            md.append("")
            for result in extrapolation:
                md.extend(self._render_extrapolation_record(result))
                md.append("")
                md.append("---")
                md.append("")

        md.append("## 六、历史版本保留说明")
        md.append("")
        md.append("> **重要**: 本系统保留所有历史版本，而非仅保留最终值。")
        md.append("> 每个答案版本的备注、截图引用均独立存储，可追溯原始说法。")
        md.append("")
        md.append("### 版本保留策略")
        md.append("")
        md.append("- ✅ 所有历史答案版本完整保留")
        md.append("- ✅ 每个版本的备注独立存储")
        md.append("- ✅ 旧版本截图引用不被覆盖")
        md.append("- ✅ 可追溯外推越界的原始说法来源")
        md.append("- ✅ 主线答案通过多版本拼接生成")
        md.append("")

        return "\n".join(md)

    def _render_processed_record(self, result: ProcessingResult) -> List[str]:
        record = result.record
        bayesian = result.bayesian_result
        check = result.recalculation_check
        mainline = self.processor.assemble_mainline(record)

        md = []
        md.append(f"### {self.STATUS_ICONS.get(result.status, '')} 记录 {record.record_id}")
        md.append("")
        md.append(f"**问题**: {record.question_text}")
        md.append("")
        md.append("#### 贝叶斯计算结果")
        md.append("")
        md.append(f"- **后验概率**: `{bayesian.posterior_probability:.6f}`")
        md.append(f"- **先验概率**: `{bayesian.prior:.6f}`")
        md.append(f"- **似然**: `{bayesian.likelihood:.6f}`")
        md.append(f"- **边际似然**: `{bayesian.evidence:.6f}`")
        md.append(f"- **计算公式**: `{bayesian.raw_formula}`")
        md.append("")

        md.append("#### 口径一致性校验")
        md.append("")
        if check and check.is_consistent:
            md.append(f"- ✅ **状态**: 图表与明细口径一致")
        else:
            md.append(f"- ❌ **状态**: 口径不一致")
            for field in check.mismatched_fields:
                md.append(f"  - {field}")
        if check:
            md.append(f"- **图表口径值**: `{check.chart_value:.6f}`")
            md.append(f"- **明细口径值**: `{check.detail_value:.6f}`")
            md.append(f"- **最大差异**: `{check.difference:.8f}` (容差 `{check.tolerance:.8f}`)")
            md.append(f"- **图表计算路径**: {check.chart_calculation_path}")
            md.append(f"- **明细计算路径**: {check.detail_calculation_path}")
        md.append("")

        md.append(f"#### 历史版本时间线 (共 {mainline['version_count']} 个版本)")
        md.append("")
        timeline = self.processor.get_version_timeline(record)
        for item in timeline:
            latest_mark = " 🔴 (最新)" if item["is_latest"] else ""
            remark_mark = " 📝" if item["has_remark"] else ""
            screenshot_mark = " 🖼️" if item["has_screenshot"] else ""
            md.append(f"{item['order']}. **{item['version_id']}** "
                      f"({item['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}) "
                      f"- {item['author'] or '未知'}{latest_mark}{remark_mark}{screenshot_mark}")
            md.append(f"   > {item['answer_excerpt']}")
            if item["source_note"]:
                md.append(f"   _来源: {item['source_note']}_")
        md.append("")

        if mainline["historical_remarks"]:
            md.append("#### 历史备注")
            md.append("")
            for remark in mainline["historical_remarks"]:
                md.append(f"- [{remark['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}] "
                          f"{remark['author'] or '未知'}: {remark['remark']}")
            md.append("")

        if mainline["screenshot_refs"]:
            md.append("#### 历史截图引用")
            md.append("")
            for shot in mainline["screenshot_refs"]:
                md.append(f"- [{shot['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}] "
                          f"版本 {shot['version_id']}: {shot['screenshot']}")
            md.append("")

        return md

    def _render_pending_record(self, result: ProcessingResult) -> List[str]:
        record = result.record
        missing = self.processor.check_pending_material(record)

        md = []
        md.append(f"### {self.STATUS_ICONS.get(result.status, '')} 记录 {record.record_id}")
        md.append("")
        md.append(f"**问题**: {record.question_text}")
        md.append("")
        md.append("#### 缺少材料")
        md.append("")
        for item in missing:
            md.append(f"- ⏳ {item}")
        md.append("")
        md.append(f"**失败原因**: {result.failure_reason or '未知'}")
        md.append("")

        if record.answer_versions:
            md.append("#### 现有版本")
            md.append("")
            timeline = self.processor.get_version_timeline(record)
            for item in timeline:
                md.append(f"{item['order']}. **{item['version_id']}** "
                          f"({item['timestamp'].strftime('%Y-%m-%d %H:%M:%S')})")
                md.append(f"   > {item['answer_excerpt']}")
            md.append("")

        return md

    def _render_manual_record(self, result: ProcessingResult) -> List[str]:
        record = result.record
        md = []
        md.append(f"### {self.STATUS_ICONS.get(result.status, '')} 记录 {record.record_id}")
        md.append("")
        md.append(f"**问题**: {record.question_text}")
        md.append("")
        md.append(f"**人工改判说明**: {result.manual_override_note or '无详细说明'}")
        md.append("")
        md.append(f"**改判人**: {record.metadata.get('override_author', '未知')}")
        md.append(f"**改判时间**: {record.metadata.get('override_time', '未知')}")
        md.append("")

        if result.bayesian_result:
            md.append("#### 原始计算结果")
            md.append("")
            md.append(f"- 后验概率: `{result.bayesian_result.posterior_probability:.6f}`")
            md.append(f"- 计算状态: `{result.bayesian_result.calculation_status}`")
            md.append("")

        md.append("#### 版本时间线")
        md.append("")
        timeline = self.processor.get_version_timeline(record)
        for item in timeline:
            override_mark = " ✋ (改判依据)" if "override" in (item["source_note"] or "") else ""
            md.append(f"{item['order']}. **{item['version_id']}** "
                      f"({item['timestamp'].strftime('%Y-%m-%d %H:%M:%S')}){override_mark}")
            md.append(f"   > {item['answer_excerpt']}")
        md.append("")

        return md

    def _render_empty_record(self, result: ProcessingResult) -> List[str]:
        record = result.record
        md = []
        md.append(f"### {self.STATUS_ICONS.get(result.status, '')} 记录 {record.record_id}")
        md.append("")
        md.append(f"**问题**: {record.question_text}")
        md.append("")
        md.append(f"**空集合原因**: {result.failure_reason or '未知原因'}")
        md.append("")
        md.append("> ⚠️ 空集合被识别为特殊输入，未参与正常计算流程")
        md.append("")

        if record.answer_versions:
            md.append("#### 检测到的版本内容")
            md.append("")
            for idx, version in enumerate(record.answer_versions, 1):
                content = version.answer_text or "(空)"
                md.append(f"{idx}. **{version.version_id}** "
                          f"({version.timestamp.strftime('%Y-%m-%d %H:%M:%S')})")
                md.append(f"   内容: `{content[:100]}`")
            md.append("")

        return md

    def _render_extrapolation_record(self, result: ProcessingResult) -> List[str]:
        record = result.record
        bayesian = result.bayesian_result
        trace = bayesian.extrapolation_trace if bayesian else None

        md = []
        md.append(f"### {self.STATUS_ICONS.get(result.status, '')} 记录 {record.record_id}")
        md.append("")
        md.append(f"**问题**: {record.question_text}")
        md.append("")

        if bayesian:
            md.append("#### 计算结果（已钳制）")
            md.append("")
            md.append(f"- **后验概率**: `{bayesian.posterior_probability:.6f}`")
            md.append(f"- **先验**: `{bayesian.prior:.6f}`")
            md.append(f"- **似然**: `{bayesian.likelihood:.6f}`")
            md.append(f"- **边际似然**: `{bayesian.evidence:.6f}`")
            md.append("")

        if trace:
            md.append("#### 越界溯源")
            md.append("")
            md.append(f"- **原始说法**: {trace.original_claim}")
            md.append(f"- **来源版本**: {trace.source_version_id}")
            md.append(f"- **来源时间**: {trace.source_timestamp.strftime('%Y-%m-%d %H:%M:%S')}")
            md.append(f"- **外推值**: `{trace.extrapolated_value:.6f}`")
            md.append(f"- **边界**: `{trace.boundary}`")
            md.append(f"- **越界方向**: {'超出上限' if trace.direction == 'upper' else '低于下限'}")
            md.append("")
            md.append("##### 追溯路径")
            md.append("")
            for step in trace.trace_path:
                md.append(f"1. {step}")
            md.append("")
        else:
            md.append("#### 越界信息")
            md.append("")
            md.append(f"- {result.failure_reason or '外推越界，但无法追溯原始说法'}")
            md.append("")

        if bayesian and bayesian.calculation_log:
            md.append("#### 计算日志")
            md.append("")
            for log in bayesian.calculation_log:
                md.append(f"- {log}")
            md.append("")

        return md

    def generate_failures_json(self, results: List[ProcessingResult]) -> Dict[str, Any]:
        failures = []
        for result in results:
            if result.failure_reason:
                failures.append({
                    "record_id": result.record.record_id,
                    "question_id": result.record.question_id,
                    "status": result.status,
                    "failure_reason": result.failure_reason,
                    "timestamp": datetime.now().isoformat(),
                })
        return {
            "total_count": len(results),
            "failure_count": len(failures),
            "failures": failures,
        }
