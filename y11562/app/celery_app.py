import uuid
from app.config import get_settings

settings = get_settings()

_celery_app = None
_tasks = {}


class DummyAsyncResult:
    def __init__(self, result=None, task_id=None):
        self.result = result
        self.id = task_id or uuid.uuid4().hex

    def get(self, *args, **kwargs):
        return self.result

    def wait(self, *args, **kwargs):
        return self.result


class DummyRequest:
    def __init__(self, task_id=None):
        self.id = task_id or uuid.uuid4().hex


class DummyTask:
    def __init__(self, name, func, bind=False):
        self.name = name
        self._func = func
        self._bind = bind
        self.delay = self._delay
        self.apply_async = self._delay
        self.s = self._s

    def _delay(self, *args, **kwargs):
        task_id = uuid.uuid4().hex
        try:
            if self._bind:
                class BindProxy:
                    request = DummyRequest(task_id)
                    def update_state(*args, **kwargs):
                        pass
                result = self._func(BindProxy(), *args, **kwargs)
            else:
                result = self._func(*args, **kwargs)
            return DummyAsyncResult(result, task_id)
        except Exception as e:
            return DummyAsyncResult({"status": "error", "message": str(e)}, task_id)

    def _s(self, *args, **kwargs):
        return self


class DummyCelery:
    def __init__(self):
        self.control = type('DummyControl', (), {'ping': lambda: None})()
        self.on_after_configure = type('DummySignal', (), {'connect': lambda self, f: None})()

    def task(self, *args, **kwargs):
        bind = kwargs.get('bind', False)

        def decorator(func):
            task_name = kwargs.get('name', func.__name__)
            dummy = DummyTask(task_name, func, bind=bind)
            _tasks[task_name] = dummy
            return dummy
        return decorator

    def autodiscover_tasks(self, *args, **kwargs):
        pass


if settings.CELERY_ENABLED:
    try:
        from celery import Celery

        _celery_app = Celery(
            "hotel_night_audit",
            broker=settings.CELERY_BROKER_URL,
            backend=settings.CELERY_RESULT_BACKEND
        )

        _celery_app.conf.update(
            task_serializer="json",
            accept_content=["json"],
            result_serializer="json",
            timezone="Asia/Shanghai",
            enable_utc=True,
            task_track_started=True,
            task_time_limit=30 * 60,
            task_soft_time_limit=25 * 60,
            worker_prefetch_multiplier=1,
            worker_max_tasks_per_child=1000,
        )

        _celery_app.autodiscover_tasks(["app.tasks"])
    except ImportError:
        _celery_app = DummyCelery()
else:
    _celery_app = DummyCelery()


def get_celery_app():
    return _celery_app


def get_task(task_name):
    return _tasks.get(task_name)


def is_celery_enabled():
    return settings.CELERY_ENABLED


celery_app = _celery_app
