import json
import csv
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path
from .models import AnalysisResult, ModulationPath, ModulationEdge, Issue, Modality


def modality_to_dict(mod: Modality) -> Dict[str, Any]:
    return {
        'id': mod.id,
        'key_note': mod.key_note.name,
        'key_pitch_class': mod.key_note.pitch_class,
        'modality_type': mod.modality_type.value,
        'notes': [{'name': n.name, 'pitch_class': n.pitch_class} for n in sorted(mod.notes, key=lambda x: x.pitch_class)],
        'scale_degrees': {str(k): v.name for k, v in mod.scale_degrees.items()}
    }


def edge_to_dict(edge: ModulationEdge) -> Dict[str, Any]:
    return {
        'source_id': edge.source.id,
        'target_id': edge.target.id,
        'source': str(edge.source),
        'target': str(edge.target),
        'common_tones': [n.name for n in edge.common_tones],
        'common_tone_count': edge.common_tone_count,
        'difficulty_score': round(edge.difficulty_score, 2),
        'modulation_type': edge.modulation_type,
        'is_enharmonic': edge.is_enharmonic,
        'needs_confirmation': edge.needs_confirmation
    }


def path_to_dict(path: ModulationPath, rank: int = 0) -> Dict[str, Any]:
    return {
        'rank': rank,
        'path_str': str(path),
        'length': path.length,
        'total_difficulty': round(path.total_difficulty, 2),
        'total_common_tones': path.total_common_tones,
        'modalities': [str(m) for m in path.modalities],
        'modality_ids': [m.id for m in path.modalities],
        'edges': [edge_to_dict(e) for e in path.edges]
    }


def issue_to_dict(issue: Issue) -> Dict[str, Any]:
    return {
        'issue_type': issue.issue_type,
        'severity': issue.severity,
        'description': issue.description,
        'related_items': issue.related_items,
        'suggested_action': issue.suggested_action
    }


def export_to_json(
    result: AnalysisResult,
    issues: List[Issue],
    output_path: str
) -> str:
    data = {
        'run_id': result.run_id,
        'timestamp': result.timestamp,
        'start_modality': modality_to_dict(result.start_modality),
        'target_modality': modality_to_dict(result.target_modality),
        'paths': [path_to_dict(p, i+1) for i, p in enumerate(result.paths)],
        'all_edges': [edge_to_dict(e) for e in result.all_edges],
        'issues': [issue_to_dict(i) for i in issues],
        'summary': {
            'total_paths_found': len(result.paths),
            'total_edges_analyzed': len(result.all_edges),
            'issues_count': len(issues),
            'best_path_score': round(result.paths[0].total_difficulty, 2) if result.paths else None
        }
    }
    
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    return output_path


def export_paths_to_csv(
    result: AnalysisResult,
    output_path: str
) -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Rank', 'Path', 'Steps', 'Total Difficulty', 
            'Avg Difficulty/Step', 'Total Common Tones',
            'Modalities'
        ])
        
        for i, path in enumerate(result.paths, 1):
            writer.writerow([
                i,
                str(path),
                path.length,
                round(path.total_difficulty, 2),
                round(path.total_difficulty / path.length, 2) if path.length > 0 else 0,
                path.total_common_tones,
                ' -> '.join(str(m) for m in path.modalities)
            ])
    
    return output_path


def export_edges_to_csv(
    edges: List[ModulationEdge],
    output_path: str
) -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'From', 'To', 'Common Tones', 'Common Tone Count',
            'Difficulty Score', 'Modulation Type',
            'Is Enharmonic', 'Needs Confirmation'
        ])
        
        for edge in edges:
            writer.writerow([
                str(edge.source),
                str(edge.target),
                ', '.join(n.name for n in edge.common_tones),
                edge.common_tone_count,
                round(edge.difficulty_score, 2),
                edge.modulation_type,
                edge.is_enharmonic,
                edge.needs_confirmation
            ])
    
    return output_path


def export_issues_to_csv(
    issues: List[Issue],
    output_path: str
) -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow([
            'Issue Type', 'Severity', 'Description',
            'Related Items', 'Suggested Action'
        ])
        
        for issue in issues:
            writer.writerow([
                issue.issue_type,
                issue.severity,
                issue.description,
                ', '.join(issue.related_items),
                issue.suggested_action
            ])
    
    return output_path


def load_analysis_result(file_path: str) -> Dict:
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)


def compare_runs(
    run1_path: str,
    run2_path: str
) -> Dict[str, Any]:
    run1 = load_analysis_result(run1_path)
    run2 = load_analysis_result(run2_path)
    
    paths1 = {p['path_str']: p for p in run1['paths']}
    paths2 = {p['path_str']: p for p in run2['paths']}
    
    new_paths = [p for k, p in paths2.items() if k not in paths1]
    removed_paths = [p for k, p in paths1.items() if k not in paths2]
    changed_paths = []
    
    for k in paths1.keys() & paths2.keys():
        p1, p2 = paths1[k], paths2[k]
        if p1['total_difficulty'] != p2['total_difficulty'] or p1['edges'] != p2['edges']:
            changed_paths.append({
                'path': k,
                'run1': p1,
                'run2': p2,
                'diff': {
                    'score_change': round(p2['total_difficulty'] - p1['total_difficulty'], 2)
                }
            })
    
    edges1 = {(e['source_id'], e['target_id']): e for e in run1['all_edges']}
    edges2 = {(e['source_id'], e['target_id']): e for e in run2['all_edges']}
    
    new_edges = [e for k, e in edges2.items() if k not in edges1]
    removed_edges = [e for k, e in edges1.items() if k not in edges2]
    changed_edges = []
    
    for k in edges1.keys() & edges2.keys():
        e1, e2 = edges1[k], edges2[k]
        if e1 != e2:
            changed_edges.append({
                'key': k,
                'run1': e1,
                'run2': e2
            })
    
    return {
        'run1_id': run1['run_id'],
        'run2_id': run2['run_id'],
        'comparison': {
            'paths': {
                'new_count': len(new_paths),
                'removed_count': len(removed_paths),
                'changed_count': len(changed_paths),
                'new_paths': new_paths,
                'removed_paths': removed_paths,
                'changed_paths': changed_paths
            },
            'edges': {
                'new_count': len(new_edges),
                'removed_count': len(removed_edges),
                'changed_count': len(changed_edges),
                'new_edges': new_edges,
                'removed_edges': removed_edges,
                'changed_edges': changed_edges
            }
        }
    }


def export_comparison_to_json(
    comparison: Dict,
    output_path: str
) -> str:
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(comparison, f, indent=2, ensure_ascii=False)
    
    return output_path
