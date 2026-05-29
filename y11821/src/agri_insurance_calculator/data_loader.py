import csv
import json
import os
import yaml
from datetime import datetime
from typing import List, Tuple
from pathlib import Path

from .models import (
    FarmerArchive, LandParcel, SignatureRecord,
    SourceReference, DataSource, Point, DamageLevel
)


def load_yaml_file(file_path: str) -> dict:
    with open(file_path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)


def load_json_file(file_path: str) -> dict:
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_csv_file(file_path: str) -> List[dict]:
    with open(file_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        return list(reader)


def load_farmer_archives(file_path: str) -> List[FarmerArchive]:
    archives = []
    file_ext = Path(file_path).suffix.lower()

    if file_ext == '.yaml' or file_ext == '.yml':
        data = load_yaml_file(file_path)
        for idx, item in enumerate(data.get('farmers', []), start=2):
            source_ref = SourceReference(
                source=DataSource.FARMER_ARCHIVE,
                file_path=file_path,
                field=f"farmers[{idx-2}]",
                line_number=idx,
                raw_value=str(item)
            )
            archive = FarmerArchive(
                farmer_id=item['farmer_id'],
                name=item['name'],
                id_card=item['id_card'],
                village=item['village'],
                phone=item['phone'],
                insurance_type=item['insurance_type'],
                insured_area=float(item['insured_area']),
                premium_amount=float(item['premium_amount']),
                insurance_amount=float(item['insurance_amount']),
                source_ref=source_ref,
                file_path=file_path
            )
            archives.append(archive)

    elif file_ext == '.json':
        data = load_json_file(file_path)
        for idx, item in enumerate(data.get('farmers', [])):
            source_ref = SourceReference(
                source=DataSource.FARMER_ARCHIVE,
                file_path=file_path,
                field=f"farmers[{idx}]",
                raw_value=str(item)
            )
            archive = FarmerArchive(
                farmer_id=item['farmer_id'],
                name=item['name'],
                id_card=item['id_card'],
                village=item['village'],
                phone=item['phone'],
                insurance_type=item['insurance_type'],
                insured_area=float(item['insured_area']),
                premium_amount=float(item['premium_amount']),
                insurance_amount=float(item['insurance_amount']),
                source_ref=source_ref,
                file_path=file_path
            )
            archives.append(archive)

    elif file_ext == '.csv':
        rows = load_csv_file(file_path)
        for idx, item in enumerate(rows, start=2):
            source_ref = SourceReference(
                source=DataSource.FARMER_ARCHIVE,
                file_path=file_path,
                field=f"row_{idx}",
                line_number=idx,
                raw_value=str(item)
            )
            archive = FarmerArchive(
                farmer_id=item['farmer_id'],
                name=item['name'],
                id_card=item['id_card'],
                village=item['village'],
                phone=item['phone'],
                insurance_type=item['insurance_type'],
                insured_area=float(item['insured_area']),
                premium_amount=float(item['premium_amount']),
                insurance_amount=float(item['insurance_amount']),
                source_ref=source_ref,
                file_path=file_path
            )
            archives.append(archive)

    return archives


def load_land_parcels(file_path: str) -> List[LandParcel]:
    parcels = []
    file_ext = Path(file_path).suffix.lower()

    if file_ext == '.yaml' or file_ext == '.yml':
        data = load_yaml_file(file_path)
        for idx, item in enumerate(data.get('parcels', []), start=2):
            source_ref = SourceReference(
                source=DataSource.SATELLITE_POLYGON,
                file_path=file_path,
                field=f"parcels[{idx-2}]",
                line_number=idx,
                raw_value=str(item)
            )
            boundary = [Point(x=p['x'], y=p['y']) for p in item['boundary']]
            parcel = LandParcel(
                parcel_id=item['parcel_id'],
                farmer_id=item['farmer_id'],
                farmer_name=item['farmer_name'],
                village=item['village'],
                area=float(item['area']),
                boundary=boundary,
                crop_type=item['crop_type'],
                damage_level=DamageLevel(item.get('damage_level', '无损失')),
                source_ref=source_ref,
                file_path=file_path
            )
            parcels.append(parcel)

    elif file_ext == '.json':
        data = load_json_file(file_path)
        for idx, item in enumerate(data.get('parcels', [])):
            source_ref = SourceReference(
                source=DataSource.SATELLITE_POLYGON,
                file_path=file_path,
                field=f"parcels[{idx}]",
                raw_value=str(item)
            )
            boundary = [Point(x=p['x'], y=p['y']) for p in item['boundary']]
            parcel = LandParcel(
                parcel_id=item['parcel_id'],
                farmer_id=item['farmer_id'],
                farmer_name=item['farmer_name'],
                village=item['village'],
                area=float(item['area']),
                boundary=boundary,
                crop_type=item['crop_type'],
                damage_level=DamageLevel(item.get('damage_level', '无损失')),
                source_ref=source_ref,
                file_path=file_path
            )
            parcels.append(parcel)

    return parcels


def load_signature_records(file_path: str) -> List[SignatureRecord]:
    records = []
    file_ext = Path(file_path).suffix.lower()

    if file_ext == '.yaml' or file_ext == '.yml':
        data = load_yaml_file(file_path)
        for idx, item in enumerate(data.get('records', []), start=2):
            source_ref = SourceReference(
                source=DataSource.SIGNATURE_FORM,
                file_path=file_path,
                field=f"records[{idx-2}]",
                line_number=idx,
                raw_value=str(item)
            )
            sig_date = None
            if item.get('signature_date'):
                sig_date = datetime.fromisoformat(item['signature_date'])

            record = SignatureRecord(
                record_id=item['record_id'],
                farmer_id=item['farmer_id'],
                farmer_name=item['farmer_name'],
                village=item['village'],
                reported_area=float(item['reported_area']),
                reported_damage=item['reported_damage'],
                has_signature=bool(item.get('has_signature', False)),
                signatory=item.get('signatory'),
                signature_date=sig_date,
                notes=item.get('notes'),
                source_ref=source_ref,
                file_path=file_path
            )
            records.append(record)

    elif file_ext == '.json':
        data = load_json_file(file_path)
        for idx, item in enumerate(data.get('records', [])):
            source_ref = SourceReference(
                source=DataSource.SIGNATURE_FORM,
                file_path=file_path,
                field=f"records[{idx}]",
                raw_value=str(item)
            )
            sig_date = None
            if item.get('signature_date'):
                sig_date = datetime.fromisoformat(item['signature_date'])

            record = SignatureRecord(
                record_id=item['record_id'],
                farmer_id=item['farmer_id'],
                farmer_name=item['farmer_name'],
                village=item['village'],
                reported_area=float(item['reported_area']),
                reported_damage=item['reported_damage'],
                has_signature=bool(item.get('has_signature', False)),
                signatory=item.get('signatory'),
                signature_date=sig_date,
                notes=item.get('notes'),
                source_ref=source_ref,
                file_path=file_path
            )
            records.append(record)

    elif file_ext == '.csv':
        rows = load_csv_file(file_path)
        for idx, item in enumerate(rows, start=2):
            source_ref = SourceReference(
                source=DataSource.SIGNATURE_FORM,
                file_path=file_path,
                field=f"row_{idx}",
                line_number=idx,
                raw_value=str(item)
            )
            sig_date = None
            if item.get('signature_date'):
                sig_date = datetime.fromisoformat(item['signature_date'])

            record = SignatureRecord(
                record_id=item['record_id'],
                farmer_id=item['farmer_id'],
                farmer_name=item['farmer_name'],
                village=item['village'],
                reported_area=float(item['reported_area']),
                reported_damage=item['reported_damage'],
                has_signature=bool(item.get('has_signature', False)),
                signatory=item.get('signatory'),
                signature_date=sig_date,
                notes=item.get('notes'),
                source_ref=source_ref,
                file_path=file_path
            )
            records.append(record)

    return records


def load_all_data(
    farmers_path: str,
    parcels_path: str,
    signatures_path: str
) -> Tuple[List[FarmerArchive], List[LandParcel], List[SignatureRecord]]:
    farmers = load_farmer_archives(farmers_path)
    parcels = load_land_parcels(parcels_path)
    signatures = load_signature_records(signatures_path)
    return farmers, parcels, signatures
