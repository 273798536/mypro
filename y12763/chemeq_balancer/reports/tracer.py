"""
数据追溯器
==========

从结果一路回溯到来源和处理记录, 支持:
    1. 通过 reaction_id 追溯: 反应记录 -> 配平过程 -> 所有审计记录
    2. 通过 结果方程式/指纹 追溯: 在所有批次中定位相关记录
    3. 通过 批次ID 追溯: 完整批次历史
"""

from dataclasses import dataclass, field
from typing import Dict, List, Optional

from ..models import (
    AuditTrailEntry,
    BatchReport,
    ReactionRecord,
    ReactionStatus,
    now_iso,
)
from ..models.schemas import canonical_equation, reaction_fingerprint
from ..storage import StorageBackend, get_default_storage


@dataclass
class TraceResult:
    """追溯结果"""
    found: bool
    message: str = ""
    batch: Optional[Dict] = None
    reaction: Optional[Dict] = None
    balance_process: Optional[Dict] = None
    audit_trail: List[Dict] = field(default_factory=list)
    related_reactions: List[Dict] = field(default_factory=list)

    def format_human(self) -> str:
        if not self.found:
            return f"[追溯失败] {self.message}"
        lines = ["=" * 68, "数据追溯报告", "=" * 68]
        if self.batch:
            lines.append(f"批次: {self.batch['title']} ({self.batch['id']})")
            lines.append(f"     操作员: {self.batch.get('operator', '未填')} | 创建: {self.batch.get('created_at', '')[:19]}")
        lines.append("")
        if self.reaction:
            r = self.reaction
            lines.append(f"反应记录: {r['id']}")
            lines.append(f"  实验编号:   {r.get('experiment_id') or '未填'}")
            lines.append(f"  原始输入:   {r.get('raw_equation', '')}")
            lines.append(f"  配平结果:   {r.get('balanced_equation') or '(未配平)'}")
            lines.append(f"  反应条件:   {r.get('reaction_conditions') or '未填'}")
            lines.append(f"  当前状态:   {r.get('status_display')}")
            lines.append(f"  是否空白:   {'是' if r.get('is_blank') else '否'}")
            lines.append(f"  操作员:     {r.get('operator') or '未填'}")
            lines.append(f"  指纹:       {r.get('fingerprint', '')[:24]}...")
            lines.append(f"  来源:       {r.get('source', 'manual')} | 引用: {r.get('source_ref', '') or '无'}")
            lines.append(f"  创建时间:   {r.get('created_at', '')[:19]}")
            lines.append(f"  更新时间:   {r.get('updated_at', '')[:19]}")
        lines.append("")
        if self.balance_process:
            bp = self.balance_process
            lines.append("-" * 68)
            lines.append("配平过程记录:")
            lines.append(f"  方法:       {bp.get('method')}")
            lines.append(f"  是否成功:   {'是' if bp.get('success') else '否'}")
            if not bp.get('success'):
                lines.append(f"  失败原因:   {bp.get('fail_reason')}: {bp.get('fail_message', '')}")
            lines.append(f"  系数列表:   {bp.get('coefficients', [])}")
            et = bp.get('element_table', [])
            if et:
                lines.append("  元素守恒表:")
                for row in et:
                    mark = "✓" if row.get('conserved') else "✗"
                    lines.append(f"    {row.get('element', '?'):>4}  反应物 {row.get('reactant_total', 0):>4}  "
                                 f"产物 {row.get('product_total', 0):>4}  {mark}")
            lines.append(f"  配平时间:   {bp.get('balanced_at', '')[:19]}")
            lines.append(f"  工具版本:   {bp.get('balancer_version', '')}")
        lines.append("")
        if self.audit_trail:
            lines.append("-" * 68)
            lines.append(f"审计追踪 ({len(self.audit_trail)} 条, 从早到晚):")
            for e in self.audit_trail:
                ts = e.get('timestamp', '')[:19]
                action = e.get('action', '')
                op = e.get('operator') or 'system'
                comment = e.get('comment', '')
                lines.append(f"  [{ts}] {action} by {op}: {comment}")
                if e.get('before'):
                    lines.append(f"      before: {e['before']}")
                if e.get('after'):
                    lines.append(f"      after:  {e['after']}")
        if self.related_reactions:
            lines.append("")
            lines.append("-" * 68)
            lines.append(f"同指纹关联记录 ({len(self.related_reactions)} 条):")
            for r in self.related_reactions:
                lines.append(f"  - {r['id']} 状态=[{r.get('status_display')}] "
                             f"批次={r.get('batch_title')} 更新={r.get('updated_at', '')[:19]}")
        lines.append("=" * 68)
        return "\n".join(lines) + "\n"


class Tracer:
    """数据追溯器"""

    def __init__(self, storage: Optional[StorageBackend] = None):
        self.storage = storage or get_default_storage()
        self._store = None

    @property
    def store(self):
        if self._store is None:
            self._store = self.storage.load()
        return self._store

    def trace_reaction_id(self, reaction_id: str, batch_id: Optional[str] = None) -> TraceResult:
        """通过反应 ID 追溯完整链路"""
        target_batch: Optional[BatchReport] = None
        target_reaction: Optional[ReactionRecord] = None

        if batch_id:
            target_batch = self.store.get_batch(batch_id)
            if target_batch:
                target_reaction = target_batch.get_reaction(reaction_id)
        else:
            for b in self.store.batches:
                r = b.get_reaction(reaction_id)
                if r:
                    target_batch = b
                    target_reaction = r
                    break

        if not target_batch or not target_reaction:
            return TraceResult(found=False, message=f"未找到反应记录 {reaction_id}")

        result = TraceResult(found=True, message="OK")
        result.batch = {
            "id": target_batch.id,
            "title": target_batch.title,
            "operator": target_batch.operator,
            "created_at": target_batch.created_at,
            "updated_at": target_batch.updated_at,
        }
        result.reaction = {
            **target_reaction.model_dump(),
            "status_display": target_reaction.status.display_name,
        }
        if target_reaction.balance_result:
            result.balance_process = target_reaction.balance_result.model_dump()

        audits = target_batch.trace_reaction(reaction_id)
        result.audit_trail = [
            {
                "id": e.id,
                "action": e.action.value,
                "operator": e.operator,
                "timestamp": e.timestamp,
                "comment": e.comment,
                "before": e.before,
                "after": e.after,
            }
            for e in sorted(audits, key=lambda x: x.timestamp)
        ]

        fp = target_reaction.fingerprint
        related = []
        for b in self.store.batches:
            for r in b.reactions:
                if r.fingerprint == fp and r.id != reaction_id:
                    related.append({
                        "id": r.id,
                        "batch_id": b.id,
                        "batch_title": b.title,
                        "status": r.status.value,
                        "status_display": r.status.display_name,
                        "updated_at": r.updated_at,
                    })
        result.related_reactions = related
        return result

    def trace_equation(self, equation: str, conditions: str = "", experiment_id: str = "") -> TraceResult:
        """通过方程式内容追溯 (模糊匹配 + 指纹匹配)"""
        fp = reaction_fingerprint(equation, conditions, experiment_id)
        canon = canonical_equation(equation)

        matches = []
        for b in self.store.batches:
            for r in b.reactions:
                score = 0
                if r.fingerprint == fp:
                    score += 100
                if canonical_equation(r.raw_equation) == canon:
                    score += 50
                if r.balanced_equation and canonical_equation(r.balanced_equation) == canon:
                    score += 50
                if experiment_id and r.experiment_id == experiment_id:
                    score += 30
                if score > 0:
                    matches.append((score, b, r))

        if not matches:
            return TraceResult(found=False, message=f"未找到与方程式相关的记录: {equation}")

        matches.sort(key=lambda x: x[0], reverse=True)
        _, batch, reaction = matches[0]
        return self.trace_reaction_id(reaction.id, batch.id)
