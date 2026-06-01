#!/usr/bin/env python3
import os
import sys
import json
import csv
from pathlib import Path
from datetime import datetime
from flask import Flask, render_template, request, jsonify, send_file
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.graph_model import TopologyGraph, Edge, EdgeDirection
from src.connectivity_audit import ConnectivityAuditor
from src.report_exporter import ReportExporter
from src.change_detector import ChangeDetector

app = Flask(__name__, 
            template_folder=str(Path(__file__).parent.parent / 'templates'),
            static_folder=str(Path(__file__).parent.parent / 'static'))

DATA_DIR = Path(__file__).parent.parent / 'data'
REPORTS_DIR = Path(__file__).parent.parent / 'reports'
DATA_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)

current_graph = None
current_report = None
previous_graph = None
previous_report = None


def load_data():
    global current_graph, current_report
    
    nodes_file = DATA_DIR / 'nodes.csv'
    edges_file = DATA_DIR / 'edges.csv'
    
    if nodes_file.exists() and edges_file.exists():
        current_graph = TopologyGraph()
        current_graph.load_nodes_from_csv(str(nodes_file))
        current_graph.load_edges_from_csv(str(edges_file))
        
        auditor = ConnectivityAuditor(current_graph)
        current_report = auditor.run_full_audit()
        current_report.source_file_nodes = str(nodes_file)
        current_report.source_file_edges = str(edges_file)


def save_graph_to_csv(graph: TopologyGraph):
    nodes_data = []
    for node_id, node in graph.nodes.items():
        nodes_data.append({
            'id': node.id,
            'name': node.name,
            'layer': node.layer,
            'tags': ','.join(node.tags)
        })
    pd.DataFrame(nodes_data).to_csv(DATA_DIR / 'nodes.csv', index=False)
    
    edges_data = []
    for edge_id, edge in graph.edges.items():
        edges_data.append({
            'id': edge.id,
            'source': edge.source,
            'target': edge.target,
            'direction': edge.direction.value,
            'layer': edge.layer
        })
    pd.DataFrame(edges_data).to_csv(DATA_DIR / 'edges.csv', index=False)


@app.route('/')
def index():
    load_data()
    return render_template('index.html')


@app.route('/api/summary')
def api_summary():
    if current_report is None:
        return jsonify({'error': 'No data loaded'}), 404
    
    return jsonify({
        'total_nodes': current_report.total_nodes,
        'total_edges': current_report.total_edges,
        'total_issues': current_report.total_issues,
        'isolated_nodes': len(current_report.isolated_nodes),
        'cross_layer_mismatches': len(current_report.cross_layer_mismatches),
        'direction_reversals': len(current_report.direction_reversals),
        'broken_paths': len(current_report.broken_paths),
        'source_files': {
            'nodes': current_report.source_file_nodes,
            'edges': current_report.source_file_edges
        }
    })


@app.route('/api/nodes')
def api_nodes():
    if current_graph is None:
        return jsonify([])
    
    nodes = []
    for node_id, node in current_graph.nodes.items():
        is_isolated = any(issue.nodes and issue.nodes[0] == node_id 
                          for issue in current_report.isolated_nodes)
        nodes.append({
            'id': node.id,
            'name': node.name,
            'layer': node.layer,
            'tags': node.tags,
            'is_isolated': is_isolated,
            'source': '节点列表'
        })
    
    return jsonify(nodes)


@app.route('/api/edges')
def api_edges():
    if current_graph is None:
        return jsonify([])
    
    edges = []
    for edge_id, edge in current_graph.edges.items():
        has_cross_layer = any(edge_id in issue.edges 
                               for issue in current_report.cross_layer_mismatches)
        has_direction_issue = any(edge_id in issue.edges 
                                   for issue in current_report.direction_reversals)
        edges.append({
            'id': edge.id,
            'source': edge.source,
            'target': edge.target,
            'direction': edge.direction.value,
            'layer': edge.layer,
            'has_cross_layer_issue': has_cross_layer,
            'has_direction_issue': has_direction_issue,
            'source': '边关系'
        })
    
    return jsonify(edges)


@app.route('/api/issues/<issue_type>')
def api_issues(issue_type):
    if current_report is None:
        return jsonify([])
    
    type_map = {
        'isolated': current_report.isolated_nodes,
        'cross_layer': current_report.cross_layer_mismatches,
        'direction': current_report.direction_reversals,
        'broken': current_report.broken_paths
    }
    
    issues = type_map.get(issue_type, [])
    return jsonify([{
        'type': issue.type.value,
        'severity': issue.severity,
        'message': issue.message,
        'nodes': issue.nodes,
        'edges': issue.edges,
        'details': issue.details
    } for issue in issues])


@app.route('/api/paths')
def api_paths():
    if current_report is None:
        return jsonify([])
    
    paths = []
    for pr in current_report.path_results:
        if pr.path:
            paths.append({
                'path': pr.path,
                'edges': pr.edges,
                'layers': pr.layers,
                'has_issues': pr.has_issues,
                'source': '路径查询'
            })
    
    return jsonify(paths)


@app.route('/api/edge/<edge_id>', methods=['PUT'])
def update_edge(edge_id):
    global previous_graph, previous_report, current_graph, current_report
    
    if current_graph is None or edge_id not in current_graph.edges:
        return jsonify({'error': 'Edge not found'}), 404
    
    previous_graph = current_graph
    previous_report = current_report
    
    data = request.json
    edge = current_graph.edges[edge_id]
    
    current_graph.remove_edge(edge_id)
    
    new_edge = Edge(
        id=edge_id,
        source=data.get('source', edge.source),
        target=data.get('target', edge.target),
        direction=EdgeDirection(data.get('direction', edge.direction.value)),
        layer=data.get('layer', edge.layer)
    )
    current_graph.add_edge(new_edge)
    
    save_graph_to_csv(current_graph)
    
    auditor = ConnectivityAuditor(current_graph)
    current_report = auditor.run_full_audit()
    
    return jsonify({
        'success': True,
        'edge': {
            'id': new_edge.id,
            'source': new_edge.source,
            'target': new_edge.target,
            'direction': new_edge.direction.value
        }
    })


@app.route('/api/compare')
def api_compare():
    if previous_graph is None or previous_report is None:
        return jsonify({'has_previous': False})
    
    detector = ChangeDetector(previous_graph, current_graph)
    change_report = detector.compare_graphs(previous_report, current_report)
    
    return jsonify({
        'has_previous': True,
        'node_changes': [
            {
                'change_type': c.change_type,
                'item_id': c.item_id,
                'old_value': c.old_value,
                'new_value': c.new_value,
                'details': c.details
            }
            for c in change_report.node_changes
        ],
        'edge_changes': [
            {
                'change_type': c.change_type,
                'item_id': c.item_id,
                'old_value': c.old_value,
                'new_value': c.new_value,
                'details': c.details
            }
            for c in change_report.edge_changes
        ],
        'breakpoints': change_report.breakpoints,
        'issue_changes': [
            {
                'change_type': c.change_type,
                'item_id': c.item_id,
                'old_value': c.old_value,
                'new_value': c.new_value,
                'details': c.details
            }
            for c in change_report.issue_changes
        ],
        'path_changes': change_report.path_changes
    })


@app.route('/api/export/<export_format>')
def export_report(export_format):
    if current_report is None or current_graph is None:
        return jsonify({'error': 'No data to export'}), 404
    
    exporter = ReportExporter(str(REPORTS_DIR))
    filepath = exporter.export_full_report(current_report, current_graph, export_format)
    
    return send_file(filepath, as_attachment=True)


@app.route('/api/upload', methods=['POST'])
def upload_files():
    if 'nodes' not in request.files or 'edges' not in request.files:
        return jsonify({'error': 'Missing files'}), 400
    
    nodes_file = request.files['nodes']
    edges_file = request.files['edges']
    
    nodes_file.save(DATA_DIR / 'nodes.csv')
    edges_file.save(DATA_DIR / 'edges.csv')
    
    load_data()
    
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
