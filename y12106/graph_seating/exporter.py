import os
import json
import csv
from typing import List, Dict, Optional, Any
from collections import defaultdict
from datetime import datetime

from .config import Config
from .exceptions import DataAnomaly, ConflictCycle
from .models import (
    Student, ConflictGraph, ColoringResult, SeatingPlan
)
from .traceability import TraceabilityManager


class ResultExporter:
    def __init__(self, config: Optional[Config] = None):
        self.config = config or Config()
        self.export_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    def export_all(self, students: List[Student],
                   graph: ConflictGraph,
                   coloring_result: ColoringResult,
                   seating_plan: SeatingPlan,
                   anomalies: List[DataAnomaly],
                   bad_rows: List[Dict[str, Any]],
                   cycles: List[ConflictCycle],
                   trace_manager: TraceabilityManager,
                   output_dir: Optional[str] = None) -> Dict[str, str]:

        output_dir = output_dir or self.config.OUTPUT_DIR
        os.makedirs(output_dir, exist_ok=True)

        exported_files = {}

        exported_files["seating_plan"] = self._export_seating_plan(
            seating_plan, students, coloring_result, trace_manager, output_dir
        )

        exported_files["students"] = self._export_students_list(
            students, seating_plan, coloring_result, output_dir
        )

        exported_files["anomalies"] = self._export_anomalies(
            anomalies, bad_rows, output_dir
        )

        exported_files["conflicts"] = self._export_conflicts(
            graph, seating_plan, output_dir
        )

        exported_files["cycles"] = self._export_cycles(
            cycles, output_dir
        )

        exported_files["coloring"] = self._export_coloring_result(
            coloring_result, graph, output_dir
        )

        exported_files["traceability"] = self._export_traceability(
            trace_manager, output_dir
        )

        exported_files["review_queue"] = self._export_review_queue(
            seating_plan, trace_manager, graph, output_dir
        )

        exported_files["summary"] = self._export_summary(
            students, graph, coloring_result, seating_plan,
            anomalies, cycles, trace_manager, output_dir
        )

        self._generate_consistency_report(
            students, graph, coloring_result, seating_plan,
            trace_manager, output_dir
        )

        return exported_files

    def _export_seating_plan(self, seating_plan: SeatingPlan,
                             students: List[Student],
                             coloring_result: ColoringResult,
                             trace_manager: TraceabilityManager,
                             output_dir: str) -> str:

        student_map = {s.student_id: s for s in students}
        filename = os.path.join(output_dir, f"seating_plan_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "学生ID", "姓名", "年级", "班级", "班号", "座位号",
                "颜色组", "分配类型", "是否请假补位", "补位说明",
                "冲突警告", "容量警告", "数据来源行号",
                "追溯链接", "数据哈希", "一致性状态"
            ])

            for class_id, cls in sorted(seating_plan.classes.items()):
                for student_id in cls.students:
                    student = student_map.get(student_id)
                    assignment = seating_plan.assignments.get(student_id)
                    color_assign = coloring_result.assignments.get(student_id)
                    consistency = trace_manager._check_consistency(student_id) if student else {"status": "unknown"}

                    writer.writerow([
                        student_id,
                        student.name if student else "",
                        student.grade if student else "",
                        cls.class_name,
                        class_id,
                        assignment.seat_number if assignment else "",
                        assignment.color_group if assignment else "",
                        assignment.assignment_type if assignment else "",
                        "是" if (assignment and assignment.is_leave_override) else "否",
                        assignment.override_reason if assignment else "",
                        "; ".join(assignment.conflict_warnings) if assignment else "",
                        "是" if (assignment and assignment.capacity_warning) else "否",
                        student.data_line_number if student else "",
                        f"trace://{student_id}",
                        color_assign.confidence if color_assign else "",
                        consistency.get("status", "unknown")
                    ])

            for student_id in seating_plan.unassigned_students:
                student = student_map.get(student_id)
                writer.writerow([
                    student_id,
                    student.name if student else "",
                    student.grade if student else "",
                    "未分配",
                    "UNASSIGNED",
                    "",
                    "",
                    "unassigned",
                    "",
                    "",
                    "",
                    "",
                    student.data_line_number if student else "",
                    f"trace://{student_id}",
                    "",
                    "unassigned"
                ])

        return filename

    def _export_students_list(self, students: List[Student],
                              seating_plan: SeatingPlan,
                              coloring_result: ColoringResult,
                              output_dir: str) -> str:

        filename = os.path.join(output_dir, f"students_list_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "学生ID", "姓名", "年级", "性别",
                "兴趣标签", "特殊需求", "座位偏好",
                "冲突对象", "请假记录数", "当前请假状态",
                "数据有效性", "验证错误", "原始行号",
                "分配班级", "分配状态", "数据哈希"
            ])

            for student in students:
                assignment = seating_plan.assignments.get(student.student_id)
                is_on_leave = any(lr.approved for lr in student.leave_records)

                writer.writerow([
                    student.student_id,
                    student.name,
                    student.grade,
                    student.gender,
                    ", ".join(student.interest_tags),
                    student.special_needs,
                    student.seat_preference,
                    ", ".join(student.conflict_with),
                    len(student.leave_records),
                    "请假中" if is_on_leave else "正常",
                    "有效" if student.is_valid else "无效",
                    "; ".join(student.validation_errors),
                    student.data_line_number,
                    assignment.class_name if assignment else "未分配",
                    "已分配" if assignment else "未分配",
                    student.get_data_hash()
                ])

        return filename

    def _export_anomalies(self, anomalies: List[DataAnomaly],
                          bad_rows: List[Dict[str, Any]],
                          output_dir: str) -> str:

        filename = os.path.join(output_dir, f"data_anomalies_{self.export_timestamp}.xlsx")
        csv_filename = os.path.join(output_dir, f"data_anomalies_{self.export_timestamp}.csv")

        with open(csv_filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "行号", "异常类型", "严重程度", "描述",
                "相关列", "建议操作", "原始数据"
            ])

            for anomaly in anomalies:
                writer.writerow([
                    anomaly.row_index,
                    anomaly.anomaly_type,
                    anomaly.severity,
                    anomaly.description,
                    anomaly.column or "",
                    anomaly.suggested_action,
                    json.dumps(anomaly.raw_data, ensure_ascii=False)
                ])

        bad_rows_filename = os.path.join(output_dir, f"bad_rows_{self.export_timestamp}.csv")
        with open(bad_rows_filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["行号", "错误信息", "原始数据"])
            for bad_row in bad_rows:
                writer.writerow([
                    bad_row.get("line", -1),
                    "; ".join(bad_row.get("errors", [])) or bad_row.get("exception", ""),
                    json.dumps(bad_row.get("data", {}), ensure_ascii=False)
                ])

        return bad_rows_filename

    def _export_conflicts(self, graph: ConflictGraph,
                          seating_plan: SeatingPlan,
                          output_dir: str) -> str:

        filename = os.path.join(output_dir, f"conflict_relations_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "学生A_ID", "学生A_姓名", "学生B_ID", "学生B_姓名",
                "冲突类型", "权重", "是否同班", "同班班级",
                "冲突描述", "属性信息"
            ])

            for (a, b), edge in graph.edges.items():
                a_in_class = seating_plan.assignments.get(a)
                b_in_class = seating_plan.assignments.get(b)
                same_class = (a_in_class and b_in_class and
                              a_in_class.class_id == b_in_class.class_id)

                a_name = graph.nodes[a].attributes.get("name", a) if a in graph.nodes else a
                b_name = graph.nodes[b].attributes.get("name", b) if b in graph.nodes else b

                writer.writerow([
                    a, a_name, b, b_name,
                    edge.conflict_type,
                    edge.weight,
                    "是" if same_class else "否",
                    a_in_class.class_name if same_class and a_in_class else "",
                    edge.attributes.get("description", ""),
                    json.dumps(edge.attributes, ensure_ascii=False)
                ])

        return filename

    def _export_cycles(self, cycles: List[ConflictCycle],
                       output_dir: str) -> str:

        filename = os.path.join(output_dir, f"conflict_cycles_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "闭环ID", "节点列表", "边列表", "总权重",
                "检测时间", "是否已隔离", "处理建议"
            ])

            for cycle in cycles:
                writer.writerow([
                    cycle.cycle_id,
                    ", ".join(cycle.nodes),
                    "; ".join([f"{e[0]}-{e[1]}({e[2]})" for e in cycle.edges]),
                    cycle.weight,
                    cycle.detected_at,
                    "是" if cycle.isolated else "否",
                    "人工复核后重新分配或单独成组"
                ])

        return filename

    def _export_coloring_result(self, coloring_result: ColoringResult,
                                graph: ConflictGraph,
                                output_dir: str) -> str:

        filename = os.path.join(output_dir, f"coloring_result_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "学生ID", "颜色编号", "颜色标签", "置信度",
                "回溯次数", "是否覆盖", "覆盖原因",
                "约束数量", "冲突违反数量", "分配时间"
            ])

            for student_id, assignment in coloring_result.assignments.items():
                violation_count = sum(
                    1 for c in assignment.constraints
                    if c.get("type") == "conflict_violation"
                )

                writer.writerow([
                    student_id,
                    assignment.color,
                    assignment.color_label,
                    assignment.confidence,
                    assignment.backtrack_count,
                    "是" if assignment.is_override else "否",
                    assignment.override_reason,
                    len(assignment.constraints),
                    violation_count,
                    assignment.assigned_at.isoformat()
                ])

        dist_filename = os.path.join(output_dir, f"color_distribution_{self.export_timestamp}.csv")
        with open(dist_filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(["颜色编号", "颜色标签", "学生数量", "学生列表"])
            for color, students in sorted(coloring_result.color_classes.items()):
                label = coloring_result.assignments[students[0]].color_label if students else f"组{color+1}"
                writer.writerow([color, label, len(students), ", ".join(students)])

        return filename

    def _export_traceability(self, trace_manager: TraceabilityManager,
                             output_dir: str) -> str:

        filename = os.path.join(output_dir, f"traceability_index_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "学生ID", "追溯记录数", "约束数", "换座次数",
                "包含的追溯类型", "数据一致性状态",
                "最近换座时间", "最近换座原因",
                "完整追溯链接"
            ])

            for student_id in trace_manager.trace_chains:
                summary = trace_manager.get_trace_summary(student_id)
                if summary is None:
                    continue

                last_change = summary.get("last_change")
                writer.writerow([
                    student_id,
                    summary["record_count"],
                    summary["constraint_count"],
                    summary["change_count"],
                    ", ".join(summary["trace_types"]),
                    summary["consistency_status"]["status"],
                    last_change.get("timestamp") if last_change else "",
                    last_change.get("change_reason") if last_change else "",
                    f"trace://{student_id}"
                ])

        if self.config.INCLUDE_TRACE_IN_EXPORT:
            details = trace_manager.export_all_traces(include_details=False)
            json_filename = os.path.join(output_dir, f"traceability_details_{self.export_timestamp}.json")
            with open(json_filename, 'w', encoding='utf-8') as f:
                json.dump(details, f, ensure_ascii=False, indent=2)
            return json_filename

        return filename

    def _export_review_queue(self, seating_plan: SeatingPlan,
                             trace_manager: TraceabilityManager,
                             graph: ConflictGraph,
                             output_dir: str) -> str:

        review_items = defaultdict(list)

        from .seating import SeatAllocator
        allocator = SeatAllocator(self.config)
        review_data = allocator.filter_for_review(
            seating_plan,
            ["capacity", "leave", "conflict", "override"]
        )

        issues = trace_manager.get_all_students_with_issues()
        for issue in issues:
            review_items["trace_issues"].append(issue)

        for category, items in review_data.items():
            review_items[category] = items

        filename = os.path.join(output_dir, f"review_queue_{self.export_timestamp}.csv")

        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "审核类别", "学生ID", "相关班级",
                "问题描述", "严重程度", "建议操作",
                "追溯链接"
            ])

            for student_id, assignment in seating_plan.assignments.items():
                if assignment.conflict_warnings:
                    for warning in assignment.conflict_warnings:
                        severity = "high" if "严重" in warning else "medium"
                        writer.writerow([
                            "conflict_warnings",
                            student_id,
                            assignment.class_name,
                            warning,
                            severity,
                            "检查冲突原因，考虑调整",
                            f"trace://{student_id}"
                        ])

                if assignment.is_leave_override:
                    writer.writerow([
                        "leave_overrides",
                        student_id,
                        assignment.class_name,
                        assignment.override_reason,
                        "medium",
                        "确认请假补位是否合理",
                        f"trace://{student_id}"
                    ])

            if "capacity_issues" in review_data:
                for issue in review_data["capacity_issues"]:
                    writer.writerow([
                        "capacity_issues",
                        issue.get("student_id", ""),
                        issue.get("class_name", issue.get("class_id", "")),
                        issue.get("suggested_action", str(issue)),
                        issue.get("severity", "warning"),
                        issue.get("suggested_action", "复核容量"),
                        f"trace://{issue.get('student_id', 'class')}"
                    ])

            if "leave_shortages" in review_data:
                for issue in review_data["leave_shortages"]:
                    writer.writerow([
                        "leave_shortages",
                        "",
                        "",
                        f"日期 {issue['date']}: 缺席{len(issue['absent'])}人, 补位{len(issue['substitutes'])}人, 缺口{issue['shortage']}人",
                        "high" if issue["shortage"] > 5 else "medium",
                        "人工复核并补充学生或临时合班",
                        "trace://leave_management"
                    ])

        return filename

    def _export_summary(self, students: List[Student],
                        graph: ConflictGraph,
                        coloring_result: ColoringResult,
                        seating_plan: SeatingPlan,
                        anomalies: List[DataAnomaly],
                        cycles: List[ConflictCycle],
                        trace_manager: TraceabilityManager,
                        output_dir: str) -> str:

        summary = {
            "export_timestamp": self.export_timestamp,
            "dataset_summary": {
                "total_students": len(students),
                "valid_students": sum(1 for s in students if s.is_valid),
                "invalid_students": sum(1 for s in students if not s.is_valid),
                "students_with_leave": sum(1 for s in students if s.leave_records),
                "students_with_conflicts": sum(1 for s in students if s.conflict_with),
                "students_with_special_needs": sum(1 for s in students if s.special_needs)
            },
            "graph_summary": graph.summary(),
            "coloring_summary": {
                "algorithm": coloring_result.algorithm,
                "success": coloring_result.success,
                "colors_used": coloring_result.colors_used,
                "uncolored_nodes": len(coloring_result.uncolored_nodes),
                "backtrack_count": coloring_result.backtrack_count,
                "cycles_found": len(coloring_result.cycles_found),
                "cycles_isolated": len(coloring_result.isolated_cycles),
                "color_distribution": coloring_result.get_color_distribution()
            },
            "seating_summary": seating_plan.get_utilization_report(),
            "anomaly_summary": {
                "total_anomalies": len(anomalies),
                "errors": sum(1 for a in anomalies if a.severity == "error"),
                "warnings": sum(1 for a in anomalies if a.severity == "warning"),
                "info": sum(1 for a in anomalies if a.severity == "info"),
                "anomaly_types": list(set(a.anomaly_type for a in anomalies))
            },
            "cycle_summary": {
                "total_cycles": len(cycles),
                "isolated_cycles": sum(1 for c in cycles if c.isolated),
                "cycle_details": [c.to_dict() for c in cycles]
            },
            "traceability_summary": trace_manager.get_trace_statistics()
        }

        filename = os.path.join(output_dir, f"run_summary_{self.export_timestamp}.json")
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(summary, f, ensure_ascii=False, indent=2)

        txt_filename = os.path.join(output_dir, f"run_summary_{self.export_timestamp}.txt")
        with open(txt_filename, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write("图论社团排座位 - 运行摘要报告\n")
            f.write(f"生成时间: {datetime.now().isoformat()}\n")
            f.write("=" * 60 + "\n\n")

            f.write("1. 数据集概览\n")
            f.write("-" * 40 + "\n")
            for k, v in summary["dataset_summary"].items():
                f.write(f"  {k}: {v}\n")
            f.write("\n")

            f.write("2. 冲突图统计\n")
            f.write("-" * 40 + "\n")
            for k, v in summary["graph_summary"].items():
                f.write(f"  {k}: {v}\n")
            f.write("\n")

            f.write("3. 图着色结果\n")
            f.write("-" * 40 + "\n")
            for k, v in summary["coloring_summary"].items():
                if k != "color_distribution":
                    f.write(f"  {k}: {v}\n")
            f.write(f"  颜色分布: {summary['coloring_summary']['color_distribution']}\n")
            f.write("\n")

            f.write("4. 座位分配概览\n")
            f.write("-" * 40 + "\n")
            f.write(f"  总学生数: {summary['seating_summary']['total_students']}\n")
            f.write(f"  总容量: {summary['seating_summary']['total_capacity']}\n")
            f.write(f"  整体利用率: {summary['seating_summary']['overall_utilization']:.2%}\n")
            f.write(f"  未分配学生: {summary['seating_summary']['unassigned']}\n")
            for cid, info in summary["seating_summary"]["by_class"].items():
                f.write(f"  {cid} ({info['class_name']}): {info['current']}/{info['max']} "
                       f"({info['utilization']:.2%})\n")
            f.write("\n")

            f.write("5. 数据异常统计\n")
            f.write("-" * 40 + "\n")
            for k, v in summary["anomaly_summary"].items():
                f.write(f"  {k}: {v}\n")
            f.write("\n")

            f.write("6. 冲突闭环统计\n")
            f.write("-" * 40 + "\n")
            f.write(f"  检测到闭环: {summary['cycle_summary']['total_cycles']}\n")
            f.write(f"  已隔离闭环: {summary['cycle_summary']['isolated_cycles']}\n")
            f.write("\n")

            f.write("7. 追溯链路统计\n")
            f.write("-" * 40 + "\n")
            for k, v in summary["traceability_summary"].items():
                f.write(f"  {k}: {v}\n")
            f.write("\n")

            f.write("=" * 60 + "\n")
            f.write("报告生成完毕，请检查各导出文件\n")
            f.write("=" * 60 + "\n")

        return txt_filename

    def _generate_consistency_report(self, students: List[Student],
                                     graph: ConflictGraph,
                                     coloring_result: ColoringResult,
                                     seating_plan: SeatingPlan,
                                     trace_manager: TraceabilityManager,
                                     output_dir: str):

        inconsistencies = []
        verified_count = 0

        for student in students:
            if not student.is_valid:
                continue
            result = trace_manager.verify_end_to_end(
                student, graph, coloring_result, seating_plan
            )
            if result["overall_status"] == "FAIL":
                inconsistencies.append(result)
            verified_count += 1

        filename = os.path.join(output_dir, f"consistency_report_{self.export_timestamp}.csv")
        with open(filename, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                "学生ID", "整体状态", "问题数量", "问题描述",
                "数据一致性状态", "追溯可用"
            ])

            for inc in inconsistencies:
                writer.writerow([
                    inc["student_id"],
                    inc["overall_status"],
                    len(inc["issues"]),
                    "; ".join(inc["issues"]),
                    inc["data_consistency"]["status"],
                    "是" if inc["full_trace_available"] else "否"
                ])

        summary_filename = os.path.join(output_dir, f"consistency_summary_{self.export_timestamp}.txt")
        with open(summary_filename, 'w', encoding='utf-8') as f:
            f.write("端到端一致性校验报告\n")
            f.write("=" * 50 + "\n")
            f.write(f"校验学生数: {verified_count}\n")
            f.write(f"通过校验: {verified_count - len(inconsistencies)}\n")
            f.write(f"存在问题: {len(inconsistencies)}\n")
            f.write(f"通过率: {(verified_count - len(inconsistencies)) / max(1, verified_count):.2%}\n")
            f.write("\n")

            if inconsistencies:
                f.write("存在问题的学生:\n")
                for inc in inconsistencies[:20]:
                    f.write(f"  {inc['student_id']}: {'; '.join(inc['issues'])}\n")
                if len(inconsistencies) > 20:
                    f.write(f"  ... 还有 {len(inconsistencies) - 20} 条记录\n")

        return filename

    def get_student_export_row(self, student_id: str,
                               students: List[Student],
                               seating_plan: SeatingPlan,
                               coloring_result: ColoringResult,
                               trace_manager: TraceabilityManager) -> Optional[Dict[str, Any]]:

        student = next((s for s in students if s.student_id == student_id), None)
        if student is None:
            return None

        assignment = seating_plan.assignments.get(student_id)
        color_assign = coloring_result.assignments.get(student_id)
        trace = trace_manager.get_trace_summary(student_id)
        consistency = trace_manager._check_consistency(student_id)

        return {
            "student_id": student_id,
            "name": student.name,
            "grade": student.grade,
            "class": assignment.class_name if assignment else "未分配",
            "seat_number": assignment.seat_number if assignment else None,
            "color_group": color_assign.color if color_assign else None,
            "conflicts": student.conflict_with,
            "leave_records": [lr.to_dict() for lr in student.leave_records],
            "is_override": assignment.is_leave_override if assignment else False,
            "override_reason": assignment.override_reason if assignment else "",
            "data_line": student.data_line_number,
            "data_hash": student.get_data_hash(),
            "consistency_status": consistency["status"],
            "trace_available": trace is not None
        }
