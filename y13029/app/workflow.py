from datetime import datetime
from typing import Optional, List, Dict
from .models import (
    RiskWarning, WarningHistory, WarningStatus, ConfirmReason, ConflictRecord
)
from . import storage


DEFAULT_KEEP_CALIBRE_ORDER = [
    "口径A-申购金额", "口径A", "口径A-交易流水",
    "口径B-净资产变动", "口径B", "口径B-份额变动",
]


def _require(cond: bool, msg: str):
    if not cond:
        raise ValueError(msg)


def confirm_warning(
    warning_id: int,
    operator: str,
    conclusion: str,
    reason: Optional[ConfirmReason] = None,
    note: str = "",
    late_attachment_ref: str = "",
) -> dict:
    try:
        _require(isinstance(warning_id, int) and warning_id > 0, "预警ID必须是正整数")
        _require(operator and isinstance(operator, str) and operator.strip(), "操作人不能为空")
        _require(conclusion and isinstance(conclusion, str) and conclusion.strip(), "确认结论不能为空")
        w = storage.get_warning_by_id(warning_id)
        if not w:
            return {"ok": False, "error": f"预警ID不存在: {warning_id}"}
        if w.status in (WarningStatus.CONFIRMED, WarningStatus.WITHDRAWN):
            return {"ok": False, "error": (
                f"预警已处于终态 {w.status.value}，如需修改请先撤回再确认。"
            )}

        old_status = w.status.value
        update_kwargs = {
            "conclusion": conclusion.strip(),
            "confirmed_by": operator.strip(),
            "confirmed_at": datetime.now().isoformat(),
        }
        if reason:
            update_kwargs["confirm_reason"] = reason.value
        if note and note.strip():
            update_kwargs["confirm_note"] = (w.confirm_note + " | " + note.strip()) if w.confirm_note else note.strip()
        if late_attachment_ref and late_attachment_ref.strip():
            update_kwargs["late_attachment_ref"] = late_attachment_ref.strip()

        new_status = WarningStatus.CONFIRMED
        storage.update_warning_status(warning_id, new_status, **update_kwargs)

        detail_parts = [f"结论: {conclusion.strip()}"]
        if reason:
            detail_parts.append(f"原因: {reason.value}")
        if note:
            detail_parts.append(f"备注: {note.strip()}")
        if late_attachment_ref:
            detail_parts.append(f"关联晚到附件: {late_attachment_ref.strip()}")

        storage.insert_history(WarningHistory(
            warning_id=warning_id,
            action="confirm",
            action_by=operator.strip(),
            old_status=old_status,
            new_status=new_status.value,
            detail="; ".join(detail_parts),
        ))
        return {"ok": True, "warning_id": warning_id, "status": new_status.value}
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"确认失败: {str(e)}\n{traceback.format_exc()}"}


def confirm_batch(
    batch_id: str,
    operator: str,
    default_conclusion: str = "已复核，风险在容忍范围内",
    include_conflict: bool = False,
) -> dict:
    try:
        _require(batch_id and batch_id.strip(), "批次号不能为空")
        _require(operator and operator.strip(), "操作人不能为空")
        warnings = storage.get_warnings_by_batch(batch_id.strip())
        if not warnings:
            return {"ok": False, "error": f"批次无预警数据: {batch_id}"}
        target_status = {WarningStatus.PENDING_CONFIRM, WarningStatus.IMPORTED}
        if include_conflict:
            target_status.add(WarningStatus.CONFLICT)
        pending = [w for w in warnings if w.status in target_status]
        done, skipped, errors = 0, 0, []
        for w in pending:
            if w.status == WarningStatus.CONFLICT:
                skipped += 1
                errors.append(f"预警#{w.id}仍处于CONFLICT状态，需先解决冲突后再确认")
                continue
            r = confirm_warning(w.id, operator, default_conclusion,
                                reason=w.confirm_reason, note=w.confirm_note)
            if r["ok"]:
                done += 1
            else:
                skipped += 1
                errors.append(f"预警#{w.id}: {r.get('error', '未知错误')}")
        return {
            "ok": True,
            "batch_id": batch_id,
            "confirmed": done,
            "skipped": skipped,
            "total_target": len(pending),
            "errors": errors[:10],
        }
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"批量确认失败: {str(e)}\n{traceback.format_exc()}"}


def withdraw_warning(warning_id: int, operator: str, reason: str) -> dict:
    try:
        _require(isinstance(warning_id, int) and warning_id > 0, "预警ID必须是正整数")
        _require(operator and operator.strip(), "操作人不能为空")
        _require(reason and reason.strip(), "撤回原因不能为空")
        w = storage.get_warning_by_id(warning_id)
        if not w:
            return {"ok": False, "error": f"预警ID不存在: {warning_id}"}
        if w.status != WarningStatus.CONFIRMED:
            return {"ok": False, "error": (
                f"只有已确认状态的预警可以撤回，当前状态: {w.status.value}"
            )}

        old_status = w.status.value
        new_status = WarningStatus.WITHDRAWN
        new_conclusion = f"[已撤回(原因:{reason.strip()})] {w.conclusion}"
        storage.update_warning_status(warning_id, new_status, conclusion=new_conclusion)
        storage.insert_history(WarningHistory(
            warning_id=warning_id,
            action="withdraw",
            action_by=operator.strip(),
            old_status=old_status,
            new_status=new_status.value,
            detail=f"撤回原因: {reason.strip()}",
        ))
        return {"ok": True, "warning_id": warning_id, "status": new_status.value}
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"撤回失败: {str(e)}\n{traceback.format_exc()}"}


def resolve_conflict(
    conflict_id: int,
    operator: str,
    resolution: str,
    keep_warning_ids: List[int],
) -> dict:
    try:
        _require(isinstance(conflict_id, int) and conflict_id > 0, "冲突ID必须是正整数")
        _require(operator and operator.strip(), "操作人不能为空")
        _require(resolution and resolution.strip(), "解决说明不能为空")
        c = storage.get_conflict_by_id(conflict_id)
        if not c:
            return {"ok": False, "error": f"冲突记录不存在: {conflict_id}"}
        if c.resolved:
            return {"ok": False, "error": (
                f"冲突#{conflict_id}已经解决，如需修改请先重置"
            )}

        keep_set = set(int(x) for x in keep_warning_ids)
        unknown = keep_set - set(c.warning_ids)
        if unknown:
            return {"ok": False, "error": (
                f"保留列表中存在不属于冲突#{conflict_id}的预警ID: {sorted(unknown)}，"
                f"当前冲突包含的预警ID为 {c.warning_ids}"
            )}
        if not keep_set:
            return {"ok": False, "error": "至少保留一条预警，否则该笔资金将从报告中消失"}

        results = []
        for wid in c.warning_ids:
            w = storage.get_warning_by_id(wid)
            if not w:
                continue
            if wid in keep_set:
                new_status = WarningStatus.PENDING_CONFIRM
                detail = f"冲突解决，保留该预警: {resolution.strip()}"
            else:
                new_status = WarningStatus.WITHDRAWN
                detail = f"冲突解决，该笔为重复统计已剔除: {resolution.strip()}"
            old = w.status.value
            storage.update_warning_status(wid, new_status)
            storage.insert_history(WarningHistory(
                warning_id=wid,
                action="resolve_conflict",
                action_by=operator.strip(),
                old_status=old,
                new_status=new_status.value,
                detail=detail,
            ))
            results.append({"warning_id": wid, "to": new_status.value})

        from . import storage as s
        with s.get_conn() as conn:
            cur = conn.cursor()
            cur.execute("UPDATE conflict_records SET resolved = 1, resolution = ? WHERE id = ?",
                        (resolution.strip(), conflict_id))
        return {
            "ok": True,
            "conflict_id": conflict_id,
            "kept": sorted(keep_set),
            "withdrawn": sorted(set(c.warning_ids) - keep_set),
            "results": results,
        }
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"解决冲突失败: {str(e)}\n{traceback.format_exc()}"}


def resolve_all_conflicts_auto(
    batch_id: str,
    operator: str,
    keep_calibre_order: Optional[List[str]] = None,
) -> dict:
    """按口径优先级批量解决所有未解决冲突"""
    try:
        _require(batch_id and batch_id.strip(), "批次号不能为空")
        _require(operator and operator.strip(), "操作人不能为空")
        order = keep_calibre_order or DEFAULT_KEEP_CALIBRE_ORDER
        conflicts = storage.get_conflicts_by_batch(batch_id.strip())
        open_conflicts = [c for c in conflicts if not c.resolved]
        if not open_conflicts:
            return {"ok": True, "batch_id": batch_id, "resolved_count": 0, "message": "本批次无未解决冲突"}

        results = []
        for c in open_conflicts:
            keep_ids = _choose_keep_by_calibre(c, order)
            if keep_ids is None:
                results.append({"conflict_id": c.id, "error": "无法按口径优先级自动选择，请手动resolve-conflict"})
                continue
            resolution = (
                f"按口径优先级自动解决: 保留{keep_ids}，口径顺序{order}; "
                f"涉及投资者{c.investor_name} 金额{c.amount:,.2f}"
            )
            r = resolve_conflict(c.id, operator, resolution, keep_ids)
            results.append({"conflict_id": c.id, "result": r})
        resolved_ok = sum(1 for x in results if isinstance(x.get("result", {}), dict) and x["result"].get("ok"))
        return {
            "ok": True,
            "batch_id": batch_id,
            "total_open": len(open_conflicts),
            "resolved_count": resolved_ok,
            "details": results,
        }
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"批量解决冲突失败: {str(e)}\n{traceback.format_exc()}"}


def _choose_keep_by_calibre(c: ConflictRecord, order: List[str]) -> Optional[List[int]]:
    """按口径优先级从每个冲突涉及的预警中选一个保留"""
    id_by_cal = {}
    for wid, cal in zip(c.warning_ids, c.calibres):
        id_by_cal.setdefault(cal, wid)
    for cal in order:
        if cal in id_by_cal:
            return [id_by_cal[cal]]
    return None


def add_remark(warning_id: int, remark: str, operator: str = "system") -> dict:
    try:
        _require(isinstance(warning_id, int) and warning_id > 0, "预警ID必须是正整数")
        _require(remark and remark.strip(), "备注不能为空")
        w = storage.get_warning_by_id(warning_id)
        if not w:
            return {"ok": False, "error": f"预警ID不存在: {warning_id}"}
        new_remark = (w.remark + " | " + remark.strip()) if w.remark else remark.strip()
        storage.update_warning_status(warning_id, w.status, remark=new_remark)
        storage.insert_history(WarningHistory(
            warning_id=warning_id,
            action="add_remark",
            action_by=operator.strip() if operator else "system",
            old_status=w.status.value,
            new_status=w.status.value,
            detail=f"追加备注: {remark.strip()}",
        ))
        return {"ok": True, "warning_id": warning_id, "remark": new_remark}
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"追加备注失败: {str(e)}\n{traceback.format_exc()}"}


def link_late_attachment(warning_id: int, attachment_ref: str, conclusion: str, operator: str) -> dict:
    try:
        _require(isinstance(warning_id, int) and warning_id > 0, "预警ID必须是正整数")
        _require(attachment_ref and attachment_ref.strip(), "附件引用不能为空")
        _require(conclusion and conclusion.strip(), "确认结论不能为空")
        _require(operator and operator.strip(), "操作人不能为空")
        w = storage.get_warning_by_id(warning_id)
        if not w:
            return {"ok": False, "error": f"预警ID不存在: {warning_id}"}
        if w.status == WarningStatus.WITHDRAWN:
            return {"ok": False, "error": "预警已撤回，不能再关联附件确认"}
        old = w.status.value
        storage.update_warning_status(
            warning_id, WarningStatus.CONFIRMED,
            late_attachment_ref=attachment_ref.strip(),
            conclusion=conclusion.strip(),
            confirmed_by=operator.strip(),
            confirmed_at=datetime.now().isoformat(),
            confirm_reason=ConfirmReason.LATE_ATTACHMENT.value,
        )
        storage.insert_history(WarningHistory(
            warning_id=warning_id,
            action="link_late_attachment",
            action_by=operator.strip(),
            old_status=old,
            new_status=WarningStatus.CONFIRMED.value,
            detail=f"关联晚到附件 {attachment_ref.strip()}，结论: {conclusion.strip()}",
        ))
        return {"ok": True, "warning_id": warning_id, "attachment": attachment_ref.strip()}
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"关联晚到附件失败: {str(e)}\n{traceback.format_exc()}"}


def finalize_batch(batch_id: str, operator: str,
                   force: bool = False,
                   keep_calibre_order: Optional[List[str]] = None) -> dict:
    """
    批次收尾：
      1) 按口径优先级自动解决所有未解决冲突
      2) 批量确认 remaining pending_confirm/imported
      3) 一致性检查：剩余 conflict + pending_confirm + imported 必须为 0
    """
    try:
        _require(batch_id and batch_id.strip(), "批次号不能为空")
        _require(operator and operator.strip(), "操作人不能为空")
        steps = []

        r1 = resolve_all_conflicts_auto(batch_id, operator, keep_calibre_order)
        steps.append({"step": "resolve_conflicts", "result": r1})

        r2 = confirm_batch(batch_id, operator)
        steps.append({"step": "confirm_pending", "result": r2})

        check = check_batch_consistency(batch_id)
        steps.append({"step": "consistency_check", "result": check})

        if not check["clean"] and not force:
            return {
                "ok": False,
                "batch_id": batch_id,
                "error": "收尾后仍有未关闭的预警，详见 consistency_check。"
                         "如需强制收尾请加 --force。",
                "steps": steps,
            }

        return {"ok": True, "batch_id": batch_id, "clean": check["clean"],
                "warnings_total": check["total"], "steps": steps}
    except ValueError as e:
        return {"ok": False, "error": f"参数错误: {str(e)}"}
    except Exception as e:
        import traceback
        return {"ok": False, "error": f"批次收尾失败: {str(e)}\n{traceback.format_exc()}"}


def check_batch_consistency(batch_id: str) -> Dict:
    """
    导出/收尾前做一致性检查，返回:
      - clean: bool 是否全部闭环
      - total / confirmed / withdrawn / pending / conflict / bad_data / conflicts_open
      - issues: 具体未闭环项列表
    """
    from collections import Counter
    warnings = storage.get_warnings_by_batch(batch_id)
    status_counter = Counter(w.status.value for w in warnings)

    open_conflicts = [c for c in storage.get_conflicts_by_batch(batch_id) if not c.resolved]
    bad_data = storage.get_all_bad_data()
    batch_bad = [b for b in bad_data if any(
        w.source_file == b.source_file for w in warnings
        for w in [storage.get_receipt_by_id(w.receipt_id)] if w
    )]

    issues = []
    for w in warnings:
        if w.status in (WarningStatus.CONFLICT, WarningStatus.PENDING_CONFIRM, WarningStatus.IMPORTED):
            issues.append({
                "warning_id": w.id,
                "code": w.warning_code,
                "status": w.status.value,
                "reason": w.confirm_reason.value if w.confirm_reason else None,
                "description": w.description[:60],
            })
    for c in open_conflicts:
        issues.append({
            "conflict_id": c.id,
            "investor": c.investor_name,
            "amount": c.amount,
            "calibres": c.calibres,
            "warning_ids": c.warning_ids,
        })

    clean = (
        not issues
        and status_counter.get(WarningStatus.CONFLICT.value, 0) == 0
        and status_counter.get(WarningStatus.PENDING_CONFIRM.value, 0) == 0
        and status_counter.get(WarningStatus.IMPORTED.value, 0) == 0
    )

    return {
        "ok": True,
        "batch_id": batch_id,
        "clean": clean,
        "total": len(warnings),
        "confirmed": status_counter.get(WarningStatus.CONFIRMED.value, 0),
        "withdrawn": status_counter.get(WarningStatus.WITHDRAWN.value, 0),
        "pending": status_counter.get(WarningStatus.PENDING_CONFIRM.value, 0),
        "conflict": status_counter.get(WarningStatus.CONFLICT.value, 0),
        "imported": status_counter.get(WarningStatus.IMPORTED.value, 0),
        "bad_data": len(batch_bad),
        "open_conflicts": len(open_conflicts),
        "issues": issues,
    }
