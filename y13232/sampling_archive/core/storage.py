import json
import os
from typing import List, Dict, Optional
from ..models.material import Material


class Storage:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.materials_file = os.path.join(data_dir, "materials.json")
        self.raw_dir = os.path.join(data_dir, "raw")
        self._ensure_dirs()

    def _ensure_dirs(self):
        os.makedirs(self.data_dir, exist_ok=True)
        os.makedirs(self.raw_dir, exist_ok=True)

    def load_materials(self) -> List[Material]:
        if not os.path.exists(self.materials_file):
            return []
        with open(self.materials_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return [Material.from_dict(item) for item in data]

    def save_materials(self, materials: List[Material]):
        data = [m.to_dict() for m in materials]
        with open(self.materials_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    def save_raw_data(self, raw_id: str, raw_data: Dict, source: str = ""):
        raw_file = os.path.join(self.raw_dir, f"{raw_id}.json")
        wrapper = {
            "raw_id": raw_id,
            "source": source,
            "data": raw_data
        }
        with open(raw_file, 'w', encoding='utf-8') as f:
            json.dump(wrapper, f, ensure_ascii=False, indent=2)

    def get_raw_data(self, raw_id: str) -> Optional[Dict]:
        raw_file = os.path.join(self.raw_dir, f"{raw_id}.json")
        if not os.path.exists(raw_file):
            return None
        with open(raw_file, 'r', encoding='utf-8') as f:
            return json.load(f)

    def add_material(self, material: Material) -> Material:
        materials = self.load_materials()
        existing = next((m for m in materials if m.id == material.id), None)
        if existing:
            materials = [m if m.id != material.id else material for m in materials]
        else:
            materials.append(material)
        self.save_materials(materials)
        return material

    def get_material(self, material_id: str) -> Optional[Material]:
        materials = self.load_materials()
        return next((m for m in materials if m.id == material_id), None)

    def update_material(self, material: Material) -> Optional[Material]:
        materials = self.load_materials()
        for i, m in enumerate(materials):
            if m.id == material.id:
                materials[i] = material
                self.save_materials(materials)
                return material
        return None
