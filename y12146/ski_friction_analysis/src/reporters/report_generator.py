import csv
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
from ..utils import Config, AuditLogger
from ..importers import ImportResult

@dataclass
class TraceableResult:
    trace_id: str
    segment_id: str
    row_id: int
    zone: str
    friction_coeff: float
    slope_angle: float
    temperature: float
    estimated_speed_kmh: float
    max_safe_speed_kmh: float
    risk_level: str
    risk_zone: str
    ice_risk_score: float
    has_accident: bool
    accident_count: int
    source_data_link: str
    speed_calc_link: str
    risk_calc_link: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "trace_id": self.trace_id,
            "segment_id": self.segment_id,
            "row_id": self.row_id,
            "zone": self.zone,
            "friction_coeff": self.friction_coeff,
            "slope_angle": self.slope_angle,
            "temperature": self.temperature,
            "estimated_speed_kmh": self.estimated_speed_kmh,
            "max_safe_speed_kmh": self.max_safe_speed_kmh,
            "risk_level": self.risk_level,
            "risk_zone": self.risk_zone,
            "ice_risk_score": self.ice_risk_score,
            "has_accident": self.has_accident,
            "accident_count": self.accident_count,
            "source_data_link": self.source_data_link,
            "speed_calc_link": self.speed_calc_link,
            "risk_calc_link": self.risk_calc_link
        }

class ReportGenerator:
    def __init__(self, audit_logger: AuditLogger):
        self.config = Config()
        self.audit_logger = audit_logger
        self.traceable_results: List[TraceableResult] = []
    
    def build_traceable_results(self, risk_results: List[Any],
                                import_result: ImportResult) -> List[TraceableResult]:
        self.traceable_results = []
        
        valid_rows_map = {row["row_id"]: row for row in import_result.valid_rows}
        
        for risk_result in risk_results:
            row_id = risk_result.row_id
            segment_id = risk_result.segment_id
            
            row_data = valid_rows_map.get(row_id, {})
            accident_count = 0
            if risk_result.accident_link:
                accident_count = risk_result.accident_link.accident_count
            
            traceable = TraceableResult(
                trace_id=risk_result.trace_id,
                segment_id=segment_id,
                row_id=row_id,
                zone=risk_result.zone,
                friction_coeff=row_data.get("friction_coeff", 0.0),
                slope_angle=risk_result.speed_estimate_kmh,
                temperature=row_data.get("temperature", 0.0),
                estimated_speed_kmh=risk_result.speed_estimate_kmh,
                max_safe_speed_kmh=risk_result.max_safe_speed_kmh,
                risk_level=risk_result.overall_risk_level,
                risk_zone=risk_result.risk_zone,
                ice_risk_score=risk_result.ice_risk_score,
                has_accident=risk_result.accident_link is not None,
                accident_count=accident_count,
                source_data_link=f"raw_data#row_{row_id}",
                speed_calc_link=f"speed_calc#{segment_id}",
                risk_calc_link=f"risk_calc#{risk_result.trace_id}"
            )
            
            self.traceable_results.append(traceable)
        
        return self.traceable_results
    
    def trace_by_id(self, trace_id: str) -> Optional[TraceableResult]:
        for tr in self.traceable_results:
            if tr.trace_id == trace_id:
                return tr
        return None
    
    def trace_by_segment(self, segment_id: str) -> List[TraceableResult]:
        return [tr for tr in self.traceable_results if tr.segment_id == segment_id]
    
    def trace_by_row(self, row_id: int) -> Optional[TraceableResult]:
        for tr in self.traceable_results:
            if tr.row_id == row_id:
                return tr
        return None
    
    def generate_full_report(self, import_result: ImportResult,
                             friction_results: List[Any],
                             speed_results: List[Any],
                             risk_results: List[Any],
                             output_dir: str,
                             report_name: str = "friction_analysis_report") -> Dict[str, str]:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        summary_file = output_path / f"{report_name}_summary_{timestamp}.md"
        self._generate_summary_report(summary_file, import_result, friction_results, 
                                       speed_results, risk_results)
        
        detail_file = output_path / f"{report_name}_details_{timestamp}.csv"
        self._generate_detail_csv(detail_file, risk_results, import_result)
        
        bad_rows_file = output_path / f"{report_name}_bad_rows_{timestamp}.csv"
        import_result.importer.export_bad_rows(import_result.bad_rows, bad_rows_file)
        
        missing_friction_file = output_path / f"{report_name}_missing_friction_{timestamp}.csv"
        import_result.importer.export_missing_friction(
            import_result.missing_friction_rows, missing_friction_file
        )
        
        review_file = output_path / f"{report_name}_review_items_{timestamp}.csv"
        self._generate_review_csv(review_file, import_result)
        
        trace_file = output_path / f"{report_name}_traceable_{timestamp}.json"
        self._generate_traceable_json(trace_file, risk_results, import_result)
        
        qa_file = output_path / f"{report_name}_qa_{timestamp}.md"
        self._generate_qa_report(qa_file, import_result, risk_results)
        
        self.audit_logger.log_report_generated(str(output_path))
        
        return {
            "summary": str(summary_file),
            "details": str(detail_file),
            "bad_rows": str(bad_rows_file),
            "missing_friction": str(missing_friction_file),
            "review_items": str(review_file),
            "traceable": str(trace_file),
            "qa_report": str(qa_file)
        }
    
    def _generate_summary_report(self, output_file: Path, import_result: ImportResult,
                                  friction_results: List[Any], speed_results: List[Any],
                                  risk_results: List[Any]):
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# 滑雪雪道摩擦分析报告\n\n")
            f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## 数据导入统计\n\n")
            f.write(f"- 总数据行数: {import_result.total_rows}\n")
            f.write(f"- 有效数据行数: {len(import_result.valid_rows)}\n")
            f.write(f"- 坏数据行数: {len(import_result.bad_rows)}\n")
            f.write(f"- 摩擦系数缺失行数: {len(import_result.missing_friction_rows)}\n")
            f.write(f"- 空行数: {import_result.skipped_empty_lines}\n")
            f.write(f"- 注释行数: {import_result.skipped_comment_lines}\n\n")
            
            f.write("## 需要复核的项目\n\n")
            f.write(f"- 重复坡段数量: {len(import_result.duplicate_segments)}\n")
            f.write(f"- 气温突变数量: {len(import_result.temperature_spikes)}\n\n")
            
            if import_result.duplicate_segments:
                f.write("### 重复坡段列表\n\n")
                f.write("| 坡段编号 | 出现行数 |\n")
                f.write("|----------|----------|\n")
                for seg_id, indices in import_result.duplicate_segments.items():
                    row_ids = [str(import_result.valid_rows[i]["row_id"]) for i in indices]
                    f.write(f"| {seg_id} | {', '.join(row_ids)} |\n")
                f.write("\n")
            
            if import_result.temperature_spikes:
                f.write("### 气温突变列表\n\n")
                f.write("| 坡段编号 | 行号 | 之前气温 | 当前气温 | 变化幅度 |\n")
                f.write("|----------|------|----------|----------|----------|\n")
                for spike in import_result.temperature_spikes:
                    f.write(f"| {spike['segment_id']} | {spike['row_id']} | {spike['previous_temperature']}°C | {spike['current_temperature']}°C | {spike['temperature_change']}°C |\n")
                f.write("\n")
            
            f.write("## 风险分区统计\n\n")
            risk_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
            for r in risk_results:
                risk_counts[r.overall_risk_level] += 1
            
            f.write("| 风险等级 | 坡段数量 |\n")
            f.write("|----------|----------|\n")
            for level, count in risk_counts.items():
                f.write(f"| {level} | {count} |\n")
            f.write("\n")
            
            f.write("## 事故关联统计\n\n")
            accident_results = [r for r in risk_results if r.accident_link]
            f.write(f"- 关联事故的坡段数: {len(accident_results)}\n")
            total_accidents = sum(r.accident_link.accident_count for r in accident_results if r.accident_link)
            f.write(f"- 总事故数: {total_accidents}\n\n")
            
            if accident_results:
                f.write("### 事故关联坡段\n\n")
                f.write("| 坡段编号 | 区域 | 事故数 | 风险等级 | 关联因素 |\n")
                f.write("|----------|------|--------|----------|----------|\n")
                for r in accident_results:
                    if r.accident_link:
                        factors = ", ".join(r.accident_link.contributing_factors)
                        f.write(f"| {r.segment_id} | {r.zone} | {r.accident_link.accident_count} | {r.overall_risk_level} | {factors} |\n")
                f.write("\n")
            
            f.write("## 结果追溯说明\n\n")
            f.write("每条结果都可通过以下方式追溯:\n")
            f.write("- trace_id: 唯一追溯标识\n")
            f.write("- source_data_link: 原始数据位置\n")
            f.write("- speed_calc_link: 速度计算过程\n")
            f.write("- risk_calc_link: 风险计算过程\n\n")
    
    def _generate_detail_csv(self, output_file: Path, risk_results: List[Any],
                              import_result: ImportResult):
        valid_rows_map = {row["row_id"]: row for row in import_result.valid_rows}
        
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow([
                "trace_id", "坡段编号", "行号", "区域", "摩擦系数", "坡度", "气温",
                "估算速度(km/h)", "安全速度(km/h)", "风险等级", "风险分区",
                "结冰风险分", "是否有事故", "事故数", "原始数据链接"
            ])
            
            for r in risk_results:
                row_data = valid_rows_map.get(r.row_id, {})
                accident_count = 0
                if r.accident_link:
                    accident_count = r.accident_link.accident_count
                
                writer.writerow([
                    r.trace_id,
                    r.segment_id,
                    r.row_id,
                    r.zone,
                    row_data.get("friction_coeff", ""),
                    row_data.get("slope_angle", ""),
                    row_data.get("temperature", ""),
                    r.speed_estimate_kmh,
                    r.max_safe_speed_kmh,
                    r.overall_risk_level,
                    r.risk_zone,
                    r.ice_risk_score,
                    "是" if r.accident_link else "否",
                    accident_count,
                    f"raw_data#row_{r.row_id}"
                ])
    
    def _generate_review_csv(self, output_file: Path, import_result: ImportResult):
        with open(output_file, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(["复核类型", "坡段编号", "行号", "问题描述", "备注"])
            
            for seg_id, indices in import_result.duplicate_segments.items():
                for idx in indices:
                    row_id = import_result.valid_rows[idx]["row_id"]
                    writer.writerow([
                        "重复坡段",
                        seg_id,
                        row_id,
                        f"坡段 {seg_id} 在数据中重复出现",
                        "请确认数据正确性，保留唯一记录"
                    ])
            
            for spike in import_result.temperature_spikes:
                writer.writerow([
                    "气温突变",
                    spike["segment_id"],
                    spike["row_id"],
                    f"气温变化 {spike['temperature_change']}°C (从 {spike['previous_temperature']}°C 到 {spike['current_temperature']}°C)",
                    "请确认气温数据是否准确，突变可能影响摩擦分析结果"
                ])
    
    def _generate_traceable_json(self, output_file: Path, risk_results: List[Any],
                                  import_result: ImportResult):
        traceable_list = self.build_traceable_results(risk_results, import_result)
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(
                [tr.to_dict() for tr in traceable_list],
                f,
                ensure_ascii=False,
                indent=2
            )
    
    def _generate_qa_report(self, output_file: Path, import_result: ImportResult,
                             risk_results: List[Any]):
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# 滑雪场运营QA报告\n\n")
            f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## Q: 哪些区域需要特别关注结冰问题？\n\n")
            high_ice_risk = [r for r in risk_results if r.ice_risk_score >= 0.7]
            if high_ice_risk:
                f.write("以下区域结冰风险较高:\n\n")
                for r in high_ice_risk:
                    f.write(f"- **{r.zone}** 坡段 {r.segment_id}: 结冰风险分 {r.ice_risk_score}\n")
            else:
                f.write("当前没有高结冰风险的区域。\n")
            f.write("\n")
            
            f.write("## Q: 有没有气温突变的情况？\n\n")
            if import_result.temperature_spikes:
                f.write(f"发现 {len(import_result.temperature_spikes)} 处气温突变:\n\n")
                for spike in import_result.temperature_spikes:
                    f.write(f"- 坡段 {spike['segment_id']} (行 {spike['row_id']}): "
                           f"气温变化 {spike['temperature_change']}°C\n")
            else:
                f.write("未发现气温突变情况。\n")
            f.write("\n")
            
            f.write("## Q: 哪些坡段有重复数据？\n\n")
            if import_result.duplicate_segments:
                f.write(f"发现 {len(import_result.duplicate_segments)} 个重复坡段:\n\n")
                for seg_id, indices in import_result.duplicate_segments.items():
                    row_ids = [str(import_result.valid_rows[i]["row_id"]) for i in indices]
                    f.write(f"- 坡段 {seg_id}: 出现在行 {', '.join(row_ids)}\n")
            else:
                f.write("未发现重复坡段。\n")
            f.write("\n")
            
            f.write("## Q: 哪些数据缺少摩擦系数？\n\n")
            if import_result.missing_friction_rows:
                f.write(f"共 {len(import_result.missing_friction_rows)} 行数据缺少摩擦系数，"
                       f"已排除在正常分析之外:\n\n")
                for row in import_result.missing_friction_rows[:10]:
                    f.write(f"- 行 {row['row_id']}: {row['data'].get('zone', '未知区域')} "
                           f"坡段 {row['data'].get('segment_id', '未知')}\n")
                if len(import_result.missing_friction_rows) > 10:
                    f.write(f"... 还有 {len(import_result.missing_friction_rows) - 10} 条记录\n")
            else:
                f.write("所有数据都包含摩擦系数。\n")
            f.write("\n")
            
            f.write("## Q: 高风险区域有哪些？\n\n")
            high_risk = [r for r in risk_results if r.overall_risk_level in ["CRITICAL", "HIGH"]]
            if high_risk:
                for r in high_risk:
                    accident_info = ""
                    if r.accident_link:
                        accident_info = f" (关联 {r.accident_link.accident_count} 起事故)"
                    f.write(f"- **{r.zone}** 坡段 {r.segment_id}: {r.overall_risk_level}{accident_info}\n")
            else:
                f.write("当前没有高风险区域。\n")
    
    def get_failure_path_report(self, import_result: ImportResult, output_file: Path):
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# 摩擦系数缺失失败路径报告\n\n")
            f.write(f"**生成时间**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            
            f.write("## 失败路径统计\n\n")
            f.write(f"- 摩擦系数缺失的记录数: {len(import_result.missing_friction_rows)}\n\n")
            
            f.write("## 详细失败记录\n\n")
            f.write("| 行号 | 区域 | 坡段编号 | 坡度 | 气温 | 表面类型 |\n")
            f.write("|------|------|----------|------|------|----------|\n")
            
            for row in import_result.missing_friction_rows:
                data = row["data"]
                f.write(f"| {row['row_id']} | {data.get('zone', '')} | {data.get('segment_id', '')} | "
                       f"{data.get('slope_angle', '')} | {data.get('temperature', '')} | "
                       f"{data.get('surface_type', '')} |\n")
            
            f.write("\n## 处理说明\n\n")
            f.write("以上记录因缺少摩擦系数数据，未进入正常分析流程。"
                   "请补充摩擦系数后重新导入，或进行人工估算。\n")
