import re
import hashlib


def normalize_location(location: str) -> str:
    if not location:
        return ""
    
    normalized = location.strip()
    normalized = re.sub(r'[，。、；：""''（）()【】\[\] ]+', '', normalized)
    normalized = re.sub(r'号$', '', normalized)
    normalized = re.sub(r'^(人民|中山|解放|建设|胜利|和平|团结|光明|幸福|迎宾|长江|黄河)', r'\1', normalized)
    normalized = re.sub(r'(路|街|巷|道|大道|弄|里)$', '', normalized)
    
    return normalized


def get_location_hash(location: str) -> str:
    normalized = normalize_location(location)
    return hashlib.md5(normalized.encode('utf-8')).hexdigest()[:12]


def generate_order_no(location: str, timestamp_str: str) -> str:
    loc_hash = get_location_hash(location)
    return f"WO{timestamp_str}{loc_hash.upper()}"


def locations_match(loc1: str, loc2: str, threshold: float = 0.7) -> bool:
    norm1 = normalize_location(loc1)
    norm2 = normalize_location(loc2)
    
    if norm1 == norm2:
        return True
    
    if norm1 in norm2 or norm2 in norm1:
        return True
    
    return False
