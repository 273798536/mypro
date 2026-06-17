from typing import List, Dict, Any
from datetime import datetime
from models import (
    ReplayResult, DecisionStatus, MaterialStatus,
    TimelineEvent, ScoreVerdict
)
from gray_analyzer import GrayAnalyzer


class ReportGenerator:
    def __init__(self, analyzer: GrayAnalyzer = None):
        self.analyzer = analyzer or GrayAnalyzer()

    def generate(self, result: ReplayResult, audience: str = "标注") -> str:
        if audience == "算法":
            return self._for_algorithm_duty(result)
        else:
            return self._for_annotator_zhou(result)

    def _for_annotator_zhou(self, result: ReplayResult) -> str:
        lines: List[str] = []
        lines.append(f"【信贷评分误判回放】标注负责人核查报告")
        lines.append(f"案件编号: {result.case_id}  |  运行ID: {result.run_id}")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 60)
        lines.append("")

        final_v = result.final_verdict.value if result.final_verdict else "待判定"
        status_icon = {
            DecisionStatus.PROCESSED: "★",
            DecisionStatus.NEEDS_MATERIAL: "⚠",
            DecisionStatus.MANUAL_CHANGED: "✎",
            DecisionStatus.GRAY: "◐"
        }.get(result.final_status, "○")
        lines.append(f"{status_icon} 当前状态: {result.final_status.value}")
        lines.append(f"   结论倾向: {final_v}")
        lines.append("")

        need_supply = []
        can_release = []
        need_confirm = []

        for mat in result.material_chain:
            if mat.status == MaterialStatus.WITHDRAWN:
                continue
            latest = mat.get_latest()
            display_name = f"{mat.material_type}[{mat.material_id}]"
            version_note = f"(v{len(mat.versions)}版, 最新:{latest.version_id})" if len(mat.versions) > 1 else ""

            if mat.status == MaterialStatus.REVISED:
                need_confirm.append((display_name, version_note, latest.note if latest else ""))
            elif mat.has_reference_gaps():
                need_supply.append((display_name, version_note, "缺少引用依据"))
            else:
                can_release.append((display_name, version_note))

        for snap in result.score_snapshots:
            for mm in snap.missing_materials:
                tag = f"[缺失必需]{mm}"
                if tag not in [x[0] for x in need_supply]:
                    need_supply.append((tag, "", "评分必需材料，未收录"))

        for w in result.withdrawals:
            for mat in result.material_chain:
                if mat.material_id == w.withdrawn_material_id:
                    need_supply.append((
                        f"[撤回待补]{mat.material_type}[{mat.material_id}]",
                        "",
                        f"撤回原因: {w.reason}"
                    ))

        if need_supply:
            lines.append("▌需要补充 / 核实的材料")
            lines.append("-" * 40)
            for name, ver, reason in need_supply:
                lines.append(f"  ⚠ {name} {ver}")
                if reason:
                    lines.append(f"      → {reason}")
            lines.append("")

        if need_confirm:
            lines.append("▌改过口径、需要最终确认的材料")
            lines.append("-" * 40)
            for name, ver, note in need_confirm:
                lines.append(f"  ◐ {name} {ver}")
                if note:
                    lines.append(f"      → 修改备注: {note}")
            lines.append("")

        if can_release:
            lines.append("▌材料齐、口径稳，可以放行")
            lines.append("-" * 40)
            for name, ver in can_release:
                lines.append(f"  ✔ {name} {ver}")
            lines.append("")

        if result.corrections:
            lines.append("▌本次关联的人工改判")
            lines.append("-" * 40)
            for c in result.corrections:
                lines.append(f"  ✎ {c.operator} 于 {c.timestamp.strftime('%m-%d %H:%M')}")
                lines.append(f"      {c.original_verdict.value} → {c.corrected_verdict.value}")
                lines.append(f"      原因: {c.reason}")
                if c.related_material_ids:
                    lines.append(f"      关联材料: {', '.join(c.related_material_ids)}")
            lines.append("")

        if result.verbal_notes:
            lines.append("▌临时口头说明（建议补成正式材料）")
            lines.append("-" * 40)
            for vn in result.verbal_notes:
                lines.append(f"  ▷ {vn.operator} 口述: {vn.content}")
                if vn.related_material_ids:
                    lines.append(f"      关联: {', '.join(vn.related_material_ids)}")
            lines.append("")

        uncertain_note = None
        for w in result.warnings:
            if "可信度提示" in w:
                uncertain_note = w
                break
        if uncertain_note:
            lines.append(f"  ⚠ 收尾提示: {uncertain_note}")
            lines.append("")

        lines.append("▌给周姐的行动建议")
        lines.append("-" * 40)
        if need_supply:
            lines.append(f"  1. 先追 {len(need_supply)} 项材料/引用，补齐再出最终结论")
        if need_confirm:
            lines.append(f"  2. 与提供方确认 {len(need_confirm)} 份改口径材料的最终版本")
        if result.verbal_notes:
            lines.append(f"  3. 把 {len(result.verbal_notes)} 条口头说明补成正式签字材料")
        if not need_supply and not need_confirm and not result.verbal_notes:
            lines.append(f"  ✓ 材料齐、口径稳，可以签字放行")
        lines.append("")

        if result.revised_materials:
            lines.append(f"[口径变更记录] 共 {len(result.revised_materials)} 份材料改过口径")
            for mid in result.revised_materials:
                lines.append(f"  - {mid}")
        return "\n".join(lines)

    def _for_algorithm_duty(self, result: ReplayResult) -> str:
        lines: List[str] = []
        lines.append(f"【信贷评分误判回放】算法值班历史时间线")
        lines.append(f"案件编号: {result.case_id}  |  运行ID: {result.run_id}")
        lines.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("=" * 60)

        if result.errors:
            lines.append("")
            lines.append("✗ 错误（脚本中断依据）:")
            for e in result.errors:
                lines.append(f"  {e}")
        if result.warnings:
            lines.append("")
            lines.append("△ 运行告警:")
            for w in result.warnings:
                lines.append(f"  {w}")

        lines.append("")
        lines.append("▌时间线（按事件发生顺序）")
        lines.append("-" * 60)

        status_prefix = {
            DecisionStatus.PROCESSED: "[已处理] ",
            DecisionStatus.NEEDS_MATERIAL: "[待补材料] ",
            DecisionStatus.MANUAL_CHANGED: "[人工改判] ",
            DecisionStatus.GRAY: "[灰度中] "
        }

        for evt in result.events:
            prefix = status_prefix.get(evt.status, "[事件] ")
            ts = evt.timestamp.strftime("%m-%d %H:%M:%S")
            op_note = f" ({evt.operator})" if evt.operator else ""
            lines.append(f"{prefix}{ts} | {evt.event_type}{op_note}")
            lines.append(f"       {evt.description}")

        lines.append("")
        lines.append("▌评分快照对比")
        lines.append("-" * 60)
        for snap in result.score_snapshots:
            mark = "●" if snap.verdict == ScoreVerdict.PASS else ("✗" if snap.verdict == ScoreVerdict.REJECT else "◐")
            lines.append(f"  {mark} 阈值[{snap.threshold_id}] 分数={snap.score} → {snap.verdict.value} (置信度:{snap.confidence.value})")
            if snap.missing_materials:
                lines.append(f"      缺失材料: {', '.join(snap.missing_materials)}")

        lines.append("")
        lines.append("▌灰度拆解（驱动因素）")
        lines.append("-" * 60)
        lines.append(self.analyzer.summary_text(result).split("主导驱动因素", 1)[-1].strip() or "")

        decomp = self.analyzer.decompose(result)
        lines.append(f"  主导驱动因素: {decomp['dominant_driver']}")
        for key, label in [("sample_change", "样本变化"), ("threshold_change", "阈值变化"), ("manual_override", "人工改判")]:
            comp = decomp["components"][key]
            d = comp["delta"]
            delta_str = f"{d:+.2f}" if d is not None else "N/A"
            lines.append(f"  - {label}: Δ={delta_str} | {comp['impact_level']} | {comp['note']}")

        lines.append("")
        lines.append("▌脚本输出常量（供日常解析使用）")
        lines.append("-" * 60)
        final_code = {
            DecisionStatus.PROCESSED: "EXIT_OK",
            DecisionStatus.NEEDS_MATERIAL: "EXIT_WAIT_MATERIAL",
            DecisionStatus.MANUAL_CHANGED: "EXIT_MANUAL_OVERRIDE",
            DecisionStatus.GRAY: "EXIT_GRAY"
        }.get(result.final_status, "EXIT_UNKNOWN")
        lines.append(f"EXIT_CODE={final_code}")
        lines.append(f"CASE_ID={result.case_id}")
        lines.append(f"RUN_ID={result.run_id}")
        lines.append(f"FINAL_VERDICT={result.final_verdict.value if result.final_verdict else 'UNSET'}")
        lines.append(f"FINAL_STATUS={result.final_status.value}")
        lines.append(f"WARN_COUNT={len(result.warnings)}")
        lines.append(f"ERR_COUNT={len(result.errors)}")
        lines.append(f"REVISED_MATERIALS={','.join(result.revised_materials) if result.revised_materials else 'NONE'}")
        lines.append(f"MISSING_REFS={','.join(result.missing_references) if result.missing_references else 'NONE'}")

        return "\n".join(lines)

    def to_dict(self, result: ReplayResult) -> Dict[str, Any]:
        return {
            "run_id": result.run_id,
            "case_id": result.case_id,
            "final_verdict": result.final_verdict.value if result.final_verdict else None,
            "final_status": result.final_status.value,
            "warnings": result.warnings,
            "errors": result.errors,
            "revised_materials": result.revised_materials,
            "missing_references": result.missing_references,
            "events": [
                {
                    "event_id": e.event_id,
                    "timestamp": e.timestamp.isoformat(),
                    "event_type": e.event_type,
                    "status": e.status.value,
                    "operator": e.operator,
                    "description": e.description,
                    "details": e.details
                } for e in result.events
            ],
            "gray_decomposition": self.analyzer.decompose(result)
        }
