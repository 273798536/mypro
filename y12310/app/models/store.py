from dataclasses import dataclass
from typing import Dict
from datetime import datetime
from .base import BaseEntity


@dataclass
class Store(BaseEntity):
    name: str = ""
    address: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    priority: int = 1
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "priority": self.priority,
            "source": self.source,
            "version": self.version
        }


@dataclass
class StoreDemand(BaseEntity):
    store_id: str = ""
    sku: str = ""
    sku_name: str = ""
    quantity: float = 0.0
    unit: str = "件"
    deadline: datetime = None
    urgency: str = "normal"
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "store_id": self.store_id,
            "sku": self.sku,
            "sku_name": self.sku_name,
            "quantity": self.quantity,
            "unit": self.unit,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "urgency": self.urgency,
            "source": self.source,
            "version": self.version
        }
