from typing import Dict, List, Set, Tuple, Optional
from .models import Note, Modality, ModalityType, ModulationEdge, Issue


NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']


ENHARMONIC_MAP: Dict[str, List[str]] = {
    'C#': ['Db'], 'Db': ['C#'],
    'D#': ['Eb'], 'Eb': ['D#'],
    'F#': ['Gb'], 'Gb': ['F#'],
    'G#': ['Ab'], 'Ab': ['G#'],
    'A#': ['Bb'], 'Bb': ['A#'],
    'B': ['Cb'], 'Cb': ['B'],
    'E': ['Fb'], 'Fb': ['E'],
}


MODALITY_INTERVALS: Dict[ModalityType, List[int]] = {
    ModalityType.MAJOR: [0, 2, 4, 5, 7, 9, 11],
    ModalityType.MINOR: [0, 2, 3, 5, 7, 8, 10],
    ModalityType.DORIAN: [0, 2, 3, 5, 7, 9, 10],
    ModalityType.PHRYGIAN: [0, 1, 3, 5, 7, 8, 10],
    ModalityType.LYDIAN: [0, 2, 4, 6, 7, 9, 11],
    ModalityType.MIXOLYDIAN: [0, 2, 4, 5, 7, 9, 10],
    ModalityType.LOCRIAN: [0, 1, 3, 5, 6, 8, 10],
    ModalityType.HARMONIC_MINOR: [0, 2, 3, 5, 7, 8, 11],
    ModalityType.MELODIC_MINOR: [0, 2, 3, 5, 7, 9, 11],
}


def create_note(name: str) -> Note:
    name = name.strip()
    if name in NOTE_NAMES_SHARP:
        return Note(name, NOTE_NAMES_SHARP.index(name))
    if name in NOTE_NAMES_FLAT:
        return Note(name, NOTE_NAMES_FLAT.index(name))
    
    for base_name, enharmonics in ENHARMONIC_MAP.items():
        if name in enharmonics:
            if base_name in NOTE_NAMES_SHARP:
                return Note(name, NOTE_NAMES_SHARP.index(base_name))
            if base_name in NOTE_NAMES_FLAT:
                return Note(name, NOTE_NAMES_FLAT.index(base_name))
    
    raise ValueError(f"Unknown note name: {name}")


def get_note_name(pitch_class: int, use_flats: bool = False) -> str:
    if use_flats:
        return NOTE_NAMES_FLAT[pitch_class % 12]
    return NOTE_NAMES_SHARP[pitch_class % 12]


def create_modality(key_note_name: str, modality_type: ModalityType) -> Modality:
    key_note = create_note(key_note_name)
    intervals = MODALITY_INTERVALS[modality_type]
    
    notes: Set[Note] = set()
    scale_degrees: Dict[int, Note] = {}
    
    for degree, interval in enumerate(intervals, 1):
        pc = (key_note.pitch_class + interval) % 12
        note_name = get_note_name(pc, use_flats='b' in key_note_name)
        note = Note(note_name, pc)
        notes.add(note)
        scale_degrees[degree] = note
    
    return Modality(key_note, modality_type, notes, scale_degrees)


def create_all_modalities() -> List[Modality]:
    modalities = []
    for note_name in NOTE_NAMES_SHARP:
        for mod_type in ModalityType:
            modalities.append(create_modality(note_name, mod_type))
    return modalities


def get_common_tones(mod1: Modality, mod2: Modality) -> Set[Note]:
    return mod1.notes.intersection(mod2.notes)


def calculate_difficulty_score(
    common_tones: Set[Note],
    source: Modality,
    target: Modality
) -> Tuple[float, str]:
    common_count = len(common_tones)
    total_notes = 7
    
    key_distance = abs(target.key_note.pitch_class - source.key_note.pitch_class)
    key_distance = min(key_distance, 12 - key_distance)
    
    same_type = source.modality_type == target.modality_type
    
    if same_type:
        base_score = key_distance * 1.0
    else:
        base_score = key_distance * 1.5
    
    common_ratio = common_count / total_notes
    common_penalty = (1 - common_ratio) * 4.0
    
    pivot_count = sum(1 for n in common_tones 
                      if n in [source.scale_degrees.get(1), source.scale_degrees.get(5),
                               target.scale_degrees.get(1), target.scale_degrees.get(5)])
    
    pivot_penalty = max(0, 2 - pivot_count) * 1.5
    
    enharmonic_penalty = 0.0
    for n1 in source.notes:
        for n2 in target.notes:
            if n1.pitch_class == n2.pitch_class and n1.name != n2.name:
                enharmonic_penalty += 0.5
    
    total_score = base_score + common_penalty + pivot_penalty + enharmonic_penalty
    total_score = max(0.5, total_score)
    
    if same_type and common_count >= 6:
        modulation_type = "diatonic_common_tone"
    elif same_type and common_count >= 4:
        modulation_type = "closely_related"
    elif common_count >= 3:
        modulation_type = "common_tone"
    elif key_distance <= 2:
        modulation_type = "nearby_key"
    else:
        modulation_type = "distant_modulation"
    
    return total_score, modulation_type


def check_enharmonic_issues(mod1: Modality, mod2: Modality) -> Tuple[bool, List[str]]:
    issues = []
    is_enharmonic = False
    
    for note1 in mod1.notes:
        for note2 in mod2.notes:
            if note1.pitch_class == note2.pitch_class and note1.name != note2.name:
                is_enharmonic = True
                issues.append(f"{note1.name} ≈ {note2.name}")
    
    return is_enharmonic, issues


def create_modulation_edge(
    source: Modality,
    target: Modality,
    min_common_tones: int = 1
) -> Optional[Tuple[Optional[ModulationEdge], List[Issue]]]:
    issues: List[Issue] = []
    
    if source.id == target.id:
        return None, issues
    
    common_tones = get_common_tones(source, target)
    
    if len(common_tones) < min_common_tones:
        issues.append(Issue(
            issue_type="insufficient_common_tones",
            severity="warning",
            description=f"Only {len(common_tones)} common tones between {source} and {target} (minimum required: {min_common_tones})",
            related_items=[source.id, target.id],
            suggested_action=f"Consider lowering min_common_tones threshold or verify the modulation is intentional"
        ))
    
    is_enharmonic, enharmonic_issues = check_enharmonic_issues(source, target)
    
    if is_enharmonic:
        issues.append(Issue(
            issue_type="enharmonic_confusion",
            severity="info",
            description=f"Enharmonic equivalents found: {', '.join(enharmonic_issues)}",
            related_items=[source.id, target.id],
            suggested_action="Review enharmonic spellings for theoretical correctness"
        ))
    
    difficulty_score, modulation_type = calculate_difficulty_score(common_tones, source, target)
    
    edge = ModulationEdge(
        source=source,
        target=target,
        common_tones=common_tones,
        difficulty_score=difficulty_score,
        modulation_type=modulation_type,
        is_enharmonic=is_enharmonic,
        needs_confirmation=is_enharmonic or len(common_tones) < 2
    )
    
    return edge, issues
