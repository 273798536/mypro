from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import uuid
import hashlib
import json

from sqlalchemy.orm import Session
from .database import (
    ExperimentRecord, SpectrumData, BatchReport, CuringTimeResult, ImportAuditLog
)
from .curing_algorithm import CuringTimeAnalyzer, build_consistent_output


class ActionableError(Exception):
    """可操作错误:附带明确的建议和上下文,而不是抛内部栈"""

    def __init__(self, message: str, suggestion: str, detail: Dict = None, code: str = "ACTION_REQUIRED"):
        super().__init__(message)
        self.message = message
        self.suggestion = suggestion
        self.detail = detail or {}
        self.code = code

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": True,
            "code": self.code,
            "message": self.message,
            "suggestion": self.suggestion,
            "detail": self.detail,
        }


def _make_record_no(batch_no: str, seq_no: int) -> str:
    return f"{batch_no}-{seq_no:03d}"


def _data_signature(time_points, signal_values) -> str:
    raw = json.dumps({"t": time_points, "s": signal_values}, sort_keys=True)
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()[:32]


def validate_batch_exists(db: Session, batch_no: str) -> Optional[BatchReport]:
    br = db.query(BatchReport).filter(BatchReport.batch_no == batch_no).first()
    if not br:
        raise ActionableError(
            message=f"未找到批号 [{batch_no}] 对应的批次报告",
            suggestion=f"请先在【批次报告管理】中录入批号 {batch_no} 的完整报告(至少填写:树脂型号、生产厂家、标称浓度),再进行实验记录导入。",
            detail={"missing_batch_no": batch_no, "next_step": "create_batch_report"}
        )
    return br


def _find_existing_by_signature(db: Session, sig: str) -> Optional[Tuple[ExperimentRecord, SpectrumData]]:
    """SQLite JSON匹配:用 json_extract(raw_json, '$._sig') 语法"""
    from sqlalchemy import func, text
    sd = db.query(SpectrumData).filter(
        func.json_extract(SpectrumData.raw_json, text("'$._sig'")) == sig
    ).first()
    if sd:
        exp = db.query(ExperimentRecord).filter(ExperimentRecord.spectrum_id == sd.spectrum_id).first()
        return exp, sd
    return None


def resolve_duplicate_record_no(db: Session, batch_no: str, preferred_seq: Optional[int] = None) -> Tuple[str, int]:
    """
    幂等策略:
    - 优先使用请求的 seq;
    - 如果同 seq 已存在,仍然返回该seq(交由调用方判断是更新还是报错);
    - 返回 (record_no, seq_no)
    """
    if preferred_seq:
        candidate = _make_record_no(batch_no, preferred_seq)
        # 注意:即使已存在,也返回这个seq(让后续逻辑判断UPDATED或报错)
        return candidate, preferred_seq

    existing = db.query(ExperimentRecord.seq_no).filter(
        ExperimentRecord.batch_no == batch_no
    ).all()
    used_seqs = {r[0] for r in existing}
    next_seq = 1
    while next_seq in used_seqs:
        next_seq += 1
    return _make_record_no(batch_no, next_seq), next_seq


def import_single_experiment(
    db: Session,
    *,
    batch_no: str,
    spectrum_payload: Dict[str, Any],
    seq_no: Optional[int] = None,
    operator: str = "",
    experiment_date: str = "",
    initial_weight: Optional[float] = None,
    curing_agent_ratio: Optional[float] = None,
    actual_concentration: Optional[float] = None,
    remark: str = "",
    allow_update: bool = True,
    operator_audit: str = "system",
) -> Dict[str, Any]:
    """
    单条实验记录导入核心流程:
      1. 校验批次报告存在 -> 不可用时抛 ActionableError
      2. 校验谱图数据完整性
      3. 数据签名 -> 完全相同的数据直接复用
      4. 解析 record_no,处理同批号重复 -> 幂等更新/安全新增
      5. 运行固化时间判定算法
      6. 统一落库,写审计日志
      7. 返回 图/表/文字 一致的 canonical 输出
    """
    import_batch_id = "IMP-" + uuid.uuid4().hex[:10]

    br = validate_batch_exists(db, batch_no)

    time_points = spectrum_payload.get("time_points")
    signal_values = spectrum_payload.get("signal_values")
    if not time_points or not signal_values or len(time_points) != len(signal_values):
        raise ActionableError(
            message="谱图数据不完整:时间点序列或信号序列缺失/长度不一致",
            suggestion="请检查谱图文件格式,确认导出时同时包含 time_points 和 signal_values 两个字段(长度必须相等)。",
            detail={"len_time": len(time_points or []), "len_signal": len(signal_values or [])}
        )
    if len(time_points) < 10:
        raise ActionableError(
            message=f"谱图数据点过少({len(time_points)}个)",
            suggestion="当前数据点不足以进行可靠的固化判定,请重新采集至少50个采样点的完整谱图。",
            detail={"received_points": len(time_points), "required_min": 50}
        )

    sig = _data_signature(time_points, signal_values)

    dup = _find_existing_by_signature(db, sig)
    if dup:
        exp_exist, sd_exist = dup
        result_exist = db.query(CuringTimeResult).filter(
            CuringTimeResult.record_no == exp_exist.record_no
        ).first()
        _write_audit(db, import_batch_id, exp_exist.record_no, "SKIPPED",
                     reason="完全相同的谱图数据已存在",
                     suggestion=f"请使用现有记录号 {exp_exist.record_no},或确认是否为重复导入。",
                     detail={"existing_record": exp_exist.record_no, "dup_signature": True},
                     operator=operator_audit)
        db.commit()
        return {
            "action": "SKIPPED",
            "reason": "duplicate_spectrum_data",
            "existing_record_no": exp_exist.record_no,
            "canonical": _load_canonical(db, exp_exist.record_no),
            "import_batch_id": import_batch_id,
        }

    # 显式指定了seq_no + 该seq已存在 + 禁止更新 = 必须抛可操作错误
    if seq_no is not None:
        candidate_explicit = _make_record_no(batch_no, seq_no)
        explicit_exist = db.query(ExperimentRecord).filter(
            ExperimentRecord.record_no == candidate_explicit
        ).first()
        if explicit_exist and not allow_update:
            # 计算下一个可用序号
            existing = db.query(ExperimentRecord.seq_no).filter(
                ExperimentRecord.batch_no == batch_no
            ).all()
            used = {r[0] for r in existing}
            suggested = 1
            while suggested in used:
                suggested += 1
            raise ActionableError(
                message=f"同批号[{batch_no}]下的序号 seq_no={seq_no} 已被占用(记录号 {candidate_explicit}),且未启用更新模式",
                suggestion=(
                    f"方案1:将 allow_update 设为 true,以覆盖旧数据(幂等补录模式);"
                    f"方案2:使用下一个未占用的序号 {suggested} 作为新实验记录。"
                ),
                detail={
                    "conflict_record_no": candidate_explicit,
                    "conflict_seq": seq_no,
                    "suggested_seq": suggested,
                    "operation_mode": "allow_update=False"
                }
            )

    record_no, assigned_seq = resolve_duplicate_record_no(db, batch_no, seq_no)

    existing_same_no = db.query(ExperimentRecord).filter(
        ExperimentRecord.record_no == record_no
    ).first()
    if existing_same_no and not allow_update:
        raise ActionableError(
            message=f"记录号 {record_no} 已存在,且未启用更新模式",
            suggestion=(
                f"该记录号对应的数据已入库。若要覆盖旧数据,请在导入时设置 allow_update=true; "
                f"若为新实验,建议使用下一个序号(当前最大序号 {assigned_seq})。"
            ),
            detail={"conflict_record_no": record_no, "suggested_seq": assigned_seq + 1}
        )

    try:
        analyzer = CuringTimeAnalyzer(time_points, signal_values)
        canonical = build_consistent_output(
            analyzer, batch_no=batch_no, record_no=record_no,
            operator=operator, experiment_date=experiment_date, remark=remark
        )
    except ValueError as e:
        raise ActionableError(
            message=f"固化时间判定失败: {str(e)}",
            suggestion="请检查谱图是否为树脂固化相关数据(时间递增、信号呈S型固化曲线)。若数据采集异常,请重新测试。",
            detail={"algorithm_error": str(e)}
        )

    spectrum_id = "SP-" + uuid.uuid4().hex[:10]
    sd_raw = dict(spectrum_payload)
    sd_raw["_sig"] = sig

    if existing_same_no and allow_update:
        old_sd = db.query(SpectrumData).filter(
            SpectrumData.spectrum_id == existing_same_no.spectrum_id
        ).first()
        if old_sd:
            old_sd.file_name = spectrum_payload.get("file_name", old_sd.file_name)
            old_sd.spectrum_type = spectrum_payload.get("spectrum_type", old_sd.spectrum_type)
            old_sd.time_points = time_points
            old_sd.signal_values = signal_values
            old_sd.temperature = spectrum_payload.get("temperature")
            old_sd.measured_at = spectrum_payload.get("measured_at")
            old_sd.raw_json = sd_raw
            existing_same_no.spectrum_id = old_sd.spectrum_id
        else:
            new_sd = SpectrumData(
                spectrum_id=spectrum_id,
                file_name=spectrum_payload.get("file_name", "unknown.csv"),
                spectrum_type=spectrum_payload.get("spectrum_type", "FTIR"),
                time_points=time_points, signal_values=signal_values,
                temperature=spectrum_payload.get("temperature"),
                measured_at=spectrum_payload.get("measured_at"),
                raw_json=sd_raw,
            )
            db.add(new_sd)
            existing_same_no.spectrum_id = spectrum_id

        existing_same_no.operator = operator or existing_same_no.operator
        existing_same_no.experiment_date = experiment_date or existing_same_no.experiment_date
        existing_same_no.initial_weight = initial_weight if initial_weight is not None else existing_same_no.initial_weight
        existing_same_no.curing_agent_ratio = curing_agent_ratio if curing_agent_ratio is not None else existing_same_no.curing_agent_ratio
        existing_same_no.actual_concentration = actual_concentration if actual_concentration is not None else existing_same_no.actual_concentration
        existing_same_no.remark = remark or existing_same_no.remark

        old_result = db.query(CuringTimeResult).filter(
            CuringTimeResult.record_no == record_no
        ).first()
        if old_result:
            old_result.gel_time = canonical["summary_numbers"]["gel_time"]
            old_result.vitrification_time = canonical["summary_numbers"]["vitrification_time"]
            old_result.full_cure_time = canonical["summary_numbers"]["full_cure_time"]
            old_result.curing_degree = canonical["summary_numbers"]["curing_degree"]
            old_result.peak_signal = canonical["summary_numbers"]["peak_signal"]
            old_result.peak_area = canonical["summary_numbers"]["peak_area"]
            old_result.method_used = canonical["summary_numbers"]["method_used"]
            old_result.judgment = canonical["summary_numbers"]["judgment"]
            old_result.confidence = canonical["summary_numbers"]["confidence"]
            old_result.chart_summary = canonical["chart_data"]
            old_result.text_summary = canonical["text_report"]
            old_result.recalculation_count += 1
            old_result.calculated_at = datetime.now()
        else:
            db.add(CuringTimeResult(
                record_no=record_no, **canonical["summary_numbers"],
                chart_summary=canonical["chart_data"],
                text_summary=canonical["text_report"],
            ))

        _write_audit(db, import_batch_id, record_no, "UPDATED",
                     reason="同记录号已存在,已按幂等模式更新为新数据",
                     suggestion="若为补录数据,请确认结论已同步更新;若不需要覆盖,请切换记录号。",
                     detail={"updated_fields": ["spectrum", "curing_result", "meta"]},
                     operator=operator_audit)
        action = "UPDATED"
    else:
        db.add(SpectrumData(
            spectrum_id=spectrum_id,
            file_name=spectrum_payload.get("file_name", "unknown.csv"),
            spectrum_type=spectrum_payload.get("spectrum_type", "FTIR"),
            time_points=time_points, signal_values=signal_values,
            temperature=spectrum_payload.get("temperature"),
            measured_at=spectrum_payload.get("measured_at"),
            raw_json=sd_raw,
        ))
        db.add(ExperimentRecord(
            record_no=record_no, batch_no=batch_no, seq_no=assigned_seq,
            spectrum_id=spectrum_id, operator=operator,
            experiment_date=experiment_date, initial_weight=initial_weight,
            curing_agent_ratio=curing_agent_ratio,
            actual_concentration=actual_concentration, remark=remark,
        ))
        db.add(CuringTimeResult(
            record_no=record_no, **canonical["summary_numbers"],
            chart_summary=canonical["chart_data"],
            text_summary=canonical["text_report"],
        ))
        _write_audit(db, import_batch_id, record_no, "CREATED",
                     reason=f"新记录 {record_no} 入库成功",
                     suggestion="可在【谱图判读】中查看图、表、文字说明。",
                     detail={"assigned_seq": assigned_seq},
                     operator=operator_audit)
        action = "CREATED"

    db.commit()

    return {
        "action": action,
        "record_no": record_no,
        "seq_no": assigned_seq,
        "batch_no": batch_no,
        "canonical": _load_canonical(db, record_no),
        "import_batch_id": import_batch_id,
        "batch_report_info": {
            "resin_type": br.resin_type,
            "manufacturer": br.manufacturer,
            "nominal_concentration": br.nominal_concentration,
        }
    }


def _write_audit(db, import_batch_id, record_no, action, reason="", suggestion="", detail=None, operator="system"):
    db.add(ImportAuditLog(
        import_batch_id=import_batch_id,
        record_no=record_no,
        action=action,
        reason=reason,
        suggestion=suggestion,
        detail=detail or {},
        operator=operator,
    ))


def _load_canonical(db: Session, record_no: str) -> Dict[str, Any]:
    exp = db.query(ExperimentRecord).filter(ExperimentRecord.record_no == record_no).first()
    if not exp:
        raise ActionableError(
            message=f"记录 {record_no} 不存在",
            suggestion="请确认记录号是否正确,或先完成导入。",
            detail={"missing_record": record_no}
        )
    sd = db.query(SpectrumData).filter(SpectrumData.spectrum_id == exp.spectrum_id).first()
    r = db.query(CuringTimeResult).filter(CuringTimeResult.record_no == record_no).first()
    if not r:
        analyzer = CuringTimeAnalyzer(sd.time_points, sd.signal_values)
        canonical = build_consistent_output(
            analyzer, batch_no=exp.batch_no, record_no=record_no,
            operator=exp.operator or "", experiment_date=exp.experiment_date or "",
            remark=exp.remark or "",
        )
        return canonical

    summary_numbers = {
        "gel_time": r.gel_time, "vitrification_time": r.vitrification_time,
        "full_cure_time": r.full_cure_time, "curing_degree": r.curing_degree,
        "peak_signal": r.peak_signal, "peak_area": r.peak_area,
        "method_used": r.method_used, "judgment": r.judgment, "confidence": r.confidence,
    }
    analyzer = CuringTimeAnalyzer(sd.time_points, sd.signal_values)
    analyzer.result = {**summary_numbers,
                       "gel_idx": r.chart_summary.get("gel_idx") if isinstance(r.chart_summary, dict) else 0,
                       "vit_idx": r.chart_summary.get("vit_idx") if isinstance(r.chart_summary, dict) else 0,
                       "plat_idx": r.chart_summary.get("plat_idx") if isinstance(r.chart_summary, dict) else 0,
                       "peak_idx": int(np_argmax(sd.signal_values)),
                       "issues": []}
    table = analyzer.get_metrics_table()

    canonical_hash = hash(json.dumps({
        "r": summary_numbers,
        "t": table,
        "c": (r.chart_summary or {}).get("markers", []),
    }, sort_keys=True, default=str))

    return {
        "record_no": record_no,
        "batch_no": exp.batch_no,
        "summary_numbers": summary_numbers,
        "metrics_table": table,
        "chart_data": r.chart_summary or analyzer.generate_chart_summary(),
        "text_report": r.text_summary or analyzer.generate_text_report(
            exp.batch_no, record_no, exp.operator or "", exp.experiment_date or "",
            {"remark": exp.remark}
        ),
        "judgment_badge": r.judgment,
        "canonical_hash": canonical_hash,
    }


def np_argmax(values):
    try:
        import numpy as np
        return int(np.argmax(values))
    except Exception:
        return max(range(len(values)), key=lambda i: values[i])


def query_canonical(db: Session, record_no: str) -> Dict[str, Any]:
    return _load_canonical(db, record_no)


def query_by_batch(db: Session, batch_no: str) -> List[Dict[str, Any]]:
    validate_batch_exists(db, batch_no)
    records = db.query(ExperimentRecord).filter(
        ExperimentRecord.batch_no == batch_no
    ).order_by(ExperimentRecord.seq_no).all()
    return [_load_canonical(db, r.record_no) for r in records]
