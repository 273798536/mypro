from datetime import date, datetime
from models import (
    TrackOwnership,
    PlatformPlayback,
    NeighboringRightsContract,
    RightType,
    RecordStatus
)


def create_sample_data():
    contracts = [
        NeighboringRightsContract(
            contract_id="CON001",
            contract_no="NRC-2024-001",
            contract_name="华星音乐录音权合作协议",
            party_a="平台公司",
            party_b="华星音乐",
            right_type=RightType.RECORDING,
            tracks_covered=["TRK001", "TRK002"],
            revenue_sharing_ratio=0.5,
            effective_start=date(2024, 1, 1),
            effective_end=date(2024, 12, 31),
            territory="中国大陆",
            version=1,
            signed_date=date(2023, 12, 15)
        ),
        NeighboringRightsContract(
            contract_id="CON002",
            contract_no="NRC-2024-001",
            contract_name="华星音乐录音权合作协议V2",
            party_a="平台公司",
            party_b="华星音乐",
            right_type=RightType.RECORDING,
            tracks_covered=["TRK001", "TRK002", "TRK003"],
            revenue_sharing_ratio=0.55,
            effective_start=date(2024, 1, 1),
            effective_end=date(2025, 12, 31),
            territory="中国大陆",
            version=2,
            signed_date=date(2024, 2, 1)
        ),
        NeighboringRightsContract(
            contract_id="CON003",
            contract_no="NRC-2024-002",
            contract_name="天籁传媒表演权协议",
            party_a="平台公司",
            party_b="天籁传媒",
            right_type=RightType.PERFORMANCE,
            tracks_covered=["TRK001", "TRK002", "TRK003", "TRK004"],
            revenue_sharing_ratio=0.3,
            effective_start=date(2023, 6, 1),
            effective_end=date(2024, 5, 31),
            territory="中国大陆",
            version=1,
            signed_date=date(2023, 5, 20)
        ),
        NeighboringRightsContract(
            contract_id="CON004",
            contract_no="NRC-2024-003",
            contract_name="盛世唱片机械权协议",
            party_a="平台公司",
            party_b="盛世唱片",
            right_type=RightType.MECHANICAL,
            tracks_covered=["TRK004", "TRK005"],
            revenue_sharing_ratio=0.45,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="全球",
            version=1,
            signed_date=date(2023, 11, 10)
        )
    ]

    ownerships = [
        TrackOwnership(
            track_id="TRK001",
            track_name="夜空中最亮的星",
            isrc="CNM012000001",
            right_type=RightType.RECORDING,
            owner_id="OWN001",
            owner_name="华星音乐",
            ownership_ratio=0.6,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="中国大陆",
            source_contract_id="CON001"
        ),
        TrackOwnership(
            track_id="TRK001",
            track_name="夜空中最亮的星",
            isrc="CNM012000001",
            right_type=RightType.RECORDING,
            owner_id="OWN002",
            owner_name="星光工作室",
            ownership_ratio=0.5,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="中国大陆",
            source_contract_id="CON001"
        ),
        TrackOwnership(
            track_id="TRK002",
            track_name="春风十里",
            isrc="CNM012000002",
            right_type=RightType.RECORDING,
            owner_id="OWN001",
            owner_name="华星音乐",
            ownership_ratio=1.0,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="中国大陆",
            source_contract_id="CON001"
        ),
        TrackOwnership(
            track_id="TRK003",
            track_name="平凡之路",
            isrc="CNM012000003",
            right_type=RightType.PERFORMANCE,
            owner_id="OWN003",
            owner_name="天籁传媒",
            ownership_ratio=1.0,
            effective_start=date(2024, 1, 1),
            effective_end=date(2024, 5, 31),
            territory="中国大陆",
            source_contract_id="CON003"
        ),
        TrackOwnership(
            track_id="TRK004",
            track_name="后会无期",
            isrc="CNM012000004",
            right_type=RightType.MECHANICAL,
            owner_id="OWN004",
            owner_name="盛世唱片",
            ownership_ratio=1.0,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="全球",
            source_contract_id="CON004"
        ),
        TrackOwnership(
            track_id="TRK005",
            track_name="岁月神偷",
            isrc="CNM012000005",
            right_type=RightType.MECHANICAL,
            owner_id="OWN004",
            owner_name="盛世唱片",
            ownership_ratio=0.5,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="全球",
            source_contract_id="CON004"
        ),
        TrackOwnership(
            track_id="TRK005",
            track_name="岁月神偷",
            isrc="CNM012000005",
            right_type=RightType.MECHANICAL,
            owner_id="OWN005",
            owner_name="独立音乐人A",
            ownership_ratio=0.5,
            effective_start=date(2024, 1, 1),
            effective_end=None,
            territory="全球",
            source_contract_id="CON004"
        )
    ]

    playbacks = [
        PlatformPlayback(
            playback_id="PB001",
            track_id="TRK001",
            track_name="夜空中最亮的星",
            isrc="CNM012000001",
            platform="网易云音乐",
            play_count=125000,
            revenue_amount=8750.00,
            settlement_month="2024-05"
        ),
        PlatformPlayback(
            playback_id="PB002",
            track_id="TRK001",
            track_name="夜空中最亮的星",
            isrc="CNM012000001",
            platform="QQ音乐",
            play_count=98000,
            revenue_amount=6860.00,
            settlement_month="2024-05"
        ),
        PlatformPlayback(
            playback_id="PB003",
            track_id="TRK002",
            track_name="春风十里",
            isrc="CNM012000002",
            platform="网易云音乐",
            play_count=76000,
            revenue_amount=5320.00,
            settlement_month="2024-05"
        ),
        PlatformPlayback(
            playback_id="PB004",
            track_id="TRK003",
            track_name="平凡之路",
            isrc="CNM012000003",
            platform="QQ音乐",
            play_count=156000,
            revenue_amount=10920.00,
            settlement_month="2024-05"
        ),
        PlatformPlayback(
            playback_id="PB005",
            track_id="TRK004",
            track_name="后会无期",
            isrc="CNM012000004",
            platform="酷狗音乐",
            play_count=45000,
            revenue_amount=3150.00,
            settlement_month="2024-05"
        ),
        PlatformPlayback(
            playback_id="PB006",
            track_id="TRK005",
            track_name="岁月神偷",
            isrc="CNM012000005",
            platform="网易云音乐",
            play_count=89000,
            revenue_amount=6230.00,
            settlement_month="2024-05"
        ),
        PlatformPlayback(
            playback_id="PB007",
            track_id="TRK001",
            track_name="夜空中最亮的星",
            isrc="CNM012000001",
            platform="抖音",
            play_count=234000,
            revenue_amount=16380.00,
            settlement_month="2024-05",
            is_supplementary=True,
            supplementary_note="4月漏算的短综BGM使用量补录",
            original_playback_id="PB_SUPP_001"
        )
    ]

    return ownerships, playbacks, contracts
