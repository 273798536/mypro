import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

try:
    import fastapi
    print(f"fastapi: {fastapi.__version__}")
except Exception as e:
    print(f"fastapi error: {e}")

try:
    import uvicorn
    print(f"uvicorn: OK")
except Exception as e:
    print(f"uvicorn error: {e}")

try:
    import pydantic
    print(f"pydantic: {pydantic.__version__}")
except Exception as e:
    print(f"pydantic error: {e}")

try:
    from backend import models
    print("models: OK")
except Exception as e:
    print(f"models error: {e}")
    import traceback
    traceback.print_exc()

try:
    from backend import data_store
    print("data_store: OK")
except Exception as e:
    print(f"data_store error: {e}")
    import traceback
    traceback.print_exc()

try:
    from backend import coverage_estimator
    print("coverage_estimator: OK")
except Exception as e:
    print(f"coverage_estimator error: {e}")
    import traceback
    traceback.print_exc()

try:
    from backend.app import app
    print(f"app: OK, routes: {len(app.routes)}")
except Exception as e:
    print(f"app error: {e}")
    import traceback
    traceback.print_exc()
