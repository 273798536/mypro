import { Vector3, RayState, IntegrationResult } from '../types';

export class SchwarzschildMetric {
  private mass: number;
  private eventHorizon: number;
  private photonSphere: number;

  constructor(mass: number) {
    this.mass = mass;
    this.eventHorizon = 2 * mass;
    this.photonSphere = 3 * mass;
  }

  getEventHorizonRadius(): number {
    return this.eventHorizon;
  }

  getPhotonSphereRadius(): number {
    return this.photonSphere;
  }

  getMass(): number {
    return this.mass;
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    if (len === 0) return [0, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  private dot(a: Vector3, b: Vector3): number {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  private add(a: Vector3, b: Vector3): Vector3 {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  private scale(v: Vector3, s: number): Vector3 {
    return [v[0] * s, v[1] * s, v[2] * s];
  }

  private subtract(a: Vector3, b: Vector3): Vector3 {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  private magnitude(v: Vector3): number {
    return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
  }

  private getAcceleration(position: Vector3, momentum: Vector3): Vector3 {
    const r = this.magnitude(position);
    
    if (r < this.eventHorizon * 0.1) {
      return [0, 0, 0];
    }

    const rSquared = r * r;
    const rCubed = rSquared * r;
    
    const factor = -3 * this.mass / (rCubed * (1 - 2 * this.mass / r));
    
    const posUnit = this.normalize(position);
    const pDotR = this.dot(momentum, posUnit);
    
    const term1 = this.scale(posUnit, pDotR * pDotR * factor);
    const term2 = this.scale(momentum, factor * pDotR * (1 - 2 * this.mass / r));
    
    return this.add(term1, term2);
  }

  private getGeodesicDerivative(state: { pos: Vector3; mom: Vector3 }): { dPos: Vector3; dMom: Vector3 } {
    const r = this.magnitude(state.pos);
    
    if (r < this.eventHorizon * 0.001) {
      return { dPos: [0, 0, 0], dMom: [0, 0, 0] };
    }

    const gamma = 1 / Math.sqrt(1 - 2 * this.mass / r);
    const dPos = this.scale(state.mom, gamma);
    
    const rSquared = r * r;
    const posUnit = this.normalize(state.pos);
    const momMagSquared = this.dot(state.mom, state.mom);
    const pDotR = this.dot(state.mom, posUnit);
    
    const factor = this.mass / rSquared;
    const radialTerm = 2 * pDotR * pDotR - momMagSquared * (1 - 2 * this.mass / r);
    const dMom = this.scale(posUnit, factor * radialTerm);

    return { dPos, dMom };
  }

  private rk4Step(
    pos: Vector3,
    mom: Vector3,
    dt: number
  ): { newPos: Vector3; newMom: Vector3 } {
    const k1 = this.getGeodesicDerivative({ pos, mom });
    
    const pos2 = this.add(pos, this.scale(k1.dPos, dt / 2));
    const mom2 = this.add(mom, this.scale(k1.dMom, dt / 2));
    const k2 = this.getGeodesicDerivative({ pos: pos2, mom: mom2 });
    
    const pos3 = this.add(pos, this.scale(k2.dPos, dt / 2));
    const mom3 = this.add(mom, this.scale(k2.dMom, dt / 2));
    const k3 = this.getGeodesicDerivative({ pos: pos3, mom: mom3 });
    
    const pos4 = this.add(pos, this.scale(k3.dPos, dt));
    const mom4 = this.add(mom, this.scale(k3.dMom, dt));
    const k4 = this.getGeodesicDerivative({ pos: pos4, mom: mom4 });
    
    const dPos = this.scale(
      this.add(
        this.add(k1.dPos, this.scale(k2.dPos, 2)),
        this.add(this.scale(k3.dPos, 2), k4.dPos)
      ),
      dt / 6
    );
    
    const dMom = this.scale(
      this.add(
        this.add(k1.dMom, this.scale(k2.dMom, 2)),
        this.add(this.scale(k3.dMom, 2), k4.dMom)
      ),
      dt / 6
    );

    return {
      newPos: this.add(pos, dPos),
      newMom: this.add(mom, dMom),
    };
  }

  private checkDiscontinuity(prev: Vector3, curr: Vector3, threshold: number): boolean {
    const dist = this.magnitude(this.subtract(curr, prev));
    return dist > threshold;
  }

  private isValidVector(v: Vector3): boolean {
    return !isNaN(v[0]) && !isNaN(v[1]) && !isNaN(v[2]) &&
           isFinite(v[0]) && isFinite(v[1]) && isFinite(v[2]);
  }

  integrateRay(
    initialState: RayState,
    maxSteps: number,
    stepSize: number,
    escapeRadius: number = 100
  ): IntegrationResult {
    const startTime = performance.now();
    const points: Vector3[] = [[...initialState.position]];
    let status: IntegrationResult['status'] = 'running';
    let errorMessage: string | undefined;
    let discontinuities = 0;

    let pos: Vector3 = [...initialState.position];
    let mom: Vector3 = this.normalize([...initialState.momentum]);

    const discontinuityThreshold = stepSize * 10;
    let step = 0;

    try {
      for (; step < maxSteps; step++) {
        const r = this.magnitude(pos);

        if (r <= this.eventHorizon * 1.01) {
          status = 'absorbed';
          break;
        }

        if (r > escapeRadius) {
          status = 'escaped';
          break;
        }

        const prevPos: Vector3 = [...pos];
        const result = this.rk4Step(pos, mom, stepSize);
        pos = result.newPos;
        mom = this.normalize(result.newMom);

        if (!this.isValidVector(pos) || !this.isValidVector(mom)) {
          status = 'error';
          errorMessage = '数值发散：位置或动量出现非数值';
          break;
        }

        if (this.checkDiscontinuity(prevPos, pos, discontinuityThreshold)) {
          discontinuities++;
          if (discontinuities > 5) {
            status = 'error';
            errorMessage = `轨迹不连续：检测到${discontinuities}次突变`;
            break;
          }
        }

        points.push([...pos]);
      }

      if (status === 'running') {
        if (step >= maxSteps) {
          status = 'complete';
        }
      }
    } catch (e) {
      status = 'error';
      errorMessage = e instanceof Error ? e.message : '未知积分错误';
    }

    const endTime = performance.now();

    return {
      id: 0,
      points,
      status,
      errorMessage,
      totalSteps: step,
      computationTime: endTime - startTime,
      discontinuities,
    };
  }

  integrateRayIncremental(
    posRef: { current: Vector3 },
    momRef: { current: Vector3 },
    stepSize: number,
    steps: number,
    escapeRadius: number = 100
  ): {
    points: Vector3[];
    status: 'running' | 'absorbed' | 'escaped' | 'error';
    errorMessage?: string;
    stepsTaken: number;
  } {
    const points: Vector3[] = [];
    let status: 'running' | 'absorbed' | 'escaped' | 'error' = 'running';
    let errorMessage: string | undefined;
    let stepsTaken = 0;

    for (let i = 0; i < steps; i++) {
      const r = this.magnitude(posRef.current);

      if (r <= this.eventHorizon * 1.01) {
        status = 'absorbed';
        break;
      }

      if (r > escapeRadius) {
        status = 'escaped';
        break;
      }

      const result = this.rk4Step(posRef.current, momRef.current, stepSize);
      posRef.current = result.newPos;
      momRef.current = this.normalize(result.newMom);

      if (!this.isValidVector(posRef.current) || !this.isValidVector(momRef.current)) {
        status = 'error';
        errorMessage = '数值发散';
        break;
      }

      points.push([...posRef.current]);
      stepsTaken++;
    }

    return { points, status, errorMessage, stepsTaken };
  }
}
