from podcast_intro_alert.models import (
    AnomalyRecord,
    AnomalyCategory,
    ProcessingStatus,
    ChannelTableEntry,
)


class AnomalyDetector:
    def __init__(self) -> None:
        self._counter = 0

    def _next_id(self, prefix: str = "ANM") -> str:
        self._counter += 1
        return f"{prefix}-{self._counter:03d}"

    def detect(self, entries: list[ChannelTableEntry]) -> list[AnomalyRecord]:
        records: list[AnomalyRecord] = []
        records.extend(self._find_duplicate_aliases(entries))
        records.extend(self._find_missing_intros(entries))
        records.extend(self._find_channel_conflicts(entries))
        records.extend(self._find_metadata_mismatches(entries))
        return records

    def _find_duplicate_aliases(self, entries: list[ChannelTableEntry]) -> list[AnomalyRecord]:
        results: list[AnomalyRecord] = []
        alias_map: dict[str, list[ChannelTableEntry]] = {}
        for e in entries:
            key = (e.song_alias or e.song_name).strip().lower()
            alias_map.setdefault(key, []).append(e)

        for key, group in alias_map.items():
            if len(group) < 2:
                continue
            ids = [e.entry_id for e in group]
            names = [e.song_name for e in group]
            episodes = [e.episode for e in group]
            results.append(
                AnomalyRecord(
                    anomaly_id=self._next_id("DUP"),
                    category=AnomalyCategory.DUPLICATE_ALIAS,
                    source_entry_ids=ids,
                    description=f"别名「{group[0].song_alias or group[0].song_name}」在 {len(group)} 条记录中重复出现",
                    human_reason=(
                        f"曲名别名「{group[0].song_alias or group[0].song_name}」被 "
                        f"{'、'.join(episodes)} 的 "
                        f"{'、'.join(names)} 共用，"
                        f"需确认是否为同一曲目或命名冲突"
                    ),
                    status=ProcessingStatus.PENDING,
                )
            )
        return results

    def _find_missing_intros(self, entries: list[ChannelTableEntry]) -> list[AnomalyRecord]:
        results: list[AnomalyRecord] = []
        for e in entries:
            if not e.intro_file:
                results.append(
                    AnomalyRecord(
                        anomaly_id=self._next_id("MIS"),
                        category=AnomalyCategory.MISSING_INTRO,
                        source_entry_ids=[e.entry_id],
                        description=f"「{e.display_label()}」缺少片头素材文件",
                        human_reason=(
                            f"第 {e.episode} 期通道 {e.channel} 的曲目「{e.song_name}」"
                            f"未关联片头素材，录音师需确认素材是否遗漏或尚未入库"
                        ),
                        status=ProcessingStatus.PENDING,
                    )
                )
        return results

    def _find_channel_conflicts(self, entries: list[ChannelTableEntry]) -> list[AnomalyRecord]:
        results: list[AnomalyRecord] = []
        slot_map: dict[str, list[ChannelTableEntry]] = {}
        for e in entries:
            slot_key = f"{e.episode}|{e.channel}"
            slot_map.setdefault(slot_key, []).append(e)

        for slot_key, group in slot_map.items():
            if len(group) < 2:
                continue
            ids = [e.entry_id for e in group]
            names = [e.song_name for e in group]
            episode, channel = slot_key.split("|", 1)
            results.append(
                AnomalyRecord(
                    anomaly_id=self._next_id("CHC"),
                    category=AnomalyCategory.CHANNEL_CONFLICT,
                    source_entry_ids=ids,
                    description=f"第 {episode} 期通道 {channel} 有 {len(group)} 首曲目占用",
                    human_reason=(
                        f"第 {episode} 期通道 {channel} 同时安排了 "
                        f"{'、'.join(names)}，"
                        f"需确认是否分时复用或通道分配有误"
                    ),
                    status=ProcessingStatus.PENDING,
                )
            )
        return results

    def _find_metadata_mismatches(self, entries: list[ChannelTableEntry]) -> list[AnomalyRecord]:
        results: list[AnomalyRecord] = []
        name_artist: dict[str, set[str]] = {}
        for e in entries:
            name_artist.setdefault(e.song_name, set()).add(e.artist or "未知")

        for name, artists in name_artist.items():
            if len(artists) <= 1:
                continue
            matching = [e for e in entries if e.song_name == name]
            ids = [e.entry_id for e in matching]
            results.append(
                AnomalyRecord(
                    anomaly_id=self._next_id("MTM"),
                    category=AnomalyCategory.METADATA_MISMATCH,
                    source_entry_ids=ids,
                    description=f"曲目「{name}」关联了多位演出者：{'、'.join(artists)}",
                    human_reason=(
                        f"曲目「{name}」在不同记录中对应演出者不一致"
                        f"（{'、'.join(artists)}），"
                        f"需核实是否为同名异曲或元数据录入错误"
                    ),
                    status=ProcessingStatus.PENDING,
                )
            )
        return results
