from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from .evaluation import apply_human_correction, recompute_summary_from_results, run_evaluation
from .exporter import export_to_string, build_export_payload
from .models import (
    DriftReport,
    ErrorResponse,
    EvalBenchmark,
    ExportFormat,
    HumanCorrectionRequest,
)
from .sample_data import (
    BASELINE_MODEL,
    SAMPLE_DATA_DIR,
    TARGET_MODEL,
    ensure_sample_data_files,
)


app = FastAPI(title="嵌入向量漂移监控")

BASE_DIR = Path(__file__).resolve().parent
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


_global_report: Optional[DriftReport] = None


class OperationError(Exception):
    def __init__(
        self,
        error_code: str,
        message: str,
        actionable_suggestion: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        self.error_code = error_code
        self.message = message
        self.actionable_suggestion = actionable_suggestion
        self.details = details or {}


@app.exception_handler(OperationError)
async def operation_error_handler(request: Request, exc: OperationError):
    return JSONResponse(
        status_code=400,
        content=ErrorResponse(
            error_code=exc.error_code,
            message=exc.message,
            actionable_suggestion=exc.actionable_suggestion,
            details=exc.details,
        ).model_dump(),
    )


def _load_benchmark(path: Path) -> EvalBenchmark:
    if not path.exists():
        raise OperationError(
            error_code="BENCHMARK_NOT_FOUND",
            message=f"评测题库文件不存在: {path}",
            actionable_suggestion=(
                f"请确认文件路径是否正确，或通过 GET /api/sample/ensure 生成样例题库到 {SAMPLE_DATA_DIR}"
            ),
            details={"expected_path": str(path)},
        )
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return EvalBenchmark.model_validate(data)
    except Exception as exc:  # noqa: BLE001
        raise OperationError(
            error_code="BENCHMARK_PARSE_FAILED",
            message=f"评测题库解析失败: {exc}",
            actionable_suggestion=(
                "请检查 JSON 格式是否合法，字段是否包含 id/name/version/questions，"
                "可参考 data/samples/eval_benchmark_v1.json"
            ),
            details={"path": str(path)},
        )


def _load_embeddings(path: Path, role: str) -> Dict[str, list]:
    if not path.exists():
        raise OperationError(
            error_code="EMBEDDINGS_NOT_FOUND",
            message=f"{role} 嵌入向量文件不存在: {path}",
            actionable_suggestion=(
                f"请先使用对应模型版本生成 {role} 嵌入向量并保存为 JSON 文件 (question_id -> vector list)，"
                f"或调用 GET /api/sample/ensure 生成样例向量"
            ),
            details={"expected_path": str(path), "role": role},
        )
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as exc:  # noqa: BLE001
        raise OperationError(
            error_code="EMBEDDINGS_PARSE_FAILED",
            message=f"{role} 嵌入向量解析失败: {exc}",
            actionable_suggestion=(
                "请检查 JSON 是否为 {question_id: [float, ...]} 格式，向量长度需一致"
            ),
            details={"path": str(path), "role": role},
        )


def _sync_summary(report: DriftReport) -> DriftReport:
    report.summary = recompute_summary_from_results(report)
    return report


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    ensure_sample_data_files()
    return templates.TemplateResponse("index.html", {"request": request})


@app.get("/api/sample/ensure")
async def ensure_sample():
    bench_path, base_path, tgt_path = ensure_sample_data_files()
    return {
        "benchmark_path": str(bench_path),
        "baseline_embeddings_path": str(base_path),
        "target_embeddings_path": str(tgt_path),
    }


@app.get("/api/run-sample")
async def run_sample():
    global _global_report
    bench_path, base_path, tgt_path = ensure_sample_data_files()
    benchmark = _load_benchmark(bench_path)
    baseline = _load_embeddings(base_path, "baseline")
    target = _load_embeddings(tgt_path, "target")
    report = run_evaluation(benchmark, baseline, target, BASELINE_MODEL, TARGET_MODEL)
    _global_report = _sync_summary(report)
    return build_export_payload(_global_report)


@app.get("/api/report")
async def get_report():
    global _global_report
    if _global_report is None:
        raise OperationError(
            error_code="NO_REPORT",
            message="还没有生成任何漂移报告",
            actionable_suggestion=(
                "请先调用 GET /api/run-sample 加载样例报告，"
                "或 POST /api/run 传入自定义评测题库与向量"
            ),
        )
    _global_report = _sync_summary(_global_report)
    return build_export_payload(_global_report)


@app.post("/api/run")
async def run_custom(payload: Dict[str, Any]):
    global _global_report
    benchmark_raw = payload.get("benchmark")
    baseline = payload.get("baseline_embeddings")
    target = payload.get("target_embeddings")
    baseline_model = payload.get("baseline_model", "baseline")
    target_model = payload.get("target_model", "target")

    if benchmark_raw is None:
        raise OperationError(
            error_code="MISSING_BENCHMARK",
            message="请求体缺少 benchmark 字段 (评测题库)",
            actionable_suggestion=(
                "请在 JSON body 中提供 benchmark（评测题库对象），可参考 data/samples/eval_benchmark_v1.json"
            ),
        )
    if baseline is None:
        raise OperationError(
            error_code="MISSING_BASELINE_EMBEDDINGS",
            message="请求体缺少 baseline_embeddings 字段",
            actionable_suggestion=(
                "请提供 baseline_embeddings: {question_id: [float, ...]}"
            ),
        )
    if target is None:
        raise OperationError(
            error_code="MISSING_TARGET_EMBEDDINGS",
            message="请求体缺少 target_embeddings 字段",
            actionable_suggestion=(
                "请提供 target_embeddings: {question_id: [float, ...]}"
            ),
        )

    try:
        benchmark = EvalBenchmark.model_validate(benchmark_raw)
    except Exception as exc:  # noqa: BLE001
        raise OperationError(
            error_code="INVALID_BENCHMARK",
            message=f"benchmark 格式不合法: {exc}",
            actionable_suggestion=(
                "请检查 benchmark 是否包含 id/name/version/questions 字段，"
                "questions 中每题至少包含 id/text/category"
            ),
        )

    common = set(baseline.keys()) & set(target.keys()) & {q.id for q in benchmark.questions}
    if not common:
        raise OperationError(
            error_code="NO_COMMON_QUESTIONS",
            message="benchmark、baseline_embeddings、target_embeddings 三者没有共同的 question_id",
            actionable_suggestion=(
                "请确保三者的 question_id 对应，比如 benchmark 里有 q1，"
                "baseline_embeddings 和 target_embeddings 里也要有 q1 对应的向量"
            ),
            details={
                "benchmark_ids": sorted(q.id for q in benchmark.questions),
                "baseline_ids": sorted(baseline.keys()),
                "target_ids": sorted(target.keys()),
            },
        )

    report = run_evaluation(benchmark, baseline, target, baseline_model, target_model)
    _global_report = _sync_summary(report)
    return build_export_payload(_global_report)


@app.post("/api/correct")
async def correct_verdict(correction: HumanCorrectionRequest):
    global _global_report
    if _global_report is None:
        raise OperationError(
            error_code="NO_REPORT",
            message="还没有生成任何漂移报告，无法进行人工修正",
            actionable_suggestion="请先调用 GET /api/run-sample 加载样例报告",
        )
    existing_ids = {r.question_id for r in _global_report.question_results}
    if correction.question_id not in existing_ids:
        raise OperationError(
            error_code="QUESTION_NOT_FOUND",
            message=f"报告中不存在 question_id={correction.question_id}",
            actionable_suggestion=(
                f"请从以下可用 question_id 中选择: {sorted(existing_ids)}"
            ),
            details={"available_ids": sorted(existing_ids)},
        )
    updated = apply_human_correction(_global_report, correction)
    _global_report = _sync_summary(_global_report)
    return {
        "updated": updated.model_dump() if updated else None,
        "synced_summary": _global_report.summary.model_dump(),
    }


@app.get("/api/export")
async def export_report(fmt: ExportFormat = ExportFormat.JSON):
    global _global_report
    if _global_report is None:
        raise OperationError(
            error_code="NO_REPORT",
            message="还没有生成任何漂移报告，无法导出",
            actionable_suggestion="请先调用 GET /api/run-sample 生成报告后再导出",
        )
    _global_report = _sync_summary(_global_report)
    content = export_to_string(_global_report, fmt)
    media = "application/json" if fmt == ExportFormat.JSON else "text/csv"
    suffix = "json" if fmt == ExportFormat.JSON else "csv"
    return Response(
        content=content,
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="drift_report.{suffix}"'},
    )
