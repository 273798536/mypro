import hashlib
import json
from datetime import datetime
from PIL import Image
from PIL.ExifTags import TAGS
import os
import uuid


def generate_fact_id(source_type, identifier_fields):
    key_parts = [source_type] + [str(f) for f in identifier_fields if f]
    key = '|'.join(key_parts)
    return hashlib.md5(key.encode('utf-8')).hexdigest()[:16]


def extract_photo_exif(photo_path):
    try:
        image = Image.open(photo_path)
        exif_data = {}
        if hasattr(image, '_getexif') and image._getexif():
            for tag_id, value in image._getexif().items():
                tag = TAGS.get(tag_id, tag_id)
                if isinstance(value, bytes):
                    value = value.decode('utf-8', errors='ignore')
                exif_data[str(tag)] = str(value)
        return json.dumps(exif_data, ensure_ascii=False)
    except Exception:
        return None


def get_photo_datetime(photo_path):
    try:
        exif_data = extract_photo_exif(photo_path)
        if exif_data:
            exif = json.loads(exif_data)
            date_str = exif.get('DateTimeOriginal') or exif.get('DateTime')
            if date_str:
                return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
    except Exception:
        pass
    return datetime.fromtimestamp(os.path.getmtime(photo_path))


def generate_batch_id():
    return f'batch_{datetime.now().strftime("%Y%m%d_%H%M%S")}_{uuid.uuid4().hex[:6]}'


def parse_datetime(date_str, formats=None):
    if formats is None:
        formats = [
            '%Y-%m-%d %H:%M:%S',
            '%Y-%m-%d %H:%M',
            '%Y/%m/%d %H:%M:%S',
            '%Y/%m/%d %H:%M',
            '%Y%m%d%H%M%S',
            '%Y-%m-%d',
            '%Y/%m/%d'
        ]
    
    if not date_str:
        return None
    
    for fmt in formats:
        try:
            return datetime.strptime(str(date_str).strip(), fmt)
        except (ValueError, TypeError):
            continue
    return None


def safe_str(value):
    if value is None:
        return ''
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def safe_int(value):
    try:
        if isinstance(value, float) and value.is_integer():
            return int(value)
        return int(str(value).strip())
    except (ValueError, TypeError):
        return None
