import pandas as pd
import numpy as np
from dataclasses import dataclass, field
from typing import Optional, List, Dict, Tuple
from pathlib import Path
import json


@dataclass
class FlightMetadata:
    water_volume: float = 0.0
    launch_angle: float = 90.0
    wind_speed: float = 0.0
    wind_direction: float = 0.0
    air_pressure: float = 101325.0
    rocket_mass: float = 0.5
    rocket_diameter: float = 0.1
    notes: str = ""
    source_file: str = ""


@dataclass
class DataPoint:
    time: float
    altitude: float
    original_altitude: float
    is_valid: bool = True
    is_modified: bool = False
    modification_reason: str = ""
    needs_manual_review: bool = False
    review_notes: str = ""


@dataclass
class FlightData:
    metadata: FlightMetadata
    data_points: List[DataPoint] = field(default_factory=list)
    time_series: np.ndarray = field(default_factory=lambda: np.array([]))
    altitude_series: np.ndarray = field(default_factory=lambda: np.array([]))
    raw_data: pd.DataFrame = None
    modifications: List[Dict] = field(default_factory=list)
    anomalies: List[Dict] = field(default_factory=list)

    def __post_init__(self):
        if self.data_points:
            self._update_series()

    def _update_series(self):
        self.time_series = np.array([dp.time for dp in self.data_points])
        self.altitude_series = np.array([dp.altitude for dp in self.data_points])

    def add_modification(self, index: int, old_value: float, new_value: float, reason: str):
        self.data_points[index].altitude = new_value
        self.data_points[index].is_modified = True
        self.data_points[index].modification_reason = reason
        self.modifications.append({
            "index": index,
            "time": self.data_points[index].time,
            "old_value": old_value,
            "new_value": new_value,
            "reason": reason
        })
        self._update_series()

    def mark_for_review(self, index: int, reason: str):
        self.data_points[index].needs_manual_review = True
        self.data_points[index].review_notes = reason
        self.anomalies.append({
            "index": index,
            "time": self.data_points[index].time,
            "value": self.data_points[index].altitude,
            "reason": reason,
            "type": "review_required"
        })

    def mark_invalid(self, index: int, reason: str):
        self.data_points[index].is_valid = False
        self.anomalies.append({
            "index": index,
            "time": self.data_points[index].time,
            "value": self.data_points[index].altitude,
            "reason": reason,
            "type": "invalid"
        })

    def get_valid_data(self) -> Tuple[np.ndarray, np.ndarray]:
        valid_indices = [i for i, dp in enumerate(self.data_points) if dp.is_valid]
        return self.time_series[valid_indices], self.altitude_series[valid_indices]

    def get_modified_points(self) -> List[Dict]:
        return self.modifications

    def get_review_required(self) -> List[Dict]:
        return [a for a in self.anomalies if a["type"] == "review_required"]

    def get_invalid_points(self) -> List[Dict]:
        return [a for a in self.anomalies if a["type"] == "invalid"]


class DataLoader:
    REQUIRED_COLUMNS = ["time", "altitude"]

    def __init__(self):
        pass

    def load_csv(self, file_path: str, metadata_path: Optional[str] = None) -> FlightData:
        file_path = Path(file_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Data file not found: {file_path}")

        df = pd.read_csv(file_path)
        self._validate_columns(df)

        df = df.sort_values("time").reset_index(drop=True)

        metadata = FlightMetadata(source_file=str(file_path))
        if metadata_path and Path(metadata_path).exists():
            metadata = self._load_metadata(metadata_path, metadata)
        else:
            metadata = self._extract_metadata_from_df(df, metadata)

        data_points = []
        for _, row in df.iterrows():
            altitude = float(row["altitude"])
            data_points.append(DataPoint(
                time=float(row["time"]),
                altitude=altitude,
                original_altitude=altitude
            ))

        flight_data = FlightData(
            metadata=metadata,
            data_points=data_points,
            raw_data=df
        )

        return flight_data

    def _validate_columns(self, df: pd.DataFrame):
        missing_columns = [col for col in self.REQUIRED_COLUMNS if col not in df.columns]
        if missing_columns:
            raise ValueError(f"Missing required columns: {missing_columns}")

    def _load_metadata(self, metadata_path: str, base_metadata: FlightMetadata) -> FlightMetadata:
        with open(metadata_path, 'r', encoding='utf-8') as f:
            meta_dict = json.load(f)

        for key, value in meta_dict.items():
            if hasattr(base_metadata, key):
                setattr(base_metadata, key, value)

        return base_metadata

    def _extract_metadata_from_df(self, df: pd.DataFrame, metadata: FlightMetadata) -> FlightMetadata:
        if 'water_volume' in df.columns:
            metadata.water_volume = df['water_volume'].iloc[0]
        if 'launch_angle' in df.columns:
            metadata.launch_angle = df['launch_angle'].iloc[0]
        if 'wind_speed' in df.columns:
            metadata.wind_speed = df['wind_speed'].iloc[0]
        if 'air_pressure' in df.columns:
            metadata.air_pressure = df['air_pressure'].iloc[0]

        return metadata

    def save_flight_data(self, flight_data: FlightData, output_path: str):
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

        data = {
            "metadata": flight_data.metadata.__dict__,
            "modifications": flight_data.modifications,
            "anomalies": flight_data.anomalies,
            "data_points": [dp.__dict__ for dp in flight_data.data_points]
        }

        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
