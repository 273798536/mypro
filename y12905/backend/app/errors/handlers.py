import uuid
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException


class APIError(Exception):
    code: str = "INTERNAL_ERROR"
    status_code: int = 500

    def __init__(self, message: str, action: str = "", **ctx):
        self.message = message
        self.action = action
        self.ctx = ctx
        self.request_id = str(uuid.uuid4())[:8]

    def to_dict(self) -> dict:
        return {
            "error_code": self.code,
            "message": self.message,
            "action": self.action,
            "request_id": self.request_id,
            **self.ctx,
        }


class PromptVersionNotFound(APIError):
    code = "PROMPT_VERSION_MISSING"
    status_code = 404

    @staticmethod
    def by_tag(tag: str) -> "PromptVersionNotFound":
        return PromptVersionNotFound(
            message=f"未找到提示词版本 '{tag}'",
            action=f"请先通过 POST /api/prompt-versions 录入版本 '{tag}'。\n"
                   f"示例: curl -X POST http://localhost:8000/api/prompt-versions "
                   f"-H 'Content-Type: application/json' "
                   f"-d '{{\"version_tag\":\"{tag}\",\"content\":\"你的提示词内容...\",\"safety_rules_snapshot\":{{\"rules\":[]}}}}'",
            missing_version_tag=tag,
        )

    @staticmethod
    def by_id(version_id: int, used_by: str = "") -> "PromptVersionNotFound":
        msg = f"数据库中未找到 ID 为 {version_id} 的提示词版本"
        if used_by:
            msg = f"{used_by} 引用了提示词版本 ID={version_id}，但该版本不存在"
        return PromptVersionNotFound(
            message=msg,
            action=f"请先通过 POST /api/prompt-versions 录入该版本，或检查 version_id 参数。\n"
                   f"可通过 GET /api/prompt-versions 查看已存在的版本列表。",
            missing_version_id=version_id,
        )


class EvalSamplesNotFound(APIError):
    code = "EVAL_SAMPLES_MISSING"
    status_code = 404

    @staticmethod
    def by_ids(missing_ids: list) -> "EvalSamplesNotFound":
        return EvalSamplesNotFound(
            message=f"以下评测样本不存在: {missing_ids}",
            action=f"请通过 POST /api/eval-samples 批量录入缺失的样本。",
            missing_sample_ids=missing_ids,
        )


class GrayCompareTaskNotFound(APIError):
    code = "GRAY_COMPARE_TASK_MISSING"
    status_code = 404

    @staticmethod
    def by_id(task_id: int) -> "GrayCompareTaskNotFound":
        return GrayCompareTaskNotFound(
            message=f"灰度对比任务 #{task_id} 不存在",
            action=f"请先通过 POST /api/gray-compare 创建对比任务，"
                   f"或通过 GET /api/gray-compare 查看所有历史任务。",
            missing_task_id=task_id,
        )


class SafetyRuleConflict(APIError):
    code = "SAFETY_RULE_CONFLICT"
    status_code = 409

    @staticmethod
    def with_details(rule_id: str, old_ver: str, new_ver: str) -> "SafetyRuleConflict":
        return SafetyRuleConflict(
            message=f"安全规则 '{rule_id}' 版本不一致: 对比版本 A 是 v{old_ver}，版本 B 是 v{new_ver}",
            action=f"请在灰度对比前确认安全规则版本是否需要同步。若需要基于新规则重跑评测，可使用 POST /api/eval-samples 提交新版样本。",
            conflicting_rule_id=rule_id,
            version_a=old_ver,
            version_b=new_ver,
        )


class InconsistentPayload(APIError):
    code = "EXPORT_CONSISTENCY_FAILED"
    status_code = 500

    def __init__(self, detail: str):
        super().__init__(
            message=f"导出内容与界面摘要不一致: {detail}",
            action=f"请重新触发对比任务 (POST /api/gray-compare) 以重建缓存摘要，再重试导出。",
            detail=detail,
        )


def register_error_handlers(app):
    @app.exception_handler(APIError)
    async def api_error_handler(request: Request, exc: APIError):
        return JSONResponse(status_code=exc.status_code, content=exc.to_dict())

    @app.exception_handler(StarletteHTTPException)
    async def http_handler(request: Request, exc: StarletteHTTPException):
        err = APIError(
            message=exc.detail if isinstance(exc.detail, str) else f"HTTP {exc.status_code}",
            action=f"检查请求参数和认证状态。若 URL 错误，请参考 API 文档 http://localhost:8000/docs。",
        )
        err.code = f"HTTP_{exc.status_code}"
        err.status_code = exc.status_code
        return JSONResponse(status_code=exc.status_code, content=err.to_dict())

    @app.exception_handler(RequestValidationError)
    async def validation_handler(request: Request, exc: RequestValidationError):
        errs = exc.errors()
        flat = []
        for e in errs:
            loc = " -> ".join(str(x) for x in e.get("loc", []))
            flat.append(f"[{loc}] {e.get('msg', '')}")
        err = APIError(
            message="请求参数校验失败: " + " | ".join(flat),
            action="请修正请求体中的字段格式后重试。详细 API 定义见 http://localhost:8000/docs。",
        )
        err.code = "VALIDATION_ERROR"
        err.status_code = status.HTTP_422_UNPROCESSABLE_ENTITY
        return JSONResponse(status_code=422, content=err.to_dict())

    @app.exception_handler(Exception)
    async def catch_all_handler(request: Request, exc: Exception):
        err = APIError(
            message=f"服务处理异常: {type(exc).__name__}: {str(exc)}",
            action="请将此 request_id 发给 MLOps 工程师排查。若可稳定复现，请在前端重试。",
        )
        err.status_code = 500
        return JSONResponse(status_code=500, content=err.to_dict())
