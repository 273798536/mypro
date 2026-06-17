import json
import uuid
import os
from datetime import datetime
from collections import Counter, defaultdict
from typing import List, Dict, Any, Optional, Tuple

from .database import DatabaseManager
from .version_tracker import VersionTracker
from .errors import (
    ActionableError, ErrorHandler,
    extract_topic_from_metadata, extract_topic_from_filename
)


CONCLUSION_PRIORITY = {
    "critical_error": 0,
    "missing_feedback": 1,
    "fail": 2,
    "pending_confirmation": 3,
    "skewed_evaluation": 4,
    "pass": 5,
    "duplicate": 6
}

SEVERITY_ORDER = {"critical": 0, "error": 1, "warning": 2, "info": 3}


class AuditConclusion:
    def __init__(
        self,
        material_pair_key: str,
        conclusion_type: str,
        severity: str,
        summary: str,
        detail: Dict[str, Any],
        actionable_items: Optional[List[str]] = None,
        training_material_id: Optional[str] = None,
        evaluation_material_id: Optional[str] = None,
    ):
        self.conclusion_id = f"con_{uuid.uuid4().hex[:12]}"
        self.material_pair_key = material_pair_key
        self.conclusion_type = conclusion_type
        self.severity = severity
        self.summary = summary
        self.detail = detail
        self.actionable_items = actionable_items or []
        self.training_material_id = training_material_id
        self.evaluation_material_id = evaluation_material_id
        self.created_at = datetime.now().isoformat(timespec="seconds")

    def to_db_row(self, run_id: str) -> Tuple:
        return (
            self.conclusion_id, run_id, self.material_pair_key,
            self.training_material_id, self.evaluation_material_id,
            self.conclusion_type, self.severity, self.summary,
            json.dumps(self.detail, ensure_ascii=False),
            json.dumps(self.actionable_items, ensure_ascii=False),
            self.created_at
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "conclusion_id": self.conclusion_id,
            "material_pair_key": self.material_pair_key,
            "training_material_id": self.training_material_id,
            "evaluation_material_id": self.evaluation_material_id,
            "conclusion_type": self.conclusion_type,
            "severity": self.severity,
            "summary": self.summary,
            "detail": self.detail,
            "actionable_items": self.actionable_items,
            "created_at": self.created_at
        }


class AuditResult:
    def __init__(self, run_id: str):
        self.run_id = run_id
        self.conclusions: List[AuditConclusion] = []
        self.processed_pairs: set = set()
        self._errors: List[ActionableError] = []
        self._stats: Dict[str, Any] = {"by_type": Counter(), "by_severity": Counter()}

    def add_conclusion(self, c: AuditConclusion) -> None:
        if c.material_pair_key in self.processed_pairs:
            return
        self.processed_pairs.add(c.material_pair_key)
        self.conclusions.append(c)
        self._stats["by_type"][c.conclusion_type] += 1
        self._stats["by_severity"][c.severity] += 1

    def add_error(self, err: ActionableError) -> None:
        self._errors.append(err)

    def overall_summary(self) -> str:
        total = len(self.conclusions)
        if total == 0:
            return "未生成任何审计结论，请检查输入材料是否完整。"
        pass_count = self._stats["by_type"].get("pass", 0)
        fail_count = (
            self._stats["by_type"].get("fail", 0)
            + self._stats["by_type"].get("critical_error", 0)
        )
        pending = self._stats["by_type"].get("pending_confirmation", 0)
        missing = self._stats["by_type"].get("missing_feedback", 0)
        skewed = self._stats["by_type"].get("skewed_evaluation", 0)
        parts = []
        if fail_count:
            parts.append(f"失败/严重问题 {fail_count} 项")
        if missing:
            parts.append(f"缺人工反馈 {missing} 项")
        if pending:
            parts.append(f"待确认 {pending} 项")
        if skewed:
            parts.append(f"评测偏科 {skewed} 项")
        parts.append(f"通过 {pass_count} 项")
        parts.append(f"共审计 {total} 对材料")
        overall_status = "待确认" if (fail_count or missing or pending or skewed) else "通过"
        return f"【总体结论：{overall_status}】" + "；".join(parts) + "。"

    def summary_dict(self) -> Dict[str, Any]:
        summary = {
            "run_id": self.run_id,
            "total": len(self.conclusions),
            "overall": self.overall_summary(),
            "by_type": dict(self._stats["by_type"]),
            "by_severity": dict(self._stats["by_severity"]),
            "errors": [e.to_dict() for e in self._errors]
        }
        passes = self._stats["by_type"].get("pass", 0)
        total = len(self.conclusions)
        summary["pass_rate"] = round(passes / total, 4) if total else 0.0
        return summary


class AuditEngine:
    EXPECTED_RATIO = (0.8, 2.5)
    TOPIC_MATCH_THRESHOLD = 0.3

    def __init__(self, db: DatabaseManager, tracker: VersionTracker):
        self.db = db
        self.tracker = tracker

    def _load_materials(self, batch_id: str) -> List[Dict[str, Any]]:
        with self.db._get_conn() as conn:
            rows = conn.execute(
                "SELECT material_id, material_type, file_name, file_path, content_hash, "
                "content_preview, metadata_json FROM materials WHERE batch_id=?",
                (batch_id,)
            ).fetchall()
            return [dict(r) for r in rows]

    def _load_feedbacks(self, batch_id: str) -> Dict[str, List[Dict[str, Any]]]:
        with self.db._get_conn() as conn:
            rows = conn.execute(
                "SELECT feedback_id, material_id, feedback_type, content_json, file_path "
                "FROM human_feedbacks WHERE batch_id=?",
                (batch_id,)
            ).fetchall()
            by_material: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
            for r in rows:
                data = dict(r)
                try:
                    data["content"] = json.loads(data["content_json"])
                except (json.JSONDecodeError, TypeError):
                    data["content"] = {}
                mat_id = data["material_id"]
                if mat_id:
                    by_material[mat_id].append(data)
                by_material["__global__"].append(data)
            return dict(by_material)

    def _load_previous_conclusions(self, training_batch_id: str,
                                   evaluation_batch_id: str) -> Dict[str, Dict[str, Any]]:
        with self.db._get_conn() as conn:
            rows = conn.execute(
                """
                SELECT c.material_pair_key, c.conclusion_type, c.summary, c.severity
                FROM audit_conclusions c
                JOIN audit_runs r ON c.run_id = r.run_id
                WHERE r.training_batch_id=? AND r.evaluation_batch_id=?
                  AND c.is_latest=1
                """,
                (training_batch_id, evaluation_batch_id)
            ).fetchall()
        return {r["material_pair_key"]: dict(r) for r in rows}

    def _get_topics(self, mat: Dict[str, Any]) -> List[str]:
        topics = extract_topic_from_metadata(mat.get("metadata_json"))
        if not topics:
            topics = extract_topic_from_filename(mat.get("file_name", ""), mat.get("content_preview", ""))
        return topics or ["__ungrouped__"]

    def _group_by_topic(self, materials: List[Dict[str, Any]]) -> Dict[str, List[Dict[str, Any]]]:
        groups: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        for m in materials:
            for t in self._get_topics(m):
                groups[t].append(m)
        return dict(groups)

    def _topic_similarity(self, a_topics: List[str], b_topics: List[str]) -> float:
        sa, sb = set(a_topics), set(b_topics)
        if "__ungrouped__" in sa or "__ungrouped__" in sb:
            return 0.5
        if not sa or not sb:
            return 0.0
        inter = sa & sb
        union = sa | sb
        return len(inter) / len(union) if union else 0.0

    def _check_skewed_distribution(
        self,
        topics: List[str],
        training_by_topic: Dict[str, List[Dict[str, Any]]],
        eval_by_topic: Dict[str, List[Dict[str, Any]]],
        result: AuditResult
    ) -> None:
        for t in topics:
            t_count = len(training_by_topic.get(t, []))
            e_count = len(eval_by_topic.get(t, []))
            if t_count == 0 or (t == "__ungrouped__"):
                continue
            ratio = e_count / t_count
            min_r, max_r = self.EXPECTED_RATIO
            if ratio < min_r or ratio > max_r:
                pair_key = f"topic_skew:{t}"
                err = ErrorHandler.evaluation_skewed(t, e_count, t_count, self.EXPECTED_RATIO)
                result.add_error(err)
                c = AuditConclusion(
                    material_pair_key=pair_key,
                    conclusion_type="skewed_evaluation",
                    severity="warning" if ratio < max_r else "error",
                    summary=(f"知识点「{t}」评测分布偏科：评测题数/训练样本数="
                             f"{ratio:.2f}，建议[{min_r}, {max_r}]"),
                    detail=err.details,
                    actionable_items=[err.suggestion]
                )
                result.add_conclusion(c)

    def _match_and_audit_pairs(
        self,
        training_materials: List[Dict[str, Any]],
        eval_materials: List[Dict[str, Any]],
        feedbacks: Dict[str, List[Dict[str, Any]]],
        prev_conclusions: Dict[str, Dict[str, Any]],
        result: AuditResult
    ) -> None:
        training_by_topic = self._group_by_topic(training_materials)
        eval_by_topic = self._group_by_topic(eval_materials)
        all_topics = sorted(set(training_by_topic) | set(eval_by_topic))

        self._check_skewed_distribution(all_topics, training_by_topic, eval_by_topic, result)

        eval_matched: set = set()

        for t_mat in training_materials:
            t_id = t_mat["material_id"]
            t_topics = self._get_topics(t_mat)
            t_has_feedback = t_id in feedbacks and any(
                fb["feedback_type"] in ("quality_review", "pass_fail", "human_rating")
                for fb in feedbacks[t_id]
            )

            if not t_has_feedback:
                pair_key = f"missing_feedback:{t_id}"
                err = ErrorHandler.missing_human_feedback(
                    material_file=t_mat["file_name"], material_id=t_id,
                    required_types=["quality_review", "pass_fail", "human_rating"]
                )
                result.add_error(err)
                c = AuditConclusion(
                    material_pair_key=pair_key,
                    conclusion_type="missing_feedback",
                    severity="error",
                    summary=f"训练样本「{t_mat['file_name']}」缺少人工反馈（质量评审/通过与否）",
                    detail=err.details,
                    actionable_items=[err.suggestion],
                    training_material_id=t_id
                )
                result.add_conclusion(c)

            best_eval = None
            best_sim = 0.0
            for e_mat in eval_materials:
                if e_mat["material_id"] in eval_matched and best_sim >= 1.0:
                    continue
                sim = self._topic_similarity(t_topics, self._get_topics(e_mat))
                if sim > best_sim:
                    best_sim = sim
                    best_eval = e_mat

            if best_eval is None or best_sim < self.TOPIC_MATCH_THRESHOLD:
                pair_key = f"unmatched:{t_id}"
                e_name = best_eval["file_name"] if best_eval else "(无候选评测题)"
                reason = (f"主题相似度 {best_sim:.2f} 低于阈值 {self.TOPIC_MATCH_THRESHOLD}"
                          if best_eval else "评测题库为空")
                err = ErrorHandler.unmatched_training_eval_pair(t_mat["file_name"], e_name, reason)
                result.add_error(err)
                c = AuditConclusion(
                    material_pair_key=pair_key,
                    conclusion_type="pending_confirmation",
                    severity="warning",
                    summary=f"训练样本「{t_mat['file_name']}」未找到匹配的评测题",
                    detail=err.details,
                    actionable_items=[err.suggestion],
                    training_material_id=t_id
                )
                result.add_conclusion(c)
                continue

            eval_matched.add(best_eval["material_id"])
            pair_key = f"pair:{t_id}->{best_eval['material_id']}"
            self._audit_single_pair(
                t_mat, best_eval, t_has_feedback, feedbacks, prev_conclusions, result, pair_key
            )

    def _audit_single_pair(
        self,
        t_mat: Dict[str, Any],
        e_mat: Dict[str, Any],
        t_has_feedback: bool,
        feedbacks: Dict[str, List[Dict[str, Any]]],
        prev_conclusions: Dict[str, Dict[str, Any]],
        result: AuditResult,
        pair_key: str
    ) -> None:
        t_topics = self._get_topics(t_mat)
        e_topics = self._get_topics(e_mat)
        topic_overlap = bool(set(t_topics) & set(e_topics) - {"__ungrouped__"})

        status = "pass"
        severity = "info"
        summary_parts = []
        detail: Dict[str, Any] = {
            "training_file": t_mat["file_name"],
            "evaluation_file": e_mat["file_name"],
            "t_topics": t_topics,
            "e_topics": e_topics,
            "topic_match": topic_overlap
        }
        actionables: List[str] = []

        if not topic_overlap:
            status = "pending_confirmation"
            severity = "warning"
            summary_parts.append("知识点未重合")
            actionables.append(
                f"请核对「{t_mat['file_name']}」与「{e_mat['file_name']}」"
                "是否确实属于同一知识点；若是，请在两者的 metadata 中添加相同 topic。"
            )

        if not t_has_feedback:
            status = "missing_feedback"
            severity = "error"
            summary_parts.append("缺人工反馈")
            err = ErrorHandler.missing_human_feedback(
                material_file=t_mat["file_name"], material_id=t_mat["material_id"],
                required_types=["quality_review", "pass_fail"]
            )
            result.add_error(err)
            actionables.append(err.suggestion)

        if t_has_feedback and topic_overlap:
            feedback_list = feedbacks.get(t_mat["material_id"], [])
            passes = 0
            fails = 0
            for fb in feedback_list:
                verdict = ""
                if isinstance(fb["content"], dict):
                    verdict = str(fb["content"].get("verdict", "")
                                  or fb["content"].get("result", "")
                                  or fb["content"].get("结论", "")).lower()
                if verdict in ("pass", "通过", "合格", "ok", "true"):
                    passes += 1
                elif verdict in ("fail", "不通过", "不合格", "ng", "false"):
                    fails += 1
            detail["feedback_verdict_pass"] = passes
            detail["feedback_verdict_fail"] = fails
            if fails > 0 and passes == 0:
                status = "fail"
                severity = "error"
                summary_parts.append(f"人工反馈判定不通过({fails}份)")
                actionables.append(
                    f"训练样本「{t_mat['file_name']}」被 {fails} 份人工反馈标记为不通过，"
                    "请修正样本或补充通过的人工反馈后再运行审计。"
                )
            else:
                summary_parts.append(f"人工反馈通过({passes}份)")

        if not summary_parts:
            summary_parts.append("训练样本与评测题匹配，人工反馈齐全")

        summary = (f"「{t_mat['file_name']}」 vs 「{e_mat['file_name']}」: "
                   + "，".join(summary_parts))

        prev = prev_conclusions.get(pair_key)
        if prev and prev["conclusion_type"] != status and not (
            prev["conclusion_type"] == "pass" and status == "pass"
        ):
            err = ErrorHandler.conflict_previous_conclusion(pair_key, prev["summary"], summary)
            result.add_error(err)
            c = AuditConclusion(
                material_pair_key=f"conflict:{pair_key}",
                conclusion_type="conflict",
                severity="warning",
                summary=(f"与上次结论冲突：上次「{prev['conclusion_type']}」，"
                         f"本次「{status}」"),
                detail={
                    "previous": prev,
                    "current": {
                        "conclusion_type": status,
                        "summary": summary
                    }
                },
                actionable_items=[err.suggestion],
                training_material_id=t_mat["material_id"],
                evaluation_material_id=e_mat["material_id"]
            )
            result.add_conclusion(c)

        c = AuditConclusion(
            material_pair_key=pair_key,
            conclusion_type=status,
            severity=severity,
            summary=summary,
            detail=detail,
            actionable_items=actionables,
            training_material_id=t_mat["material_id"],
            evaluation_material_id=e_mat["material_id"]
        )
        result.add_conclusion(c)

    def run_audit(self, run_id: str, training_batch_id: str, evaluation_batch_id: str,
                  force: bool = False) -> AuditResult:
        with self.db._get_conn() as conn:
            for bid, btype in [
                (training_batch_id, "训练样本"),
                (evaluation_batch_id, "评测题库")
            ]:
                row = conn.execute(
                    "SELECT batch_id FROM batches WHERE batch_id=?", (bid,)
                ).fetchone()
                if not row:
                    raise ErrorHandler.batch_not_found(bid, btype)

        training_materials = self._load_materials(training_batch_id)
        eval_materials = self._load_materials(evaluation_batch_id)
        feedbacks = self._load_feedbacks(training_batch_id)
        if not force:
            prev = self._load_previous_conclusions(training_batch_id, evaluation_batch_id)
        else:
            prev = {}

        result = AuditResult(run_id)
        self._match_and_audit_pairs(
            training_materials, eval_materials, feedbacks, prev, result
        )
        return result

    def save_conclusions(self, result: AuditResult) -> None:
        with self.db._get_conn() as conn:
            cursor = conn.cursor()
            for c in result.conclusions:
                cursor.execute(
                    "INSERT INTO audit_conclusions (conclusion_id, run_id, material_pair_key, "
                    "training_material_id, evaluation_material_id, conclusion_type, severity, "
                    "summary, detail_json, actionable_items_json, created_at, is_latest) "
                    "VALUES (?,?,?,?,?,?,?,?,?,?,?, 1)",
                    c.to_db_row(result.run_id)
                )

    def get_run_conclusions(self, run_id: str, only_latest: bool = True) -> List[Dict[str, Any]]:
        with self.db._get_conn() as conn:
            q = """
                SELECT c.*, m1.file_name as training_file, m2.file_name as evaluation_file
                FROM audit_conclusions c
                LEFT JOIN materials m1 ON c.training_material_id = m1.material_id
                LEFT JOIN materials m2 ON c.evaluation_material_id = m2.material_id
                WHERE c.run_id=?
            """
            args: List[Any] = [run_id]
            if only_latest:
                q += " AND c.is_latest=1"
            q += " ORDER BY c.severity, c.conclusion_type, c.material_pair_key"
            rows = conn.execute(q, args).fetchall()
            return [dict(r) for r in rows]
