import { Vector3, RayState, SimulationParams } from '../types';

export class RayGenerator {
  private params: SimulationParams;

  constructor(params: SimulationParams) {
    this.params = params;
  }

  updateParams(params: SimulationParams): void {
    this.params = params;
  }

  private degToRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  private normalize(v: Vector3): Vector3 {
    const len = Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
    if (len === 0) return [1, 0, 0];
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  generateParallelRays(): RayState[] {
    const rays: RayState[] = [];
    const { rayCount, rayAngleRange, rayImpactParameter } = this.params;
    
    const angleRangeRad = this.degToRad(rayAngleRange);
    const startAngle = -angleRangeRad / 2;
    const angleStep = rayCount > 1 ? angleRangeRad / (rayCount - 1) : 0;
    
    const sourceDistance = 50;
    
    for (let i = 0; i < rayCount; i++) {
      const angle = startAngle + i * angleStep;
      
      const impactY = Math.sin(angle) * rayImpactParameter;
      const impactZ = Math.cos(angle) * rayImpactParameter * 0.3;
      
      const position: Vector3 = [
        -sourceDistance,
        impactY,
        impactZ,
      ];
      
      const momentum: Vector3 = this.normalize([1, 0, 0]);
      
      const hue = (i / Math.max(rayCount - 1, 1)) * 0.8 + 0.5;
      const wavelength = 400 + hue * 300;
      
      rays.push({
        position,
        momentum,
        wavelength,
      });
    }
    
    return rays;
  }

  generateRadialRays(): RayState[] {
    const rays: RayState[] = [];
    const { rayCount } = this.params;
    const sourceDistance = 30;
    
    for (let i = 0; i < rayCount; i++) {
      const phi = (i / rayCount) * Math.PI * 2;
      const theta = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      
      const position: Vector3 = [
        sourceDistance * Math.sin(theta) * Math.cos(phi),
        sourceDistance * Math.sin(theta) * Math.sin(phi),
        sourceDistance * Math.cos(theta) * 0.3,
      ];
      
      const momentum: Vector3 = this.normalize([
        -position[0],
        -position[1],
        -position[2],
      ]);
      
      rays.push({
        position,
        momentum,
        wavelength: 450 + Math.random() * 200,
      });
    }
    
    return rays;
  }

  generateGridRays(): RayState[] {
    const rays: RayState[] = [];
    const { rayCount, rayImpactParameter } = this.params;
    
    const gridSize = Math.ceil(Math.sqrt(rayCount));
    const step = (rayImpactParameter * 2) / (gridSize - 1);
    
    const sourceDistance = 50;
    
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        if (rays.length >= rayCount) break;
        
        const y = -rayImpactParameter + i * step;
        const z = -rayImpactParameter * 0.5 + j * step * 0.5;
        
        const position: Vector3 = [-sourceDistance, y, z];
        const momentum: Vector3 = this.normalize([1, 0, 0]);
        
        rays.push({
          position,
          momentum,
          wavelength: 500,
        });
      }
    }
    
    return rays;
  }

  generateDefaultRays(): RayState[] {
    return this.generateParallelRays();
  }

  static wavelengthToColor(wavelength: number): string {
    let r = 0, g = 0, b = 0;
    
    if (wavelength >= 380 && wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
      r = 0;
      g = (wavelength - 440) / (490 - 440);
      b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
      r = 0;
      g = 1;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (wavelength >= 580 && wavelength < 645) {
      r = 1;
      g = -(wavelength - 645) / (645 - 580);
      b = 0;
    } else if (wavelength >= 645 && wavelength <= 780) {
      r = 1;
      g = 0;
      b = 0;
    }
    
    return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
  }

  static wavelengthToRGB(wavelength: number): [number, number, number] {
    let r = 0, g = 0, b = 0;
    
    if (wavelength >= 380 && wavelength < 440) {
      r = -(wavelength - 440) / (440 - 380);
      g = 0;
      b = 1;
    } else if (wavelength >= 440 && wavelength < 490) {
      r = 0;
      g = (wavelength - 440) / (490 - 440);
      b = 1;
    } else if (wavelength >= 490 && wavelength < 510) {
      r = 0;
      g = 1;
      b = -(wavelength - 510) / (510 - 490);
    } else if (wavelength >= 510 && wavelength < 580) {
      r = (wavelength - 510) / (580 - 510);
      g = 1;
      b = 0;
    } else if (wavelength >= 580 && wavelength < 645) {
      r = 1;
      g = -(wavelength - 645) / (645 - 580);
      b = 0;
    } else if (wavelength >= 645 && wavelength <= 780) {
      r = 1;
      g = 0;
      b = 0;
    }
    
    return [r, g, b];
  }
}
