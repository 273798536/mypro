let allNodes = [];
let allEdges = [];

document.addEventListener('DOMContentLoaded', function() {
    loadSummary();
    loadNodes();
    loadEdges();
    loadIssues();
    loadPaths();
    loadCompare();
    
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
});

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.remove('active'));
    
    document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'compare') {
        loadCompare();
    }
}

async function loadSummary() {
    try {
        const response = await fetch('/api/summary');
        const data = await response.json();
        
        document.getElementById('totalNodes').textContent = data.total_nodes;
        document.getElementById('totalEdges').textContent = data.total_edges;
        document.getElementById('isolatedNodes').textContent = data.isolated_nodes;
        document.getElementById('crossLayerIssues').textContent = data.cross_layer_mismatches;
        document.getElementById('directionIssues').textContent = data.direction_reversals;
        document.getElementById('brokenPaths').textContent = data.broken_paths;
        
        document.getElementById('sourceNodes').textContent = data.source_files.nodes;
        document.getElementById('sourceEdges').textContent = data.source_files.edges;
    } catch (error) {
        console.error('Error loading summary:', error);
    }
}

async function loadNodes() {
    try {
        const response = await fetch('/api/nodes');
        allNodes = await response.json();
        
        const tbody = document.getElementById('nodesTable');
        tbody.innerHTML = allNodes.map(node => `
            <tr>
                <td><code>${node.id}</code></td>
                <td>${node.name}</td>
                <td>${node.layer}</td>
                <td>${node.tags.join(', ') || '-'}</td>
                <td>
                    <span class="status-badge ${node.is_isolated ? 'warning' : 'normal'}">
                        ${node.is_isolated ? '孤立' : '正常'}
                    </span>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading nodes:', error);
    }
}

async function loadEdges() {
    try {
        const response = await fetch('/api/edges');
        allEdges = await response.json();
        
        const tbody = document.getElementById('edgesTable');
        tbody.innerHTML = allEdges.map(edge => {
            let issues = [];
            if (edge.has_cross_layer_issue) issues.push('跨层错连');
            if (edge.has_direction_issue) issues.push('方向边反');
            
            return `
                <tr>
                    <td><code>${edge.id}</code></td>
                    <td>${edge.source}</td>
                    <td>${edge.target}</td>
                    <td>${edge.direction}</td>
                    <td>${edge.layer || '-'}</td>
                    <td>
                        ${issues.length > 0 
                            ? `<span class="status-badge error">${issues.join(', ')}</span>` 
                            : '<span class="status-badge normal">正常</span>'}
                    </td>
                    <td>
                        <button class="btn btn-primary" style="padding: 5px 10px; font-size: 12px;" 
                                onclick="openEditModal('${edge.id}')">编辑</button>
                    </td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading edges:', error);
    }
}

async function loadIssues() {
    const issueTypes = ['isolated', 'cross_layer', 'direction', 'broken'];
    const elementIds = ['isolatedIssues', 'crossLayerIssuesList', 'directionIssuesList', 'brokenPathsList'];
    
    for (let i = 0; i < issueTypes.length; i++) {
        try {
            const response = await fetch(`/api/issues/${issueTypes[i]}`);
            const issues = await response.json();
            
            const container = document.getElementById(elementIds[i]);
            if (issues.length === 0) {
                container.innerHTML = '<p style="color: #7f8c8d; padding: 10px;">暂无问题</p>';
            } else {
                container.innerHTML = issues.map(issue => `
                    <div class="issue-item ${issue.severity}">
                        <div class="message">${issue.message}</div>
                        <div class="details">
                            来源: ${issue.details.source || '未知'}
                            ${issue.nodes.length ? ` | 节点: ${issue.nodes.join(', ')}` : ''}
                            ${issue.edges.length ? ` | 边: ${issue.edges.join(', ')}` : ''}
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error(`Error loading ${issueTypes[i]} issues:`, error);
        }
    }
}

async function loadPaths() {
    try {
        const response = await fetch('/api/paths');
        const paths = await response.json();
        
        const container = document.getElementById('pathsList');
        if (paths.length === 0) {
            container.innerHTML = '<p style="color: #7f8c8d; padding: 20px;">暂无路径数据</p>';
        } else {
            container.innerHTML = paths.map((path, index) => `
                <div class="path-item ${path.has_issues ? 'has-issues' : ''}">
                    <div class="path-display">
                        <strong>路径 ${index + 1}:</strong> ${path.path.join(' → ')}
                    </div>
                    <div class="path-info">
                        <span>途经边: ${path.edges.join(', ')}</span>
                        <span>层级: ${path.layers.join(' → ')}</span>
                        <span>来源: ${path.source}</span>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading paths:', error);
    }
}

async function loadCompare() {
    try {
        const response = await fetch('/api/compare');
        const data = await response.json();
        
        if (!data.has_previous) {
            document.getElementById('noPrevious').style.display = 'block';
            document.getElementById('compareContent').style.display = 'none';
            return;
        }
        
        document.getElementById('noPrevious').style.display = 'none';
        document.getElementById('compareContent').style.display = 'block';
        
        const renderChanges = (changes, containerId) => {
            const container = document.getElementById(containerId);
            if (changes.length === 0) {
                container.innerHTML = '<p style="color: #7f8c8d; padding: 10px;">无变更</p>';
                return;
            }
            container.innerHTML = changes.map(change => `
                <div class="change-item ${change.change_type}">
                    <div class="change-type">${getChangeTypeName(change.change_type)}</div>
                    <div class="change-message">
                        ${change.old_value ? `${change.old_value} → ` : ''}
                        ${change.new_value || change.item_id}
                    </div>
                    ${change.details ? `<div class="change-details">来源: ${change.details.source || '未知'}</div>` : ''}
                </div>
            `).join('');
        };
        
        const renderBreakpoints = (breakpoints, containerId) => {
            const container = document.getElementById(containerId);
            if (breakpoints.length === 0) {
                container.innerHTML = '<p style="color: #7f8c8d; padding: 10px;">无断点</p>';
                return;
            }
            container.innerHTML = breakpoints.map(bp => `
                <div class="change-item removed">
                    <div class="change-type">断点</div>
                    <div class="change-message">${bp.message}</div>
                    <div class="change-details">来源: ${bp.source || '未知'}</div>
                </div>
            `).join('');
        };
        
        const renderPathChanges = (pathChanges, containerId) => {
            const container = document.getElementById(containerId);
            if (pathChanges.length === 0) {
                container.innerHTML = '<p style="color: #7f8c8d; padding: 10px;">无路径变更</p>';
                return;
            }
            container.innerHTML = pathChanges.map(pc => `
                <div class="change-item ${pc.change_type === 'path_lost' ? 'removed' : pc.change_type === 'path_created' ? 'added' : 'modified'}">
                    <div class="change-type">${getChangeTypeName(pc.change_type)}</div>
                    <div class="change-message">${pc.message}</div>
                    ${pc.old_path.length ? `<div class="change-details">旧路径: ${pc.old_path.join(' → ')}</div>` : ''}
                    ${pc.new_path.length ? `<div class="change-details">新路径: ${pc.new_path.join(' → ')}</div>` : ''}
                    <div class="change-details">来源: ${pc.source}</div>
                </div>
            `).join('');
        };
        
        renderChanges(data.node_changes, 'nodeChanges');
        renderChanges(data.edge_changes, 'edgeChanges');
        renderBreakpoints(data.breakpoints, 'breakpoints');
        renderChanges(data.issue_changes, 'issueChanges');
        renderPathChanges(data.path_changes, 'pathChanges');
        
    } catch (error) {
        console.error('Error loading compare:', error);
    }
}

function getChangeTypeName(type) {
    const names = {
        'added': '新增',
        'removed': '删除',
        'modified': '修改',
        'resolved': '已修复',
        'introduced': '新问题',
        'path_lost': '路径断开',
        'path_created': '路径创建',
        'path_modified': '路径修改'
    };
    return names[type] || type;
}

function openEditModal(edgeId) {
    const edge = allEdges.find(e => e.id === edgeId);
    if (!edge) return;
    
    document.getElementById('editEdgeId').value = edgeId;
    
    const sourceSelect = document.getElementById('editSource');
    const targetSelect = document.getElementById('editTarget');
    
    sourceSelect.innerHTML = allNodes.map(n => 
        `<option value="${n.id}" ${n.id === edge.source ? 'selected' : ''}>${n.name} (${n.id})</option>`
    ).join('');
    
    targetSelect.innerHTML = allNodes.map(n => 
        `<option value="${n.id}" ${n.id === edge.target ? 'selected' : ''}>${n.name} (${n.id})</option>`
    ).join('');
    
    document.getElementById('editDirection').value = edge.direction;
    
    document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function saveEdge() {
    const edgeId = document.getElementById('editEdgeId').value;
    const source = document.getElementById('editSource').value;
    const target = document.getElementById('editTarget').value;
    const direction = document.getElementById('editDirection').value;
    
    try {
        const response = await fetch(`/api/edge/${edgeId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source, target, direction })
        });
        
        if (response.ok) {
            closeModal();
            loadSummary();
            loadEdges();
            loadIssues();
            loadPaths();
            alert('边关系已更新！');
        } else {
            alert('更新失败，请重试');
        }
    } catch (error) {
        console.error('Error saving edge:', error);
        alert('更新失败，请重试');
    }
}

async function exportReport(format) {
    window.location.href = `/api/export/${format}`;
}

async function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length !== 2) {
        alert('请同时上传节点CSV和边CSV两个文件');
        return;
    }
    
    const formData = new FormData();
    for (const file of files) {
        if (file.name.includes('node') || file.name.includes('节点')) {
            formData.append('nodes', file);
        } else if (file.name.includes('edge') || file.name.includes('边')) {
            formData.append('edges', file);
        }
    }
    
    if (!formData.has('nodes') || !formData.has('edges')) {
        formData.delete('nodes');
        formData.delete('edges');
        formData.append('nodes', files[0]);
        formData.append('edges', files[1]);
    }
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (response.ok) {
            loadSummary();
            loadNodes();
            loadEdges();
            loadIssues();
            loadPaths();
            alert('数据上传成功！');
        } else {
            alert('上传失败，请重试');
        }
    } catch (error) {
        console.error('Error uploading files:', error);
        alert('上传失败，请重试');
    }
    
    event.target.value = '';
}
