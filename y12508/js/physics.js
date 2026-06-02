import * as THREE from 'three';

const _PhysicsEngine = (() => {
    const G = 6.67430e-11;
    const AU = 1.495978707e11;
    const M_SUN = 1.989e30;
    const DAY_SECONDS = 86400;

    const BOUNDARY = {
        MAX_DISTANCE: 100 * AU,
        MAX_VELOCITY: 0.1 * 299792458,
        MAX_MASS: 100 * M_SUN,
        MIN_MASS: 1e15,
        COLLISION_FACTOR: 1.5
    };

    class CelestialBody {
        constructor(config) {
            this.id = config.id || Math.random().toString(36).substr(2, 9);
            this.name = config.name || '未知天体';
            this.type = config.type || 'asteroid';
            this.mass = config.mass || 1e20;
            this.radius = config.radius || 1e6;
            this.color = config.color || '#ffffff';
            this.description = config.description || '';
            this.source = config.source || 'default';
            
            this.position = new THREE.Vector3(
                config.position?.x || 0,
                config.position?.y || 0,
                config.position?.z || 0
            );
            
            this.velocity = new THREE.Vector3(
                config.velocity?.x || 0,
                config.velocity?.y || 0,
                config.velocity?.z || 0
            );
            
            this.acceleration = new THREE.Vector3();
            this.force = new THREE.Vector3();
            
            this.initialPosition = this.position.clone();
            this.initialVelocity = this.velocity.clone();
            this.initialMass = this.mass;
            
            this.trail = [];
            this.maxTrailLength = 1000;
            this.orbitPoints = [];
            
            this.collided = false;
            this.collisionInfo = null;
            this.escapeDetected = false;
            this.divergenceDetected = false;
            this.positionHistory = [];
            this.energyHistory = [];
            
            this.perturbationForces = [];
        }

        getDistance(other) {
            return this.position.distanceTo(other.position);
        }

        getSpeed() {
            return this.velocity.length();
        }

        getKineticEnergy() {
            const v = this.getSpeed();
            return 0.5 * this.mass * v * v;
        }

        getOrbitalElements(centralBody) {
            if (!centralBody) return null;
            
            const r = this.position.clone().sub(centralBody.position);
            const v = this.velocity.clone().sub(centralBody.velocity);
            const rMag = r.length();
            const vMag = v.length();
            
            const mu = G * (centralBody.mass + this.mass);
            
            const h = new THREE.Vector3().crossVectors(r, v);
            const hMag = h.length();
            
            if (hMag < 1e-10) return null;
            
            const eVec = new THREE.Vector3()
                .copy(v)
                .cross(h)
                .divideScalar(mu)
                .sub(r.clone().normalize());
            const e = eVec.length();
            
            const energy = 0.5 * vMag * vMag - mu / rMag;
            
            let a;
            if (Math.abs(e - 1.0) > 1e-6) {
                a = -mu / (2 * energy);
            } else {
                a = Infinity;
            }
            
            const i = Math.acos(Math.max(-1, Math.min(1, h.y / hMag)));
            
            const n = new THREE.Vector3(-h.z, 0, h.x);
            const nMag = n.length();
            
            let omega = 0;
            if (nMag > 1e-10) {
                omega = Math.acos(Math.max(-1, Math.min(1, n.x / nMag)));
                if (n.y < 0) omega = 2 * Math.PI - omega;
            }
            
            let w = 0;
            if (e > 1e-6 && nMag > 1e-10) {
                w = Math.acos(Math.max(-1, Math.min(1, n.dot(eVec) / (nMag * e))));
                if (eVec.y < 0) w = 2 * Math.PI - w;
            }
            
            let nu = 0;
            if (e > 1e-6) {
                nu = Math.acos(Math.max(-1, Math.min(1, eVec.dot(r) / (e * rMag))));
                if (r.dot(v) < 0) nu = 2 * Math.PI - nu;
            }
            
            let period = 0;
            if (e < 1 && isFinite(a) && a > 0) {
                period = 2 * Math.PI * Math.sqrt(a * a * a / mu) / DAY_SECONDS;
            }
            
            return {
                semiMajorAxis: a,
                eccentricity: e,
                inclination: i,
                ascendingNode: omega,
                argumentOfPeriapsis: w,
                trueAnomaly: nu,
                period: period,
                energy: energy,
                angularMomentum: hMag,
                isBound: e < 1
            };
        }

        updateTrail() {
            this.trail.push(this.position.clone());
            if (this.trail.length > this.maxTrailLength) {
                this.trail.shift();
            }
        }

        reset() {
            this.position.copy(this.initialPosition);
            this.velocity.copy(this.initialVelocity);
            this.mass = this.initialMass;
            this.acceleration.set(0, 0, 0);
            this.force.set(0, 0, 0);
            this.trail = [];
            this.orbitPoints = [];
            this.collided = false;
            this.collisionInfo = null;
            this.escapeDetected = false;
            this.divergenceDetected = false;
            this.positionHistory = [];
            this.energyHistory = [];
            this.perturbationForces = [];
        }

        toJSON() {
            return {
                id: this.id,
                name: this.name,
                type: this.type,
                mass: this.mass,
                radius: this.radius,
                color: this.color,
                description: this.description,
                source: this.source,
                position: { x: this.initialPosition.x, y: this.initialPosition.y, z: this.initialPosition.z },
                velocity: { x: this.initialVelocity.x, y: this.initialVelocity.y, z: this.initialVelocity.z }
            };
        }
    }

    class NBodySolver {
        constructor() {
            this.bodies = [];
            this.time = 0;
            this.timeStep = 1;
            this.isRunning = false;
            this.collisions = [];
            this.warnings = [];
            this.totalEnergyHistory = [];
            this.systemEnergy = { kinetic: 0, potential: 0, total: 0 };
        }

        addBody(config) {
            const body = new CelestialBody(config);
            this.bodies.push(body);
            return body;
        }

        removeBody(bodyId) {
            const index = this.bodies.findIndex(b => b.id === bodyId);
            if (index !== -1) {
                this.bodies.splice(index, 1);
            }
        }

        getBody(bodyId) {
            return this.bodies.find(b => b.id === bodyId);
        }

        calculateForces() {
            for (let i = 0; i < this.bodies.length; i++) {
                this.bodies[i].force.set(0, 0, 0);
                this.bodies[i].perturbationForces = [];
            }

            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const bodyA = this.bodies[i];
                    const bodyB = this.bodies[j];

                    const delta = bodyB.position.clone().sub(bodyA.position);
                    const distance = delta.length();

                    if (distance < 1) continue;

                    const softening = 1e6;
                    const denom = Math.pow(distance * distance + softening * softening, 1.5);
                    const forceMag = G * bodyA.mass * bodyB.mass / denom;

                    const force = delta.clone().multiplyScalar(forceMag);
                    
                    bodyA.force.add(force);
                    bodyB.force.sub(force);
                    
                    const perts = [];
                    for (let k = 0; k < this.bodies.length; k++) {
                        if (k !== i && k !== j) {
                            const perturber = this.bodies[k];
                            const deltaP = perturber.position.clone().sub(bodyA.position);
                            const distP = deltaP.length();
                            if (distP > 0) {
                                const forceP = G * bodyA.mass * perturber.mass / (distP * distP);
                                bodyA.perturbationForces.push({
                                    source: perturber.name,
                                    magnitude: forceP,
                                    direction: deltaP.normalize()
                                });
                            }
                        }
                    }
                }
            }
        }

        stepRK4(dt) {
            const n = this.bodies.length;
            if (n < 2) return;

            const saveState = () => this.bodies.map(b => ({
                pos: b.position.clone(),
                vel: b.velocity.clone()
            }));

            const restoreState = (state) => {
                state.forEach((s, i) => {
                    this.bodies[i].position.copy(s.pos);
                    this.bodies[i].velocity.copy(s.vel);
                });
            };

            const getDerivatives = () => {
                this.calculateForces();
                return this.bodies.map(b => ({
                    dp: b.velocity.clone(),
                    dv: b.force.clone().divideScalar(b.mass)
                }));
            };

            const initialState = saveState();

            const k1 = getDerivatives();

            initialState.forEach((s, i) => {
                this.bodies[i].position.copy(s.pos).add(k1[i].dp.clone().multiplyScalar(dt * 0.5));
                this.bodies[i].velocity.copy(s.vel).add(k1[i].dv.clone().multiplyScalar(dt * 0.5));
            });
            const k2 = getDerivatives();

            initialState.forEach((s, i) => {
                this.bodies[i].position.copy(s.pos).add(k2[i].dp.clone().multiplyScalar(dt * 0.5));
                this.bodies[i].velocity.copy(s.vel).add(k2[i].dv.clone().multiplyScalar(dt * 0.5));
            });
            const k3 = getDerivatives();

            initialState.forEach((s, i) => {
                this.bodies[i].position.copy(s.pos).add(k3[i].dp.clone().multiplyScalar(dt));
                this.bodies[i].velocity.copy(s.vel).add(k3[i].dv.clone().multiplyScalar(dt));
            });
            const k4 = getDerivatives();

            restoreState(initialState);

            for (let i = 0; i < n; i++) {
                const b = this.bodies[i];
                b.position.add(
                    k1[i].dp.clone()
                        .add(k2[i].dp.clone().multiplyScalar(2))
                        .add(k3[i].dp.clone().multiplyScalar(2))
                        .add(k4[i].dp)
                        .multiplyScalar(dt / 6)
                );
                b.velocity.add(
                    k1[i].dv.clone()
                        .add(k2[i].dv.clone().multiplyScalar(2))
                        .add(k3[i].dv.clone().multiplyScalar(2))
                        .add(k4[i].dv)
                        .multiplyScalar(dt / 6)
                );
                b.acceleration.copy(b.force.clone().divideScalar(b.mass));
            }

            this.time += dt / DAY_SECONDS;
        }

        checkCollisions() {
            const newCollisions = [];
            
            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const bodyA = this.bodies[i];
                    const bodyB = this.bodies[j];

                    if (bodyA.collided || bodyB.collided) continue;

                    const distance = bodyA.getDistance(bodyB);
                    const collisionDist = (bodyA.radius + bodyB.radius) * BOUNDARY.COLLISION_FACTOR;

                    if (distance < collisionDist) {
                        const collision = {
                            time: this.time,
                            bodyA: bodyA,
                            bodyB: bodyB,
                            distance: distance,
                            relativeVelocity: bodyA.velocity.clone().sub(bodyB.velocity).length(),
                            impactParameter: this.calculateImpactParameter(bodyA, bodyB)
                        };
                        
                        newCollisions.push(collision);
                        this.collisions.push(collision);
                        
                        bodyA.collided = true;
                        bodyA.collisionInfo = collision;
                        bodyB.collided = true;
                        bodyB.collisionInfo = collision;
                    }
                }
            }

            return newCollisions;
        }

        calculateImpactParameter(bodyA, bodyB) {
            const r = bodyA.position.clone().sub(bodyB.position);
            const v = bodyA.velocity.clone().sub(bodyB.velocity);
            const rMag = r.length();
            const vMag = v.length();
            
            if (vMag < 1e-10) return rMag;
            
            const dot = r.dot(v);
            const projection = r.clone().sub(v.clone().multiplyScalar(dot / (vMag * vMag)));
            return projection.length();
        }

        checkBoundaries() {
            const warnings = [];

            for (const body of this.bodies) {
                if (body.collided) continue;

                const dist = body.position.length();
                const speed = body.getSpeed();

                if (dist > BOUNDARY.MAX_DISTANCE) {
                    body.escapeDetected = true;
                    warnings.push({
                        type: 'escape',
                        level: 'warning',
                        body: body,
                        message: `${body.name} 已飞离系统边界 (${(dist/AU).toFixed(2)} AU)`
                    });
                }

                if (speed > BOUNDARY.MAX_VELOCITY) {
                    warnings.push({
                        type: 'velocity',
                        level: 'error',
                        body: body,
                        message: `${body.name} 速度超过相对论极限 (${(speed/299792458).toFixed(4)}c)`
                    });
                }

                if (body.mass > BOUNDARY.MAX_MASS) {
                    warnings.push({
                        type: 'mass',
                        level: 'warning',
                        body: body,
                        message: `${body.name} 质量过大 (${(body.mass/M_SUN).toFixed(2)} M☉)`
                    });
                }

                if (this.checkDivergence(body)) {
                    body.divergenceDetected = true;
                    warnings.push({
                        type: 'divergence',
                        level: 'error',
                        body: body,
                        message: `${body.name} 轨道出现数值发散，请减小时间步长`
                    });
                }
            }

            this.warnings = warnings;
            return warnings;
        }

        checkDivergence(body) {
            body.positionHistory.push({
                time: this.time,
                position: body.position.clone()
            });

            if (body.positionHistory.length < 10) return false;

            const recent = body.positionHistory.slice(-10);
            let totalChange = 0;
            
            for (let i = 1; i < recent.length; i++) {
                totalChange += recent[i].position.distanceTo(recent[i-1].position);
            }

            const avgChange = totalChange / (recent.length - 1);
            const lastChange = recent[recent.length - 1].position.distanceTo(recent[recent.length - 2].position);

            return lastChange > avgChange * 10 || !isFinite(body.position.x);
        }

        calculateEnergy() {
            let kinetic = 0;
            let potential = 0;

            for (const body of this.bodies) {
                kinetic += body.getKineticEnergy();
            }

            for (let i = 0; i < this.bodies.length; i++) {
                for (let j = i + 1; j < this.bodies.length; j++) {
                    const dist = this.bodies[i].getDistance(this.bodies[j]);
                    if (dist > 0) {
                        potential -= G * this.bodies[i].mass * this.bodies[j].mass / dist;
                    }
                }
            }

            this.systemEnergy = {
                kinetic: kinetic,
                potential: potential,
                total: kinetic + potential
            };

            this.totalEnergyHistory.push({
                time: this.time,
                ...this.systemEnergy
            });

            if (this.totalEnergyHistory.length > 1000) {
                this.totalEnergyHistory.shift();
            }

            return this.systemEnergy;
        }

        checkEnergyConservation() {
            if (this.totalEnergyHistory.length < 2) return null;

            const initial = this.totalEnergyHistory[0].total;
            const current = this.totalEnergyHistory[this.totalEnergyHistory.length - 1].total;
            
            if (Math.abs(initial) < 1e-10) return null;

            const drift = Math.abs((current - initial) / initial) * 100;
            
            return {
                drift: drift,
                initial: initial,
                current: current,
                isProblematic: drift > 1
            };
        }

        step(speedMultiplier = 1) {
            if (!this.isRunning) return;

            const dt = this.timeStep * DAY_SECONDS * speedMultiplier;
            this.stepRK4(dt);

            for (const body of this.bodies) {
                if (!body.collided) {
                    body.updateTrail();
                }
            }

            const collisions = this.checkCollisions();
            const warnings = this.checkBoundaries();
            this.calculateEnergy();

            return { collisions, warnings };
        }

        getDominantPerturbation(body) {
            if (!body.perturbationForces || body.perturbationForces.length === 0) {
                return null;
            }

            return body.perturbationForces.reduce((max, p) => 
                p.magnitude > max.magnitude ? p : max
            , body.perturbationForces[0]);
        }

        analyzeOrbitStability(body, centralBody) {
            const elements = body.getOrbitalElements(centralBody);
            if (!elements) return null;

            const perturbations = [];
            
            for (const other of this.bodies) {
                if (other.id === body.id || other.id === centralBody?.id) continue;
                
                const dist = body.getDistance(other);
                const centralDist = centralBody ? body.getDistance(centralBody) : dist;
                
                if (dist > 0 && centralDist > 0) {
                    const perturbationStrength = (other.mass / centralBody.mass) * 
                        Math.pow(centralDist / dist, 3);
                    
                    if (perturbationStrength > 1e-6) {
                        perturbations.push({
                            body: other,
                            strength: perturbationStrength,
                            distance: dist
                        });
                    }
                }
            }

            perturbations.sort((a, b) => b.strength - a.strength);

            return {
                elements: elements,
                perturbations: perturbations,
                stabilityIndex: this.calculateStabilityIndex(elements, perturbations),
                isStable: elements.eccentricity < 0.8 && elements.isBound && perturbations.length < 3
            };
        }

        calculateStabilityIndex(elements, perturbations) {
            let score = 100;

            if (elements.eccentricity > 0.9) score -= 40;
            else if (elements.eccentricity > 0.7) score -= 20;
            else if (elements.eccentricity > 0.5) score -= 10;

            if (!elements.isBound) score -= 50;

            for (const p of perturbations) {
                if (p.strength > 1e-3) score -= 30;
                else if (p.strength > 1e-4) score -= 15;
                else if (p.strength > 1e-5) score -= 5;
            }

            return Math.max(0, Math.min(100, score));
        }

        reset() {
            this.time = 0;
            this.collisions = [];
            this.warnings = [];
            this.totalEnergyHistory = [];
            for (const body of this.bodies) {
                body.reset();
            }
        }

        toJSON() {
            return {
                bodies: this.bodies.map(b => b.toJSON()),
                timeStep: this.timeStep
            };
        }

        loadJSON(data) {
            this.bodies = [];
            if (data.bodies) {
                for (const bodyData of data.bodies) {
                    this.addBody(bodyData);
                }
            }
            if (data.timeStep) {
                this.timeStep = data.timeStep;
            }
        }
    }

    return {
        CelestialBody,
        NBodySolver,
        Constants: {
            G,
            AU,
            M_SUN,
            DAY_SECONDS
        },
        BOUNDARY
    };
})();

export const PhysicsEngine = window.PhysicsEngine || _PhysicsEngine;
window.PhysicsEngine = PhysicsEngine;
