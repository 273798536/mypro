class FoodWebConnector {
    constructor() {
        this.batchId = this.generateBatchId();
        this.timestamp = new Date().toLocaleString('zh-CN');
        this.data = {
            files: [],
            connections: [],
            nodes: [],
            notes: {
                annotation: '',
                explanation: '',
                layer: ''
            },
            traceLog: []
        };
        this.history = [];
        this.historyIndex = -1;
        
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.startNode = null;
        this.currentLine = null;
        
        this.init();
    }

    generateBatchId() {
        const date = new Date();
        return `FW${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.updateBatchInfo();
        this.addTrace('新建批次', `批次 ${this.batchId} 已创建，等待导入素材`);
        this.saveState();
    }

    setupCanvas() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 500;
        this.drawCanvas();
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('redoBtn').addEventListener('click', () => this.redo());
        document.getElementById('clearBtn').addEventListener('click', () => this.clearCurrent());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportResults());

        this.canvas.addEventListener('mousedown', (e) => this.handleCanvasMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleCanvasMouseUp(e));

        document.getElementById('annotationNotes').addEventListener('input', (e) => {
            this.data.notes.annotation = e.target.value;
            this.saveState();
        });
        document.getElementById('explanationNotes').addEventListener('input', (e) => {
            this.data.notes.explanation = e.target.value;
            this.saveState();
        });
        document.getElementById('layerNotes').addEventListener('input', (e) => {
            this.data.notes.layer = e.target.value;
            this.saveState();
        });
    }

    handleFiles(files) {
        const fileList = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileList.length === 0) return;

        let processed = 0;
        let duplicated = 0;

        fileList.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target.result;
                const fileHash = this.hashDataUrl(dataUrl);
                
                const existing = this.data.files.find(f => 
                    f.name === file.name || f.hash === fileHash
                );
                
                if (existing) {
                    duplicated++;
                    this.addTrace('重复导入已跳过', `${file.name}（素材已存在，未重复添加）`);
                } else {
                    this.addFile(file.name, dataUrl, fileHash);
                    processed++;
                }

                if (processed + duplicated === fileList.length) {
                    this.addTrace('批次导入完成', `新增 ${processed} 个素材，跳过 ${duplicated} 个重复素材`);
                    this.saveState();
                    this.updateButtons();
                }
            };
            reader.readAsDataURL(file);
        });
    }

    hashDataUrl(dataUrl) {
        let hash = 0;
        const str = dataUrl.substring(0, Math.min(dataUrl.length, 2000));
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }

    addFile(name, dataUrl, hash) {
        const fileObj = {
            id: Date.now() + Math.random(),
            name: name,
            dataUrl: dataUrl,
            hash: hash,
            timestamp: new Date().toLocaleTimeString('zh-CN')
        };
        this.data.files.push(fileObj);
        this.renderUploadedFiles();
        this.addNode(name, 100 + Math.random() * 600, 100 + Math.random() * 300);
        this.addTrace('导入素材', name);
    }

    renderUploadedFiles() {
        const container = document.getElementById('uploadedFiles');
        container.innerHTML = '';
        this.data.files.forEach(file => {
            const div = document.createElement('div');
            div.className = 'uploaded-file';
            div.innerHTML = `<img src="${file.dataUrl}" title="${file.name}"><span class="file-name">${file.name.substring(0, 8)}</span>`;
            container.appendChild(div);
        });
    }

    addNode(name, x, y) {
        const node = {
            id: Date.now() + Math.random(),
            name: name,
            x: x,
            y: y,
            color: this.assignColor(this.data.nodes.length)
        };
        this.data.nodes.push(node);
        this.drawCanvas();
        this.updateDetailTable();
        this.updateChart();
    }

    assignColor(index) {
        const palette = [
            '#4299e1',
            '#48bb78',
            '#ed8936',
            '#9f7aea',
            '#38b2ac',
            '#f56565',
            '#ecc94b',
            '#667eea'
        ];
        return palette[index % palette.length];
    }

    handleCanvasMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const node = this.findNodeAt(x, y);
        if (node) {
            this.isDrawing = true;
            this.startNode = node;
            this.currentLine = { startX: node.x, startY: node.y, endX: x, endY: y };
        }
    }

    handleCanvasMouseMove(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        this.currentLine.endX = e.clientX - rect.left;
        this.currentLine.endY = e.clientY - rect.top;
        this.drawCanvas();
    }

    handleCanvasMouseUp(e) {
        if (!this.isDrawing) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const endNode = this.findNodeAt(x, y);
        if (endNode && endNode.id !== this.startNode.id) {
            this.addConnection(this.startNode, endNode);
        }
        
        this.isDrawing = false;
        this.startNode = null;
        this.currentLine = null;
        this.drawCanvas();
    }

    findNodeAt(x, y) {
        const radius = 25;
        return this.data.nodes.find(node => {
            const dx = node.x - x;
            const dy = node.y - y;
            return Math.sqrt(dx * dx + dy * dy) < radius;
        });
    }

    addConnection(fromNode, toNode) {
        const traceId = 'T' + Date.now().toString(36) + Math.random().toString(36).substring(2, 5);
        const colorAnalysis = this.analyzeColorPair(fromNode.color, toNode.color);
        
        const connection = {
            id: Date.now() + Math.random(),
            traceId: traceId,
            from: fromNode.id,
            fromName: fromNode.name,
            fromColor: fromNode.color,
            to: toNode.id,
            toName: toNode.name,
            toColor: toNode.color,
            type: '捕食关系',
            colorStatus: colorAnalysis.status,
            colorReason: colorAnalysis.reason,
            colorDetail: colorAnalysis.detail,
            opinion: colorAnalysis.opinion
        };
        
        this.data.connections.push(connection);
        this.addTrace(
            colorAnalysis.status === '正常' ? '添加连线' : '添加连线（颜色异常）',
            `${fromNode.name} → ${toNode.name}，颜色状态：${colorAnalysis.status}`,
            traceId
        );
        this.saveState();
        this.updateDetailTable();
        this.updateChart();
        this.updateButtons();
    }

    analyzeColorPair(hex1, hex2) {
        const rgb1 = this.hexToRgb(hex1);
        const rgb2 = this.hexToRgb(hex2);
        
        const rDiff = Math.abs(rgb1.r - rgb2.r);
        const gDiff = Math.abs(rgb1.g - rgb2.g);
        const bDiff = Math.abs(rgb1.b - rgb2.b);
        const totalDiff = rDiff + gDiff + bDiff;
        
        const brightness1 = (rgb1.r + rgb1.g + rgb1.b) / 3;
        const brightness2 = (rgb2.r + rgb2.g + rgb2.b) / 3;
        const brightnessDiff = Math.abs(brightness1 - brightness2);
        
        const name1 = this.getColorName(hex1);
        const name2 = this.getColorName(hex2);
        
        if (totalDiff > 200) {
            const brighterSide = brightness1 > brightness2 ? `${name1}（${hex1}）` : `${name2}（${hex2}）`;
            const darkerSide = brightness1 < brightness2 ? `${name1}（${hex1}）` : `${name2}（${hex2}）`;
            return {
                status: '颜色差异过大',
                reason: `${name1}与${name2}的色差达${totalDiff}，超过可接受范围200。`,
                detail: `红色差${rDiff}、绿色差${gDiff}、蓝色差${bDiff}；${brighterSide}偏亮，${darkerSide}偏暗，明暗差${Math.round(brightnessDiff)}。`,
                opinion: `两种颜色跳变太大，展示时观众会误以为它们不属于同一组关系。建议把${name1}或${name2}换成中间过渡色（比如${this.suggestMiddleColor(hex1, hex2)}附近的颜色），让整条食物链看起来更顺。`
            };
        }
        
        if (totalDiff < 50) {
            return {
                status: '颜色过于接近',
                reason: `${name1}与${name2}的色差仅${totalDiff}，低于可区分阈值50。`,
                detail: `红色差${rDiff}、绿色差${gDiff}、蓝色差${bDiff}；两个节点都是偏${name1.substring(0, 2)}的色调，亮度差只有${Math.round(brightnessDiff)}。`,
                opinion: `两个生物挨在一起时几乎分不出谁是谁。建议把其中一个换成对比色：比如${name1}保持不动，把${name2}改成${this.suggestContrastColor(hex1)}，这样观众一眼就能分清。`
            };
        }
        
        return {
            status: '正常',
            reason: `色差${totalDiff}，在50~200的合理区间内。`,
            detail: `红色差${rDiff}、绿色差${gDiff}、蓝色差${bDiff}。`,
            opinion: ''
        };
    }

    suggestMiddleColor(hex1, hex2) {
        const rgb1 = this.hexToRgb(hex1);
        const rgb2 = this.hexToRgb(hex2);
        const midR = Math.round((rgb1.r + rgb2.r) / 2);
        const midG = Math.round((rgb1.g + rgb2.g) / 2);
        const midB = Math.round((rgb1.b + rgb2.b) / 2);
        return this.rgbToHex(midR, midG, midB);
    }

    suggestContrastColor(hex) {
        const rgb = this.hexToRgb(hex);
        const contrastR = 255 - rgb.r;
        const contrastG = 255 - rgb.g;
        const contrastB = 255 - rgb.b;
        return this.rgbToHex(contrastR, contrastG, contrastB);
    }

    rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
    }

    getColorName(hex) {
        const rgb = this.hexToRgb(hex);
        const { r, g, b } = rgb;
        
        if (r > 180 && g < 120 && b < 120) return '偏红色';
        if (r > 180 && g > 150 && b < 100) return '偏橙色';
        if (r > 180 && g > 180 && b < 120) return '偏黄色';
        if (r < 120 && g > 150 && b < 120) return '偏绿色';
        if (r < 120 && g > 150 && b > 150) return '偏青色';
        if (r < 120 && g < 120 && b > 180) return '偏蓝色';
        if (r > 150 && g < 120 && b > 150) return '偏紫色';
        if (r > 180 && g > 180 && b > 180) return '偏浅色';
        if (r < 80 && g < 80 && b < 80) return '偏深色';
        return '中性色';
    }

    getColorDifference(color1, color2) {
        const rgb1 = this.hexToRgb(color1);
        const rgb2 = this.hexToRgb(color2);
        return Math.abs(rgb1.r - rgb2.r) + Math.abs(rgb1.g - rgb2.g) + Math.abs(rgb1.b - rgb2.b);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    drawCanvas() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.data.connections.forEach(conn => {
            const fromNode = this.data.nodes.find(n => n.id === conn.from);
            const toNode = this.data.nodes.find(n => n.id === conn.to);
            if (fromNode && toNode) {
                ctx.beginPath();
                ctx.moveTo(fromNode.x, fromNode.y);
                ctx.lineTo(toNode.x, toNode.y);
                ctx.strokeStyle = conn.colorStatus === '正常' ? '#a0aec0' : '#f56565';
                ctx.lineWidth = 3;
                ctx.stroke();
                
                if (conn.colorStatus !== '正常') {
                    const midX = (fromNode.x + toNode.x) / 2;
                    const midY = (fromNode.y + toNode.y) / 2;
                    ctx.fillStyle = '#f56565';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('!', midX, midY);
                }
            }
        });
        
        if (this.currentLine) {
            ctx.beginPath();
            ctx.moveTo(this.currentLine.startX, this.currentLine.startY);
            ctx.lineTo(this.currentLine.endX, this.currentLine.endY);
            ctx.strokeStyle = '#4299e1';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
        }
        
        this.data.nodes.forEach(node => {
            ctx.beginPath();
            ctx.arc(node.x, node.y, 20, 0, Math.PI * 2);
            ctx.fillStyle = node.color;
            ctx.fill();
            ctx.strokeStyle = '#2d3748';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            ctx.fillStyle = '#2d3748';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(node.name.substring(0, 8), node.x, node.y + 35);
        });
    }

    updateDetailTable() {
        const tbody = document.querySelector('#detailTable tbody');
        tbody.innerHTML = '';
        
        this.data.connections.forEach((conn, index) => {
            const statusClass = conn.colorStatus === '正常' ? 'status-normal' : 
                               conn.colorStatus === '颜色过于接近' ? 'status-warning' : 'status-error';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td>
                    <span class="color-chip" style="background:${conn.fromColor}"></span>
                    ${conn.fromName}
                </td>
                <td>
                    <span class="color-chip" style="background:${conn.toColor}"></span>
                    ${conn.toName}
                </td>
                <td>${conn.type}</td>
                <td class="${statusClass}"><strong>${conn.colorStatus}</strong></td>
                <td>
                    <div class="reason-cell">
                        <div class="reason-title">原因：${conn.colorReason}</div>
                        ${conn.colorDetail ? `<div class="reason-detail">${conn.colorDetail}</div>` : ''}
                    </div>
                </td>
                <td>
                    ${conn.opinion || '<span style="color:#a0aec0">—</span>'}
                </td>
                <td>
                    <button class="trace-btn" data-trace="${conn.traceId}" title="查看轨迹">🔍 ${conn.traceId}</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.trace-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const traceId = e.target.getAttribute('data-trace');
                this.highlightTrace(traceId);
            });
        });
    }

    highlightTrace(traceId) {
        const items = document.querySelectorAll('.trace-item');
        items.forEach(item => {
            item.classList.remove('highlighted');
            if (item.getAttribute('data-trace') === traceId) {
                item.classList.add('highlighted');
                item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        });
        this.addTrace('定位异常轨迹', `定位到连线 ${traceId}`);
        this.saveState();
    }

    updateChart() {
        const svg = document.getElementById('foodWebChart');
        const width = 400;
        const height = 300;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = 100;
        
        let svgContent = '';
        
        this.data.connections.forEach((conn, i) => {
            const fromIdx = this.data.nodes.findIndex(n => n.id === conn.from);
            const toIdx = this.data.nodes.findIndex(n => n.id === conn.to);
            if (fromIdx < 0 || toIdx < 0) return;
            
            const angle1 = (2 * Math.PI * fromIdx) / Math.max(this.data.nodes.length, 1);
            const angle2 = (2 * Math.PI * toIdx) / Math.max(this.data.nodes.length, 1);
            const x1 = centerX + radius * Math.cos(angle1);
            const y1 = centerY + radius * Math.sin(angle1);
            const x2 = centerX + radius * Math.cos(angle2);
            const y2 = centerY + radius * Math.sin(angle2);
            
            const strokeColor = conn.colorStatus === '正常' ? '#a0aec0' : '#f56565';
            const strokeWidth = conn.colorStatus === '正常' ? 2 : 3;
            svgContent += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeWidth}"/>`;
            
            if (conn.colorStatus !== '正常') {
                const midX = (x1 + x2) / 2;
                const midY = (y1 + y2) / 2;
                svgContent += `<circle cx="${midX}" cy="${midY}" r="6" fill="#f56565"/>`;
                svgContent += `<text x="${midX}" y="${midY + 4}" text-anchor="middle" font-size="10" fill="white" font-weight="bold">!</text>`;
            }
        });
        
        this.data.nodes.forEach((node, i) => {
            const angle = (2 * Math.PI * i) / this.data.nodes.length;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            
            svgContent += `<circle cx="${x}" cy="${y}" r="15" fill="${node.color}" stroke="#2d3748" stroke-width="2"/>`;
            svgContent += `<text x="${x}" y="${y + 5}" text-anchor="middle" font-size="10" fill="#2d3748">${node.name.substring(0, 4)}</text>`;
        });
        
        svg.innerHTML = svgContent;
    }

    saveState() {
        const state = JSON.parse(JSON.stringify(this.data));
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push(state);
        this.historyIndex = this.history.length - 1;
        this.updateButtons();
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.data = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.restoreUIFromData();
            this.data.traceLog.unshift({
                time: new Date().toLocaleTimeString('zh-CN'),
                action: '撤销一步',
                detail: `回到第 ${this.historyIndex + 1}/${this.history.length} 步历史记录`,
                traceId: ''
            });
            this.renderTraceLog();
            this.updateButtons();
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.data = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
            this.restoreUIFromData();
            this.data.traceLog.unshift({
                time: new Date().toLocaleTimeString('zh-CN'),
                action: '重做一步',
                detail: `前进到第 ${this.historyIndex + 1}/${this.history.length} 步历史记录`,
                traceId: ''
            });
            this.renderTraceLog();
            this.updateButtons();
        }
    }

    restoreUIFromData() {
        this.renderUploadedFiles();
        this.drawCanvas();
        this.updateDetailTable();
        this.updateChart();
        this.renderTraceLog();
        document.getElementById('annotationNotes').value = this.data.notes.annotation;
        document.getElementById('explanationNotes').value = this.data.notes.explanation;
        document.getElementById('layerNotes').value = this.data.notes.layer;
    }

    clearCurrent() {
        this.data.connections = [];
        this.addTrace('清空所有连线', '画布连线已重置，素材节点保留');
        this.saveState();
        this.drawCanvas();
        this.updateDetailTable();
        this.updateChart();
    }

    updateButtons() {
        document.getElementById('undoBtn').disabled = this.historyIndex <= 0;
        document.getElementById('redoBtn').disabled = this.historyIndex >= this.history.length - 1;
        document.getElementById('clearBtn').disabled = this.data.connections.length === 0;
        document.getElementById('exportBtn').disabled = this.data.files.length === 0;
        
        document.getElementById('historyStep').textContent = `历史：${this.historyIndex + 1}/${this.history.length} 步`;
    }

    addTrace(action, detail, traceId = '') {
        const trace = {
            time: new Date().toLocaleTimeString('zh-CN'),
            action: action,
            detail: detail,
            traceId: traceId
        };
        this.data.traceLog.unshift(trace);
        this.renderTraceLog();
    }

    renderTraceLog() {
        const container = document.getElementById('traceLog');
        container.innerHTML = '';
        this.data.traceLog.forEach(trace => {
            const div = document.createElement('div');
            div.className = 'trace-item' + (trace.traceId ? ' trace-linked' : '');
            div.setAttribute('data-trace', trace.traceId || '');
            div.innerHTML = `
                <span class="trace-time">${trace.time}</span>
                <span class="trace-action">${trace.action}</span>
                <span class="trace-detail">${trace.detail}</span>
                ${trace.traceId ? `<span class="trace-id">[${trace.traceId}]</span>` : ''}
            `;
            container.appendChild(div);
        });
    }

    updateBatchInfo() {
        document.getElementById('batchId').textContent = `批次号: ${this.batchId}`;
        document.getElementById('timestamp').textContent = `时间: ${this.timestamp}`;
    }

    exportResults() {
        const abnormalCount = this.data.connections.filter(c => c.colorStatus !== '正常').length;
        const dateTag = new Date().toLocaleDateString('zh-CN').replace(/\//g, '');
        const timeTag = new Date().toLocaleTimeString('zh-CN', { hour12: false }).replace(/:/g, '');
        
        const exportData = {
            batchId: this.batchId,
            timestamp: this.timestamp,
            exportTime: new Date().toLocaleString('zh-CN'),
            summary: {
                fileCount: this.data.files.length,
                nodeCount: this.data.nodes.length,
                connectionCount: this.data.connections.length,
                abnormalCount: abnormalCount
            },
            files: this.data.files.map(f => ({ name: f.name, timestamp: f.timestamp })),
            connections: this.data.connections.map(c => ({
                traceId: c.traceId,
                from: c.fromName,
                fromColor: c.fromColor,
                to: c.toName,
                toColor: c.toColor,
                type: c.type,
                colorStatus: c.colorStatus,
                colorReason: c.colorReason,
                colorDetail: c.colorDetail,
                opinion: c.opinion
            })),
            notes: this.data.notes,
            traceLog: this.data.traceLog
        };

        const htmlContent = this.generateExportHTML(exportData);
        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `食物网复核_${dateTag}_${timeTag}_${this.batchId}_${this.data.connections.length}条${abnormalCount > 0 ? '_含' + abnormalCount + '处异常' : ''}.html`;
        a.click();
        URL.revokeObjectURL(url);
        
        this.addTrace('导出报告', a.download);
        this.saveState();
    }

    generateExportHTML(data) {
        const connectionsHTML = data.connections.map((c, i) => `
            <tr class="${c.colorStatus === '正常' ? '' : c.colorStatus === '颜色过于接近' ? 'row-warning' : 'row-error'}">
                <td>${i + 1}</td>
                <td>
                    <span class="color-chip" style="background:${c.fromColor}"></span>
                    ${c.from}
                    <span class="color-hex">${c.fromColor}</span>
                </td>
                <td>
                    <span class="color-chip" style="background:${c.toColor}"></span>
                    ${c.to}
                    <span class="color-hex">${c.toColor}</span>
                </td>
                <td>${c.type}</td>
                <td><strong style="color: ${c.colorStatus === '正常' ? '#48bb78' : c.colorStatus === '颜色过于接近' ? '#ed8936' : '#f56565'}">${c.colorStatus}</strong></td>
                <td>
                    <div class="reason-block">
                        <div><strong>为什么：</strong>${c.colorReason}</div>
                        ${c.colorDetail ? `<div class="detail-block"><strong>具体数据：</strong>${c.colorDetail}</div>` : ''}
                    </div>
                </td>
                <td>
                    ${c.opinion ? `<div class="opinion-block"><strong>处理建议：</strong>${c.opinion}</div>` : '<span style="color:#a0aec0">无需调整</span>'}
                </td>
                <td><code>${c.traceId}</code></td>
            </tr>
        `).join('');

        const traceHTML = data.traceLog.map(t => `
            <div class="trace-row ${t.traceId ? 'trace-row-linked' : ''}">
                <span class="trace-col-time">${t.time}</span>
                <span class="trace-col-action">${t.action}</span>
                <span class="trace-col-detail">${t.detail}</span>
                ${t.traceId ? `<span class="trace-col-id"><code>${t.traceId}</code></span>` : ''}
            </div>
        `).join('');

        const legendHTML = `
            <div class="legend-block">
                <h3>怎么看这份报告</h3>
                <ul>
                    <li><strong>批次号 ${data.batchId}</strong>：本次运行的唯一标识，和上次运行的文件名里批次号不同。</li>
                    <li><strong>来源/目标后面的色块</strong>：对应画布上该生物节点的实际颜色，括号里是颜色代码。</li>
                    <li><strong>颜色状态</strong>：
                        <span style="color:#48bb78">●正常</span>、
                        <span style="color:#ed8936">●过于接近（可能分不清）</span>、
                        <span style="color:#f56565">●差异过大（跳变太突兀）</span>。
                    </li>
                    <li><strong>为什么 / 具体数据</strong>：不用猜颜色问题出在哪，这里把色差和明暗都写出来了。</li>
                    <li><strong>处理建议</strong>：针对这条异常给出的具体改法，外行也能照着调。</li>
                    <li><strong>轨迹编号 Txxx</strong>：和底部"操作轨迹"里的编号对应，顺着编号能查到这条连线当时是怎么加的、撤销重做过没有。</li>
                </ul>
            </div>
        `;

        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>生物食物网复核报告 - ${data.batchId}</title>
    <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif; padding: 30px; max-width: 1200px; margin: 0 auto; background: #f5f7fa; color: #2d3748; line-height: 1.6; }
        .header { background: white; padding: 24px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        h1 { color: #1a365d; font-size: 26px; margin: 0 0 14px 0; }
        .info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
        .info-item { background: #f7fafc; padding: 10px 14px; border-radius: 6px; }
        .info-item .label { font-size: 12px; color: #718096; }
        .info-item .value { font-size: 16px; font-weight: 600; margin-top: 2px; }
        .info-item .value.highlight-red { color: #f56565; }
        .info-item .value.highlight-green { color: #48bb78; }
        section { background: white; padding: 24px; border-radius: 10px; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
        h2 { color: #1a365d; font-size: 20px; margin: 0 0 16px 0; padding-bottom: 10px; border-bottom: 2px solid #e2e8f0; }
        h3 { color: #2c5282; font-size: 16px; margin: 0 0 12px 0; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; }
        th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        th { background: #f7fafc; font-weight: 600; color: #2d3748; }
        tr.row-warning { background: #fffaf0; }
        tr.row-error { background: #fff5f5; }
        .color-chip { display: inline-block; width: 16px; height: 16px; border-radius: 4px; border: 1px solid #cbd5e0; vertical-align: middle; margin-right: 6px; }
        .color-hex { font-family: 'Courier New', monospace; color: #718096; font-size: 12px; margin-left: 4px; }
        .reason-block { font-size: 13px; line-height: 1.6; }
        .reason-block .detail-block { color: #4a5568; margin-top: 4px; padding-left: 12px; border-left: 3px solid #e2e8f0; }
        .opinion-block { background: #ebf8ff; border-left: 4px solid #4299e1; padding: 10px 12px; border-radius: 4px; font-size: 13px; }
        code { background: #edf2f7; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; font-size: 12px; color: #553c9a; }
        .notes-group { display: grid; grid-template-columns: 1fr; gap: 14px; }
        .notes-card { background: #f7fafc; border-radius: 8px; padding: 16px; border: 1px solid #e2e8f0; }
        .notes-card .title { font-weight: 600; color: #2c5282; margin-bottom: 8px; font-size: 14px; }
        .notes-card .content { color: #2d3748; white-space: pre-wrap; font-size: 14px; min-height: 20px; }
        .notes-card .content:empty::before { content: '（本轮未填写）'; color: #a0aec0; font-style: italic; }
        .trace-row { display: grid; grid-template-columns: 90px 130px 1fr auto; gap: 12px; padding: 10px 12px; border-bottom: 1px solid #edf2f7; font-size: 13px; align-items: start; }
        .trace-row:hover { background: #f7fafc; }
        .trace-row-linked { background: #fffaf0; }
        .trace-col-time { color: #718096; font-family: 'Courier New', monospace; }
        .trace-col-action { font-weight: 500; color: #2c5282; }
        .trace-col-detail { color: #2d3748; }
        .trace-col-id { color: #9f7aea; }
        .legend-block { background: #f0fff4; border: 1px solid #9ae6b4; border-radius: 8px; padding: 16px; }
        .legend-block ul { margin: 0; padding-left: 20px; }
        .legend-block li { margin-bottom: 6px; font-size: 13px; color: #2d3748; }
        .abnormal-summary { background: #fff5f5; border-left: 4px solid #f56565; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px; }
        .normal-summary { background: #f0fff4; border-left: 4px solid #48bb78; padding: 12px 16px; border-radius: 4px; margin-bottom: 16px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>生物食物网复核报告</h1>
        <div class="info-grid">
            <div class="info-item">
                <div class="label">批次号（与上次不同）</div>
                <div class="value">${data.batchId}</div>
            </div>
            <div class="info-item">
                <div class="label">生成时间</div>
                <div class="value">${data.exportTime}</div>
            </div>
            <div class="info-item">
                <div class="label">素材数量</div>
                <div class="value highlight-green">${data.summary.fileCount} 个</div>
            </div>
            <div class="info-item">
                <div class="label">连线总数</div>
                <div class="value highlight-green">${data.summary.connectionCount} 条</div>
            </div>
            <div class="info-item">
                <div class="label">颜色异常</div>
                <div class="value ${data.summary.abnormalCount > 0 ? 'highlight-red' : 'highlight-green'}">${data.summary.abnormalCount} 处</div>
            </div>
        </div>
    </div>

    <section>
        ${legendHTML}
    </section>

    ${data.summary.abnormalCount > 0 ? `
    <section>
        <h2>本次复核结论</h2>
        <div class="abnormal-summary">
            <strong>发现 ${data.summary.abnormalCount} 处颜色异常</strong>，需要调整后才能用于讲解展示。
            请查看下方"连线明细"中红色和橙色高亮的行，按"处理建议"修改节点颜色，然后重新导出报告验证。
        </div>
    </section>
    ` : `
    <section>
        <h2>本次复核结论</h2>
        <div class="normal-summary">
            <strong>全部 ${data.summary.connectionCount} 条连线颜色均正常</strong>，可以直接用于讲解展示。
        </div>
    </section>
    `}

    <section>
        <h2>连线明细（来自与画布同一批数据）</h2>
        <table>
            <thead>
                <tr>
                    <th>编号</th>
                    <th>来源生物</th>
                    <th>目标生物</th>
                    <th>关系类型</th>
                    <th>颜色状态</th>
                    <th>为什么出现这个状态</th>
                    <th>处理建议</th>
                    <th>轨迹编号</th>
                </tr>
            </thead>
            <tbody>
                ${connectionsHTML}
            </tbody>
        </table>
    </section>

    <section>
        <h2>本轮复核三要素（标注草稿 / 讲解备注 / 图层遮挡）</h2>
        <div class="notes-group">
            <div class="notes-card">
                <div class="title">📝 标注草稿 —— 本次处理这批素材时的草稿想法</div>
                <div class="content">${data.notes.annotation || ''}</div>
            </div>
            <div class="notes-card">
                <div class="title">🎤 讲解备注 —— 面向观众的讲解要点</div>
                <div class="content">${data.notes.explanation || ''}</div>
            </div>
            <div class="notes-card">
                <div class="title">🗂 图层遮挡 —— 素材间的遮挡与层级说明</div>
                <div class="content">${data.notes.layer || ''}</div>
            </div>
        </div>
    </section>

    <section>
        <h2>操作轨迹（可顺着编号往回查每一条异常连线）</h2>
        ${traceHTML}
    </section>
</body>
</html>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new FoodWebConnector();
});
