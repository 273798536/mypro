from datetime import datetime, timedelta
import random
import math
from typing import Dict, List

from .models import SeabirdObservation, TideRecord, ShipTrack, InspectionPhoto
from .tide_calculator import TIDE_STATIONS


RANDOM_SEED = 20260612


SPECIES = [
    "白鹭", "苍鹭", "红嘴鸥", "白额燕鸥", "黑尾鸥",
    "鸬鹚", "斑嘴鸭", "绿翅鸭", "小天鹅", "灰鹤",
]

LOCATIONS = list(TIDE_STATIONS.keys())

SHIP_NAMES = ["渔政1号", "捕捞3号", "巡查7号"]


def generate_sample_data() -> Dict:
    random.seed(RANDOM_SEED)

    base_date = datetime(2026, 6, 10, 6, 0)
    observations = _generate_observations(base_date)
    tide_records = _generate_tide_records(base_date)
    ship_tracks = _generate_ship_tracks(base_date)
    photos = _generate_photos(observations)

    return {
        "observations": observations,
        "tide_records": tide_records,
        "ship_tracks": ship_tracks,
        "photos": photos,
    }


def _generate_observations(base_date: datetime) -> List[SeabirdObservation]:
    observations = []
    obs_id = 1

    for day_offset in range(3):
        day = base_date + timedelta(days=day_offset)
        for hour in [6, 8, 10, 12, 14, 16, 18]:
            location = random.choice(LOCATIONS)
            station = TIDE_STATIONS[location]

            obs_time = day.replace(hour=hour, minute=random.randint(0, 59))
            species = random.choice(SPECIES)
            count = random.randint(1, 50)

            lat_jitter = random.uniform(-0.01, 0.01)
            lon_jitter = random.uniform(-0.01, 0.01)

            photo_arrived = True
            photo_time = obs_time + timedelta(minutes=random.randint(5, 30))

            if obs_id in [5, 12, 18]:
                photo_arrived = False
                photo_time = None

            obs = SeabirdObservation(
                obs_id=f"OBS{obs_id:04d}",
                obs_time=obs_time,
                location=location,
                lat=station["lat"] + lat_jitter,
                lon=station["lon"] + lon_jitter,
                species=species,
                count=count,
                observer=f"观测员{random.randint(1, 5)}号",
                weather=random.choice(["晴", "多云", "阴", "小雨"]),
                notes=f"第{day_offset+1}天第{hour}时观测",
                photo_arrived=photo_arrived,
                photo_time=photo_time,
                data_source="routine_survey",
            )
            observations.append(obs)
            obs_id += 1

    return observations


def _generate_tide_records(base_date: datetime) -> List[TideRecord]:
    records = []
    tide_id = 1

    for location, station in TIDE_STATIONS.items():
        for day_offset in range(3):
            day = base_date + timedelta(days=day_offset)
            for hour in [0, 3, 6, 9, 12, 15, 18, 21]:
                obs_time = day.replace(hour=hour, minute=random.randint(0, 30))

                hours_since_midnight = obs_time.hour + obs_time.minute / 60 + day_offset * 24
                tide_phase = (hours_since_midnight / 12.42) * 2 * math.pi
                tide_height = station["base_height"] + station["amplitude"] * math.sin(tide_phase)
                tide_height += random.uniform(-0.05, 0.05)

                if tide_height > station["base_height"] + 0.8:
                    tide_type = "高潮"
                elif tide_height > station["base_height"] + 0.2:
                    tide_type = "涨潮"
                elif tide_height < station["base_height"] - 0.8:
                    tide_type = "低潮"
                elif tide_height < station["base_height"] - 0.2:
                    tide_type = "落潮"
                else:
                    tide_type = "平潮"

                timezone = "Asia/Shanghai"
                timezone_correct = True

                if location == "西滩涂":
                    timezone = "UTC"
                    timezone_correct = False

                record = TideRecord(
                    tide_id=f"TIDE{tide_id:04d}",
                    obs_time=obs_time,
                    location=location,
                    lat=station["lat"],
                    lon=station["lon"],
                    tide_height=round(tide_height, 2),
                    tide_type=tide_type,
                    timezone=timezone,
                    timezone_correct=timezone_correct,
                    data_source="tide_station",
                )
                records.append(record)
                tide_id += 1

    return records


def _generate_ship_tracks(base_date: datetime) -> List[ShipTrack]:
    tracks = []
    track_id = 1

    ship_routes = {
        "渔政1号": {
            "locations": ["东码头", "南岛礁"],
            "day_offsets": [0, 1],
        },
        "捕捞3号": {
            "locations": ["西滩涂", "北湾"],
            "day_offsets": [1, 2],
        },
        "巡查7号": {
            "locations": ["东码头", "北湾"],
            "day_offsets": [0, 2],
        },
    }

    for ship_name, route in ship_routes.items():
        for day_offset in route["day_offsets"]:
            day = base_date + timedelta(days=day_offset)
            start_loc = route["locations"][0]
            end_loc = route["locations"][1]
            start_station = TIDE_STATIONS[start_loc]
            end_station = TIDE_STATIONS[end_loc]

            start_hour = random.randint(7, 9)

            for point in range(5):
                ratio = point / 4.0
                timestamp = day.replace(hour=start_hour + point * 2,
                                        minute=random.randint(0, 59))
                lat = start_station["lat"] + ratio * (end_station["lat"] - start_station["lat"])
                lon = start_station["lon"] + ratio * (end_station["lon"] - start_station["lon"])
                lat += random.uniform(-0.005, 0.005)
                lon += random.uniform(-0.005, 0.005)

                is_supplementary = False
                if ship_name == "捕捞3号" and day_offset == 2 and point >= 2:
                    is_supplementary = True

                track = ShipTrack(
                    track_id=f"TRK{track_id:04d}",
                    ship_name=ship_name,
                    timestamp=timestamp,
                    lat=round(lat, 4),
                    lon=round(lon, 4),
                    speed=round(random.uniform(8, 20), 1),
                    heading=random.randint(0, 360),
                    is_supplementary=is_supplementary,
                )
                tracks.append(track)
                track_id += 1

    return tracks


def _generate_photos(observations: List[SeabirdObservation]) -> List[InspectionPhoto]:
    photos = []
    photo_id = 1

    for obs in observations:
        if not obs.photo_arrived:
            continue

        is_late = False
        upload_time = obs.obs_time + timedelta(hours=random.randint(1, 5))

        if obs.obs_id in ["OBS0008", "OBS0015"]:
            is_late = True
            upload_time = obs.obs_time + timedelta(days=2, hours=random.randint(1, 5))

        photo = InspectionPhoto(
            photo_id=f"PIC{photo_id:04d}",
            obs_id=obs.obs_id,
            upload_time=upload_time,
            file_name=f"{obs.obs_id}_{obs.species}.jpg",
            is_late=is_late,
        )
        photos.append(photo)
        photo_id += 1

    return photos
