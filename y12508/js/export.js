import { ReportGenerator } from './report.js';

const _ExportManager = (() => {
    class Exporter {
        constructor(scene, solver, dataStore) {
            this.scene = scene;
            this.solver = solver;
            this.dataStore = dataStore;
        }

        async takeScreenshot(options = {}) {
            const { 
                filename = 'orbit-screenshot',
                format = 'png',
                quality = 0.95,
                includeUI = false,
                watermark = true
            } = options;

            if (includeUI) {
                return await this.takeFullScreenshot(filename, format, quality);
            } else {
                return await this.takeCanvasScreenshot(filename, format, quality, watermark);
            }
        }

        async takeCanvasScreenshot(filename, format, quality, watermark) {
            this.scene.render();
            
            const dataURL = this.scene.getScreenshotDataURL();
            
            if (watermark) {
                return await this.addWatermark(dataURL, filename, format, quality);
            } else {
                this.downloadDataURL(dataURL, `${filename}.${format}`);
                return dataURL;
            }
        }

        async takeFullScreenshot(filename, format, quality) {
            const container = document.getElementById('canvas-wrapper');
            
            try {
                const canvas = await html2canvas(container, {
                    backgroundColor: '#000008',
                    scale: Math.min(window.devicePixelRatio, 2),
                    logging: false,
                    useCORS: true
                });
                
                const dataURL = canvas.toDataURL(`image/${format}`, quality);
                this.downloadDataURL(dataURL, `${filename}.${format}`);
                return dataURL;
            } catch (error) {
                console.error('Full screenshot failed:', error);
                return await this.takeCanvasScreenshot(filename, format, quality, true);
            }
        }

        async addWatermark(dataURL, filename, format, quality) {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    
                    ctx.drawImage(img, 0, 0);
                    
                    const watermarkText = '🌌 天体轨道摄动教室';
                    const timestamp = new Date().toLocaleString('zh-CN');
                    const simTime = `模拟时长: ${this.formatTime(this.solver.time)}`;
                    
                    ctx.font = `bold ${14 * Math.min(window.devicePixelRatio, 2)}px -apple-system, BlinkMacSystemFont, sans-serif`;
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                    ctx.textBaseline = 'bottom';
                    
                    const padding = 20 * Math.min(window.devicePixelRatio, 2);
                    const lineHeight = 20 * Math.min(window.devicePixelRatio, 2);
                    
                    ctx.fillText(watermarkText, padding, canvas.height - padding - lineHeight * 2);
                    ctx.fillText(timestamp, padding, canvas.height - padding - lineHeight);
                    ctx.fillText(simTime, padding, canvas.height - padding);
                    
                    const watermarkedDataURL = canvas.toDataURL(`image/${format}`, quality);
                    this.downloadDataURL(watermarkedDataURL, `${filename}.${format}`);
                    resolve(watermarkedDataURL);
                };
                img.src = dataURL;
            });
        }

        downloadDataURL(dataURL, filename) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = dataURL;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        exportReport(format = 'html') {
            const report = new ReportGenerator.Report(this.solver, this.dataStore);
            
            if (format === 'html') {
                return this.exportHTMLReport(report);
            } else if (format === 'txt') {
                return this.exportTextReport(report);
            } else if (format === 'json') {
                return this.exportJSONReport(report);
            }
        }

        exportHTMLReport(report) {
            const content = report.generateHTML();
            const fullHTML = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <title>轨道分析报告</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', sans-serif;
            line-height: 1.8;
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            background: #f5f5f5;
            color: #333;
        }
        h1 { color: #1a1a3a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
        h2 { color: #1a1a3a; margin-top: 30px; }
        h3 { color: #3b82f6; margin-top: 25px; }
        .highlight { background: rgba(59, 130, 246, 0.1); padding: 2px 8px; border-radius: 4px; color: #1d4ed8; font-weight: 600; }
        .warning-text { color: #d97706; font-weight: 600; }
        .error-text { color: #dc2626; font-weight: 600; }
        .success-text { color: #059669; font-weight: 600; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #1a1a3a; color: white; }
        tr:hover { background: #f0f0f0; }
        .hint { color: #666; font-size: 14px; background: #fffbeb; padding: 10px; border-radius: 4px; border-left: 3px solid #f59e0b; }
    </style>
</head>
<body>
    <h1>🌌 天体轨道分析报告</h1>
    ${content}
    <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px;">
        <p>报告生成时间: ${new Date().toLocaleString('zh-CN')}</p>
        <p>生成工具: 天体轨道摄动教室</p>
    </footer>
</body>
</html>`;

            const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const filename = `轨道分析报告_${this.getTimestamp()}.html`;
            this.downloadURL(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return fullHTML;
        }

        exportTextReport(report) {
            const content = report.generatePlainText();
            const fullText = `
========================================
🌌 天体轨道分析报告
========================================
生成时间: ${new Date().toLocaleString('zh-CN')}
生成工具: 天体轨道摄动教室
========================================

${content}

========================================
报告结束
========================================
`.trim();

            const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const filename = `轨道分析报告_${this.getTimestamp()}.txt`;
            this.downloadURL(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return fullText;
        }

        exportJSONReport(report) {
            const data = {
                generatedAt: new Date().toISOString(),
                simulation: {
                    time: this.solver.time,
                    timeStep: this.solver.timeStep,
                    bodyCount: this.solver.bodies.length,
                    collisions: this.solver.collisions.length,
                    warnings: this.solver.warnings.length
                },
                bodies: this.solver.bodies.map(b => ({
                    id: b.id,
                    name: b.name,
                    type: b.type,
                    mass: b.mass,
                    position: { x: b.position.x, y: b.position.y, z: b.position.z },
                    velocity: { x: b.velocity.x, y: b.velocity.y, z: b.velocity.z },
                    collided: b.collided,
                    escaped: b.escapeDetected,
                    divergent: b.divergenceDetected
                })),
                energy: this.solver.systemEnergy,
                energyDrift: this.solver.checkEnergyConservation(),
                dataConflicts: this.dataStore.conflicts.map(c => ({
                    bodyId: c.bodyId,
                    field: c.field,
                    sourceA: c.sourceA,
                    valueA: c.valueA,
                    sourceB: c.sourceB,
                    valueB: c.valueB
                }))
            };

            const jsonString = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const filename = `轨道分析报告_${this.getTimestamp()}.json`;
            this.downloadURL(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return jsonString;
        }

        exportData() {
            const jsonString = this.dataStore.exportData();
            if (!jsonString) return null;

            const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const filename = `天体数据_${this.getTimestamp()}.json`;
            this.downloadURL(url, filename);
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            
            return jsonString;
        }

        downloadURL(url, filename) {
            const link = document.createElement('a');
            link.download = filename;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }

        copyToClipboard(text) {
            return navigator.clipboard.writeText(text).then(() => {
                return true;
            }).catch(() => {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    return true;
                } catch (e) {
                    return false;
                } finally {
                    document.body.removeChild(textarea);
                }
            });
        }

        getTimestamp() {
            const now = new Date();
            const pad = (n) => n.toString().padStart(2, '0');
            return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        }

        formatTime(days) {
            if (days < 1) {
                return (days * 24).toFixed(1) + ' 小时';
            }
            if (days < 365) {
                return days.toFixed(1) + ' 天';
            }
            return (days / 365.25).toFixed(2) + ' 年';
        }
    }

    return { Exporter };
})();

export const ExportManager = window.ExportManager || _ExportManager;
window.ExportManager = ExportManager;
