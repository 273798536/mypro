class Sailboat {
    constructor(startPosition, id = 'boat-1') {
        this.id = id;
        this.startPosition = startPosition.clone();
        this.position = startPosition.clone();
        this.velocity = new Vector(0, 0);
        this.heading = 0;
        this.sailEfficiency = 0.8;
        this.maxSpeed = 5;
        this.path = [startPosition.clone()];
        this.stepRecords = [];
        this.state = 'idle';
        this.collision = null;
        this.color = '#4299e1';
    }

    reset() {
        this.position = this.startPosition.clone();
        this.velocity = new Vector(0, 0);
        this.heading = 0;
        this.path = [this.startPosition.clone()];
        this.stepRecords = [];
        this.state = 'idle';
        this.collision = null;
    }

    calculateSailForce(windVector) {
        const windAngle = windVector.angle();
        const angleDiff = Math.abs(((windAngle - this.heading + 540) % 360) - 180);
        
        let efficiency;
        if (angleDiff < 30) {
            efficiency = 0.1;
        } else if (angleDiff < 60) {
            efficiency = 0.5;
        } else if (angleDiff < 120) {
            efficiency = 0.9;
        } else if (angleDiff < 150) {
            efficiency = 0.7;
        } else {
            efficiency = 0.3;
        }

        const sailForce = windVector.multiply(efficiency * this.sailEfficiency);
        return sailForce;
    }

    move(windVector, currentVector, grid, obstacles = [], stepIndex = 0) {
        const sailForce = this.calculateSailForce(windVector);
        const totalForce = sailForce.add(currentVector);
        
        const speed = totalForce.magnitude();
        if (speed > this.maxSpeed) {
            totalForce.multiply(this.maxSpeed / speed);
        }

        this.velocity = totalForce;
        this.heading = totalForce.angle();

        const newPosition = this.position.add(this.velocity);

        const stepRecord = {
            step: stepIndex,
            startPosition: this.position.clone(),
            endPosition: newPosition.clone(),
            windVector: windVector.clone(),
            currentVector: currentVector.clone(),
            sailForce: sailForce.clone(),
            totalForce: totalForce.clone(),
            errors: [],
            warnings: []
        };

        if (!grid.isVectorInBounds(newPosition)) {
            stepRecord.errors.push({
                type: 'out_of_bounds',
                message: `帆船越界！位置 ${newPosition.toString()} 超出网格范围`,
                position: newPosition.clone()
            });
            this.state = 'failed';
            this.collision = { type: 'boundary', position: newPosition.clone() };
        }

        for (const obstacle of obstacles) {
            if (obstacle.checkCollision(newPosition)) {
                stepRecord.errors.push({
                    type: 'island_collision',
                    message: `帆船撞上 ${obstacle.name}！位置 ${newPosition.toString()}`,
                    obstacle: obstacle,
                    position: newPosition.clone()
                });
                this.state = 'failed';
                this.collision = { type: 'island', obstacle: obstacle, position: newPosition.clone() };
                break;
            }
        }

        if (VectorMath.isOppositeDirection(windVector, currentVector, 5)) {
            stepRecord.warnings.push({
                type: 'opposite_direction',
                message: '风向与水流方向相反，航行效率降低',
                angle: VectorMath.angleBetween(windVector, currentVector)
            });
        }

        if (VectorMath.checkUnitError(windVector, 1, 0.3)) {
            stepRecord.warnings.push({
                type: 'unit_error',
                message: `风力单位异常：${windVector.magnitude().toFixed(2)}，预期约 1 单位`,
                expected: 1,
                actual: windVector.magnitude()
            });
        }

        if (VectorMath.checkUnitError(currentVector, 0.5, 0.3)) {
            stepRecord.warnings.push({
                type: 'unit_error',
                message: `水流单位异常：${currentVector.magnitude().toFixed(2)}，预期约 0.5 单位`,
                expected: 0.5,
                actual: currentVector.magnitude()
            });
        }

        this.stepRecords.push(stepRecord);
        this.position = newPosition.clone();
        this.path.push(this.position.clone());

        if (this.state !== 'failed') {
            this.state = 'moving';
        }

        return stepRecord;
    }

    checkTargetReached(target, tolerance = 30) {
        const distance = this.position.distanceTo(target);
        if (distance < tolerance) {
            this.state = 'success';
            return true;
        }
        return false;
    }

    getDistanceTraveled() {
        let distance = 0;
        for (let i = 1; i < this.path.length; i++) {
            distance += this.path[i - 1].distanceTo(this.path[i]);
        }
        return distance;
    }

    getFinalDisplacement() {
        return this.position.subtract(this.startPosition);
    }

    toJSON() {
        return {
            id: this.id,
            startPosition: this.startPosition,
            position: this.position,
            path: this.path,
            stepRecords: this.stepRecords,
            state: this.state,
            collision: this.collision,
            distanceTraveled: this.getDistanceTraveled(),
            displacement: this.getFinalDisplacement()
        };
    }
}

class Current {
    constructor(direction, magnitude, area = null) {
        this.direction = direction;
        this.magnitude = magnitude;
        this.area = area;
        this.vector = Vector.fromPolarNav(direction, magnitude);
        this.name = '水流';
    }

    getVectorAt(position) {
        if (this.area && !this.area.contains(position)) {
            return new Vector(0, 0);
        }
        return this.vector.clone();
    }

    update(direction, magnitude) {
        this.direction = direction;
        this.magnitude = magnitude;
        this.vector = Vector.fromPolarNav(direction, magnitude);
    }

    draw(ctx, grid, cellSize = 50) {
        ctx.save();
        ctx.strokeStyle = '#4fd1c5';
        ctx.fillStyle = '#4fd1c5';
        ctx.lineWidth = 2;

        const startX = 60;
        const startY = grid.originY + grid.rows * cellSize - 60;

        this.drawArrow(ctx, startX, startY, this.vector.multiply(30));

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#319795';
        ctx.textAlign = 'center';
        ctx.fillText(`水流: ${this.magnitude.toFixed(1)} 单位, ${this.direction}°`, startX, startY + 25);

        ctx.restore();
    }

    drawArrow(ctx, x, y, v) {
        const endX = x + v.x;
        const endY = y - v.y;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const angle = Math.atan2(-v.y, v.x);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLen * Math.cos(angle - Math.PI / 6),
            endY + headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLen * Math.cos(angle + Math.PI / 6),
            endY + headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }
}

class Wind {
    constructor(direction, magnitude) {
        this.direction = direction;
        this.magnitude = magnitude;
        this.vector = Vector.fromPolarNav(direction, magnitude);
        this.name = '风';
    }

    getVector() {
        return this.vector.clone();
    }

    update(direction, magnitude) {
        this.direction = direction;
        this.magnitude = magnitude;
        this.vector = Vector.fromPolarNav(direction, magnitude);
    }

    draw(ctx, grid, cellSize = 50) {
        ctx.save();
        ctx.strokeStyle = '#63b3ed';
        ctx.fillStyle = '#63b3ed';
        ctx.lineWidth = 2;

        const startX = grid.originX + grid.cols * cellSize - 60;
        const startY = grid.originY + grid.rows * cellSize - 60;

        this.drawArrow(ctx, startX, startY, this.vector.multiply(30));

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#3182ce';
        ctx.textAlign = 'center';
        ctx.fillText(`风: ${this.magnitude.toFixed(1)} 单位, ${this.direction}°`, startX, startY + 25);

        ctx.restore();
    }

    drawArrow(ctx, x, y, v) {
        const endX = x + v.x;
        const endY = y - v.y;

        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const angle = Math.atan2(-v.y, v.x);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLen * Math.cos(angle - Math.PI / 6),
            endY + headLen * Math.sin(angle - Math.PI / 6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
            endX - headLen * Math.cos(angle + Math.PI / 6),
            endY + headLen * Math.sin(angle + Math.PI / 6)
        );
        ctx.stroke();
    }
}

class Island {
    constructor(center, radius, name = '岛屿') {
        this.center = center.clone();
        this.radius = radius;
        this.name = name;
        this.color = '#ed8936';
    }

    checkCollision(position, buffer = 0) {
        return position.distanceTo(this.center) < this.radius + buffer;
    }

    draw(ctx) {
        ctx.save();

        const gradient = ctx.createRadialGradient(
            this.center.x, this.center.y, 0,
            this.center.x, this.center.y, this.radius
        );
        gradient.addColorStop(0, '#fbd38d');
        gradient.addColorStop(0.5, '#ed8936');
        gradient.addColorStop(1, '#c05621');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2f855a';
        ctx.beginPath();
        ctx.arc(this.center.x - 5, this.center.y - 5, this.radius * 0.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏝️', this.center.x, this.center.y);

        ctx.restore();
    }
}

class Target {
    constructor(position, radius = 25, name = '目标') {
        this.position = position.clone();
        this.radius = radius;
        this.name = name;
        this.color = '#48bb78';
        this.pulsePhase = 0;
    }

    checkReached(position, tolerance = 0) {
        return position.distanceTo(this.position) < this.radius + tolerance;
    }

    update(time) {
        this.pulsePhase = time * 0.003;
    }

    draw(ctx) {
        ctx.save();

        const pulse = Math.sin(this.pulsePhase) * 0.2 + 1;
        const pulseRadius = this.radius * pulse;

        ctx.strokeStyle = 'rgba(72, 187, 120, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, pulseRadius + 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        const gradient = ctx.createRadialGradient(
            this.position.x, this.position.y, 0,
            this.position.x, this.position.y, this.radius
        );
        gradient.addColorStop(0, '#9ae6b4');
        gradient.addColorStop(1, '#48bb78');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎯', this.position.x, this.position.y);

        ctx.restore();
    }
}

class StartPoint {
    constructor(position, name = '起点') {
        this.position = position.clone();
        this.name = name;
    }

    draw(ctx) {
        ctx.save();

        ctx.fillStyle = '#9f7aea';
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🚩', this.position.x, this.position.y);

        ctx.restore();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Sailboat, Current, Wind, Island, Target, StartPoint };
}
