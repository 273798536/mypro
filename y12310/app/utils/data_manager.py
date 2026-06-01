import json
import os
import pandas as pd
from datetime import datetime
from typing import Dict, List, Optional, Any
from ..models import (
    Warehouse, WarehouseInventory, Store, StoreDemand, Vehicle, VersionInfo
)


class DataManager:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = data_dir
        self.warehouses: Dict[str, Warehouse] = {}
        self.inventories: Dict[str, List[WarehouseInventory]] = {}
        self.stores: Dict[str, Store] = {}
        self.demands: Dict[str, List[StoreDemand]] = {}
        self.vehicles: Dict[str, Vehicle] = {}
        self.versions: List[VersionInfo] = []
        self.current_version: Optional[str] = None
        
        self._ensure_directories()
    
    def _ensure_directories(self):
        dirs = [
            self.data_dir,
            os.path.join(self.data_dir, "warehouses"),
            os.path.join(self.data_dir, "stores"),
            os.path.join(self.data_dir, "vehicles"),
            os.path.join(self.data_dir, "results")
        ]
        for d in dirs:
            os.makedirs(d, exist_ok=True)
    
    def create_version(self, source: str, description: str, parent_version: Optional[str] = None) -> str:
        version_id = f"v{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        version = VersionInfo(
            version_id=version_id,
            created_at=datetime.now(),
            source=source,
            description=description,
            parent_version=parent_version
        )
        self.versions.append(version)
        self.current_version = version_id
        return version_id
    
    def save_version_info(self, filepath: str):
        version_data = [
            {
                "version_id": v.version_id,
                "created_at": v.created_at.isoformat(),
                "source": v.source,
                "description": v.description,
                "parent_version": v.parent_version
            }
            for v in self.versions
        ]
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(version_data, f, indent=2, ensure_ascii=False)
    
    def load_version_info(self, filepath: str):
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                version_data = json.load(f)
            self.versions = [
                VersionInfo(
                    version_id=v["version_id"],
                    created_at=datetime.fromisoformat(v["created_at"]),
                    source=v["source"],
                    description=v["description"],
                    parent_version=v.get("parent_version")
                )
                for v in version_data
            ]
    
    def add_warehouse(self, warehouse: Warehouse):
        if self.current_version:
            warehouse.version = self.current_version
        self.warehouses[warehouse.id] = warehouse
    
    def add_inventory(self, inventory: WarehouseInventory):
        if self.current_version:
            inventory.version = self.current_version
        if inventory.warehouse_id not in self.inventories:
            self.inventories[inventory.warehouse_id] = []
        self.inventories[inventory.warehouse_id].append(inventory)
    
    def add_store(self, store: Store):
        if self.current_version:
            store.version = self.current_version
        self.stores[store.id] = store
    
    def add_demand(self, demand: StoreDemand):
        if self.current_version:
            demand.version = self.current_version
        if demand.store_id not in self.demands:
            self.demands[demand.store_id] = []
        self.demands[demand.store_id].append(demand)
    
    def add_vehicle(self, vehicle: Vehicle):
        if self.current_version:
            vehicle.version = self.current_version
        self.vehicles[vehicle.id] = vehicle
    
    def save_all(self, version_dir: Optional[str] = None):
        if version_dir is None:
            version_dir = self.current_version or "default"
        
        save_path = os.path.join(self.data_dir, version_dir)
        os.makedirs(save_path, exist_ok=True)
        
        warehouses_data = [w.to_dict() for w in self.warehouses.values()]
        with open(os.path.join(save_path, "warehouses.json"), 'w', encoding='utf-8') as f:
            json.dump(warehouses_data, f, indent=2, ensure_ascii=False)
        
        inventories_data = []
        for inv_list in self.inventories.values():
            inventories_data.extend([inv.to_dict() for inv in inv_list])
        with open(os.path.join(save_path, "inventories.json"), 'w', encoding='utf-8') as f:
            json.dump(inventories_data, f, indent=2, ensure_ascii=False)
        
        stores_data = [s.to_dict() for s in self.stores.values()]
        with open(os.path.join(save_path, "stores.json"), 'w', encoding='utf-8') as f:
            json.dump(stores_data, f, indent=2, ensure_ascii=False)
        
        demands_data = []
        for dem_list in self.demands.values():
            demands_data.extend([d.to_dict() for d in dem_list])
        with open(os.path.join(save_path, "demands.json"), 'w', encoding='utf-8') as f:
            json.dump(demands_data, f, indent=2, ensure_ascii=False)
        
        vehicles_data = [v.to_dict() for v in self.vehicles.values()]
        with open(os.path.join(save_path, "vehicles.json"), 'w', encoding='utf-8') as f:
            json.dump(vehicles_data, f, indent=2, ensure_ascii=False)
        
        self.save_version_info(os.path.join(save_path, "versions.json"))
        
        return save_path
    
    def load_all(self, version_dir: str):
        load_path = os.path.join(self.data_dir, version_dir)
        
        self.warehouses.clear()
        self.inventories.clear()
        self.stores.clear()
        self.demands.clear()
        self.vehicles.clear()
        
        if os.path.exists(os.path.join(load_path, "warehouses.json")):
            with open(os.path.join(load_path, "warehouses.json"), 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                wh = Warehouse(
                    id=item["id"],
                    name=item["name"],
                    address=item["address"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    max_capacity=item["max_capacity"],
                    source=item["source"],
                    version=item["version"]
                )
                self.warehouses[wh.id] = wh
        
        if os.path.exists(os.path.join(load_path, "inventories.json")):
            with open(os.path.join(load_path, "inventories.json"), 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                inv = WarehouseInventory(
                    id=item["id"],
                    warehouse_id=item["warehouse_id"],
                    sku=item["sku"],
                    sku_name=item["sku_name"],
                    quantity=item["quantity"],
                    unit=item["unit"],
                    source=item["source"],
                    version=item["version"]
                )
                if inv.warehouse_id not in self.inventories:
                    self.inventories[inv.warehouse_id] = []
                self.inventories[inv.warehouse_id].append(inv)
        
        if os.path.exists(os.path.join(load_path, "stores.json")):
            with open(os.path.join(load_path, "stores.json"), 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                st = Store(
                    id=item["id"],
                    name=item["name"],
                    address=item["address"],
                    latitude=item["latitude"],
                    longitude=item["longitude"],
                    priority=item["priority"],
                    source=item["source"],
                    version=item["version"]
                )
                self.stores[st.id] = st
        
        if os.path.exists(os.path.join(load_path, "demands.json")):
            with open(os.path.join(load_path, "demands.json"), 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                dm = StoreDemand(
                    id=item["id"],
                    store_id=item["store_id"],
                    sku=item["sku"],
                    sku_name=item["sku_name"],
                    quantity=item["quantity"],
                    unit=item["unit"],
                    deadline=datetime.fromisoformat(item["deadline"]) if item["deadline"] else None,
                    urgency=item["urgency"],
                    source=item["source"],
                    version=item["version"]
                )
                if dm.store_id not in self.demands:
                    self.demands[dm.store_id] = []
                self.demands[dm.store_id].append(dm)
        
        if os.path.exists(os.path.join(load_path, "vehicles.json")):
            with open(os.path.join(load_path, "vehicles.json"), 'r', encoding='utf-8') as f:
                data = json.load(f)
            for item in data:
                vh = Vehicle(
                    id=item["id"],
                    plate_number=item["plate_number"],
                    vehicle_type=item["vehicle_type"],
                    max_capacity=item["max_capacity"],
                    capacity_unit=item["capacity_unit"],
                    max_weight=item["max_weight"],
                    weight_unit=item["weight_unit"],
                    available=item["available"],
                    depot_warehouse_id=item["depot_warehouse_id"],
                    source=item["source"],
                    version=item["version"]
                )
                self.vehicles[vh.id] = vh
        
        self.load_version_info(os.path.join(load_path, "versions.json"))
        
        return True
    
    def import_from_excel(self, filepath: str, source: str = "excel") -> str:
        version_id = self.create_version(source, f"从Excel导入: {os.path.basename(filepath)}")
        
        try:
            xls = pd.ExcelFile(filepath)
            name_to_id = {}
            
            if "仓库" in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name="仓库")
                for idx, row in df.iterrows():
                    if pd.notna(row.get("ID")) and str(row.get("ID")).strip():
                        wh_id = str(row.get("ID")).strip()
                    else:
                        wh_id = f"wh_{idx+1:03d}"
                    
                    wh = Warehouse(
                        id=wh_id,
                        name=str(row.get("名称", "")),
                        address=str(row.get("地址", "")),
                        latitude=float(row.get("纬度", 0)),
                        longitude=float(row.get("经度", 0)),
                        max_capacity=float(row.get("最大容量", 0)),
                        source=source,
                        version=version_id
                    )
                    name_to_id[f"warehouse_{wh.name}"] = wh_id
                    self.add_warehouse(wh)
            
            if "门店" in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name="门店")
                for idx, row in df.iterrows():
                    if pd.notna(row.get("ID")) and str(row.get("ID")).strip():
                        st_id = str(row.get("ID")).strip()
                    else:
                        st_id = f"st_{idx+1:03d}"
                    
                    st = Store(
                        id=st_id,
                        name=str(row.get("名称", "")),
                        address=str(row.get("地址", "")),
                        latitude=float(row.get("纬度", 0)),
                        longitude=float(row.get("经度", 0)),
                        priority=int(row.get("优先级", 1)),
                        source=source,
                        version=version_id
                    )
                    name_to_id[f"store_{st.name}"] = st_id
                    self.add_store(st)
            
            if "库存" in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name="库存")
                for _, row in df.iterrows():
                    wh_id = str(row.get("仓库ID", "")).strip()
                    wh_name = str(row.get("仓库名称", "")).strip()
                    if not wh_id and wh_name:
                        wh_id = name_to_id.get(f"warehouse_{wh_name}", "")
                    
                    inv = WarehouseInventory(
                        warehouse_id=wh_id,
                        sku=str(row.get("SKU", "")),
                        sku_name=str(row.get("商品名称", "")),
                        quantity=float(row.get("数量", 0)),
                        unit=str(row.get("单位", "件")),
                        source=source,
                        version=version_id
                    )
                    self.add_inventory(inv)
            
            if "需求" in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name="需求")
                for _, row in df.iterrows():
                    st_id = str(row.get("门店ID", "")).strip()
                    st_name = str(row.get("门店名称", "")).strip()
                    if not st_id and st_name:
                        st_id = name_to_id.get(f"store_{st_name}", "")
                    
                    deadline = row.get("截止时间")
                    if pd.notna(deadline):
                        if isinstance(deadline, pd.Timestamp):
                            deadline = deadline.to_pydatetime()
                    else:
                        deadline = None
                    
                    dm = StoreDemand(
                        store_id=st_id,
                        sku=str(row.get("SKU", "")),
                        sku_name=str(row.get("商品名称", "")),
                        quantity=float(row.get("数量", 0)),
                        unit=str(row.get("单位", "件")),
                        deadline=deadline,
                        urgency=str(row.get("紧急程度", "normal")),
                        source=source,
                        version=version_id
                    )
                    self.add_demand(dm)
            
            if "车辆" in xls.sheet_names:
                df = pd.read_excel(filepath, sheet_name="车辆")
                for _, row in df.iterrows():
                    vh = Vehicle(
                        plate_number=str(row.get("车牌号", "")),
                        vehicle_type=str(row.get("车型", "van")),
                        max_capacity=float(row.get("最大容量", 0)),
                        capacity_unit=str(row.get("容量单位", "件")),
                        max_weight=float(row.get("最大载重", 0)),
                        weight_unit=str(row.get("重量单位", "kg")),
                        available=bool(row.get("可用", True)),
                        depot_warehouse_id=str(row.get("所属仓库ID", "")),
                        source=source,
                        version=version_id
                    )
                    self.add_vehicle(vh)
            
            self.save_all(version_id)
            return version_id
            
        except Exception as e:
            raise Exception(f"导入Excel失败: {str(e)}")
    
    def get_inventory_summary(self) -> pd.DataFrame:
        data = []
        for wh_id, inv_list in self.inventories.items():
            wh_name = self.warehouses.get(wh_id, Warehouse(name="未知")).name
            for inv in inv_list:
                data.append({
                    "仓库ID": wh_id,
                    "仓库名称": wh_name,
                    "SKU": inv.sku,
                    "商品名称": inv.sku_name,
                    "库存数量": inv.quantity,
                    "单位": inv.unit,
                    "数据来源": inv.source,
                    "版本": inv.version
                })
        return pd.DataFrame(data)
    
    def get_demand_summary(self) -> pd.DataFrame:
        data = []
        for st_id, dem_list in self.demands.items():
            st_name = self.stores.get(st_id, Store(name="未知")).name
            for dem in dem_list:
                data.append({
                    "门店ID": st_id,
                    "门店名称": st_name,
                    "SKU": dem.sku,
                    "商品名称": dem.sku_name,
                    "需求数量": dem.quantity,
                    "单位": dem.unit,
                    "截止时间": dem.deadline,
                    "紧急程度": dem.urgency,
                    "数据来源": dem.source,
                    "版本": dem.version
                })
        return pd.DataFrame(data)
    
    def list_versions(self) -> List[Dict[str, Any]]:
        return [
            {
                "version_id": v.version_id,
                "created_at": v.created_at,
                "source": v.source,
                "description": v.description,
                "parent_version": v.parent_version
            }
            for v in self.versions
        ]
