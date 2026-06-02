import os
import json
import csv
from datetime import datetime
from typing import List, Dict, Tuple, Optional
from collections import OrderedDict
from .models import TrainingRecord, CheckResult, Issue


class ResultExporter:
    def __init__(self, output_dir: str = "./output"):
        self.output_dir = output_dir
        os.makedirs(output_dir, exist_ok=True)
        self.export_snapshots: List[Dict] = []

    def export_all(
        self,
        records: List[TrainingRecord],
        check_results: List[CheckResult],
        advisor_result: Dict,
        process_snapshots: List[Dict],
    ) -> Dict[str, str]:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        result_map = {r.record_id: r for r in check_results}

        export_paths = {}

        self._capture_snapshot("export_start", {
            "records_count": len(records),
            "check_results_count": len(check_results),
            "timestamp": timestamp,
        })

        export_paths["parameter_comparison"] = self._export_parameter_comparison(
            records, check_results, timestamp
        )

        export_paths["issues_summary"] = self._export_issues_summary(
            check_results, advisor_result, timestamp
        )

        export_paths["failure_review"] = self._export_failure_review(
            records, check_results, timestamp
        )

        export_paths["process_audit_trail"] = self._export_process_audit_trail(
            process_snapshots, timestamp
        )

        export_paths["detailed_reports"] = self._export_detailed_per_record_reports(
            records, check_results, advisor_result, timestamp
        )

        export_paths["business_friendly_report"] = self._export_business_friendly_report(
            records, check_results, advisor_result, timestamp
        )

        export_paths["json_full"] = self._export_full_json(
            records, check_results, advisor_result, process_snapshots, timestamp
        )

        self._capture_snapshot("export_complete", {
            "export_paths": export_paths,
        })

        return export_paths

    def _export_parameter_comparison(
        self, records: List[TrainingRecord], check_results: List[CheckResult], timestamp: str
    ) -> str:
        result_map = {r.record_id: r for r in check_results}
        filename = os.path.join(self.output_dir, f"parameter_comparison_{timestamp}.csv")

        rows = []
        for record in records:
            cr = result_map.get(record.record_id)
            if not cr:
                continue

            loss_values = sorted(record.loss_history, key=lambda x: x.iteration)
            initial_loss = loss_values[0].loss_value if loss_values else None
            final_loss = loss_values[-1].loss_value if loss_values else None
            loss_drop = initial_loss - final_loss if initial_loss and final_loss else None
            loss_drop_pct = (loss_drop / initial_loss * 100) if initial_loss and loss_drop is not None else None

            has_lr_issue = any(i.issue_type.value == "learning_rate_explosion" for i in cr.issues)
            has_local_min = any(i.issue_type.value == "local_minimum" for i in cr.issues)
            has_iter_issue = any(i.issue_type.value == "insufficient_iterations" for i in cr.issues)

            overall_status = "正常"
            if has_iter_issue:
                overall_status = "⚠️ 迭代不足"
            elif has_lr_issue:
                overall_status = "❌ 学习率爆炸"
            elif has_local_min:
                overall_status = "⚠️ 局部极小"
            elif not cr.learning_rate_ok or not cr.convergence_ok or not cr.iteration_ok:
                overall_status = "⚠️ 有问题"

            rows.append({
                "班级名称": record.class_name,
                "原始班级名": record.original_class_name,
                "损失函数": record.loss_function,
                "损失函数备注": record.loss_function_note,
                "学习率": record.learning_rate if record.learning_rate is not None else "缺失",
                "学习率来源": record.learning_rate_source,
                "预期迭代数": record.iterations if record.iterations > 0 else "未填写",
                "实际迭代数": len(loss_values),
                "初始损失": f"{initial_loss:.6f}" if initial_loss is not None else "",
                "最终损失": f"{final_loss:.6f}" if final_loss is not None else "",
                "损失下降值": f"{loss_drop:.6f}" if loss_drop is not None else "",
                "下降幅度(%)": f"{loss_drop_pct:.1f}%" if loss_drop_pct is not None else "",
                "学习率正常": "是" if cr.learning_rate_ok else "否",
                "收敛正常": "是" if cr.convergence_ok else "否",
                "迭代足够": "是" if cr.iteration_ok else "否",
                "整体状态": overall_status,
                "问题数量": len(cr.issues),
                "数据来源": record.source_file,
                "记录ID": record.record_id,
            })

        with open(filename, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys() if rows else [])
            writer.writeheader()
            writer.writerows(rows)

        return filename

    def _export_issues_summary(
        self, check_results: List[CheckResult], advisor_result: Dict, timestamp: str
    ) -> str:
        filename = os.path.join(self.output_dir, f"issues_summary_{timestamp}.csv")

        all_issues = []
        for cr in check_results:
            for issue in cr.issues:
                all_issues.append({
                    "班级名称": issue.class_name,
                    "问题类型": self._format_issue_type(issue.issue_type.value),
                    "严重程度": self._format_severity(issue.severity),
                    "问题描述": issue.message,
                    "修正建议": issue.suggestion,
                    "涉及材料/对象": issue.details.get("material", ""),
                    "详细信息": json.dumps(issue.details, ensure_ascii=False),
                    "记录ID": issue.record_id,
                })

        with open(filename, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.DictWriter(
                f,
                fieldnames=["班级名称", "问题类型", "严重程度", "问题描述", "修正建议",
                           "涉及材料/对象", "详细信息", "记录ID"]
            )
            writer.writeheader()
            writer.writerows(all_issues)

        return filename

    def _export_failure_review(
        self, records: List[TrainingRecord], check_results: List[CheckResult], timestamp: str
    ) -> str:
        result_map = {r.record_id: r for r in check_results}
        filename = os.path.join(self.output_dir, f"failure_review_{timestamp}.md")

        lines = [
            "# 失败案例回看手册",
            "",
            f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"> 分析记录数：{len(records)}",
            f"> 有问题记录数：{sum(1 for cr in check_results if cr.issues)}",
            "",
            "---",
            "",
        ]

        failure_cases = [
            (record, cr) for record, cr in zip(records, check_results)
            if cr.issues
        ]

        if not failure_cases:
            lines.append("✅ 所有记录均通过检查，没有失败案例。")
        else:
            for idx, (record, cr) in enumerate(failure_cases, start=1):
                lines.append(f"## 案例 {idx}：{record.class_name}")
                lines.append("")
                lines.append(f"**数据来源**：{record.source_file}")
                lines.append(f"**记录ID**：{record.record_id}")
                lines.append("")

                lines.append("### 基本参数")
                lines.append("")
                lines.append("| 参数 | 值 |")
                lines.append("|------|-----|")
                lines.append(f"| 损失函数 | {record.loss_function}" + (f"（备注：{record.loss_function_note}）" if record.loss_function_note else "") + " |")
                lines.append(f"| 学习率 | {record.learning_rate if record.learning_rate is not None else '❌ 缺失'} |")
                lines.append(f"| 预期迭代数 | {record.iterations if record.iterations > 0 else '未填写'} |")
                lines.append(f"| 实际迭代数 | {len(record.loss_history)} |")
                if record.loss_history:
                    loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
                    lines.append(f"| 初始损失 | {loss_vals[0].loss_value:.6f} |")
                    lines.append(f"| 最终损失 | {loss_vals[-1].loss_value:.6f} |")
                lines.append("")

                lines.append("### 问题列表")
                lines.append("")
                for issue_idx, issue in enumerate(cr.issues, start=1):
                    lines.append(f"#### 问题 {issue_idx}：{self._format_issue_type(issue.issue_type.value)} "
                               f"（{self._format_severity(issue.severity)}）")
                    lines.append("")
                    lines.append(f"**描述**：{issue.message}")
                    lines.append("")
                    if issue.details.get("material"):
                        lines.append(f"**涉及材料**：{issue.details['material']}")
                        lines.append("")
                    lines.append("**修正建议**：")
                    lines.append("")
                    for line in issue.suggestion.split("\n"):
                        lines.append(f"> {line}")
                    lines.append("")

                lines.append("### 原始损失数据")
                lines.append("")
                if record.loss_history:
                    lines.append("| 迭代 | 损失 | 原始记录 |")
                    lines.append("|------|------|----------|")
                    for h in sorted(record.loss_history, key=lambda x: x.iteration):
                        escaped_line = h.raw_line.replace("|", "\\|")
                        lines.append(f"| {h.iteration} | {h.loss_value:.6f} | {escaped_line} |")
                else:
                    lines.append("_无有效损失数据_")
                lines.append("")
                lines.append("---")
                lines.append("")

        with open(filename, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filename

    def _export_process_audit_trail(
        self, process_snapshots: List[Dict], timestamp: str
    ) -> str:
        filename = os.path.join(self.output_dir, f"process_audit_trail_{timestamp}.json")

        audit_data = {
            "generated_at": datetime.now().isoformat(),
            "snapshot_count": len(process_snapshots),
            "stages": {},
            "snapshots": process_snapshots,
        }

        for snap in process_snapshots:
            stage = snap.get("stage", "unknown")
            if stage not in audit_data["stages"]:
                audit_data["stages"][stage] = []
            audit_data["stages"][stage].append(snap)

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(audit_data, f, ensure_ascii=False, indent=2)

        return filename

    def _export_detailed_per_record_reports(
        self,
        records: List[TrainingRecord],
        check_results: List[CheckResult],
        advisor_result: Dict,
        timestamp: str
    ) -> str:
        result_map = {r.record_id: r for r in check_results}
        dir_name = os.path.join(self.output_dir, f"detailed_reports_{timestamp}")
        os.makedirs(dir_name, exist_ok=True)

        for record in records:
            cr = result_map.get(record.record_id)
            if not cr:
                continue

            safe_name = "".join(c for c in record.class_name if c.isalnum() or c in "._- ")
            filename = os.path.join(dir_name, f"{safe_name}_{record.record_id}.md")

            lines = [
                f"# {record.class_name} - 梯度下降调参详细报告",
                "",
                f"> 生成时间：{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                f"> 记录ID：{record.record_id}",
                f"> 数据来源：{record.source_file}",
                "",
                "---",
                "",
                "## 1. 基本信息",
                "",
                "| 项目 | 内容 |",
                "|------|------|",
                f"| 班级名称 | {record.class_name} |",
                f"| 原始班级名 | {record.original_class_name} |",
                f"| 损失函数 | {record.loss_function} |",
                f"| 损失函数备注 | {record.loss_function_note or '无'} |",
                f"| 学习率 | {record.learning_rate if record.learning_rate is not None else '❌ 缺失'} |",
                f"| 学习率来源 | {record.learning_rate_source} |",
                f"| 预期迭代数 | {record.iterations if record.iterations > 0 else '未填写'} |",
                f"| 实际迭代数 | {len(record.loss_history)} |",
                "",
            ]

            if cr.loss_trend:
                lines.append("## 2. 损失趋势")
                lines.append("")
                lines.append("| 迭代 | 损失 |")
                lines.append("|------|------|")
                for i, loss in enumerate(cr.loss_trend, start=1):
                    mark = ""
                    if i - 1 in cr.explosive_points:
                        mark = " 💥 爆炸点"
                    for start, end in cr.plateau_points:
                        if start <= i <= end:
                            mark = " ⛔ 平台期"
                    lines.append(f"| {i} | {loss:.6f} {mark} |")
                lines.append("")

            lines.append("## 3. 检查结果")
            lines.append("")
            lines.append("| 检查项 | 结果 |")
            lines.append("|--------|------|")
            lines.append(f"| 学习率检查 | {'✅ 通过' if cr.learning_rate_ok else '❌ 失败'} |")
            lines.append(f"| 收敛性检查 | {'✅ 通过' if cr.convergence_ok else '❌ 失败'} |")
            lines.append(f"| 迭代数检查 | {'✅ 通过' if cr.iteration_ok else '❌ 失败'} |")
            lines.append(f"| 发现问题数 | {len(cr.issues)} |")
            lines.append("")

            if cr.issues:
                lines.append("## 4. 问题详情与修正建议")
                lines.append("")
                for idx, issue in enumerate(cr.issues, start=1):
                    lines.append(f"### 4.{idx} {self._format_issue_type(issue.issue_type.value)} "
                               f"（{self._format_severity(issue.severity)}）")
                    lines.append("")
                    lines.append(f"**问题描述**：")
                    lines.append("")
                    for l in issue.message.split("\n"):
                        lines.append(f"> {l}")
                    lines.append("")
                    if issue.details.get("material"):
                        lines.append(f"**涉及材料**：{issue.details['material']}")
                        lines.append("")
                    lines.append(f"**修正建议**：")
                    lines.append("")
                    for l in issue.suggestion.split("\n"):
                        lines.append(f"> {l}")
                    lines.append("")

            lines.append("## 5. 数据完整性校验")
            lines.append("")
            lines.append("| 校验项 | 状态 | 说明 |")
            lines.append("|--------|------|------|")
            lines.append(f"| 损失函数 | {'✅ 已填写' if record.loss_function else '❌ 缺失'} | {record.loss_function or '需要补填'} |")
            lines.append(f"| 学习率 | {'✅ 已填写' if record.learning_rate is not None else '❌ 缺失'} | {record.learning_rate if record.learning_rate is not None else '需要补填'} |")
            lines.append(f"| 损失数据 | {'✅ 有效' if record.loss_history else '❌ 缺失'} | 共 {len(record.loss_history)} 条记录 |")
            lines.append(f"| 班级名称 | {'✅ 正常' if record.original_class_name == record.class_name else '⚠️ 自动命名'} | 原始：{record.original_class_name} |")
            lines.append("")

            with open(filename, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))

        return dir_name

    def _export_business_friendly_report(
        self,
        records: List[TrainingRecord],
        check_results: List[CheckResult],
        advisor_result: Dict,
        timestamp: str
    ) -> str:
        filename = os.path.join(self.output_dir, f"business_report_{timestamp}.md")
        result_map = {r.record_id: r for r in check_results}

        total = len(records)
        normal = sum(1 for cr in check_results if not cr.issues)
        has_issues = total - normal
        iter_issue_count = sum(
            1 for cr in check_results
            if any(i.issue_type.value == "insufficient_iterations" for i in cr.issues)
        )
        lr_issue_count = sum(
            1 for cr in check_results
            if any(i.issue_type.value == "learning_rate_explosion" for i in cr.issues)
        )
        local_min_count = sum(
            1 for cr in check_results
            if any(i.issue_type.value == "local_minimum" for i in cr.issues)
        )
        missing_lr_count = sum(
            1 for cr in check_results
            if any(i.issue_type.value == "missing_learning_rate" for i in cr.issues)
        )

        lines = [
            "# 梯度下降调参分析报告",
            "",
            f"> 报告日期：{datetime.now().strftime('%Y年%m月%d日')}",
            f"> 分析班级数：{total} 个",
            f"> 正常班级：{normal} 个（{normal/total*100:.0f}%）" if total > 0 else "",
            f"> 需关注班级：{has_issues} 个（{has_issues/total*100:.0f}%）" if total > 0 else "",
            "",
            "---",
            "",
            "## 一、总体情况",
            "",
        ]

        if total == 0:
            lines.append("_没有分析到任何有效数据，请检查导入的文件。_")
        else:
            lines.append(f"本次共分析了 {total} 个班级的梯度下降训练数据。")
            lines.append("")

            if has_issues == 0:
                lines.append("🎉 **好消息！所有班级的训练数据都通过了检查。**")
                lines.append("")
                lines.append("可以直接使用这些训练结果进行后续分析。")
            else:
                lines.append(f"⚠️ **发现 {has_issues} 个班级需要关注**，具体问题分布如下：")
                lines.append("")
                lines.append("| 问题类型 | 班级数 | 说明 |")
                lines.append("|----------|--------|------|")
                if iter_issue_count > 0:
                    lines.append(f"| 迭代不足 | {iter_issue_count} | 训练没跑完就停了，结果不可靠 |")
                if lr_issue_count > 0:
                    lines.append(f"| 学习率爆炸 | {lr_issue_count} | 学习率太大，损失反而上升 |")
                if local_min_count > 0:
                    lines.append(f"| 局部极小 | {local_min_count} | 模型卡在小坑里没出来 |")
                if missing_lr_count > 0:
                    lines.append(f"| 学习率缺失 | {missing_lr_count} | 记录里没填学习率 |")
                lines.append("")

            if iter_issue_count > 0:
                lines.append("## 二、重点关注：迭代不足问题")
                lines.append("")
                lines.append(
                    f"有 **{iter_issue_count} 个班级** 存在训练没跑完的问题。"
                    f"这是最容易被忽略但影响最大的问题。"
                )
                lines.append("")
                lines.append("### 什么是迭代不足？")
                lines.append("")
                lines.append(
                    "打个比方：你让学生做 100 道题来检验他有没有学会，"
                    "结果他做了 20 道就说做完了。"
                    "你没法判断他是真的全会了，还是嫌麻烦没做完。"
                )
                lines.append("")
                lines.append("梯度下降也是一样：")
                lines.append("- 前几步只是在「找方向」，还没开始「真正学习」")
                lines.append("- 如果训练提前停止，得到的不是「最优结果」，只是「走到这儿的结果」")
                lines.append("- 这样的结果会严重高估模型的训练效果")
                lines.append("")

                lines.append("### 受影响的班级")
                lines.append("")
                for record in records:
                    cr = result_map.get(record.record_id)
                    if not cr:
                        continue
                    if any(i.issue_type.value == "insufficient_iterations" for i in cr.issues):
                        actual = len(record.loss_history)
                        expected = record.iterations if record.iterations > 0 else "未填写"
                        lines.append(f"- **{record.class_name}**：实际 {actual} 轮 / 预期 {expected} 轮")
                lines.append("")

                lines.append("### 建议处理方式")
                lines.append("")
                lines.append("1. **优先处理**：这是高优先级问题，建议先补跑这些班级的训练")
                lines.append("2. **验证标准**：等损失曲线连续 10-20 轮稳定不再下降，再停止训练")
                lines.append("3. **对比验证**：补跑后的结果和当前结果对比，确认差异")
                lines.append("")

            lines.append("## 三、其他问题说明")
            lines.append("")

            if lr_issue_count > 0:
                lines.append("### 学习率爆炸")
                lines.append("")
                lines.append(
                    "学习率太大，就像下山步子迈太大，一步跨过山谷冲到对面山坡，"
                    "损失反而越来越大。"
                )
                lines.append("")
                lines.append("**建议**：把学习率降到原来的 1/10 重新训练。")
                lines.append("")

            if local_min_count > 0:
                lines.append("### 局部极小")
                lines.append("")
                lines.append(
                    "模型走到一个小坑就以为到了谷底，在坑里来回打转不肯出来。"
                )
                lines.append("")
                lines.append("**建议**：调大学习率或增加动量，帮助模型「跳出小坑」。")
                lines.append("")

            if missing_lr_count > 0:
                lines.append("### 学习率缺失")
                lines.append("")
                lines.append(
                    "就像看菜谱没写「用多大火」，没有学习率的记录无法做准确分析。"
                )
                lines.append("")
                lines.append("**建议**：查找原始训练配置，补填学习率后重新分析。")
                lines.append("")

            lines.append("## 四、后续行动建议")
            lines.append("")
            actions = advisor_result.get("prioritized_actions", [])
            if actions:
                for idx, action in enumerate(actions, start=1):
                    priority = action.get("priority", "P2")
                    priority_text = {"P0": "🔴 紧急", "P1": "🟡 重要", "P2": "🟢 一般"}.get(priority, priority)
                    lines.append(f"{idx}. **[{priority_text}]** {action.get('message', '')}")
                    affected = action.get("affected_classes", [])
                    if affected:
                        lines.append(f"   涉及班级：{', '.join(affected[:5])}" + (f" 等 {len(affected)} 个" if len(affected) > 5 else ""))
                    suggestion = action.get("suggestion")
                    if suggestion:
                        lines.append(f"   建议：{suggestion}")
                    lines.append("")
            else:
                lines.append("✅ 没有需要特别处理的问题。")
                lines.append("")

            lines.append("## 五、附录")
            lines.append("")
            lines.append("### 参数对比表")
            lines.append("")
            lines.append("| 班级 | 学习率 | 实际迭代 | 初始损失 | 最终损失 | 状态 |")
            lines.append("|------|--------|----------|----------|----------|------|")
            for record in records:
                cr = result_map.get(record.record_id)
                if not cr:
                    continue
                loss_vals = sorted(record.loss_history, key=lambda x: x.iteration)
                initial = loss_vals[0].loss_value if loss_vals else "-"
                final = loss_vals[-1].loss_value if loss_vals else "-"
                status = "✅ 正常" if not cr.issues else "⚠️ 需关注"
                lr = record.learning_rate if record.learning_rate is not None else "缺失"
                lines.append(f"| {record.class_name} | {lr} | {len(loss_vals)} | {initial:.4f} | {final:.4f} | {status} |")
            lines.append("")

            lines.append("> 详细数据和修正建议请参考同目录下的其他导出文件。")

        with open(filename, "w", encoding="utf-8") as f:
            f.write("\n".join(lines))

        return filename

    def _export_full_json(
        self,
        records: List[TrainingRecord],
        check_results: List[CheckResult],
        advisor_result: Dict,
        process_snapshots: List[Dict],
        timestamp: str
    ) -> str:
        filename = os.path.join(self.output_dir, f"full_analysis_{timestamp}.json")

        def record_to_dict(r: TrainingRecord) -> Dict:
            return {
                "record_id": r.record_id,
                "class_name": r.class_name,
                "original_class_name": r.original_class_name,
                "loss_function": r.loss_function,
                "loss_function_note": r.loss_function_note,
                "learning_rate": r.learning_rate,
                "learning_rate_source": r.learning_rate_source,
                "iterations": r.iterations,
                "actual_iterations": r.actual_iterations,
                "source_file": r.source_file,
                "is_learning_rate_missing": r.is_learning_rate_missing,
                "loss_history": [
                    {"iteration": h.iteration, "loss_value": h.loss_value,
                     "raw_line": h.raw_line, "note": h.note}
                    for h in r.loss_history
                ],
            }

        def check_result_to_dict(cr: CheckResult) -> Dict:
            return {
                "record_id": cr.record_id,
                "class_name": cr.class_name,
                "learning_rate_ok": cr.learning_rate_ok,
                "convergence_ok": cr.convergence_ok,
                "iteration_ok": cr.iteration_ok,
                "loss_trend": cr.loss_trend,
                "explosive_points": cr.explosive_points,
                "plateau_points": [[s, e] for s, e in cr.plateau_points],
                "issues": [
                    {
                        "issue_type": i.issue_type.value,
                        "severity": i.severity,
                        "message": i.message,
                        "suggestion": i.suggestion,
                        "details": i.details,
                    }
                    for i in cr.issues
                ],
            }

        full_data = {
            "generated_at": datetime.now().isoformat(),
            "timestamp": timestamp,
            "records": [record_to_dict(r) for r in records],
            "check_results": [check_result_to_dict(cr) for cr in check_results],
            "advisor_result": {
                "summary": advisor_result.get("summary", {}),
                "prioritized_actions": advisor_result.get("prioritized_actions", []),
                "recommended_fixes": advisor_result.get("recommended_fixes", []),
            },
            "process_audit_trail": process_snapshots,
        }

        with open(filename, "w", encoding="utf-8") as f:
            json.dump(full_data, f, ensure_ascii=False, indent=2)

        return filename

    def _format_issue_type(self, issue_type: str) -> str:
        mapping = {
            "learning_rate_explosion": "学习率爆炸",
            "local_minimum": "局部极小",
            "insufficient_iterations": "迭代不足",
            "missing_learning_rate": "学习率缺失",
            "corrupted_loss_record": "损失记录损坏",
            "renamed_class_record": "班级名自动命名",
        }
        return mapping.get(issue_type, issue_type)

    def _format_severity(self, severity: str) -> str:
        mapping = {
            "high": "🔴 高",
            "medium": "🟡 中",
            "low": "🟢 低",
            "warning": "🟡 警告",
            "error": "🔴 错误",
        }
        return mapping.get(severity, severity)

    def _capture_snapshot(self, operation: str, data: Dict) -> None:
        self.export_snapshots.append({
            "stage": "export",
            "operation": operation,
            "data": data,
            "timestamp": datetime.now().isoformat(),
        })

    def get_export_snapshots(self) -> List[Dict]:
        return self.export_snapshots
