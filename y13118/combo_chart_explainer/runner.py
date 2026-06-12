import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional, Tuple, Any
from .models import Question, WeightRecord, RawDataSource, CalculationResult, ExtrapolationError
from .counter import ComboCounter
from .history import ChangeHistory
from .chart import ChartGenerator
from .csv_exporter import CSVExporter


class Runner:
    def __init__(
        self,
        data_dir: str = "data",
        output_dir: str = "output",
        max_combo_size: int = 3,
        weight_bounds: Tuple[float, float] = (0.0, 100.0),
        count_bounds: Tuple[int, int] = (1, 10000),
    ):
        self.data_dir = Path(data_dir)
        self.output_dir = Path(output_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.history = ChangeHistory(storage_path=str(self.output_dir / "change_history.json"))
        self.counter = ComboCounter(
            max_combo_size=max_combo_size,
            weight_bounds=weight_bounds,
            count_bounds=count_bounds,
        )
        self.chart_gen = ChartGenerator()

        self.questions: List[Question] = []
        self.weights: Dict[str, WeightRecord] = {}
        self.occurrence_counts: Dict[str, int] = {}
        self.raw_sources: List[RawDataSource] = []
        self.last_result: Optional[CalculationResult] = None

    def load_questions_from_json(self, filepath: str, source_name: str = "unknown") -> List[Question]:
        path = Path(filepath)
        with open(path, "r", encoding="utf-8") as f:
            raw_content = f.read()
            data = json.loads(raw_content)

        source = RawDataSource(
            source_name=source_name,
            raw_content=raw_content,
            notes=f"文件来源: {path.name}",
        )
        self.raw_sources.append(source)
        self.history.log_raw_source(source)

        old_questions = list(self.questions)
        new_questions: List[Question] = []

        for item in data.get("questions", []):
            qid = str(item.get("qid", ""))
            text = str(item.get("text", ""))
            is_dirty = bool(item.get("_dirty", False)) or bool(item.get("is_dirty", False))
            dirty_reason = str(item.get("_dirty_reason", "")) or str(item.get("dirty_reason", ""))

            q = Question(
                qid=qid,
                text=text,
                category=str(item.get("category", "")),
                difficulty=str(item.get("difficulty", "")),
                raw_source=source,
                is_dirty=is_dirty,
                dirty_reason=dirty_reason,
            )
            new_questions.append(q)

        for q in new_questions:
            existing = next((x for x in self.questions if x.qid == q.qid), None)
            if existing:
                idx = self.questions.index(existing)
                self.questions[idx] = q
            else:
                self.questions.append(q)

        self.history.log_question_list_change(
            old_questions=old_questions,
            new_questions=self.questions,
            changed_by="system",
            reason=f"从 {source_name} 加载题目清单",
        )

        return new_questions

    def set_weight(self, qid: str, weight: float, changed_by: str = "user", reason: str = "") -> WeightRecord:
        existing = self.weights.get(qid)
        prev_weight = existing.weight if existing else None

        record = WeightRecord(
            qid=qid,
            weight=weight,
            changed_at=datetime.now(),
            changed_by=changed_by,
            previous_weight=prev_weight,
            change_reason=reason,
        )
        self.weights[qid] = record

        self.history.log_weight_change(
            record=record,
            qid=qid,
            changed_by=changed_by,
            reason=reason,
        )

        return record

    def set_occurrence_count(self, qid: str, count: int) -> None:
        self.occurrence_counts[qid] = count

    def run(self, run_id: Optional[str] = None) -> CalculationResult:
        run_id = run_id or f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"

        combo_items, errors = self.counter.count(
            questions=self.questions,
            weights=self.weights,
            occurrence_counts=self.occurrence_counts,
        )

        total_combos = sum(item.count for item in combo_items)
        total_weight = sum(item.combined_weight * item.count for item in combo_items)

        chart_summary = self.chart_gen.generate_summary(combo_items)

        result = CalculationResult(
            run_id=run_id,
            questions=list(self.questions),
            weights=dict(self.weights),
            combo_items=combo_items,
            total_combos=total_combos,
            total_weight=total_weight,
            errors=errors,
            chart_summary=chart_summary,
            calculated_at=datetime.now(),
            raw_sources=list(self.raw_sources),
        )

        self.last_result = result
        return result

    def rerun(self, result: Optional[CalculationResult] = None) -> CalculationResult:
        result = result or self.last_result
        if result is None:
            raise ValueError("没有可重跑的结果，请先调用 run()")

        self.questions = list(result.questions)
        self.weights = dict(result.weights)
        self.raw_sources = list(result.raw_sources)

        new_run_id = f"rerun_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}"
        return self.run(run_id=new_run_id)

    def export_csv(self, result: Optional[CalculationResult] = None) -> Dict[str, str]:
        result = result or self.last_result
        if result is None:
            raise ValueError("没有可导出的结果，请先调用 run()")

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        details_path = self.output_dir / f"combo_details_{timestamp}.csv"
        summary_path = self.output_dir / f"combo_summary_{timestamp}.csv"
        weights_path = self.output_dir / f"weight_changes_{timestamp}.csv"

        files = {
            "details": CSVExporter.export_details(result, str(details_path)),
            "summary": CSVExporter.export_summary(result, str(summary_path)),
            "weight_changes": CSVExporter.export_weight_changes(
                self.history.get_changes_relationship(), str(weights_path)
            ),
        }

        return files

    def verify_csv(self, csv_path: str, result: Optional[CalculationResult] = None) -> Dict[str, Any]:
        result = result or self.last_result
        if result is None:
            raise ValueError("没有可校验的结果，请先调用 run()")
        return CSVExporter.verify_csv_consistency(csv_path, result)

    def print_exit_summary(self, result: Optional[CalculationResult] = None) -> None:
        result = result or self.last_result
        if result is None:
            print("没有运行结果可显示。")
            return

        print()
        print("=" * 60)
        print("运行退出总结")
        print("=" * 60)
        print(f"运行ID: {result.run_id}")
        print(f"计算时间: {result.calculated_at.isoformat(timespec='seconds')}")
        print(f"题目数量: {len(result.questions)}")
        print(f"总组合数: {result.total_combos}")
        print(f"总权重: {result.total_weight:.4f}")

        if result.errors:
            print()
            print(f"发现 {len(result.errors)} 个外推越界错误:")
            for i, err in enumerate(result.errors, 1):
                print(f"  {i}. {err}")
                print(f"     → 卡壳点: 字段 '{err.field_name}' 值 {err.current_value} 超出 [{err.lower_bound}, {err.upper_bound}]")
        else:
            print()
            print("✓ 未发现外推越界错误。")

        dirty_q = [q for q in result.questions if q.is_dirty]
        if dirty_q:
            print()
            print(f"发现 {len(dirty_q)} 条脏数据（已保留原始痕迹）:")
            for q in dirty_q:
                print(f"  - {q.qid}: {q.dirty_reason or '未标注原因'}")

        rel = self.history.get_changes_relationship()
        print()
        print(f"历史记录: 题目清单修改 {rel['total_q_list_changes']} 次, 权重变更 {rel['total_weight_changes']} 次")

        consistent = result.is_consistent()
        print(f"图表与明细口径一致: {'✓ 是' if consistent else '✗ 否'}")
        print("=" * 60)
