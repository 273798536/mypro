import random
from datetime import datetime, timedelta
from typing import List, Tuple

from .models import BuoyData, InspectionPhoto


class SampleDataGenerator:
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.buoy_prefixes = ["HB", "YD", "QHD", "TJ", "DL"]

    def generate_buoy_data(self, count: int = 20) -> List[BuoyData]:
        buoys = []
        base_time = datetime.now() - timedelta(days=1)

        for i in range(count):
            buoy_id = f"{random.choice(self.buoy_prefixes)}_{i+1:03d}"

            lat = 38.0 + random.uniform(0, 3.0)
            lon = 119.5 + random.uniform(0, 3.5)

            base_thickness = 20.0 + random.uniform(-10, 25)
            if i % 7 == 0:
                base_thickness = 65.0 + random.uniform(0, 15)

            timestamp = base_time + timedelta(hours=i * 0.8)

            buoy = BuoyData(
                buoy_id=buoy_id,
                timestamp=timestamp,
                latitude=round(lat, 4),
                longitude=round(lon, 4),
                ice_thickness=round(base_thickness, 1),
                ice_temperature=round(-2.0 + random.uniform(-3, 1), 1),
                water_temperature=round(-1.5 + random.uniform(-1, 0.5), 1),
                wind_speed=round(5.0 + random.uniform(0, 10), 1),
                raw_source=f"buoy_network/{buoy_id}/{timestamp.strftime('%Y%m%d')}.csv",
            )
            buoys.append(buoy)

        return buoys

    def generate_photos(
        self,
        buoys: List[BuoyData],
        missing_count: int = 5,
    ) -> List[InspectionPhoto]:
        selected = random.sample(buoys, len(buoys) - missing_count)

        photos = []
        for i, buoy in enumerate(selected):
            photo = InspectionPhoto(
                photo_id=f"photo_{i+1:04d}",
                buoy_id=buoy.buoy_id,
                timestamp=buoy.timestamp + timedelta(minutes=random.randint(-30, 30)),
                file_path=f"/photos/{buoy.buoy_id}_{buoy.timestamp.strftime('%Y%m%d_%H%M')}.jpg",
                uploader=random.choice(["张工", "李助理", "王科研", "赵巡检"]),
                annotation=random.choice([
                    "冰层平整，无明显裂缝",
                    "冰面积雪约5cm",
                    "边缘有融水迹象",
                    "",
                    "冰面有裂隙，需关注",
                ]) or None,
            )
            photos.append(photo)

        return photos

    def generate_full_dataset(
        self,
        buoy_count: int = 20,
        missing_photos: int = 5,
    ) -> Tuple[List[BuoyData], List[InspectionPhoto]]:
        buoys = self.generate_buoy_data(buoy_count)
        photos = self.generate_photos(buoys, missing_photos)
        return buoys, photos
