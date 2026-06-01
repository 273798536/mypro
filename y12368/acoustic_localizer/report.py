import numpy as np
from typing import List, Dict, Optional
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
import json

from .triangulation import TDOALocalizer, LocalizationResult
from .error_analysis import ErrorEstimator, RankedCandidate
from .evidence import EvidenceManager


@dataclass
class LocalizationReport:
    report_id: str
    timestamp: str
    case_info: Dict
    input_data: Dict
    triangulation_steps: List[Dict]
    candidates: List[Dict]
    error_analysis: Dict
    evidence_summary: Dict
    tuning_notes: List[Dict]
    conclusion: Dict

    def to_markdown(self) -> str:
        return self._generate_markdown()

    def to_json(self) -> str:
        return json.dumps({
            "report_id": self.report_id,
            "timestamp": self.timestamp,
            "case_info": self.case_info,
            "input_data": self.input_data,
            "triangulation_steps": self.triangulation_steps,
            "candidates": self.candidates,
            "error_analysis": self.error_analysis,
            "evidence_summary": self.evidence_summary,
            "tuning_notes": self.tuning_notes,
            "conclusion": self.conclusion
        }, indent=2, ensure_ascii=False)

    def _generate_markdown(self) -> str:
        md = []
        md.append(f"# 声源定位报告")
        md.append(f"")
        md.append(f"**报告ID**: {self.report_id}")
        md.append(f"**生成时间**: {self.timestamp}")
        md.append(f"**案例**: {self.case_info.get('name', '未命名')}")
        md.append(f"**描述**: {self.case_info.get('description', '无描述')}")
        md.append(f"")

        md.append("## 1. 输入数据")
        md.append("")
        md.append("### 1.1 基本参数")
        md.append(f"- 声速: {self.input_data['speed_of_sound']['value']} {self.input_data['speed_of_sound']['unit']}")
        md.append(f"")

        md.append("### 1.2 麦克风坐标")
        md.append("")
        md.append("| ID | X (m) | Y (m) | Z (m) | 备注 |")
        md.append("|----|-------|-------|-------|------|")
        for mic in self.input_data["microphones"]:
            md.append(f"| {mic['id']} | {mic['position']['x']:.3f} | {mic['position']['y']:.3f} | {mic['position']['z']:.3f} | {mic.get('notes', '')} |")
        md.append("")

        md.append("### 1.3 时间差测量 (TDOA)")
        md.append("")
        md.append("| 麦克风对 | Δt (ms) | Δd (m) | 置信度 | 噪声峰值 | 备注 |")
        md.append("|----------|---------|--------|--------|----------|------|")
        for td in self.input_data["time_differences"]:
            noise_peak = td.get('noise_peak', 'N/A')
            md.append(f"| {td['pair']} | {td['delta_t']*1000:.3f} | {td['distance_difference']:.4f} | {td.get('confidence', 1.0):.2f} | {noise_peak} | {td.get('notes', '')} |")
        md.append("")

        md.append("## 2. 三角定位计算过程")
        md.append("")
        for i, step in enumerate(self.triangulation_steps, 1):
            md.append(f"### {i}. {step['description']}")
            md.append(f"")
            md.append(f"**公式**: `{step['formula']}`")
            md.append(f"")
            md.append(f"**结果**:")
            md.append(f"```")
            if isinstance(step['value'], list):
                for v in step['value']:
                    md.append(f"  {v}")
            else:
                md.append(f"  {step['value']}")
            md.append(f"```")
            md.append(f"**单位**: {step['unit']}")
            md.append(f"")

        md.append("## 3. 候选位置排序")
        md.append("")
        md.append("| 排名 | 方法 | X (m) | Y (m) | 残差 (m) | 一致性得分 | 综合得分 | 调音备注 |")
        md.append("|------|------|-------|-------|----------|------------|----------|----------|")
        for cand in self.candidates:
            md.append(f"| {cand['rank']} | {cand['method']} | {cand['x']:.4f} | {cand['y']:.4f} | {cand['error']:.6f} | {cand['consistency']:.4f} | {cand['score']:.4f} | {cand['notes_count']} |")
        md.append("")

        if self.candidates:
            best = self.candidates[0]
            md.append("### 3.1 最佳候选详情")
            md.append("")
            md.append(f"- **位置**: ({best['x']:.4f}, {best['y']:.4f}) m")
            md.append(f"- **定位方法**: {best['method']}")
            md.append(f"- **残差误差**: {best['error']:.6f} m")
            md.append(f"- **一致性得分**: {best['consistency']:.4f}")
            md.append(f"- **综合评分**: {best['score']:.4f}")
            md.append(f"")

            md.append("#### 麦克风距离验证")
            md.append("")
            md.append("| 麦克风 | 距离 (m) |")
            md.append("|--------|----------|")
            for mic_id, dist in best.get('mic_distances', {}).items():
                md.append(f"| {mic_id} | {dist:.4f} |")
            md.append("")

        md.append("## 4. 误差分析")
        md.append("")
        md.append("### 4.1 误差来源")
        md.append("")
        md.append("| 误差来源 | 贡献值 (m) | 描述 |")
        md.append("|----------|------------|------|")
        for err in self.error_analysis.get('error_budget', []):
            md.append(f"| {err['source']} | {err['magnitude']:.6f} | {err['description']} |")
        md.append("")

        md.append("### 4.2 不确定度椭圆")
        md.append("")
        unc = self.error_analysis.get('uncertainty', {})
        md.append(f"- **中心**: ({unc.get('center_x', 0):.4f}, {unc.get('center_y', 0):.4f}) m")
        md.append(f"- **长轴**: {unc.get('major_axis', 0):.4f} m")
        md.append(f"- **短轴**: {unc.get('minor_axis', 0):.4f} m")
        md.append(f"- **角度**: {unc.get('angle', 0):.2f}°")
        md.append("")

        md.append("### 4.3 置信区间")
        md.append("")
        ci = self.error_analysis.get('confidence_interval', {})
        md.append(f"- **置信水平**: {ci.get('confidence_level', 0.95) * 100:.0f}%")
        md.append(f"- **误差半径**: {ci.get('radius', 0):.4f} m")
        md.append(f"- **X范围**: [{ci.get('lower_bound_x', 0):.4f}, {ci.get('upper_bound_x', 0):.4f}] m")
        md.append(f"- **Y范围**: [{ci.get('lower_bound_y', 0):.4f}, {ci.get('upper_bound_y', 0):.4f}] m")
        md.append("")

        md.append("## 5. 证据与调音备注")
        md.append("")
        md.append("### 5.1 证据摘要")
        md.append("")
        ev = self.evidence_summary
        md.append(f"- **证据总数**: {ev.get('total_evidence_items', 0)}")
        md.append(f"- **坐标问题**: {ev.get('coordinate_issues', 0)}")
        md.append(f"- **时间差异常**: {ev.get('time_gaps', 0)}")
        md.append(f"- **归档噪声峰值**: {ev.get('archived_noise_peaks', 0)}")
        md.append("")

        md.append("### 5.2 调音备注")
        md.append("")
        if self.tuning_notes:
            for note in self.tuning_notes:
                status = "✅ 已解决" if note.get('resolved') else "⚠️ 待处理"
                md.append(f"- **[{note.get('severity', 'info').upper()}]** {note.get('content', '')}")
                md.append(f"  - 作者: {note.get('author', '未知')}")
                md.append(f"  - 时间: {note.get('timestamp', '')}")
                md.append(f"  - 状态: {status}")
                md.append("")
        else:
            md.append("无调音备注")
            md.append("")

        md.append("## 6. 结论")
        md.append("")
        conc = self.conclusion
        md.append(f"### 6.1 最终定位结果")
        md.append("")
        md.append(f"- **声源位置**: ({conc.get('final_x', 0):.4f}, {conc.get('final_y', 0):.4f}) m")
        md.append(f"- **定位误差**: ±{conc.get('final_error', 0):.4f} m")
        md.append(f"- **结果置信度**: {conc.get('confidence', 0) * 100:.1f}%")
        md.append("")

        md.append("### 6.2 质量评估")
        md.append("")
        for qa in conc.get('quality_assessment', []):
            status = "✅ 通过" if qa.get('passed') else "❌ 失败"
            md.append(f"- **{qa['item']}**: {status}")
            if qa.get('message'):
                md.append(f"  - {qa['message']}")
        md.append("")

        md.append("### 6.3 建议")
        md.append("")
        for rec in conc.get('recommendations', []):
            md.append(f"- {rec}")
        if not conc.get('recommendations'):
            md.append("- 定位结果质量良好，无需特殊调整")
        md.append("")

        return "\n".join(md)


class ReportGenerator:
    def __init__(self, localizer: TDOALocalizer, evidence_manager: EvidenceManager):
        self.localizer = localizer
        self.evidence_manager = evidence_manager
        self.error_estimator = ErrorEstimator(localizer)

    def generate_report(self, case_name: str = "未命名案例",
                        case_description: str = "") -> LocalizationReport:
        report_id = f"LOC-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        candidates = self.localizer.get_candidate_positions(5)
        ranked_candidates = self.error_estimator.rank_candidates(candidates)

        triangulation_steps = []
        if ranked_candidates:
            best_result = ranked_candidates[0].result
            for step in best_result.intermediate_steps:
                triangulation_steps.append({
                    "description": step.description,
                    "formula": step.formula,
                    "value": step.value,
                    "unit": step.unit
                })

        candidates_data = []
        for rc in ranked_candidates:
            candidates_data.append({
                "rank": rc.rank,
                "method": rc.result.method,
                "x": float(rc.result.source_position[0]),
                "y": float(rc.result.source_position[1]),
                "error": float(rc.result.error),
                "consistency": float(rc.result.consistency_score),
                "score": float(rc.total_score),
                "notes_count": len(rc.result.tuning_notes),
                "tuning_notes": rc.result.tuning_notes,
                "mic_distances": {k: float(v) for k, v in rc.result.microphone_distances.items()}
            })

        error_budget = []
        if ranked_candidates:
            error_contributions = self.error_estimator.estimate_error_budget(ranked_candidates[0].result)
            for ec in error_contributions:
                error_budget.append({
                    "source": ec.source.value,
                    "magnitude": float(ec.magnitude),
                    "unit": ec.unit,
                    "description": ec.description
                })

        uncertainty = {}
        if ranked_candidates:
            unc = self.error_estimator.calculate_uncertainty_ellipse(ranked_candidates[0].result)
            uncertainty = {
                "center_x": float(unc.center_x),
                "center_y": float(unc.center_y),
                "major_axis": float(unc.major_axis),
                "minor_axis": float(unc.minor_axis),
                "angle": float(unc.angle),
                "unit": unc.unit
            }

        confidence_interval = {}
        if ranked_candidates:
            confidence_interval = self.error_estimator.get_confidence_interval(
                ranked_candidates[0].result
            )

        tuning_notes_data = []
        for note in self.evidence_manager.tuning_notes:
            tuning_notes_data.append({
                "id": note.id,
                "timestamp": note.timestamp,
                "author": note.author,
                "category": note.category,
                "content": note.content,
                "related_evidence": note.related_evidence,
                "severity": note.severity,
                "resolved": note.resolved
            })

        conclusion = self._generate_conclusion(ranked_candidates)

        return LocalizationReport(
            report_id=report_id,
            timestamp=timestamp,
            case_info={
                "name": case_name,
                "description": case_description
            },
            input_data=self.localizer.export_input_data(),
            triangulation_steps=triangulation_steps,
            candidates=candidates_data,
            error_analysis={
                "error_budget": error_budget,
                "uncertainty": uncertainty,
                "confidence_interval": confidence_interval
            },
            evidence_summary=self.evidence_manager.generate_evidence_summary(),
            tuning_notes=tuning_notes_data,
            conclusion=conclusion
        )

    def _generate_conclusion(self, ranked_candidates: List[RankedCandidate]) -> Dict:
        if not ranked_candidates:
            return {
                "final_x": 0,
                "final_y": 0,
                "final_error": 0,
                "confidence": 0,
                "quality_assessment": [],
                "recommendations": ["无法定位，检查输入数据"]
            }

        best = ranked_candidates[0]
        quality_assessment = []
        recommendations = []

        error_ok = best.result.error < 0.1
        quality_assessment.append({
            "item": "残差误差",
            "passed": bool(error_ok),
            "message": f"误差 {best.result.error:.4f}m, 阈值 0.1m" if not error_ok else ""
        })

        consistency_ok = best.result.consistency_score > 0.7
        quality_assessment.append({
            "item": "一致性检查",
            "passed": bool(consistency_ok),
            "message": f"得分 {best.result.consistency_score:.2f}, 阈值 0.7" if not consistency_ok else ""
        })

        notes_ok = len(best.result.tuning_notes) == 0
        quality_assessment.append({
            "item": "调音备注",
            "passed": bool(notes_ok),
            "message": f"发现 {len(best.result.tuning_notes)} 条异常" if not notes_ok else ""
        })

        if not error_ok:
            recommendations.append("残差较大，建议检查时间差测量精度")
        if not consistency_ok:
            recommendations.append("一致性较差，建议验证麦克风坐标是否正确")
        if best.result.tuning_notes:
            recommendations.append("存在调音告警，详见第5.2节")

        confidence = best.total_score

        return {
            "final_x": float(best.result.source_position[0]),
            "final_y": float(best.result.source_position[1]),
            "final_error": float(best.result.error),
            "confidence": float(confidence),
            "quality_assessment": quality_assessment,
            "recommendations": recommendations
        }

    def save_report(self, report: LocalizationReport, output_dir: str = "reports",
                    formats: List[str] = ["markdown", "json"]) -> None:
        Path(output_dir).mkdir(parents=True, exist_ok=True)

        base_filename = f"{report.report_id}"

        if "markdown" in formats:
            md_path = Path(output_dir) / f"{base_filename}.md"
            with open(md_path, 'w', encoding='utf-8') as f:
                f.write(report.to_markdown())
            print(f"报告已保存: {md_path}")

        if "json" in formats:
            json_path = Path(output_dir) / f"{base_filename}.json"
            with open(json_path, 'w', encoding='utf-8') as f:
                f.write(report.to_json())
            print(f"JSON数据已保存: {json_path}")
