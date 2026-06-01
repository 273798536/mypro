class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.animationTime = 0;
    }

    clear() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        const gradient = this.ctx.createLinearGradient(0, 0, 0, this.height);
        gradient.addColorStop(0, '#e6f7ff');
        gradient.addColorStop(1, '#b3e0ff');
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        this.ctx.restore();
    }

    drawGrid(grid) {
        grid.draw(this.ctx, true);
    }

    drawStartPoint(startPoint) {
        startPoint.draw(this.ctx);
    }

    drawTarget(target) {
        target.update(this.animationTime);
        target.draw(this.ctx);
    }

    drawIslands(islands) {
        for (const island of islands) {
            island.draw(this.ctx);
        }
    }

    drawWind(wind, grid, cellSize = 50) {
        wind.draw(this.ctx, grid, cellSize);
        
        const gridCols = grid.cols;
        const gridRows = grid.rows;
        const spacing = 100;
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.strokeStyle = '#63b3ed';
        this.ctx.fillStyle = '#63b3ed';
        this.ctx.lineWidth = 1;
        
        const scale = 15;
        for (let x = 50; x < this.width - 50; x += spacing) {
            for (let y = 50; y < this.height - 100; y += spacing) {
                const offsetX = Math.sin((x + y + this.animationTime * 0.05) * 0.02) * 5;
                const arrowX = wind.vector.x * scale;
                const arrowY = -wind.vector.y * scale;
                
                this.ctx.beginPath();
                this.ctx.moveTo(x + offsetX, y);
                this.ctx.lineTo(x + offsetX + arrowX, y + arrowY);
                this.ctx.stroke();
            }
        }
        this.ctx.restore();
    }

    drawCurrent(current, grid, cellSize = 50) {
        current.draw(this.ctx, grid, cellSize);
        
        this.ctx.save();
        this.ctx.globalAlpha = 0.4;
        this.ctx.strokeStyle = '#4fd1c5';
        this.ctx.lineWidth = 2;
        
        const scale = 20;
        const baseY = this.height - 130;
        const waveAmplitude = 8;
        const waveFrequency = 0.03;
        const speed = this.animationTime * 0.1;
        
        for (let x = 20; x < this.width - 20; x += 40) {
            const waveOffset = Math.sin((x + speed) * waveFrequency) * waveAmplitude;
            const y = baseY + waveOffset;
            
            const arrowX = current.vector.x * scale;
            const arrowY = -current.vector.y * scale;
            
            this.ctx.beginPath();
            this.ctx.moveTo(x, y);
            this.ctx.lineTo(x + 30, y);
            this.ctx.stroke();
            
            const midX = x + 15;
            this.ctx.beginPath();
            this.ctx.moveTo(midX - 5, y - 3);
            this.ctx.lineTo(midX, y);
            this.ctx.lineTo(midX - 5, y + 3);
            this.ctx.stroke();
        }
        this.ctx.restore();
    }

    drawSailboatPath(sailboat, showVectors = false) {
        if (sailboat.path.length < 2) return;

        this.ctx.save();
        
        this.ctx.strokeStyle = sailboat.color;
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.setLineDash([8, 4]);
        
        this.ctx.beginPath();
        this.ctx.moveTo(sailboat.path[0].x, sailboat.path[0].y);
        for (let i = 1; i < sailboat.path.length; i++) {
            this.ctx.lineTo(sailboat.path[i].x, sailboat.path[i].y);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        for (let i = 0; i < sailboat.path.length; i++) {
            const point = sailboat.path[i];
            const alpha = 0.3 + (i / sailboat.path.length) * 0.7;
            
            this.ctx.fillStyle = sailboat.color;
            this.ctx.globalAlpha = alpha;
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.globalAlpha = 1;
            this.ctx.fillStyle = '#fff';
            this.ctx.font = 'bold 10px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText(i.toString(), point.x, point.y);
        }
        
        this.ctx.restore();

        if (showVectors && sailboat.stepRecords.length > 0) {
            this.drawStepVectors(sailboat);
        }
    }

    drawStepVectors(sailboat) {
        this.ctx.save();
        
        for (let i = 0; i < sailboat.stepRecords.length; i++) {
            const record = sailboat.stepRecords[i];
            const start = record.startPosition;
            
            const windScale = 30;
            this.ctx.strokeStyle = '#63b3ed';
            this.ctx.lineWidth = 2;
            this.drawVector(start, record.windVector.multiply(windScale), '#63b3ed');
            
            const currentScale = 30;
            const windEnd = start.add(record.windVector.multiply(windScale));
            this.drawVector(windEnd, record.currentVector.multiply(currentScale), '#4fd1c5');
            
            const totalScale = 30;
            this.ctx.strokeStyle = '#9f7aea';
            this.ctx.lineWidth = 3;
            this.drawVector(start, record.totalForce.multiply(totalScale), '#9f7aea', true);
        }
        
        this.ctx.restore();
    }

    drawVector(start, v, color, showLabel = false) {
        const end = start.add(v);
        
        this.ctx.strokeStyle = color;
        this.ctx.fillStyle = color;
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(start.x, start.y);
        this.ctx.lineTo(end.x, end.y);
        this.ctx.stroke();
        
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const headLen = 8;
        
        this.ctx.beginPath();
        this.ctx.moveTo(end.x, end.y);
        this.ctx.lineTo(
            end.x - headLen * Math.cos(angle - Math.PI / 6),
            end.y - headLen * Math.sin(angle - Math.PI / 6)
        );
        this.ctx.lineTo(
            end.x - headLen * Math.cos(angle + Math.PI / 6),
            end.y - headLen * Math.sin(angle + Math.PI / 6)
        );
        this.ctx.closePath();
        this.ctx.fill();
        
        if (showLabel) {
            this.ctx.font = '10px monospace';
            this.ctx.fillStyle = color;
            this.ctx.textAlign = 'center';
            const midX = (start.x + end.x) / 2;
            const midY = (start.y + end.y) / 2;
            this.ctx.fillText(v.toString(), midX, midY - 10);
        }
    }

    drawSailboat(sailboat) {
        this.ctx.save();
        this.ctx.translate(sailboat.position.x, sailboat.position.y);
        this.ctx.rotate(-sailboat.heading + Math.PI / 2);
        
        const bobOffset = Math.sin(this.animationTime * 0.005) * 2;
        this.ctx.translate(0, bobOffset);
        
        const rollOffset = Math.sin(this.animationTime * 0.003) * 0.05;
        this.ctx.rotate(rollOffset);
        
        this.ctx.fillStyle = '#e2e8f0';
        this.ctx.strokeStyle = '#718096';
        this.ctx.lineWidth = 2;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, -20);
        this.ctx.quadraticCurveTo(15, -10, 10, 15);
        this.ctx.quadraticCurveTo(0, 20, -10, 15);
        this.ctx.quadraticCurveTo(-15, -10, 0, -20);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#4a5568';
        this.ctx.fillRect(-2, -15, 4, 20);
        
        const sailColor = sailboat.state === 'failed' ? '#f56565' : 
                         sailboat.state === 'success' ? '#48bb78' : '#e53e3e';
        this.ctx.fillStyle = sailColor;
        this.ctx.strokeStyle = '#c53030';
        this.ctx.lineWidth = 1;
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.quadraticCurveTo(12, -5, 8, 5);
        this.ctx.lineTo(0, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        if (sailboat.state === 'failed') {
            this.ctx.rotate(sailboat.heading - Math.PI / 2);
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('💥', 0, 5);
        } else if (sailboat.state === 'success') {
            this.ctx.rotate(sailboat.heading - Math.PI / 2);
            this.ctx.font = '16px sans-serif';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('✅', 0, 5);
        }
        
        this.ctx.restore();
    }

    drawAll(grid, level, sailboats, showPaths = true, showVectors = false) {
        this.clear();
        this.drawGrid(grid);
        
        if (level) {
            this.drawWind(level.wind, grid, grid.cellSize);
            this.drawCurrent(level.current, grid, grid.cellSize);
            this.drawIslands(level.islands);
            this.drawTarget(level.target);
            this.drawStartPoint(level.startPoint);
        }
        
        if (showPaths) {
            for (const boat of sailboats) {
                this.drawSailboatPath(boat, showVectors);
            }
        }
        
        for (const boat of sailboats) {
            this.drawSailboat(boat);
        }
    }

    updateAnimationTime(time) {
        this.animationTime = time;
    }

    drawCoordinate(x, y, label, color = '#4a5568') {
        this.ctx.save();
        this.ctx.fillStyle = color;
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(label, x, y + 30);
        this.ctx.restore();
    }

    drawInfoPanel(text, x, y, width, height) {
        this.ctx.save();
        
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.strokeStyle = '#e2e8f0';
        this.ctx.lineWidth = 1;
        
        this.roundRect(x, y, width, height, 8);
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.fillStyle = '#2d3748';
        this.ctx.font = '12px sans-serif';
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'top';
        
        const lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            this.ctx.fillText(lines[i], x + 10, y + 10 + i * 18);
        }
        
        this.ctx.restore();
    }

    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.lineTo(x + width - radius, y);
        this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        this.ctx.lineTo(x + width, y + height - radius);
        this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        this.ctx.lineTo(x + radius, y + height);
        this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        this.ctx.lineTo(x, y + radius);
        this.ctx.quadraticCurveTo(x, y, x + radius, y);
        this.ctx.closePath();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Renderer };
}
