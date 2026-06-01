import numpy as np
import time
from typing import Optional, Callable, Dict, Any
from dataclasses import dataclass, field
from enum import Enum


class GridStatus(Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    TIMEOUT = "timeout"


@dataclass
class GridPromise:
    grid_id: str
    created_at: float
    status: GridStatus = GridStatus.PENDING
    grid: Optional[np.ndarray] = None
    error_message: Optional[str] = None
    callbacks: list = field(default_factory=list)

    def then(self, callback: Callable[[np.ndarray], None]):
        if self.status == GridStatus.READY and self.grid is not None:
            callback(self.grid)
        else:
            self.callbacks.append(callback)

    def resolve(self, grid: np.ndarray):
        self.grid = grid
        self.status = GridStatus.READY
        for callback in self.callbacks:
            callback(grid)
        self.callbacks.clear()

    def reject(self, error_message: str):
        self.error_message = error_message
        self.status = GridStatus.ERROR
        self.callbacks.clear()


class WaterGrid:
    def __init__(
        self,
        default_size: tuple = (100, 100),
        default_delay: float = 0.1,
        timeout: float = 5.0,
    ):
        self.default_size = default_size
        self.default_delay = default_delay
        self.timeout = timeout
        self._pending_grids: Dict[str, GridPromise] = {}

    def create_grid_async(
        self,
        grid_id: Optional[str] = None,
        size: Optional[tuple] = None,
        delay: Optional[float] = None,
        initial_value: float = 0.0,
    ) -> GridPromise:
        if grid_id is None:
            grid_id = f"grid_{int(time.time() * 1000)}"

        if size is None:
            size = self.default_size

        if delay is None:
            delay = self.default_delay

        promise = GridPromise(
            grid_id=grid_id,
            created_at=time.time(),
            status=GridStatus.PENDING,
        )
        self._pending_grids[grid_id] = promise

        import threading

        def delayed_creation():
            time.sleep(delay)
            try:
                grid = np.full(size, initial_value, dtype=np.float64)
                promise.resolve(grid)
            except Exception as e:
                promise.reject(str(e))

        thread = threading.Thread(target=delayed_creation)
        thread.daemon = True
        thread.start()

        return promise

    def create_grid_sync(
        self,
        grid_id: Optional[str] = None,
        size: Optional[tuple] = None,
        initial_value: float = 0.0,
        wait: bool = True,
    ) -> Optional[np.ndarray]:
        promise = self.create_grid_async(
            grid_id=grid_id, size=size, initial_value=initial_value
        )

        if not wait:
            return None

        start_time = time.time()
        while promise.status == GridStatus.PENDING:
            if time.time() - start_time > self.timeout:
                promise.status = GridStatus.TIMEOUT
                return None
            time.sleep(0.01)

        return promise.grid

    def wait_for_grid(
        self, promise: GridPromise, timeout: Optional[float] = None
    ) -> bool:
        if timeout is None:
            timeout = self.timeout

        start_time = time.time()
        while promise.status == GridStatus.PENDING:
            if time.time() - start_time > timeout:
                promise.status = GridStatus.TIMEOUT
                return False
            time.sleep(0.01)

        return promise.status == GridStatus.READY

    def get_grid_status(self, grid_id: str) -> Optional[GridStatus]:
        promise = self._pending_grids.get(grid_id)
        return promise.status if promise else None

    def cleanup_expired(self, max_age: float = 60.0):
        current_time = time.time()
        expired = [
            grid_id
            for grid_id, promise in self._pending_grids.items()
            if current_time - promise.created_at > max_age
        ]
        for grid_id in expired:
            del self._pending_grids[grid_id]
