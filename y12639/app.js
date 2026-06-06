class App {
    constructor() {
        this.canvas = document.getElementById('gridCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 40;
        this.canvasWidth = 800;
        this.canvasHeight = 600;
        this.snapGrid = true;
        
        this.layers = [];
        this.activeLayer = null;
        this.currentTool = 'path';
        
        this.history = [];
        this.historyIndex = -1;
        
        this.samples = [];
        this.logs = [];
        
        this.scoreData = {};
        this.trajectoryData = [];
        this.materialData = [];
        
        this.setupCanvas();
        this.setupEventListeners();
        this.loadInitialData();
    }
    
    setupCanvas() {
        this.canvas.width = this.canvasWidth;
        this.canvas.height = this.canvasHeight;
        this.drawGrid();
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
        
        document.getElementById('drawPathTool').addEventListener('click', () => this.setTool('path'));
        document.getElementById('drawObstacleTool').addEventListener('click', () => this.setTool('obstacle'));
        document.getElementById('eraseTool').addEventListener('click', () => this.setTool('erase'));
        
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        
        document.getElementById('snapGrid').addEventListener('change', (e) => {
            this.snapGrid = e.target.checked;
        });
        
        document.getElementById('loadSampleBtn').addEventListener('click', () => this.loadSampleData());
        document.getElementById('exportReportBtn').addEventListener('click', () => this.exportReport());
        
        document.getElementById('addLayerBtn').addEventListener('click', () => this.addLayer());
        
        document.querySelector('.close').addEventListener('click', () => this.closeModal());
        document.getElementById('modal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('modal')) this.closeModal();
        });
    }
    
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tool="${tool}"]`).classList.add('active');
    }
    
    drawGrid() {
        this.ctx.strokeStyle = '#eee';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= this.canvasWidth; x += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvasHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvasHeight; y += this.gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvasWidth, y);
            this.ctx.stroke();
        }
    }
    
    snapToGrid(x, y) {
        if (!this.snapGrid) return { x, y };
        return {
            x: Math.round(x / this.gridSize) * this.gridSize,
            y: Math.round(y / this.gridSize) * this.gridSize
        };
    }
    
    getGridPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        return this.snapToGrid(x, y);
    }
    
    handleMouseDown(e) {
        const pos = this.getGridPosition(e);
        this.isDrawing = true;
        this.lastPos = pos;
        
        if (this.currentTool === 'path') {
            this.drawPath(pos);
        } else if (this.currentTool === 'obstacle') {
            this.drawObstacle(pos);
        } else if (this.currentTool === 'erase') {
            this.erase(pos);
        }
    }
    
    handleMouseMove(e) {
        const pos = this.getGridPosition(e);
        
        if (this.isDrawing && this.currentTool === 'path') {
            this.drawPath(pos);
        } else if (this.isDrawing && this.currentTool === 'obstacle') {
            this.drawObstacle(pos);
        } else if (this.isDrawing && this.currentTool === 'erase') {
            this.erase(pos);
        }
        
        this.updateStatusBar(pos);
    }
    
    handleMouseUp() {
        this.isDrawing = false;
        this.lastPos = null;
    }
    
    drawPath(pos) {
        if (!this.activeLayer) {
            this.addLayer();
        }
        
        if (!this.activeLayer.paths) this.activeLayer.paths = [];
        
        if (this.lastPos) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.activeLayer.color;
            this.ctx.lineWidth = 3;
            this.ctx.moveTo(this.lastPos.x + this.gridSize/2, this.lastPos.y + this.gridSize/2);
            this.ctx.lineTo(pos.x + this.gridSize/2, pos.y + this.gridSize/2);
            this.ctx.stroke();
            
            this.activeLayer.paths.push({ from: this.lastPos, to: pos });
            this.saveToHistory();
        }
        
        this.lastPos = pos;
        this.addLog('绘制路径', 'success');
    }
    
    drawObstacle(pos) {
        if (!this.activeLayer) {
            this.addLayer();
        }
        
        if (!this.activeLayer.obstacles) this.activeLayer.obstacles = [];
        
        const obstacleKey = `${pos.x}-${pos.y}`;
        if (!this.activeLayer.obstacles.includes(obstacleKey)) {
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
            this.ctx.fillRect(pos.x, pos.y, this.gridSize, this.gridSize);
            
            this.activeLayer.obstacles.push(obstacleKey);
            this.saveToHistory();
            this.addLog('绘制障碍', 'success');
        }
    }
    
    erase(pos) {
        if (!this.activeLayer) return;
        
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(pos.x, pos.y, this.gridSize, this.gridSize);
        this.drawGrid();
        
        if (this.activeLayer.paths) {
            this.activeLayer.paths = this.activeLayer.paths.filter(p => 
                !(p.from.x === pos.x && p.from.y === pos.y) &&
                !(p.to.x === pos.x && p.to.y === pos.y)
            );
        }
        
        if (this.activeLayer.obstacles) {
            const obstacleKey = `${pos.x}-${pos.y}`;
            this.activeLayer.obstacles = this.activeLayer.obstacles.filter(o => o !== obstacleKey);
        }
        
        this.redrawLayers();
        this.saveToHistory();
        this.addLog('擦除操作', 'success');
    }
    
    redrawLayers() {
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.drawGrid();
        
        this.layers.forEach(layer => {
            if (layer.visible) {
                if (layer.obstacles) {
                    layer.obstacles.forEach(obstacle => {
                        const [x, y] = obstacle.split('-').map(Number);
                        this.ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
                        this.ctx.fillRect(x, y, this.gridSize, this.gridSize);
                    });
                }
                
                if (layer.paths) {
                    layer.paths.forEach(path => {
                        this.ctx.beginPath();
                        this.ctx.strokeStyle = layer.color;
                        this.ctx.lineWidth = 3;
                        this.ctx.moveTo(path.from.x + this.gridSize/2, path.from.y + this.gridSize/2);
                        this.ctx.lineTo(path.to.x + this.gridSize/2, path.to.y + this.gridSize/2);
                        this.ctx.stroke();
                    });
                }
            }
        });
    }
    
    updateStatusBar(pos) {
        document.getElementById('statusText').textContent = 
            `位置: (${Math.round(pos.x/this.gridSize)}, ${Math.round(pos.y/this.gridSize)}) | 工具: ${this.getToolName()}`;
    }
    
    getToolName() {
        const names = { path: '绘制路径', obstacle: '绘制障碍', erase: '橡皮擦' };
        return names[this.currentTool] || this.currentTool;
    }
    
    addLayer() {
        const colors = ['#3498db', '#e74c3c', '#27ae60', '#f39c12', '#9b59b6'];
        const color = colors[this.layers.length % colors.length];
        
        const layer = {
            id: Date.now(),
            name: `图层 ${this.layers.length + 1}`,
            color: color,
            visible: true,
            paths: [],
            obstacles: []
        };
        
        this.layers.push(layer);
        this.activeLayer = layer;
        this.saveToHistory();
        this.addLog(`新建图层: ${layer.name}`, 'success');
        this.updateLayerList();
    }
    
    updateLayerList() {
        const container = document.getElementById('layerList');
        container.innerHTML = '';
        
        this.layers.forEach(layer => {
            const item = document.createElement('div');
            item.className = `layer-item ${this.activeLayer?.id === layer.id ? 'active' : ''}`;
            item.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="width: 16px; height: 16px; background-color: ${layer.color}; border-radius: 2px;"></span>
                    <span>${layer.name}</span>
                    <button style="margin-left: auto; font-size: 12px;" onclick="app.toggleLayer(${layer.id})">
                        ${layer.visible ? '隐藏' : '显示'}
                    </button>
                    <button style="font-size: 12px;" onclick="app.deleteLayer(${layer.id})">删除</button>
                </div>
            `;
            item.addEventListener('click', () => this.selectLayer(layer.id));
            container.appendChild(item);
        });
    }
    
    selectLayer(id) {
        this.activeLayer = this.layers.find(l => l.id === id);
        this.updateLayerList();
    }
    
    toggleLayer(id) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            layer.visible = !layer.visible;
            this.redrawLayers();
            this.updateLayerList();
        }
    }
    
    deleteLayer(id) {
        const index = this.layers.findIndex(l => l.id === id);
        if (index !== -1) {
            this.layers.splice(index, 1);
            this.activeLayer = this.layers.length > 0 ? this.layers[0] : null;
            this.redrawLayers();
            this.updateLayerList();
            this.addLog('删除图层', 'success');
        }
    }
    
    saveToHistory() {
        const state = JSON.stringify({
            layers: this.layers,
            activeLayerId: this.activeLayer?.id
        });
        
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex++;
        
        if (this.history.length > 50) {
            this.history.shift();
            this.historyIndex--;
        }
    }
    
    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            this.addLog('撤销操作', 'success');
        }
    }
    
    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            this.addLog('重做操作', 'success');
        }
    }
    
    restoreState(state) {
        const data = JSON.parse(state);
        this.layers = data.layers;
        this.activeLayer = this.layers.find(l => l.id === data.activeLayerId) || null;
        this.redrawLayers();
        this.updateLayerList();
    }
    
    addLog(message, type = 'info') {
        const log = {
            id: Date.now(),
            message,
            type,
            time: new Date().toLocaleTimeString('zh-CN')
        };
        this.logs.unshift(log);
        
        if (this.logs.length > 50) {
            this.logs.pop();
        }
        
        this.updateLogList();
    }
    
    updateLogList() {
        const container = document.getElementById('logList');
        container.innerHTML = '';
        
        this.logs.forEach(log => {
            const item = document.createElement('div');
            item.className = `log-item ${log.type}`;
            item.textContent = `[${log.time}] ${log.message}`;
            container.appendChild(item);
        });
    }
    
    loadInitialData() {
        this.samples = [
            {
                id: 1,
                name: '样例A - 正常路径',
                status: 'success',
                score: 95,
                remark: '路径规划合理，无离线素材缺失',
                hasOfflineMaterial: false
            },
            {
                id: 2,
                name: '样例B - 离线素材缺失',
                status: 'error',
                score: 60,
                remark: '航拍剪辑素材缺失！第3、第5关键帧无法定位，请重新采集素材后重试。',
                hasOfflineMaterial: true,
                missingFiles: ['frame_003.png', 'frame_005.png']
            },
            {
                id: 3,
                name: '样例C - 部分缺失',
                status: 'warning',
                score: 78,
                remark: '部分离线素材缺失，但不影响主要路径分析。备注：这个是人工写的，别自动改！',
                hasOfflineMaterial: true,
                missingFiles: ['frame_012.png']
            },
            {
                id: 4,
                name: '样例D - 障碍测试',
                status: 'success',
                score: 88,
                remark: '障碍规避测试通过，轨迹记录完整',
                hasOfflineMaterial: false
            },
            {
                id: 5,
                name: '样例E - 错误操作演示',
                status: 'error',
                score: 0,
                remark: '用户误操作：在起点放置了障碍，导致路径无法生成。已恢复。',
                hasOfflineMaterial: false,
                isErrorDemo: true
            }
        ];
        
        this.scoreData = {
            totalScore: 0,
            pathScore: 0,
            obstacleScore: 0,
            materialScore: 0,
            efficiencyScore: 0,
            completeness: '未评估'
        };
        
        this.trajectoryData = [
            { id: 1, time: '00:00:00', x: 0, y: 0, action: '起点' },
            { id: 2, time: '00:00:05', x: 1, y: 0, action: '移动' },
            { id: 3, time: '00:00:10', x: 2, y: 0, action: '移动' },
            { id: 4, time: '00:00:15', x: 2, y: 1, action: '转向' },
            { id: 5, time: '00:00:20', x: 2, y: 2, action: '移动' },
            { id: 6, time: '00:00:25', x: 3, y: 2, action: '移动' },
            { id: 7, time: '00:00:30', x: 3, y: 3, action: '终点' }
        ];
        
        this.materialData = [
            { name: 'frame_001.png', status: 'ok', size: '128KB' },
            { name: 'frame_002.png', status: 'ok', size: '134KB' },
            { name: 'frame_003.png', status: 'missing', size: '-' },
            { name: 'frame_004.png', status: 'ok', size: '142KB' },
            { name: 'frame_005.png', status: 'missing', size: '-' },
            { name: 'frame_006.png', status: 'ok', size: '129KB' }
        ];
        
        this.updateSampleList();
        this.updateScorePanel();
        this.updateTrajectoryPanel();
        this.updateMaterialPanel();
    }
    
    loadSampleData() {
        const sample = this.samples.find(s => s.id === 2);
        if (sample) {
            this.applySample(sample);
            this.addLog(`加载样例: ${sample.name}`, 'success');
        }
    }
    
    applySample(sample) {
        this.layers = [];
        this.activeLayer = null;
        
        const layer = {
            id: Date.now(),
            name: sample.name,
            color: '#3498db',
            visible: true,
            paths: [],
            obstacles: []
        };
        
        if (sample.isErrorDemo) {
            layer.obstacles = ['0-0'];
            this.ctx.fillStyle = 'rgba(231, 76, 60, 0.7)';
            this.ctx.fillRect(0, 0, this.gridSize, this.gridSize);
            this.addLog('错误操作演示：起点放置障碍', 'error');
            
            setTimeout(() => {
                layer.obstacles = [];
                this.ctx.fillStyle = '#fff';
                this.ctx.fillRect(0, 0, this.gridSize, this.gridSize);
                this.drawGrid();
                this.addLog('恢复操作：移除起点障碍', 'success');
            }, 2000);
        } else {
            const pathPoints = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
                { x: 2, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 2 },
                { x: 3, y: 3 }
            ];
            
            for (let i = 0; i < pathPoints.length - 1; i++) {
                const from = { x: pathPoints[i].x * this.gridSize, y: pathPoints[i].y * this.gridSize };
                const to = { x: pathPoints[i + 1].x * this.gridSize, y: pathPoints[i + 1].y * this.gridSize };
                
                layer.paths.push({ from, to });
                
                this.ctx.beginPath();
                this.ctx.strokeStyle = layer.color;
                this.ctx.lineWidth = 3;
                this.ctx.moveTo(from.x + this.gridSize/2, from.y + this.gridSize/2);
                this.ctx.lineTo(to.x + this.gridSize/2, to.y + this.gridSize/2);
                this.ctx.stroke();
            }
        }
        
        this.layers.push(layer);
        this.activeLayer = layer;
        this.updateLayerList();
        
        this.scoreData = {
            totalScore: sample.score,
            pathScore: sample.score >= 80 ? 90 : sample.score >= 60 ? 60 : 30,
            obstacleScore: sample.status === 'success' ? 100 : sample.status === 'warning' ? 70 : 40,
            materialScore: sample.hasOfflineMaterial ? 50 : 100,
            efficiencyScore: sample.score >= 80 ? 85 : sample.score >= 60 ? 65 : 40,
            completeness: sample.status === 'success' ? '完整' : sample.status === 'warning' ? '部分完整' : '不完整'
        };
        
        this.updateScorePanel();
        this.showSampleDetail(sample);
    }
    
    showSampleDetail(sample) {
        const modal = document.getElementById('modal');
        const body = document.getElementById('modalBody');
        
        body.innerHTML = `
            <h3>${sample.name}</h3>
            <p style="margin: 16px 0;">状态: <span style="color: ${sample.status === 'success' ? '#27ae60' : sample.status === 'warning' ? '#f39c12' : '#e74c3c'}">
                ${sample.status === 'success' ? '通过' : sample.status === 'warning' ? '警告' : '错误'}
            </span></p>
            <p style="margin: 16px 0;">评分: ${sample.score}/100</p>
            <div class="remark">备注：${sample.remark}</div>
            ${sample.missingFiles ? `
                <div style="margin-top: 16px;">
                    <h4>缺失的离线素材:</h4>
                    <ul>${sample.missingFiles.map(f => `<li>${f}</li>`).join('')}</ul>
                </div>
            ` : ''}
        `;
        
        modal.classList.remove('hidden');
    }
    
    closeModal() {
        document.getElementById('modal').classList.add('hidden');
    }
    
    updateSampleList() {
        const container = document.getElementById('sampleList');
        container.innerHTML = '';
        
        this.samples.forEach(sample => {
            const item = document.createElement('div');
            item.className = `sample-item ${sample.status}`;
            item.innerHTML = `
                <div style="font-weight: 500;">${sample.name}</div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">评分: ${sample.score}/100</div>
                <div style="font-size: 11px; color: #999; margin-top: 4px;">${sample.hasOfflineMaterial ? '离线素材缺失' : '素材完整'}</div>
            `;
            item.addEventListener('click', () => this.applySample(sample));
            container.appendChild(item);
        });
    }
    
    updateScorePanel() {
        const container = document.getElementById('scorePanel');
        container.innerHTML = `
            <div class="score-item">
                <div class="score-label">总分</div>
                <div class="score-value" style="font-size: 24px; font-weight: 600; color: ${this.scoreData.totalScore >= 80 ? '#27ae60' : this.scoreData.totalScore >= 60 ? '#f39c12' : '#e74c3c'}">
                    ${this.scoreData.totalScore}/100
                </div>
            </div>
            <div class="score-item">
                <div class="score-label">路径规划</div>
                <div class="score-value">${this.scoreData.pathScore}/100</div>
            </div>
            <div class="score-item">
                <div class="score-label">障碍规避</div>
                <div class="score-value">${this.scoreData.obstacleScore}/100</div>
            </div>
            <div class="score-item">
                <div class="score-label">素材完整性</div>
                <div class="score-value">${this.scoreData.materialScore}/100</div>
            </div>
            <div class="score-item">
                <div class="score-label">执行效率</div>
                <div class="score-value">${this.scoreData.efficiencyScore}/100</div>
            </div>
            <div class="score-item">
                <div class="score-label">完成度</div>
                <div class="score-value">${this.scoreData.completeness}</div>
            </div>
        `;
    }
    
    updateTrajectoryPanel() {
        const container = document.getElementById('trajectoryPanel');
        container.innerHTML = '';
        
        this.trajectoryData.forEach(point => {
            const item = document.createElement('div');
            item.className = 'trajectory-item';
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span>${point.time}</span>
                    <span>(${point.x}, ${point.y})</span>
                </div>
                <div style="font-size: 11px; color: #666; margin-top: 4px;">${point.action}</div>
            `;
            container.appendChild(item);
        });
    }
    
    updateMaterialPanel() {
        const container = document.getElementById('materialPanel');
        container.innerHTML = '';
        
        this.materialData.forEach(material => {
            const item = document.createElement('div');
            item.className = `material-item ${material.status}`;
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between;">
                    <span>${material.name}</span>
                    <span>${material.size}</span>
                </div>
                <div style="font-size: 11px; margin-top: 4px;">
                    ${material.status === 'ok' ? '✓ 可用' : '✗ 缺失 - 请重新采集'}
                </div>
            `;
            container.appendChild(item);
        });
    }
    
    exportReport() {
        const report = `
机器人路径格子沙盘 - 导出报告
================================

生成时间: ${new Date().toLocaleString('zh-CN')}

一、评分表
----------
总分: ${this.scoreData.totalScore}/100
路径规划: ${this.scoreData.pathScore}/100
障碍规避: ${this.scoreData.obstacleScore}/100
素材完整性: ${this.scoreData.materialScore}/100
执行效率: ${this.scoreData.efficiencyScore}/100
完成度: ${this.scoreData.completeness}

二、轨迹记录
----------
${this.trajectoryData.map(p => `[${p.time}] 位置(${p.x}, ${p.y}) - ${p.action}`).join('\n')}

三、离线素材检查
----------------
${this.materialData.map(m => `${m.name} [${m.size}] - ${m.status === 'ok' ? '✓ 可用' : '✗ 缺失'}`).join('\n')}

四、样例记录汇总
----------------
${this.samples.map(s => {
    const statusText = s.status === 'success' ? '通过' : s.status === 'warning' ? '警告' : '错误';
    return `${s.name} - ${statusText} (${s.score}分)\n备注: ${s.remark}`;
}).join('\n\n')}

五、备注说明
------------
${this.samples.filter(s => s.hasOfflineMaterial).length > 0 ? `
以下记录因离线素材缺失被拦截：
${this.samples.filter(s => s.hasOfflineMaterial).map(s => `- ${s.name}: ${s.remark}`).join('\n')}

离线素材缺失原因说明：
1. 航拍剪辑素材未完整采集
2. 关键帧图像文件丢失或损坏
3. 素材路径配置错误

恢复建议：
1. 重新采集缺失的航拍素材
2. 检查文件存储路径
3. 验证素材文件完整性
` : '所有记录素材完整，无缺失。'}
        `;
        
        const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `机器人路径格子沙盘报告_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.addLog('导出报告成功', 'success');
    }
}

const app = new App();
