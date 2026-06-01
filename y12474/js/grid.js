class Grid {
    constructor(width, height, cellSize = 50) {
        this.width = width;
        this.height = height;
        this.cellSize = cellSize;
        this.cols = Math.floor(width / cellSize);
        this.rows = Math.floor(height / cellSize);
        this.originX = 0;
        this.originY = 0;
    }

    worldToGrid(worldX, worldY) {
        return {
            col: Math.floor((worldX - this.originX) / this.cellSize),
            row: Math.floor((worldY - this.originY) / this.cellSize)
        };
    }

    gridToWorld(col, row) {
        return new Vector(
            this.originX + col * this.cellSize + this.cellSize / 2,
            this.originY + row * this.cellSize + this.cellSize / 2
        );
    }

    vectorToGrid(v) {
        return this.worldToGrid(v.x, v.y);
    }

    isInBounds(col, row) {
        return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
    }

    isPointInBounds(x, y) {
        const grid = this.worldToGrid(x, y);
        return this.isInBounds(grid.col, grid.row);
    }

    isVectorInBounds(v) {
        return this.isPointInBounds(v.x, v.y);
    }

    snapToGrid(v) {
        const grid = this.vectorToGrid(v);
        return this.gridToWorld(grid.col, grid.row);
    }

    getCellCorners(col, row) {
        const x = this.originX + col * this.cellSize;
        const y = this.originY + row * this.cellSize;
        return [
            new Vector(x, y),
            new Vector(x + this.cellSize, y),
            new Vector(x + this.cellSize, y + this.cellSize),
            new Vector(x, y + this.cellSize)
        ];
    }

    getNeighbors(col, row, includeDiagonals = false) {
        const neighbors = [];
        const directions = includeDiagonals
            ? [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
            : [[0, -1], [-1, 0], [1, 0], [0, 1]];

        for (const [dc, dr] of directions) {
            const newCol = col + dc;
            const newRow = row + dr;
            if (this.isInBounds(newCol, newRow)) {
                neighbors.push({ col: newCol, row: newRow });
            }
        }
        return neighbors;
    }

    draw(ctx, showCoordinates = true) {
        ctx.save();
        
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;

        for (let col = 0; col <= this.cols; col++) {
            const x = this.originX + col * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(x, this.originY);
            ctx.lineTo(x, this.originY + this.rows * this.cellSize);
            ctx.stroke();
        }

        for (let row = 0; row <= this.rows; row++) {
            const y = this.originY + row * this.cellSize;
            ctx.beginPath();
            ctx.moveTo(this.originX, y);
            ctx.lineTo(this.originX + this.cols * this.cellSize, y);
            ctx.stroke();
        }

        const axisX = this.originX + Math.floor(this.cols / 2) * this.cellSize;
        const axisY = this.originY + Math.floor(this.rows / 2) * this.cellSize;

        ctx.strokeStyle = '#718096';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(this.originX, axisY);
        ctx.lineTo(this.originX + this.cols * this.cellSize, axisY);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(axisX, this.originY);
        ctx.lineTo(axisX, this.originY + this.rows * this.cellSize);
        ctx.stroke();

        ctx.fillStyle = '#718096';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        if (showCoordinates) {
            const centerCol = Math.floor(this.cols / 2);
            const centerRow = Math.floor(this.rows / 2);

            for (let col = 0; col <= this.cols; col++) {
                const x = this.originX + col * this.cellSize + this.cellSize / 2;
                const label = col - centerCol;
                ctx.fillText(label.toString(), x, axisY + 15);
            }

            for (let row = 0; row <= this.rows; row++) {
                const y = this.originY + row * this.cellSize + this.cellSize / 2;
                const label = centerRow - row;
                if (label !== 0) {
                    ctx.fillText(label.toString(), axisX - 15, y);
                }
            }
        }

        ctx.fillStyle = '#4a5568';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('N', axisX, this.originY + 15);
        ctx.textAlign = 'left';
        ctx.fillText('S', axisX, this.originY + this.rows * this.cellSize - 5);
        ctx.textAlign = 'left';
        ctx.fillText('E', this.originX + this.cols * this.cellSize - 5, axisY + 15);
        ctx.textAlign = 'right';
        ctx.fillText('W', this.originX + 5, axisY + 15);

        ctx.restore();
    }

    getGridCoordinateLabel(v) {
        const grid = this.vectorToGrid(v);
        const centerCol = Math.floor(this.cols / 2);
        const centerRow = Math.floor(this.rows / 2);
        return `(${grid.col - centerCol}, ${centerRow - grid.row})`;
    }
}

class GridAlignmentChecker {
    constructor(grid) {
        this.grid = grid;
    }

    checkAlignment(v, tolerance = 5) {
        const snapped = this.grid.snapToGrid(v);
        const distance = v.distanceTo(snapped);
        return {
            isAligned: distance < tolerance,
            distance: distance,
            snapped: snapped,
            original: v.clone()
        };
    }

    checkPathAlignment(path, tolerance = 5) {
        const results = [];
        for (let i = 0; i < path.length; i++) {
            const check = this.checkAlignment(path[i], tolerance);
            if (!check.isAligned) {
                results.push({
                    step: i,
                    ...check
                });
            }
        }
        return results;
    }

    suggestAlignment(v) {
        return this.grid.snapToGrid(v);
    }

    explainMisalignment(v) {
        const check = this.checkAlignment(v);
        if (check.isAligned) {
            return '点已正确对齐到网格';
        }

        const grid = this.grid.vectorToGrid(v);
        const centerCol = Math.floor(this.grid.cols / 2);
        const centerRow = Math.floor(this.grid.rows / 2);
        const expectedCol = grid.col - centerCol;
        const expectedRow = centerRow - grid.row;

        return `位置 ${v.toString()} 偏离网格 ${check.distance.toFixed(1)} 像素。` +
               `最近的网格点是 ${check.snapped.toString()} (${expectedCol}, ${expectedRow})。` +
               `建议使用 Grid.snapToGrid() 方法对齐。`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Grid, GridAlignmentChecker };
}
