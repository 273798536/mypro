from dataclasses import dataclass
from typing import Dict
from .base import BaseEntity


@dataclass
class Vehicle(BaseEntity):
    plate_number: str = ""
    vehicle_type: str = "van"
    max_capacity: float = 0.0
    capacity_unit: str = "件"
    max_weight: float = 0.0
    weight_unit: str = "kg"
    available: bool = True
    depot_warehouse_id: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "id": self.id,
            "plate_number": self.plate_number,
            "vehicle_type": self.vehicle_type,
            "max_capacity": self.max_capacity,
            "capacity_unit": self.capacity_unit,
            "max_weight": self.max_weight,
            "weight_unit": self.weight_unit,
            "available": self.available,
            "depot_warehouse_id": self.depot_warehouse_id,
            "source": self.source,
            "version": self.version
        }
