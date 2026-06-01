"""报告导出和复盘模块"""

import json
import csv
from datetime import datetime
from typing import List
from .models import GameResult, DataError, ErrorType, GameStatus


class ReportGenerator:
    """报告生成器"""

    def __init__(self):
        self.error_explanations = {
            ErrorType.ANGLE_UNIT_MIX: "角度制混用：同时使用了度(°)和弧度(rad)，容易造成计算混淆",
            ErrorType.QUADRANT_MISJUDGE: "象限误判：角度所在的象限与预期不符，影响三角函数符号",
            ErrorType.PROJECTION_OUT_OF_BOUNDS: "投影越界：计算结果超出了[-1, 1]范围",
            ErrorType.BAD_ROW: "数据行问题：空行、备注或格式错误"
        }

    def generate_text_report(self, result: GameResult) -> str:
        """生成文本报告"""
        lines = []
        lines.append("=" * 60)
        lines.append("三角函数灯塔赛 - 成绩报告")
        lines.append("=" * 60)
        lines.append(f"关卡: {result.level_name}")
        lines.append(f"时间: {datetime.fromtimestamp(result.timestamp).strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")

        status_text = "成功" if result.status == GameStatus.SUCCESS else "失败"
        lines.append(f"结果: {status_text}")
        lines.append(f"得分: {result.score}")
        lines.append(f"命中: {result.hit_targets}/{result.total_targets}")
        lines.append(f"准确率: {result.accuracy:.1%}")
        lines.append("")

        lines.append("-" * 60)
        lines.append("数学解释")
        lines.append("-" * 60)
        lines.append(self._explain_result(result))
        lines.append("")

        if result.errors:
            lines.append("-" * 60)
            lines.append("错误详情")
            lines.append("-" * 60)
            for error in result.errors:
                lines.append(f"[{error.error_type.value}] 第{error.row_number}行: {error.message}")
                lines.append(f"  解释: {self.error_explanations.get(error.error_type, '未知错误')}")
                if error.raw_data:
                    lines.append(f"  原始数据: {error.raw_data}")
                lines.append("")

        lines.append("=" * 60)
        return "\n".join(lines)

    def _explain_result(self, result: GameResult) -> str:
        """解释结果"""
        explanations = []
        
        if result.accuracy >= 0.8:
            explanations.append("表现优秀！对三角函数的理解很到位。")
        elif result.accuracy >= 0.5:
            explanations.append("还需要多加练习，注意角度与象限的对应关系。")
        else:
            explanations.append("建议先复习单位圆基础知识。")

        has_angle_mix = any(e.error_type == ErrorType.ANGLE_UNIT_MIX for e in result.errors)
        if has_angle_mix:
            explanations.append("提示：建议统一使用角度制，混用会导致计算错误。")

        has_quadrant = any(e.error_type == ErrorType.QUADRANT_MISJUDGE for e in result.errors)
        if has_quadrant:
            explanations.append("提示：90°-180°在第二象限(cos负,sin正)，180°-270°在第三象限(cos负,sin负)")

        return "\n".join(explanations)

    def export_json(self, result: GameResult, filepath: str) -> None:
        """导出JSON报告"""
        data = {
            "level_id": result.level_id,
            "level_name": result.level_name,
            "status": result.status.value,
            "score": result.score,
            "hit_targets": result.hit_targets,
            "total_targets": result.total_targets,
            "accuracy": result.accuracy,
            "errors": [
                {
                    "type": e.error_type.value,
                    "row": e.row_number,
                    "message": e.message,
                    "raw": e.raw_data
                } for e in result.errors
            ],
            "timestamp": result.timestamp,
            "explanation": self._explain_result(result)
        }
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def export_csv(self, results: List[GameResult], filepath: str) -> None:
        """导出CSV复盘数据"""
        with open(filepath, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow([
                "时间", "关卡", "结果", "得分", "命中", "总数", "准确率", "错误数"
            ])
            for r in results:
                writer.writerow([
                    datetime.fromtimestamp(r.timestamp).strftime('%Y-%m-%d %H:%M:%S'),
                    r.level_name,
                    r.status.value,
                    r.score,
                    r.hit_targets,
                    r.total_targets,
                    f"{r.accuracy:.2%}",
                    len(r.errors)
                ])

    def generate_review_report(self, results: List[GameResult]) -> str:
        """生成复盘报告"""
        if not results:
            return "暂无游戏记录"

        total_score = sum(r.score for r in results)
        avg_accuracy = sum(r.accuracy for r in results) / len(results)
        best = max(results, key=lambda r: r.accuracy)
        total_errors = sum(len(r.errors) for r in results)

        lines = []
        lines.append("=" * 60)
        lines.append("三角函数灯塔赛 - 复盘报告")
        lines.append("=" * 60)
        lines.append(f"总游戏次数: {len(results)}")
        lines.append(f"总得分: {total_score}")
        lines.append(f"平均准确率: {avg_accuracy:.1%}")
        lines.append(f"最佳关卡: {best.level_name} ({best.accuracy:.1%})")
        lines.append(f"总错误数: {total_errors}")
        lines.append("")

        error_summary = {}
        for r in results:
            for e in r.errors:
                key = e.error_type
                error_summary[key] = error_summary.get(key, 0) + 1

        if error_summary:
            lines.append("-" * 60)
            lines.append("错误类型统计")
            lines.append("-" * 60)
            for err_type, count in error_summary.items():
                lines.append(f"{self.error_explanations.get(err_type, err_type.value)}: {count}次")

        lines.append("")
        lines.append("-" * 60)
        lines.append("目标命中记录")
        lines.append("-" * 60)
        for r in results:
            lines.append(f"{r.level_name}: {r.hit_targets}/{r.total_targets} ({r.accuracy:.1%})")

        lines.append("")
        lines.append("=" * 60)
        return "\n".join(lines)
