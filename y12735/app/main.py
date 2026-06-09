from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.services import (
    ExcelParseError,
    InvalidTransitionError,
    ReviewNotFoundError,
    ReviewService,
)

review_service = ReviewService()


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    yield


app = FastAPI(
    title="最小二乘异常点复核系统",
    description=(
        "面向教研编辑与投委会的最小二乘异常点复核工具："
        "提供约束校验、外推越界检测、结果自然语言解释、"
        "人工复核留痕（待确认→通过/驳回）、Excel 与图表导出。"
    ),
    version="0.1.0",
    lifespan=lifespan,
)


@app.exception_handler(ReviewNotFoundError)
async def _not_found_handler(request: Request, exc: ReviewNotFoundError) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(status_code=404, content={"error": str(exc)})


@app.exception_handler(InvalidTransitionError)
async def _invalid_transition_handler(request: Request, exc: InvalidTransitionError) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(status_code=400, content={"error": str(exc)})


@app.exception_handler(ExcelParseError)
async def _excel_parse_handler(request: Request, exc: ExcelParseError) -> JSONResponse:  # noqa: ARG001
    return JSONResponse(status_code=400, content={"error": str(exc)})


@app.get("/", tags=["健康检查"])
def root() -> dict[str, str]:
    return {
        "service": "最小二乘异常点复核系统",
        "status": "运行中",
        "docs": "/docs",
    }


app.include_router(api_router)
