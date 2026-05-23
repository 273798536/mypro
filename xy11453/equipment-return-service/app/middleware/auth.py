import os
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


API_KEY = os.getenv("API_KEY", "equipment-return-2024")


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.url.path in ["/", "/health", "/docs", "/openapi.json", "/redoc"]:
            return await call_next(request)

        api_key = request.headers.get("X-API-Key")
        if not api_key or api_key != API_KEY:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Unauthorized: Invalid or missing API key"}
            )

        response = await call_next(request)
        return response
