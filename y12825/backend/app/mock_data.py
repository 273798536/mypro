from datetime import date

from .models import QCStatus, RawSampleRow

MOCK_RAW_ROWS: list[dict] = [
    {
        "sample_id": "L1A-001",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-03-01",
        "viral_load": "1.2e4",
        "notes": "",
    },
    {
        "sample_id": "L1A-002",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-03-08",
        "viral_load": "1.8e4",
        "notes": "",
    },
    {
        "sample_id": "L1A-003",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-03-15",
        "viral_load": "2.1e4",
        "notes": "",
    },
    {
        "sample_id": "L1A-004",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-03-22",
        "viral_load": "9.5e5",
        "notes": "载量突增，需复核",
    },
    {
        "sample_id": "L1A-005",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-03-29",
        "viral_load": "2.3e4",
        "notes": "",
    },
    {
        "sample_id": "L1A-006",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-04-05",
        "viral_load": "",
        "notes": "样本不足，未检出",
    },
    {
        "sample_id": "L1A-003",
        "lineage_id": "LINEAGE-ALPHA",
        "collection_date": "2026-03-15",
        "viral_load": "2.1e4",
        "notes": "",
    },
    {
        "sample_id": "L2B-001",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-03-02",
        "viral_load": "3.2e4 偏低，疑似污染",
        "notes": "",
    },
    {
        "sample_id": "L2B-002",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-03-09",
        "viral_load": "5.6e4",
        "notes": "",
    },
    {
        "sample_id": "L2B-003",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-03-16",
        "viral_load": "6.1e4",
        "notes": "",
    },
    {
        "sample_id": "L2B-004",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-03-23",
        "viral_load": "5.8e4",
        "notes": "",
    },
    {
        "sample_id": "L2B-005",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-03-30",
        "viral_load": "8.7e6",
        "notes": "极高载量，需紧急复核",
    },
    {
        "sample_id": "L2B-006",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-04-06",
        "viral_load": "6.3e4",
        "notes": "",
    },
    {
        "sample_id": "L2B-007",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-04-13",
        "viral_load": "",
        "notes": "运输延误，样本降解",
    },
    {
        "sample_id": "L2B-002",
        "lineage_id": "LINEAGE-BETA",
        "collection_date": "2026-03-09",
        "viral_load": "5.6e4",
        "notes": "",
    },
    {
        "sample_id": "L3G-001",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-03-03",
        "viral_load": "7.2e3",
        "notes": "",
    },
    {
        "sample_id": "L3G-002",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-03-10",
        "viral_load": "8.1e3",
        "notes": "",
    },
    {
        "sample_id": "L3G-003",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-03-17",
        "viral_load": "7.8e3 偏低，疑似污染",
        "notes": "",
    },
    {
        "sample_id": "L3G-004",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-03-24",
        "viral_load": "9.0e3",
        "notes": "",
    },
    {
        "sample_id": "L3G-005",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-03-31",
        "viral_load": "8.5e3",
        "notes": "",
    },
    {
        "sample_id": "L3G-006",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-04-07",
        "viral_load": "9.2e3",
        "notes": "",
    },
    {
        "sample_id": "L3G-003",
        "lineage_id": "LINEAGE-GAMMA",
        "collection_date": "2026-03-17",
        "viral_load": "7.8e3 偏低，疑似污染",
        "notes": "",
    },
]

LINEAGE_NAMES = {
    "LINEAGE-ALPHA": "Alpha 变异株谱系",
    "LINEAGE-BETA": "Beta 变异株谱系",
    "LINEAGE-GAMMA": "Gamma 变异株谱系",
}


def get_mock_raw_rows() -> list[RawSampleRow]:
    return [RawSampleRow(**row) for row in MOCK_RAW_ROWS]
