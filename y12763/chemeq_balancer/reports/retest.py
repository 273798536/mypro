"""
复测建议管理器
==============

日常入口: 执行 chemeq retest 即可扫描所有批次, 输出需要复测的条目。

扫描触发条件:
    1. 配平失败的记录 (balance_result.success=False)
    2. 状态为 needs_retest 的记录
    3. 批次缺少空白对照
    4. 同一批次内指纹冲突 (同反应多结论)
    5. 长时间未处理的 pending 记录 (默认 > 7 天)
"""

from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional

from ..models import (
    BatchReport,
    ReactionStatus,
    RetestPriority,
    RetestSuggestion,
    now_iso,
)
from ..storage import StorageBackend, get_default_storage


PENDING_THRESHOLD_DAYS = 7


class RetestManager:
    """复测建议管理器"""

    def __init__(self, storage: Optional[StorageBackend] = None):
        self.storage = storage or get_default_storage()
        self._store = None

    @property
    def store(self):
        if self._store is None:
            self._store = self.storage.load()
        return self._store

    def _save(self):
        self.storage.save(self._store)

    def scan_batch(self, batch: BatchReport) -> List[RetestSuggestion]:
        """扫描单个批次, 返回建议列表 (不自动写入)"""
        suggestions: List[RetestSuggestion] = []

        blank_count = sum(1 for r in batch.reactions if r.is_blank)
        if blank_count == 0:
            suggestions.append(RetestSuggestion(
                batch_id=batch.id,
                reaction_id=None,
                priority=RetestPriority.CRITICAL,
                reason="批次缺少空白对照",
                recommendation="请添加至少一条 is_blank=True 的空白对照记录, 该记录不参与统计但用于质控",
                created_by="system",
            ))

        duplicates = batch.find_duplicates()
        for fp, rids in duplicates.items():
            reactions = [batch.get_reaction(rid) for rid in rids]
            statuses = {r.status.value for r in reactions if r}
            if len(statuses) > 1:
                for rid in rids:
                    suggestions.append(RetestSuggestion(
                        batch_id=batch.id,
                        reaction_id=rid,
                        priority=RetestPriority.HIGH,
                        reason=f"同指纹 {fp[:12]} 存在多条不同状态的结论",
                        recommendation="请合并或确认哪条是最终结论, 同一件事只允许保留一份结论",
                        created_by="system",
                    ))

        threshold = datetime.now(timezone.utc) - timedelta(days=PENDING_THRESHOLD_DAYS)
        for r in batch.reactions:
            reasons = []
            priority = RetestPriority.LOW

            if r.status == ReactionStatus.NEEDS_RETEST:
                reasons.append("状态已标记为需复测")
                priority = RetestPriority.HIGH

            if r.balance_result and not r.balance_result.success:
                fail_msg = r.balance_result.fail_message or r.balance_result.fail_reason or "未知原因"
                reasons.append(f"配平失败: {fail_msg}")
                priority = max(priority, RetestPriority.HIGH)

            if r.status == ReactionStatus.PENDING and not r.is_blank:
                try:
                    updated = datetime.fromisoformat(r.updated_at.replace("Z", "+00:00"))
                except Exception:
                    updated = datetime.now(timezone.utc)
                if updated < threshold:
                    reasons.append(f"待确认超过 {PENDING_THRESHOLD_DAYS} 天未处理")
                    priority = max(priority, RetestPriority.MEDIUM)

            if reasons:
                existing_ids = {s.reaction_id for s in batch.retest_suggestions if not s.resolved}
                if r.id not in existing_ids:
                    suggestions.append(RetestSuggestion(
                        batch_id=batch.id,
                        reaction_id=r.id,
                        priority=priority,
                        reason="; ".join(reasons),
                        recommendation="请复核实验记录与配平输入, 必要时重新提交",
                        created_by="system",
                    ))

        return suggestions

    def scan_all(self, auto_apply: bool = True) -> List[Dict]:
        """扫描所有批次, 返回聚合建议列表"""
        all_suggestions: List[Dict] = []
        for batch in self.store.batches:
            new_sugs = self.scan_batch(batch)
            if auto_apply and new_sugs:
                existing_unresolved = {s.reason: s for s in batch.retest_suggestions if not s.resolved and s.reaction_id is None}
                for s in new_sugs:
                    key = (s.reaction_id, s.reason)
                    dup = False
                    for existing in batch.retest_suggestions:
                        if not existing.resolved and (existing.reaction_id, existing.reason) == key:
                            dup = True
                            break
                    if not dup:
                        batch.retest_suggestions.append(s)
                batch.updated_at = now_iso()
            for s in new_sugs:
                all_suggestions.append({
                    "id": s.id,
                    "batch_id": s.batch_id,
                    "batch_title": batch.title,
                    "reaction_id": s.reaction_id,
                    "priority": s.priority.value,
                    "priority_display": s.priority.display_name,
                    "reason": s.reason,
                    "recommendation": s.recommendation,
                    "created_at": s.created_at,
                })
        if auto_apply:
            self._save()
        all_suggestions.sort(key=lambda d: (
            {"critical": 0, "high": 1, "medium": 2, "low": 3}[d["priority"]],
            d["created_at"],
        ))
        return all_suggestions

    def resolve(self, suggestion_id: str, operator: str = "", comment: str = "") -> bool:
        """标记一条复测建议为已解决"""
        for batch in self.store.batches:
            for s in batch.retest_suggestions:
                if s.id == suggestion_id:
                    s.resolved = True
                    s.resolved_at = now_iso()
                    s.resolved_by = operator
                    batch.updated_at = now_iso()
                    self._save()
                    return True
        return False

    def list_unresolved(self, batch_id: Optional[str] = None) -> List[Dict]:
        """列出未解决的复测建议 (日常查看入口)"""
        result = []
        for batch in self.store.batches:
            if batch_id and batch.id != batch_id:
                continue
            for s in batch.retest_suggestions:
                if not s.resolved:
                    result.append({
                        "id": s.id,
                        "batch_id": batch.id,
                        "batch_title": batch.title,
                        "reaction_id": s.reaction_id,
                        "priority": s.priority.value,
                        "priority_display": s.priority.display_name,
                        "reason": s.reason,
                        "recommendation": s.recommendation,
                        "created_at": s.created_at,
                    })
        result.sort(key=lambda d: (
            {"critical": 0, "high": 1, "medium": 2, "low": 3}[d["priority"]],
            d["created_at"],
        ))
        return result


def scan_for_retest() -> List[Dict]:
    """便捷函数: 扫描并返回所有待处理复测建议"""
    return RetestManager().scan_all()
