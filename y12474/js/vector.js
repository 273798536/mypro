class Vector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static fromPolar(angleDegrees, magnitude) {
        const radians = (angleDegrees * Math.PI) / 180;
        return new Vector(
            magnitude * Math.cos(radians),
            magnitude * Math.sin(radians)
        );
    }

    static fromPolarNav(angleDegrees, magnitude) {
        const radians = ((90 - angleDegrees) * Math.PI) / 180;
        return new Vector(
            magnitude * Math.cos(radians),
            magnitude * Math.sin(radians)
        );
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    subtract(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    multiply(scalar) {
        return new Vector(this.x * scalar, this.y * scalar);
    }

    divide(scalar) {
        if (scalar === 0) throw new Error('Cannot divide by zero');
        return new Vector(this.x / scalar, this.y / scalar);
    }

    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector(0, 0);
        return this.divide(mag);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y;
    }

    cross(v) {
        return this.x * v.y - this.y * v.x;
    }

    angle() {
        return Math.atan2(this.y, this.x) * 180 / Math.PI;
    }

    angleNav() {
        return 90 - (Math.atan2(this.y, this.x) * 180 / Math.PI);
    }

    distanceTo(v) {
        return this.subtract(v).magnitude();
    }

    negate() {
        return new Vector(-this.x, -this.y);
    }

    equals(v, tolerance = 0.001) {
        return Math.abs(this.x - v.x) < tolerance && 
               Math.abs(this.y - v.y) < tolerance;
    }

    isOpposite(v, tolerance = 0.001) {
        return this.add(v).magnitude() < tolerance;
    }

    clone() {
        return new Vector(this.x, this.y);
    }

    toString() {
        return `(${this.x.toFixed(2)}, ${this.y.toFixed(2)})`;
    }

    toPolarString() {
        return `${this.magnitude().toFixed(2)} ∠ ${this.angle().toFixed(1)}°`;
    }

    toNavString() {
        return `${this.magnitude().toFixed(2)} 单位, 方向 ${this.angleNav().toFixed(1)}°`;
    }

    roundToGrid(gridSize = 1) {
        return new Vector(
            Math.round(this.x / gridSize) * gridSize,
            Math.round(this.y / gridSize) * gridSize
        );
    }
}

class VectorMath {
    static add(v1, v2) {
        return v1.add(v2);
    }

    static subtract(v1, v2) {
        return v1.subtract(v2);
    }

    static multiply(v, scalar) {
        return v.multiply(scalar);
    }

    static sum(vectors) {
        return vectors.reduce((sum, v) => sum.add(v), new Vector(0, 0));
    }

    static average(vectors) {
        if (vectors.length === 0) return new Vector(0, 0);
        return this.sum(vectors).divide(vectors.length);
    }

    static project(v1, v2) {
        const scalar = v1.dot(v2) / v2.dot(v2);
        return v2.multiply(scalar);
    }

    static reflect(v, normal) {
        const n = normal.normalize();
        return v.subtract(n.multiply(2 * v.dot(n)));
    }

    static angleBetween(v1, v2) {
        const dot = v1.dot(v2);
        const mag1 = v1.magnitude();
        const mag2 = v2.magnitude();
        if (mag1 === 0 || mag2 === 0) return 0;
        const cos = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
        return Math.acos(cos) * 180 / Math.PI;
    }

    static isOppositeDirection(v1, v2, tolerance = 1) {
        const angle = this.angleBetween(v1, v2);
        return Math.abs(angle - 180) < tolerance;
    }

    static isSameDirection(v1, v2, tolerance = 1) {
        const angle = this.angleBetween(v1, v2);
        return angle < tolerance;
    }

    static checkUnitError(v, expectedMagnitude, tolerance = 0.5) {
        const actual = v.magnitude();
        const ratio = actual / expectedMagnitude;
        return ratio > 2 + tolerance || ratio < 0.5 - tolerance;
    }

    static calculateResultant(wind, current, sail = null) {
        const vectors = [wind, current];
        if (sail) vectors.push(sail);
        return this.sum(vectors);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Vector, VectorMath };
}
