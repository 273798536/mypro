from __future__ import annotations

import json
import sys
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .api.routes import router
from .samples.sample_data import get_sample_request
from .core.validator import InputValidator
from .core.edge_detector import EdgeDetector
from .core.shadow_engine import ShadowEngine
from .core.report_engine import ReportEngine
from .utils.interpreter import ResultInterpreter

app = FastAPI(
    title="光伏阴影损失API",
    description="估算树影和建筑阴影对光伏组串发电影响，提供校验、归因、情景对比、维修建议",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/")
async def root():
    return {
        "name": "光伏阴影损失API",
        "version": "1.0.0",
        "endpoints": [
            "POST /api/v1/shadow-loss/calculate",
            "GET  /api/v1/shadow-loss/samples/{normal|edge|bad}",
            "POST /api/v1/shadow-loss/validate-only",
            "GET  /health",
        ],
    }


@app.get("/health")
async def health():
    return {"status": "ok"}


def run_cli(sample_type: str = "normal"):
    request = get_sample_request(sample_type)
    print(f"\n{'='*60}")
    print(f"  光伏阴影损失计算 — 样例: {sample_type}")
    print(f"{'='*60}\n")

    validator = InputValidator(request)
    validations, corrections = validator.validate_all()

    edge_detector = EdgeDetector(request)
    edge_warnings = edge_detector.detect_all()

    print(f"[1/4] 输入校验  错误:{sum(1 for v in validations if v.severity == 'error')} "
          f"警告:{sum(1 for v in validations if v.severity == 'warning')} "
          f"修正:{len(corrections)}")

    print(f"[2/4] 边缘检测  提示:{len(edge_warnings)} "
          f"阻断:{sum(1 for w in edge_warnings if w.is_blocking)}")

    for w in edge_warnings:
        flag = "【阻断】" if w.is_blocking else "【提示】"
        print(f"      {flag} {w.message}")

    if edge_detector.is_safe_to_compute():
        shadow_engine = ShadowEngine(request, edge_warnings)
        attributions, string_calcs = shadow_engine.compute()
        report_engine = ReportEngine(request, attributions, string_calcs, edge_warnings)
        scenarios, suggestions, export_report = report_engine.generate_all()

        print(f"[3/4] 阴影归因  受影响组件:{sum(1 for a in attributions if a.shadow_loss_pct > 0.05)} "
              f"/ {len(attributions)}")

        for sc in string_calcs:
            print(f"      组串 {sc.string_id}: 损失率 {sc.string_shadow_loss_pct:.0%} "
                  f"热斑风险 {sc.hotspot_risk:.0%} "
                  f"受影响 {sc.affected_components}/{sc.total_components}")

        print(f"[4/4] 情景对比  当前损失:{export_report.overall_shadow_loss_pct:.0%} "
              f"估算电量损失:{export_report.total_estimated_loss_kwh:.2f}kWh")

        for sc in scenarios:
            print(f"      {sc.scenario_name}: 损失率 {sc.shadow_loss_pct:.0%} "
                  f"年损失 {sc.estimated_annual_loss_kwh:.0f}kWh "
                  f"({sc.estimated_annual_revenue_loss:.0f}元)")

        if suggestions:
            print(f"\n  维修建议 (Top {min(5, len(suggestions))}):")
            for s in suggestions[:5]:
                priority = {"critical": "★★★★", "high": "★★★", "medium": "★★", "low": "★"}.get(s.priority, s.priority)
                print(f"      {priority} {s.description}")

        print(f"\n  数据质量评分: {export_report.data_quality_score:.2f}")

        response = type("Response", (), {
            "request_id": request.request_id,
            "station_id": request.station_id,
            "status": "success",
            "calculation_date": request.calculation_date,
            "validations": validations,
            "corrections": corrections,
            "edge_warnings": edge_warnings,
            "shadow_attributions": attributions,
            "string_calculations": string_calcs,
            "maintenance_suggestions": suggestions,
            "processing_time_ms": 0,
        })()
        print("\n" + ResultInterpreter.to_readable_text(response))
    else:
        print(f"\n  [终止] 存在阻断性边缘问题，未进行计算")
        for w in edge_detector.get_blocking_warnings():
            print(f"      {w.message}")
            print(f"      建议: {w.recommendation}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="光伏阴影损失计算")
    parser.add_argument("--sample", choices=["normal", "edge", "bad"],
                        default="normal", help="选择样例数据类型")
    parser.add_argument("--serve", action="store_true", help="启动API服务")
    parser.add_argument("--port", type=int, default=8000, help="API端口")
    args = parser.parse_args()

    if args.serve:
        import uvicorn
        uvicorn.run(app, host="0.0.0.0", port=args.port)
    else:
        run_cli(args.sample)
