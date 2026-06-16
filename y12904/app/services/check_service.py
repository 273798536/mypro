import math
from collections import Counter
from typing import List, Dict, Any
from sqlalchemy.orm import Session

from app.models import (
    Question, CheckTask, CheckResult, TaskStatus,
    CheckType, SeverityLevel, SplitType, AuditLog, ActionType,
)
from app.schemas import (
    LEAKAGE_ACTION_HINTS, LEAKAGE_PLAIN_EXPLANATIONS, BLOCKING_REASONS,
)


def run_bias_check(db: Session, task_id: int, actor: str = "system") -> List[CheckResult]:
    task = db.query(CheckTask).filter(CheckTask.id == task_id).first()
    if not task:
        raise ValueError(f"检查任务 {task_id} 不存在")

    if task.status not in (TaskStatus.IMPORTED, TaskStatus.REJECTED):
        raise ValueError(f"任务当前状态为 {task.status.value}，不能执行检查")

    task.status = TaskStatus.CHECKING
    db.commit()

    db.query(CheckResult).filter(CheckResult.task_id == task_id).delete()
    db.commit()

    all_questions = db.query(Question).filter(Question.bank_id == task.bank_id).all()

    unique_questions = [q for q in all_questions if not q.is_duplicate]

    results = []

    check_types = task.check_types or []
    if isinstance(check_types, str):
        check_types = [check_types]

    normalized_check_types = []
    for ct in check_types:
        if isinstance(ct, str):
            normalized_check_types.append(CheckType(ct))
        else:
            normalized_check_types.append(ct)

    for ct in normalized_check_types:
        if ct == CheckType.LEAKAGE:
            results.extend(_check_leakage(db, task_id, all_questions))
        elif ct == CheckType.DISTRIBUTION:
            results.extend(_check_distribution(db, task_id, unique_questions))
        elif ct == CheckType.DUPLICATE:
            results.extend(_check_duplicate(db, task_id, unique_questions))
        elif ct == CheckType.DIFFICULTY:
            results.extend(_check_difficulty(db, task_id, unique_questions))
        elif ct == CheckType.CATEGORY:
            results.extend(_check_category(db, task_id, unique_questions))

    task.status = TaskStatus.CHECKED
    db.commit()

    log = AuditLog(
        task_id=task_id,
        bank_id=task.bank_id,
        action=ActionType.CHECK,
        actor=actor,
        detail=f"完成偏科检查，共发现 {len(results)} 条检查结果",
        snapshot={"result_count": len(results), "check_types": [ct.value for ct in normalized_check_types]},
    )
    db.add(log)
    db.commit()

    return results


def _check_leakage(db: Session, task_id: int, questions: List[Question]) -> List[CheckResult]:
    results = []
    by_split: Dict[SplitType, List[Question]] = {s: [] for s in SplitType}
    for q in questions:
        by_split[q.split_type].append(q)

    train_content_map = {q.content.strip(): q for q in by_split[SplitType.TRAIN]}
    val_content_map = {q.content.strip(): q for q in by_split[SplitType.VAL]}
    test_content_map = {q.content.strip(): q for q in by_split[SplitType.TEST]}

    for content, test_q in test_content_map.items():
        if content in train_content_map:
            train_q = train_content_map[content]
            overlap_type = "train_test_overlap"
            r = CheckResult(
                task_id=task_id,
                check_type=CheckType.LEAKAGE,
                severity=SeverityLevel.BLOCKER,
                question_id=test_q.question_id,
                detail=f"训练集题目 '{train_q.question_id}' 与测试集题目 '{test_q.question_id}' 内容完全一致",
                plain_explanation=LEAKAGE_PLAIN_EXPLANATIONS[overlap_type],
                action_hint=LEAKAGE_ACTION_HINTS[overlap_type],
                original_human_note=_preserve_human_note(test_q.human_note, train_q.human_note),
                is_blocking=True,
                metadata_json={
                    "overlap_type": overlap_type,
                    "train_question_id": train_q.question_id,
                    "test_question_id": test_q.question_id,
                    "blocking_reason": BLOCKING_REASONS[overlap_type],
                },
            )
            db.add(r)
            results.append(r)

        if content in val_content_map:
            val_q = val_content_map[content]
            overlap_type = "val_test_overlap"
            r = CheckResult(
                task_id=task_id,
                check_type=CheckType.LEAKAGE,
                severity=SeverityLevel.ERROR,
                question_id=test_q.question_id,
                detail=f"验证集题目 '{val_q.question_id}' 与测试集题目 '{test_q.question_id}' 内容完全一致",
                plain_explanation=LEAKAGE_PLAIN_EXPLANATIONS[overlap_type],
                action_hint=LEAKAGE_ACTION_HINTS[overlap_type],
                original_human_note=_preserve_human_note(test_q.human_note, val_q.human_note),
                is_blocking=True,
                metadata_json={
                    "overlap_type": overlap_type,
                    "val_question_id": val_q.question_id,
                    "test_question_id": test_q.question_id,
                    "blocking_reason": BLOCKING_REASONS[overlap_type],
                },
            )
            db.add(r)
            results.append(r)

    for content, val_q in val_content_map.items():
        if content in train_content_map:
            train_q = train_content_map[content]
            overlap_type = "train_val_overlap"
            r = CheckResult(
                task_id=task_id,
                check_type=CheckType.LEAKAGE,
                severity=SeverityLevel.WARNING,
                question_id=val_q.question_id,
                detail=f"训练集题目 '{train_q.question_id}' 与验证集题目 '{val_q.question_id}' 内容完全一致",
                plain_explanation=LEAKAGE_PLAIN_EXPLANATIONS[overlap_type],
                action_hint=LEAKAGE_ACTION_HINTS[overlap_type],
                original_human_note=_preserve_human_note(train_q.human_note, val_q.human_note),
                is_blocking=False,
                metadata_json={
                    "overlap_type": overlap_type,
                    "train_question_id": train_q.question_id,
                    "val_question_id": val_q.question_id,
                    "blocking_reason": BLOCKING_REASONS[overlap_type],
                },
            )
            db.add(r)
            results.append(r)

    if results:
        db.commit()

    return results


def _check_distribution(db: Session, task_id: int, questions: List[Question]) -> List[CheckResult]:
    results = []
    by_split: Dict[SplitType, List[Question]] = {s: [] for s in SplitType}
    for q in questions:
        by_split[q.split_type].append(q)

    total = len(questions)
    if total == 0:
        return results

    split_counts = {s.value: len(qs) for s, qs in by_split.items()}
    split_ratios = {s: c / total for s, c in split_counts.items()}

    expected = {"train": 0.7, "val": 0.15, "test": 0.15}
    for split_name, exp_ratio in expected.items():
        actual = split_ratios.get(split_name, 0.0)
        if abs(actual - exp_ratio) > 0.15:
            r = CheckResult(
                task_id=task_id,
                check_type=CheckType.DISTRIBUTION,
                severity=SeverityLevel.WARNING if abs(actual - exp_ratio) < 0.25 else SeverityLevel.ERROR,
                detail=f"切分 '{split_name}' 占比 {actual:.1%}，与预期 {exp_ratio:.0%} 偏差较大",
                plain_explanation=f"{split_name}集占了所有题目的{actual:.1%}，通常期望大约占{exp_ratio:.0%}。比例偏差太大可能影响模型训练或评测的代表性。",
                action_hint="建议调整切分比例，使各集合占比更接近预期",
                original_human_note="",
                is_blocking=False,
                metadata_json={"split": split_name, "actual_ratio": actual, "expected_ratio": exp_ratio},
            )
            db.add(r)
            results.append(r)

    if results:
        db.commit()

    return results


def _check_duplicate(db: Session, task_id: int, questions: List[Question]) -> List[CheckResult]:
    results = []
    if not questions:
        return results
    bank_id = questions[0].bank_id
    all_questions = db.query(Question).filter(Question.bank_id == bank_id).all()

    dup_count = sum(1 for q in all_questions if q.is_duplicate)
    if dup_count > 0:
        r = CheckResult(
            task_id=task_id,
            check_type=CheckType.DUPLICATE,
            severity=SeverityLevel.WARNING if dup_count < len(all_questions) * 0.05 else SeverityLevel.ERROR,
            detail=f"题库中共有 {dup_count} 条重复题目",
            plain_explanation=f"题库里有{dup_count}道题是重复的。重复题目会让模型在某些题型上获得不合理的优势，也可能让评测分数虚高。",
            action_hint="建议去除重复题目，或在导入时开启去重选项",
            original_human_note="",
            is_blocking=dup_count > len(all_questions) * 0.1,
            metadata_json={"duplicate_count": dup_count, "total_count": len(all_questions)},
        )
        db.add(r)
        results.append(r)

    if results:
        db.commit()

    return results


def _check_difficulty(db: Session, task_id: int, questions: List[Question]) -> List[CheckResult]:
    results = []
    diff_counts = Counter(q.difficulty for q in questions if q.difficulty)
    total = len(questions)

    if not diff_counts or total == 0:
        return results

    for diff, count in diff_counts.items():
        ratio = count / total
        if ratio > 0.6:
            r = CheckResult(
                task_id=task_id,
                check_type=CheckType.DIFFICULTY,
                severity=SeverityLevel.WARNING,
                detail=f"难度 '{diff}' 占比 {ratio:.1%}，存在偏科风险",
                plain_explanation=f"题库中{ratio:.1%}的题都是'{diff}'难度的，分布太集中了，可能无法全面评估模型在不同难度上的表现。",
                action_hint="建议补充其他难度级别的题目，使难度分布更均衡",
                original_human_note="",
                is_blocking=False,
                metadata_json={"difficulty": diff, "count": count, "ratio": ratio},
            )
            db.add(r)
            results.append(r)

    if results:
        db.commit()

    return results


def _check_category(db: Session, task_id: int, questions: List[Question]) -> List[CheckResult]:
    results = []
    cat_counts = Counter(q.category for q in questions if q.category)
    total = len(questions)

    if not cat_counts or total == 0:
        return results

    for cat, count in cat_counts.items():
        ratio = count / total
        if ratio > 0.5:
            r = CheckResult(
                task_id=task_id,
                check_type=CheckType.CATEGORY,
                severity=SeverityLevel.WARNING,
                detail=f"类别 '{cat}' 占比 {ratio:.1%}，存在偏科风险",
                plain_explanation=f"题库中{ratio:.1%}的题都属于'{cat}'类别，覆盖面不够广，评测结果可能不能代表模型在其他类别上的能力。",
                action_hint="建议补充其他类别的题目，使类别分布更均衡",
                original_human_note="",
                is_blocking=False,
                metadata_json={"category": cat, "count": count, "ratio": ratio},
            )
            db.add(r)
            results.append(r)

    if results:
        db.commit()

    return results


def _preserve_human_note(*notes: str) -> str:
    non_empty = [n.strip() for n in notes if n and n.strip()]
    if not non_empty:
        return ""
    return "；".join(non_empty)
