import os
import re
import yaml
import json
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Set
from datetime import datetime
from collections import defaultdict


@dataclass
class AudioReference:
    file_path: str
    file_name: str
    referenced_by: List[str] = field(default_factory=list)
    reference_count: int = 0
    last_used: Optional[str] = None
    tags: List[str] = field(default_factory=list)
    notes: str = ""
    source_type: str = ""
    
    def to_dict(self) -> Dict:
        return {
            "file_path": self.file_path,
            "file_name": self.file_name,
            "referenced_by": self.referenced_by,
            "reference_count": self.reference_count,
            "last_used": self.last_used,
            "tags": self.tags,
            "notes": self.notes,
            "source_type": self.source_type
        }


@dataclass
class ReferenceModification:
    timestamp: str
    action: str
    file_path: str
    field: str
    old_value: str
    new_value: str
    user: str = "system"
    
    def to_dict(self) -> Dict:
        return {
            "timestamp": self.timestamp,
            "action": self.action,
            "file_path": self.file_path,
            "field": self.field,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "user": self.user
        }


class ReferenceTracker:
    def __init__(self):
        self.references: Dict[str, AudioReference] = {}
        self.modification_history: List[ReferenceModification] = []
        self.tag_index: Dict[str, Set[str]] = defaultdict(set)
    
    def _record_modification(self, action: str, file_path: str, field: str, 
                             old_value: str, new_value: str, user: str = "system"):
        mod = ReferenceModification(
            timestamp=datetime.now().isoformat(),
            action=action,
            file_path=file_path,
            field=field,
            old_value=str(old_value),
            new_value=str(new_value),
            user=user
        )
        self.modification_history.append(mod)
    
    def scan_project_directory(self, project_dir: str, 
                                code_extensions: List[str] = None) -> Dict[str, AudioReference]:
        if code_extensions is None:
            code_extensions = ['.cs', '.js', '.ts', '.py', '.lua', '.json', '.unity', '.prefab']
        
        audio_patterns = [
            r'["\']([^"\']+\.(?:wav|mp3|ogg|flac|m4a))["\']',
            r'AudioClip\s*\(\s*["\']([^"\']+)["\']',
            r'LoadAudio\s*\(\s*["\']([^"\']+)["\']',
            r'playSound\s*\(\s*["\']([^"\']+)["\']',
        ]
        
        compiled_patterns = [re.compile(p, re.IGNORECASE) for p in audio_patterns]
        
        for root, _, files in os.walk(project_dir):
            for file in files:
                if not any(file.endswith(ext) for ext in code_extensions):
                    continue
                
                file_path = os.path.join(root, file)
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    for pattern in compiled_patterns:
                        matches = pattern.findall(content)
                        for audio_ref in matches:
                            audio_name = os.path.basename(audio_ref)
                            self._add_reference(audio_ref, audio_name, file_path, "code_scan")
                except Exception as e:
                    print(f"Error scanning {file_path}: {e}")
        
        return self.references
    
    def import_tag_table(self, tag_file: str) -> Dict[str, AudioReference]:
        _, ext = os.path.splitext(tag_file)
        
        if ext == '.yaml' or ext == '.yml':
            with open(tag_file, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
        elif ext == '.json':
            with open(tag_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        else:
            raise ValueError(f"Unsupported tag file format: {ext}")
        
        for entry in data:
            file_path = entry.get('file_path', entry.get('path', ''))
            file_name = entry.get('file_name', os.path.basename(file_path))
            tags = entry.get('tags', [])
            notes = entry.get('notes', '')
            
            ref = self._get_or_create_ref(file_path, file_name)
            ref.tags.extend(tags)
            ref.notes = notes
            ref.source_type = "tag_table"
            
            for tag in tags:
                self.tag_index[tag].add(file_path)
        
        return self.references
    
    def _get_or_create_ref(self, file_path: str, file_name: str) -> AudioReference:
        if file_path not in self.references:
            self.references[file_path] = AudioReference(
                file_path=file_path,
                file_name=file_name
            )
        return self.references[file_path]
    
    def _add_reference(self, file_path: str, file_name: str, 
                       referenced_by: str, source_type: str):
        ref = self._get_or_create_ref(file_path, file_name)
        if referenced_by not in ref.referenced_by:
            ref.referenced_by.append(referenced_by)
            ref.reference_count += 1
            ref.last_used = datetime.now().isoformat()
        if not ref.source_type:
            ref.source_type = source_type
    
    def add_usage_record(self, file_path: str, used_by: str, 
                         user: str = "system") -> Optional[AudioReference]:
        if file_path not in self.references:
            return None
        
        ref = self.references[file_path]
        old_count = ref.reference_count
        old_refs = ref.referenced_by.copy()
        
        if used_by not in ref.referenced_by:
            ref.referenced_by.append(used_by)
            ref.reference_count += 1
            ref.last_used = datetime.now().isoformat()
            
            self._record_modification(
                action="add_usage",
                file_path=file_path,
                field="referenced_by",
                old_value=str(old_refs),
                new_value=str(ref.referenced_by),
                user=user
            )
        
        return ref
    
    def update_tags(self, file_path: str, tags: List[str], 
                    user: str = "system") -> Optional[AudioReference]:
        if file_path not in self.references:
            return None
        
        ref = self.references[file_path]
        old_tags = ref.tags.copy()
        
        ref.tags = tags
        
        for tag in old_tags:
            if tag not in tags and file_path in self.tag_index[tag]:
                self.tag_index[tag].remove(file_path)
        
        for tag in tags:
            self.tag_index[tag].add(file_path)
        
        self._record_modification(
            action="update_tags",
            file_path=file_path,
            field="tags",
            old_value=str(old_tags),
            new_value=str(tags),
            user=user
        )
        
        return ref
    
    def get_references_for_file(self, file_path: str) -> Optional[AudioReference]:
        return self.references.get(file_path)
    
    def get_unused_files(self) -> List[AudioReference]:
        return [ref for ref in self.references.values() if ref.reference_count == 0]
    
    def get_files_by_tag(self, tag: str) -> List[AudioReference]:
        file_paths = self.tag_index.get(tag, set())
        return [self.references[fp] for fp in file_paths if fp in self.references]
    
    def get_modification_history(self, file_path: str = None) -> List[ReferenceModification]:
        if file_path:
            return [m for m in self.modification_history if m.file_path == file_path]
        return self.modification_history
    
    def export_references(self, output_path: str, format: str = "json"):
        data = {
            "references": {k: v.to_dict() for k, v in self.references.items()},
            "modification_history": [m.to_dict() for m in self.modification_history]
        }
        
        if format == "json":
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
        elif format == "yaml":
            with open(output_path, 'w', encoding='utf-8') as f:
                yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        else:
            raise ValueError(f"Unsupported export format: {format}")
    
    def import_references(self, input_path: str):
        _, ext = os.path.splitext(input_path)
        
        if ext == '.json':
            with open(input_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
        elif ext in ['.yaml', '.yml']:
            with open(input_path, 'r', encoding='utf-8') as f:
                data = yaml.safe_load(f)
        else:
            raise ValueError(f"Unsupported import format: {ext}")
        
        for file_path, ref_data in data.get("references", {}).items():
            ref = AudioReference(
                file_path=ref_data["file_path"],
                file_name=ref_data["file_name"],
                referenced_by=ref_data.get("referenced_by", []),
                reference_count=ref_data.get("reference_count", 0),
                last_used=ref_data.get("last_used"),
                tags=ref_data.get("tags", []),
                notes=ref_data.get("notes", ""),
                source_type=ref_data.get("source_type", "")
            )
            self.references[file_path] = ref
            
            for tag in ref.tags:
                self.tag_index[tag].add(file_path)
        
        for mod_data in data.get("modification_history", []):
            mod = ReferenceModification(
                timestamp=mod_data["timestamp"],
                action=mod_data["action"],
                file_path=mod_data["file_path"],
                field=mod_data["field"],
                old_value=mod_data["old_value"],
                new_value=mod_data["new_value"],
                user=mod_data.get("user", "system")
            )
            self.modification_history.append(mod)
