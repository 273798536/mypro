import json
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from ..models import (
    NavigationResult,
    RouteStatus,
    CampusGraph,
    AccessibilityProfile,
)
from ..core import NavigationService


class ReportGenerator:
    def __init__(self, service: NavigationService):
        self.service = service

    def generate_full_report(
        self,
        result: NavigationResult,
        include_traces: bool = True,
    ) -> Dict[str, Any]:
        validation = self.service.validate_data()
        consistency = self.service.verify_consistency(result)
        edit_impacts = self.service.get_manual_edit_impacts(result)
        graph_stats = self.service.get_graph_stats()

        report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "request_id": result.request_id,
                "report_version": "1.0",
            },
            "graph_statistics": graph_stats,
            "navigation_summary": self._get_navigation_summary(result),
            "route_details": self._get_route_details(result),
            "edge_length_trace": self._get_edge_length_trace(result),
            "risk_sections": {
                "direction_errors": self._format_direction_errors(result, validation),
                "expired_barriers": self._format_expired_barriers(result, validation),
                "accessibility_breakpoints": self._format_accessibility_breakpoints(result, validation),
                "manual_edit_impacts": edit_impacts,
            },
            "data_validation": validation,
            "consistency_check": consistency,
        }

        if include_traces:
            report["trace_entries"] = [t.to_dict() for t in result.trace_entries]

        return report

    def _get_navigation_summary(self, result: NavigationResult) -> Dict[str, Any]:
        start_node = self.service.graph.get_node(result.start_node) if self.service.graph else None
        end_node = self.service.graph.get_node(result.end_node) if self.service.graph else None

        return {
            "request_id": result.request_id,
            "status": result.status.value,
            "start_node_id": result.start_node,
            "start_node_name": start_node.name if start_node else result.start_node,
            "start_node_source": start_node.source_file if start_node else None,
            "end_node_id": result.end_node,
            "end_node_name": end_node.name if end_node else result.end_node,
            "end_node_source": end_node.source_file if end_node else None,
            "total_distance_meters": round(result.total_distance, 2),
            "estimated_time_minutes": round(result.estimated_time / 60, 1),
            "total_segments": len(result.route_segments),
            "total_nodes": len(result.node_sequence),
            "has_warnings": len(result.warnings) > 0,
            "has_errors": len(result.errors) > 0,
            "warnings": result.warnings,
            "errors": result.errors,
            "accessibility_profile": result.accessibility_profile,
        }

    def _get_route_details(self, result: NavigationResult) -> List[Dict[str, Any]]:
        details = []
        for i, segment in enumerate(result.route_segments):
            from_node = self.service.graph.get_node(segment.from_node) if self.service.graph else None
            to_node = self.service.graph.get_node(segment.to_node) if self.service.graph else None

            segment_detail = {
                "segment_index": i,
                "edge_id": segment.edge_id,
                "edge_source_file": segment.edge_source_file,
                "edge_source_line": segment.edge_source_line,
                "from_node_id": segment.from_node,
                "from_node_name": from_node.name if from_node else segment.from_node,
                "to_node_id": segment.to_node,
                "to_node_name": to_node.name if to_node else segment.to_node,
                "length_meters": segment.length,
                "direction": segment.direction,
                "accessibility_tags": segment.accessibility_tags,
                "node_coordinates": {
                    "from": {"x": from_node.x, "y": from_node.y} if from_node else None,
                    "to": {"x": to_node.x, "y": to_node.y} if to_node else None,
                },
            }

            flags = []
            if segment.has_barrier:
                flags.append("has_barrier")
            if segment.has_accessibility_issue:
                flags.append("has_accessibility_issue")
            if segment.has_manual_edit:
                flags.append("has_manual_edit")
            segment_detail["flags"] = flags

            if segment.has_barrier:
                segment_detail["barrier_id"] = segment.barrier_id
                barrier = self.service.graph.barriers.get(segment.barrier_id) if self.service.graph else None
                if barrier:
                    segment_detail["barrier_detail"] = {
                        "reason": barrier.reason,
                        "start_date": barrier.start_date.isoformat(),
                        "end_date": barrier.end_date.isoformat(),
                        "is_expired": barrier.is_expired(),
                        "status": barrier.status.value,
                        "source_file": barrier.source_file,
                        "source_line": barrier.source_line,
                    }

            if segment.has_accessibility_issue:
                segment_detail["accessibility_issue_ids"] = segment.accessibility_issue_ids

            if segment.has_manual_edit:
                segment_detail["manual_edit_ids"] = segment.edit_ids

            details.append(segment_detail)

        return details

    def _get_edge_length_trace(self, result: NavigationResult) -> List[Dict[str, Any]]:
        return result.edge_length_trace

    def _format_direction_errors(
        self,
        result: NavigationResult,
        validation: Dict[str, Any],
    ) -> Dict[str, Any]:
        route_direction_errors = [
            e for e in result.direction_errors
            if e.get("from_node") in result.node_sequence or e.get("to_node") in result.node_sequence
        ]

        all_direction_errors = validation.get("direction_errors", [])

        return {
            "summary": {
                "total_direction_errors": len(all_direction_errors),
                "affecting_route": len(route_direction_errors),
                "high_severity": sum(1 for e in all_direction_errors if e.get("severity") == "high"),
            },
            "errors_affecting_route": route_direction_errors,
            "all_direction_errors": all_direction_errors,
        }

    def _format_expired_barriers(
        self,
        result: NavigationResult,
        validation: Dict[str, Any],
    ) -> Dict[str, Any]:
        all_barrier_issues = validation.get("expired_barriers", [])
        expired_barriers = [b for b in all_barrier_issues if "已过期" in b.get("message", "")]
        route_barrier_issues = [
            b for b in result.barrier_issues
            if b.get("edge_id") in [s.edge_id for s in result.route_segments]
        ]

        return {
            "summary": {
                "total_barrier_issues": len(all_barrier_issues),
                "expired_barriers": len(expired_barriers),
                "affecting_route": len(route_barrier_issues),
            },
            "expired_barriers_detail": expired_barriers,
            "barriers_affecting_route": route_barrier_issues,
            "all_barrier_issues": all_barrier_issues,
        }

    def _format_accessibility_breakpoints(
        self,
        result: NavigationResult,
        validation: Dict[str, Any],
    ) -> Dict[str, Any]:
        all_accessibility_issues = validation.get("accessibility_breakpoints", [])
        route_accessibility_issues = [
            a for a in result.accessibility_breakpoints
            if a.get("edge_id") in [s.edge_id for s in result.route_segments]
        ]

        high_severity = [a for a in all_accessibility_issues if a.get("severity", 0) >= 4]
        moderate_severity = [a for a in all_accessibility_issues if 2 <= a.get("severity", 0) < 4]
        low_severity = [a for a in all_accessibility_issues if a.get("severity", 0) < 2]

        return {
            "summary": {
                "total_accessibility_issues": len(all_accessibility_issues),
                "high_severity": len(high_severity),
                "moderate_severity": len(moderate_severity),
                "low_severity": len(low_severity),
                "affecting_route": len(route_accessibility_issues),
            },
            "high_severity_issues": high_severity,
            "moderate_severity_issues": moderate_severity,
            "low_severity_issues": low_severity,
            "issues_affecting_route": route_accessibility_issues,
        }

    def generate_cli_text(
        self,
        result: NavigationResult,
        validation: Optional[Dict[str, Any]] = None,
        show_traces: bool = False,
    ) -> str:
        if validation is None:
            validation = self.service.validate_data()

        lines = []
        lines.append("=" * 80)
        lines.append("Dijkstra校园导航系统 - 导航报告")
        lines.append("=" * 80)
        lines.append(f"报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append(f"请求ID: {result.request_id}")
        lines.append("")

        start_node = self.service.graph.get_node(result.start_node) if self.service.graph else None
        end_node = self.service.graph.get_node(result.end_node) if self.service.graph else None

        lines.append("【导航概要】")
        lines.append("-" * 80)
        lines.append(f"  状态: {'✓ 成功' if result.status == RouteStatus.SUCCESS else '⚠ 有警告' if result.status == RouteStatus.HAS_WARNINGS else '✗ 失败'}")
        lines.append(f"  起点: {result.start_node} - {start_node.name if start_node else '未知'}")
        if start_node:
            lines.append(f"        来源: {start_node.source_file}:{start_node.source_line}")
        lines.append(f"  终点: {result.end_node} - {end_node.name if end_node else '未知'}")
        if end_node:
            lines.append(f"        来源: {end_node.source_file}:{end_node.source_line}")
        lines.append(f"  总距离: {result.total_distance:.2f} 米")
        lines.append(f"  预计时间: {result.estimated_time / 60:.1f} 分钟")
        lines.append(f"  路段数: {len(result.route_segments)}")
        lines.append(f"  节点数: {len(result.node_sequence)}")
        lines.append("")

        if result.warnings:
            lines.append("【警告信息】")
            lines.append("-" * 80)
            for warning in result.warnings:
                lines.append(f"  ⚠ {warning}")
            lines.append("")

        if result.errors:
            lines.append("【错误信息】")
            lines.append("-" * 80)
            for error in result.errors:
                lines.append(f"  ✗ {error}")
            lines.append("")

        lines.append("【路线明细】")
        lines.append("-" * 80)
        lines.append(f"  节点序列: {' → '.join(result.node_sequence)}")
        lines.append("")
        lines.append(f"  {'序号':<4} {'边ID':<8} {'起点→终点':<30} {'长度(m)':<8} {'方向':<12} 标签")
        lines.append("  " + "-" * 76)

        for i, segment in enumerate(result.route_segments):
            from_node = self.service.graph.get_node(segment.from_node) if self.service.graph else None
            to_node = self.service.graph.get_node(segment.to_node) if self.service.graph else None
            from_name = from_node.name if from_node else segment.from_node
            to_name = to_node.name if to_node else segment.to_node

            flags = []
            if segment.has_barrier:
                flags.append("⚠围挡")
            if segment.has_accessibility_issue:
                flags.append("⚡无障碍")
            if segment.has_manual_edit:
                flags.append("✎人工修改")

            flag_str = f" [{', '.join(flags)}]" if flags else ""

            lines.append(f"  {i:<4} {segment.edge_id:<8} {from_name}→{to_name:<20} {segment.length:<8.1f} {segment.direction:<12} {','.join(segment.accessibility_tags)}{flag_str}")
            if segment.edge_source_file:
                lines.append(f"       来源: {segment.edge_source_file}:{segment.edge_source_line}")

        lines.append("")

        lines.append("【边长度追踪】")
        lines.append("-" * 80)
        lines.append(f"  {'序号':<4} {'边ID':<8} {'起点→终点':<30} {'报告长度':<10} {'实际长度':<10} 匹配")
        lines.append("  " + "-" * 70)

        for trace in result.edge_length_trace:
            match_str = "✓" if trace.get("length_match") else "✗"
            from_name = trace.get("from_node_name", trace["from_node_id"])
            to_name = trace.get("to_node_name", trace["to_node_id"])
            reported = trace.get("reported_length", 0)
            actual = trace.get("actual_edge_length", 0)

            lines.append(f"  {trace['segment_index']:<4} {trace['edge_id']:<8} {from_name}→{to_name:<20} {reported:<10.1f} {actual:<10.1f} {match_str}")
            if trace.get("edge_source_file"):
                lines.append(f"       来源: {trace['edge_source_file']}:{trace['edge_source_line']}")

        lines.append("")

        dir_errors = validation.get("direction_errors", [])
        if dir_errors:
            lines.append("【边方向错误】")
            lines.append("-" * 80)
            lines.append(f"  总计: {len(dir_errors)} 个问题")
            lines.append("")
            for i, error in enumerate(dir_errors, 1):
                severity = "高危" if error.get("severity") == "high" else "中危" if error.get("severity") == "medium" else "低危"
                lines.append(f"  {i}. [{severity}] {error.get('error_type', 'unknown')}")
                lines.append(f"     边: {error.get('edge_id')} ({error.get('from_node')} → {error.get('to_node')})")
                lines.append(f"     方向: {error.get('direction')}")
                lines.append(f"     说明: {error.get('message')}")
                if error.get("source_file"):
                    lines.append(f"     来源: {error['source_file']}:{error.get('source_line', '?')}")
                lines.append("")

        barrier_issues = validation.get("expired_barriers", [])
        expired = [b for b in barrier_issues if "已过期" in b.get("message", "")]
        if barrier_issues:
            lines.append("【围挡问题】")
            lines.append("-" * 80)
            lines.append(f"  总计: {len(barrier_issues)} 个问题，其中过期: {len(expired)} 个")
            lines.append("")

            if expired:
                lines.append("  过期围挡明细:")
                for i, barrier in enumerate(expired, 1):
                    lines.append(f"  {i}. [过期{barrier.get('days_expired', '?')}天] {barrier.get('barrier_id')}")
                    lines.append(f"     边: {barrier.get('edge_id')}")
                    lines.append(f"     原因: {barrier.get('reason')}")
                    lines.append(f"     起止: {barrier.get('start_date')} ~ {barrier.get('end_date')}")
                    lines.append(f"     当前状态: {barrier.get('current_status')} (应为: {barrier.get('calculated_status')})")
                    lines.append(f"     说明: {barrier.get('message')}")
                    if barrier.get("source_file"):
                        lines.append(f"     来源: {barrier['source_file']}:{barrier.get('source_line', '?')}")
                    lines.append("")

            other_barriers = [b for b in barrier_issues if "已过期" not in b.get("message", "")]
            if other_barriers:
                lines.append("  其他围挡问题:")
                for i, barrier in enumerate(other_barriers, 1):
                    lines.append(f"  {i}. {barrier.get('barrier_id')} - {barrier.get('message')}")
                    if barrier.get("source_file"):
                        lines.append(f"     来源: {barrier['source_file']}:{barrier.get('source_line', '?')}")
                lines.append("")

        acc_issues = validation.get("accessibility_breakpoints", [])
        if acc_issues:
            lines.append("【无障碍断点】")
            lines.append("-" * 80)
            high = [a for a in acc_issues if a.get("severity", 0) >= 4]
            mid = [a for a in acc_issues if 2 <= a.get("severity", 0) < 4]
            low = [a for a in acc_issues if a.get("severity", 0) < 2]
            lines.append(f"  总计: {len(acc_issues)} 个问题")
            lines.append(f"  严重: {len(high)} | 中等: {len(mid)} | 轻微: {len(low)}")
            lines.append("")

            if high:
                lines.append("  严重无障碍问题 (严重度≥4):")
                for i, issue in enumerate(high, 1):
                    lines.append(f"  {i}. [严重度{issue.get('severity')}] {issue.get('issue_id')}")
                    lines.append(f"     边: {issue.get('edge_id')} ({issue.get('from_node')} → {issue.get('to_node')})")
                    lines.append(f"     类型: {issue.get('issue_type_detail')}")
                    lines.append(f"     说明: {issue.get('description')}")
                    lines.append(f"     位置: {issue.get('location_detail')}")
                    if issue.get("source_file"):
                        lines.append(f"     来源: {issue['source_file']}:{issue.get('source_line', '?')}")
                    lines.append("")

            if mid:
                lines.append("  中等无障碍问题 (严重度2-3):")
                for i, issue in enumerate(mid, 1):
                    lines.append(f"  {i}. [严重度{issue.get('severity')}] {issue.get('issue_id')} - {issue.get('description')}")
                    if issue.get("source_file"):
                        lines.append(f"     来源: {issue['source_file']}:{issue.get('source_line', '?')}")
                lines.append("")

        edit_impacts = result.manual_edit_impacts
        weight_overrides = self.service.router.get_weight_overrides() if self.service.router else {}
        removed_edges = list(self.service.router.get_removed_edges()) if self.service.router else []

        if edit_impacts or weight_overrides or removed_edges:
            lines.append("【人工修改影响】")
            lines.append("-" * 80)
            lines.append(f"  人工修改总数: {len(edit_impacts)} 条")
            if weight_overrides:
                lines.append(f"  权重覆盖生效: {len(weight_overrides)} 条")
                for eid, w in weight_overrides.items():
                    lines.append(f"    - 边 {eid}: 权重覆盖为 {w}")
            if removed_edges:
                lines.append(f"  已移除边: {len(removed_edges)} 条")
                for eid in removed_edges:
                    lines.append(f"    - 边 {eid}: 已被人工移除")
            lines.append("")

            route_edge_ids = {s.edge_id for s in result.route_segments}
            on_route = [imp for imp in edit_impacts if imp.get("edge_id") in route_edge_ids]
            off_route = [imp for imp in edit_impacts if imp.get("edge_id") not in route_edge_ids]

            if on_route:
                lines.append("  影响当前路线的修改:")
                for i, impact in enumerate(on_route, 1):
                    lines.append(f"  {i}. {impact.get('edit_id')} - {impact.get('edit_type')}")
                    if impact.get("edge_id"):
                        lines.append(f"     边: {impact.get('edge_id')} ({impact.get('from_node', '?')} → {impact.get('to_node', '?')})")
                    lines.append(f"     修改人: {impact.get('editor')}")
                    lines.append(f"     修改时间: {impact.get('edit_time')}")
                    lines.append(f"     原因: {impact.get('reason')}")
                    lines.append(f"     原值: {impact.get('old_value')} → 新值: {impact.get('new_value')}")
                    if impact.get("source_file"):
                        lines.append(f"     来源: {impact['source_file']}:{impact.get('source_line', '?')}")
                    lines.append("")

            if off_route:
                lines.append("  全局人工修改（不限于当前路线）:")
                for i, impact in enumerate(off_route, 1):
                    target_desc = impact.get("target_id", "?")
                    aff_edges = impact.get("affected_edge_ids", [])
                    aff_nodes = impact.get("affected_node_ids", [])
                    lines.append(f"  {i}. {impact.get('edit_id')} - {impact.get('edit_type')}")
                    lines.append(f"     目标: {target_desc}")
                    if aff_edges:
                        lines.append(f"     受影响边: {aff_edges}")
                    if aff_nodes:
                        lines.append(f"     受影响节点: {aff_nodes}")
                    lines.append(f"     修改人: {impact.get('editor')}")
                    lines.append(f"     修改时间: {impact.get('edit_time')}")
                    lines.append(f"     原因: {impact.get('reason')}")
                    lines.append(f"     原值: {impact.get('old_value')} → 新值: {impact.get('new_value')}")
                    if impact.get("source_file"):
                        lines.append(f"     来源: {impact['source_file']}:{impact.get('source_line', '?')}")
                    lines.append("")

        if show_traces and result.trace_entries:
            lines.append("【溯源追踪】")
            lines.append("-" * 80)
            for i, trace in enumerate(result.trace_entries, 1):
                lines.append(f"  {i}. {trace.source_type}({trace.source_id}) → {trace.target_type}({trace.target_id})")
                lines.append(f"     关系: {trace.relationship}")
                if trace.metadata:
                    lines.append(f"     元数据: {trace.metadata}")
            lines.append("")

        consistency = self.service.verify_consistency(result)
        lines.append("【一致性校验】")
        lines.append("-" * 80)
        lines.append(f"  报告总距离: {consistency.get('result_total_distance', 0):.2f} 米")
        lines.append(f"  累计路段距离: {consistency.get('total_reported_distance', 0):.2f} 米")
        lines.append(f"  实际边长度和: {consistency.get('total_actual_distance', 0):.2f} 米")
        lines.append(f"  距离匹配: {'✓ 是' if consistency.get('total_distance_match') else '✗ 否'}")
        if consistency.get("inconsistencies"):
            lines.append(f"  不一致项: {consistency.get('inconsistency_count')} 处")
            for inc in consistency["inconsistencies"]:
                lines.append(f"    - 边 {inc['edge_id']}: 报告{inc['reported_length']} ≠ 实际{inc['actual_length']}")
                if inc.get("source_file"):
                    lines.append(f"      来源: {inc['source_file']}:{inc.get('source_line', '?')}")
        lines.append("")

        lines.append("=" * 80)
        return "\n".join(lines)

    def save_json_report(
        self,
        result: NavigationResult,
        output_path: str,
        include_traces: bool = True,
    ) -> str:
        report = self.generate_full_report(result, include_traces)

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(report, f, ensure_ascii=False, indent=2)

        return output_path

    def save_cli_report(
        self,
        result: NavigationResult,
        output_path: str,
        show_traces: bool = False,
    ) -> str:
        text = self.generate_cli_text(result, show_traces=show_traces)

        os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)

        return output_path
