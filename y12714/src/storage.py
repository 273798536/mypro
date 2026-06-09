"""
数据持久化与幂等运行
====================
负责输入输出目录管理、JSON序列化、增量合并
"""

import json
import os
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

from .models import (
    Question,
    AnswerRecord,
    ReviewRecord,
    ReviewStatus,
    generate_id,
)


def ensure_dir(path: Path) -> None:
    path.mkdir(parents=True, exist_ok=True)


def load_json(path: Path) -> Optional[dict]:
    if not path.exists():
        return None
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_json(path: Path, data) -> None:
    ensure_dir(path.parent)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class Storage:
    def __init__(self, input_dir: str, output_dir: str):
        self.input_dir = Path(input_dir).resolve()
        self.output_dir = Path(output_dir).resolve()
        self.reviews_dir = self.output_dir / "reviews"
        self.reports_dir = self.output_dir / "reports"
        self.state_path = self.output_dir / "state.json"

        ensure_dir(self.input_dir)
        ensure_dir(self.reviews_dir)
        ensure_dir(self.reports_dir)

    # ---------- 输入加载 ----------

    def load_questions(self) -> Dict[str, Question]:
        """
        加载题目清单。支持补录：文件可以是 questions.json 或 questions/ 目录下的多个 json。
        """
        questions: Dict[str, Question] = {}

        q_file = self.input_dir / "questions.json"
        if q_file.exists():
            data = load_json(q_file) or []
            for item in data:
                q = Question.from_dict(item)
                questions[q.question_id] = q

        q_dir = self.input_dir / "questions"
        if q_dir.is_dir():
            for fp in sorted(q_dir.glob("*.json")):
                data = load_json(fp)
                if isinstance(data, list):
                    for item in data:
                        q = Question.from_dict(item)
                        questions[q.question_id] = q
                elif isinstance(data, dict) and "question_id" in data:
                    q = Question.from_dict(data)
                    questions[q.question_id] = q

        return questions

    def load_answers(self) -> Dict[str, AnswerRecord]:
        """加载答案记录。"""
        answers: Dict[str, AnswerRecord] = {}

        a_file = self.input_dir / "answers.json"
        if a_file.exists():
            data = load_json(a_file) or []
            for item in data:
                a = AnswerRecord.from_dict(item)
                answers[a.record_id] = a

        a_dir = self.input_dir / "answers"
        if a_dir.is_dir():
            for fp in sorted(a_dir.glob("*.json")):
                data = load_json(fp)
                if isinstance(data, list):
                    for item in data:
                        a = AnswerRecord.from_dict(item)
                        answers[a.record_id] = a
                elif isinstance(data, dict) and "record_id" in data:
                    a = AnswerRecord.from_dict(data)
                    answers[a.record_id] = a

        return answers

    # ---------- 状态与幂等 ----------

    def load_state(self) -> dict:
        return load_json(self.state_path) or {
            "runs": [],
            "last_run_id": None,
            "processed_record_ids": [],
        }

    def save_state(self, state: dict) -> None:
        save_json(self.state_path, state)

    def start_run(self) -> Tuple[str, dict]:
        """
        启动一次运行，生成 run_id 并读取历史状态。
        保证同一批材料重复跑不会越跑越乱：保留已有的 review 结果，只做增量更新。
        """
        state = self.load_state()
        run_id = generate_id("run_")
        state["runs"].append(
            {
                "run_id": run_id,
                "started_at": datetime.now().isoformat(),
                "input_dir": str(self.input_dir),
            }
        )
        state["last_run_id"] = run_id
        self.save_state(state)
        return run_id, state

    def finish_run(self, run_id: str, stats: dict) -> None:
        state = self.load_state()
        for run in state["runs"]:
            if run["run_id"] == run_id:
                run["finished_at"] = datetime.now().isoformat()
                run["stats"] = stats
        self.save_state(state)

    # ---------- Review 持久化 ----------

    def review_path(self, record_id: str) -> Path:
        return self.reviews_dir / f"{record_id}.json"

    def load_existing_review(self, record_id: str) -> Optional[ReviewRecord]:
        path = self.review_path(record_id)
        if not path.exists():
            return None
        data = load_json(path)
        if data:
            return ReviewRecord.from_dict(data)
        return None

    def save_review(self, review: ReviewRecord) -> None:
        path = self.review_path(review.record_id)
        save_json(path, review.to_dict())

    def load_all_reviews(self) -> Dict[str, ReviewRecord]:
        reviews: Dict[str, ReviewRecord] = {}
        if self.reviews_dir.is_dir():
            for fp in self.reviews_dir.glob("*.json"):
                data = load_json(fp)
                if data:
                    r = ReviewRecord.from_dict(data)
                    reviews[r.record_id] = r
        return reviews

    # ---------- 异常/受影响查询 ----------

    def find_anomalies(self) -> List[ReviewRecord]:
        """返回需要人工关注的记录：REJECTED / PENDING / AFFECTED"""
        result = []
        for review in self.load_all_reviews().values():
            if review.status in (
                ReviewStatus.REJECTED,
                ReviewStatus.PENDING,
                ReviewStatus.AFFECTED,
            ):
                result.append(review)
        return result

    def find_affected_by_late(self) -> List[ReviewRecord]:
        return [r for r in self.load_all_reviews().values() if r.affected_by_late_answer]
