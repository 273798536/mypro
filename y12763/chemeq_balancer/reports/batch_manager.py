"""
批次报告管理器
==============

负责:
    - 创建/加载批次报告
    - 添加反应记录 (含去重检测、补录合并)
    - 空白对照标记与检测
    - 状态更新 (验证/驳回/复测)
    - 自动记录审计追踪 (保证可追溯)
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

from ..balancer import (
    BalanceResult,
    BalanceMethod,
    balance_equation,
)
from ..models import (
    AuditAction,
    AuditTrailEntry,
    BatchReport,
    BalanceRecord as ModelBalanceRecord,
    ElementCount as ModelElementCount,
    ReactionRecord,
    ReactionStatus,
    RetestPriority,
    RetestSuggestion,
    make_id,
    now_iso,
)
from ..storage import StorageBackend, JsonFileStorage, get_default_storage


@dataclass
class AddReactionResult:
    """添加反应记录的结果"""
    success: bool
    reaction: Optional[ReactionRecord] = None
    is_duplicate: bool = False
    duplicate_of: Optional[str] = None
    action: str = ""
    warnings: List[str] = None

    def __post_init__(self):
        if self.warnings is None:
            self.warnings = []


class BatchManager:
    """批次报告管理器"""

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

    def list_batches(self) -> List[Dict]:
        """列出所有批次的摘要信息"""
        result = []
        for b in self.store.batches:
            summary = b.compute_summary()
            result.append({
                "id": b.id,
                "title": b.title,
                "operator": b.operator,
                "created_at": b.created_at,
                "updated_at": b.updated_at,
                **summary.to_display_dict(),
            })
        return result

    def create_batch(self, title: str, operator: str = "", description: str = "") -> BatchReport:
        """创建新批次"""
        batch = BatchReport(
            title=title,
            operator=operator,
            description=description,
        )
        batch.audit_trail.append(AuditTrailEntry(
            batch_id=batch.id,
            action=AuditAction.CREATE,
            operator=operator,
            comment=f"创建批次: {title}",
        ))
        self.store.add_batch(batch)
        self._save()
        return batch

    def get_batch(self, batch_id: str) -> Optional[BatchReport]:
        return self.store.get_batch(batch_id)

    def _convert_balance_result(self, b: BalanceResult) -> ModelBalanceRecord:
        """将配平结果转换为可持久化的 BalanceRecord"""
        elem_table = []
        for elem, info in b.element_table().items():
            elem_table.append(ModelElementCount(
                element=elem,
                reactant_total=info["reactants"],
                product_total=info["products"],
                conserved=info["conserved"],
            ))
        return ModelBalanceRecord(
            method=b.method.value,
            raw_equation=b.equation.raw_text,
            balanced_equation=b.format_equation(),
            coefficients=list(b.coefficients),
            element_table=elem_table,
            success=b.success,
            fail_reason=b.fail_reason,
            fail_message=b.fail_message,
        )

    def add_reaction(
        self,
        batch_id: str,
        raw_equation: str,
        operator: str = "",
        reaction_conditions: str = "",
        experiment_id: str = "",
        notes: str = "",
        is_blank: bool = False,
        source: str = "manual",
        source_ref: str = "",
        auto_balance: bool = True,
        balance_method: BalanceMethod = BalanceMethod.AUTO,
    ) -> AddReactionResult:
        """
        添加反应记录到批次。

        去重逻辑:
            - 若 fingerprint 已存在且状态为 VERIFIED, 拒绝添加并提示
            - 若 fingerprint 已存在但状态为 PENDING/REJECTED, 执行补录合并 (保留老 ID, 更新内容)
            - 若不存在, 正常创建
        """
        batch = self.get_batch(batch_id)
        if batch is None:
            return AddReactionResult(success=False, action="批次不存在")

        balanced_eq_str = ""
        balance_rec = None
        status = ReactionStatus.BLANK_CONTROL if is_blank else ReactionStatus.PENDING
        warnings = []

        if auto_balance and not is_blank:
            br = balance_equation(raw_equation, method=balance_method)
            balance_rec = self._convert_balance_result(br)
            if br.success and br.balanced_eq:
                balanced_eq_str = br.format_equation()
            else:
                warnings.append(f"配平失败: {br.fail_message}")
                status = ReactionStatus.NEEDS_RETEST

        # 检测指纹
        from ..models.schemas import reaction_fingerprint
        fp = reaction_fingerprint(raw_equation, reaction_conditions, experiment_id)
        existing = None
        for r in batch.reactions:
            if r.fingerprint == fp:
                existing = r
                break

        if existing is not None:
            if existing.status == ReactionStatus.VERIFIED and not is_blank:
                return AddReactionResult(
                    success=False,
                    reaction=existing,
                    is_duplicate=True,
                    duplicate_of=existing.id,
                    action="重复检测: 该反应已验证通过, 如需修改请先驳回",
                    warnings=["相同反应条件的记录已存在且状态为通过, 已拒绝添加"],
                )
            existing.raw_equation = raw_equation
            existing.balanced_equation = balanced_eq_str
            existing.reaction_conditions = reaction_conditions
            existing.experiment_id = experiment_id
            existing.notes = notes
            existing.operator = operator or existing.operator
            existing.is_blank = is_blank
            existing.updated_at = now_iso()
            if balance_rec is not None:
                existing.balance_result = balance_rec
            if status == ReactionStatus.NEEDS_RETEST:
                existing.status = status
            elif is_blank:
                existing.status = ReactionStatus.BLANK_CONTROL

            batch.audit_trail.append(AuditTrailEntry(
                batch_id=batch.id,
                reaction_id=existing.id,
                action=AuditAction.SUPPLEMENT,
                operator=operator,
                comment=f"补录/合并反应: {raw_equation[:60]}",
            ))
            batch.updated_at = now_iso()
            self._save()
            return AddReactionResult(
                success=True,
                reaction=existing,
                is_duplicate=True,
                duplicate_of=existing.id,
                action="补录合并: 已更新同指纹的旧记录",
                warnings=warnings,
            )

        reaction = ReactionRecord(
            batch_id=batch.id,
            raw_equation=raw_equation,
            balanced_equation=balanced_eq_str,
            reaction_conditions=reaction_conditions,
            experiment_id=experiment_id,
            notes=notes,
            operator=operator,
            is_blank=is_blank,
            status=status,
            balance_result=balance_rec,
            source=source,
            source_ref=source_ref,
        )

        action_type = AuditAction.MARK_BLANK if is_blank else AuditAction.CREATE
        batch.audit_trail.append(AuditTrailEntry(
            batch_id=batch.id,
            reaction_id=reaction.id,
            action=action_type,
            operator=operator,
            before=None,
            after={"raw_equation": raw_equation, "status": status.value},
            comment=f"{'标记空白对照' if is_blank else '添加反应'}: {raw_equation[:60]}",
        ))
        batch.reactions.append(reaction)
        batch.updated_at = now_iso()
        self._save()

        return AddReactionResult(
            success=True,
            reaction=reaction,
            is_duplicate=False,
            action="已添加新记录",
            warnings=warnings,
        )

    def set_status(
        self,
        batch_id: str,
        reaction_id: str,
        status: ReactionStatus,
        operator: str = "",
        comment: str = "",
    ) -> bool:
        """设置反应记录状态"""
        batch = self.get_batch(batch_id)
        if batch is None:
            return False
        reaction = batch.get_reaction(reaction_id)
        if reaction is None:
            return False
        before = {"status": reaction.status.value}
        reaction.status = status
        reaction.updated_at = now_iso()
        action_map = {
            ReactionStatus.VERIFIED: AuditAction.VERIFY,
            ReactionStatus.REJECTED: AuditAction.REJECT,
            ReactionStatus.NEEDS_RETEST: AuditAction.REQUEST_RETEST,
            ReactionStatus.BLANK_CONTROL: AuditAction.MARK_BLANK,
        }
        batch.audit_trail.append(AuditTrailEntry(
            batch_id=batch.id,
            reaction_id=reaction.id,
            action=action_map.get(status, AuditAction.UPDATE),
            operator=operator,
            before=before,
            after={"status": status.value},
            comment=comment or f"状态变更为 {status.display_name}",
        ))
        batch.updated_at = now_iso()
        self._save()
        return True

    def check_blank_control(self, batch_id: str) -> Tuple[bool, List[str]]:
        """检查批次是否包含空白对照, 返回 (是否通过, 缺失说明列表)"""
        batch = self.get_batch(batch_id)
        if batch is None:
            return False, ["批次不存在"]
        blank_count = sum(1 for r in batch.reactions if r.is_blank)
        issues = []
        if blank_count == 0:
            issues.append("该批次未包含任何空白对照记录, 请添加 is_blank=True 的记录")
        if blank_count > 1:
            issues.append(f"该批次包含 {blank_count} 条空白对照, 建议仅保留 1 条基准对照")
        return (len(issues) == 0), issues


def create_default_manager() -> BatchManager:
    """创建使用默认存储的批次管理器"""
    return BatchManager()
