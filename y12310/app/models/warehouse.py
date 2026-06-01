from dataclasses import dataclass, field
from typing import Dict
from .base import BaseEntity


@dataclass
class Warehouse(BaseEntity):
    name: str = ""
    address: str = ""
    latitude: float = 0.0
    longitude: float = 0.0
    max_capacity: float = 0.0
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "max_capacity": self.max_capacity,
            "source": self.source,
            "version": self.version
        }


@dataclass
class WarehouseInventory(BaseEntity):
    warehouse_id: str = ""
    sku: str = ""
    sku_name: str = ""
    quantity: float = 0.0
    unit: str = "件"
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "warehouse_id": self.warehouse_id,
            "sku": self.sku,
            "sku_name": self.sku_name,
            "quantity": self.quantity,
            "unit": self.unit,
            "source": self.source,
            "version": self.version
        }
