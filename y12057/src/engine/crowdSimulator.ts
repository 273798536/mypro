import { v4 as uuidv4 } from 'uuid';
import type { 
  CrowdParticle, 
  FestivalMap, 
  MapElement, 
  Deployment,
  WeatherCondition 
} from './types';

const GRID_SIZE = 20;
const MAX_PARTICLES = 500;

export class CrowdSimulator {
  private map: FestivalMap;
  private particles: CrowdParticle[] = [];
  private densityGrid: number[][] = [];
  private exits: MapElement[] = [];
  private stages: MapElement[] = [];
  private attractions: MapElement[] = [];

  constructor(map: FestivalMap) {
    this.map = map;
    this.initializeGrid();
    this.classifyElements();
  }

  private initializeGrid(): void {
    const cols = Math.ceil(this.map.width / GRID_SIZE);
    const rows = Math.ceil(this.map.height / GRID_SIZE);
    this.densityGrid = Array(rows).fill(null).map(() => Array(cols).fill(0));
  }

  private classifyElements(): void {
    this.exits = this.map.elements.filter(e => e.type === 'exit');
    this.stages = this.map.elements.filter(e => e.type === 'stage');
    this.attractions = this.map.elements.filter(e => 
      ['food', 'restroom', 'stage'].includes(e.type)
    );
  }

  public initializeParticles(count: number): CrowdParticle[] {
    const particleCount = Math.min(count, MAX_PARTICLES);
    const entrances = this.map.elements.filter(e => e.type === 'entrance');
    
    this.particles = [];
    
    for (let i = 0; i < particleCount; i++) {
      const entrance = entrances[Math.floor(Math.random() * entrances.length)];
      const target = this.getRandomTarget();
      
      this.particles.push({
        id: uuidv4(),
        x: entrance.x + entrance.width / 2 + (Math.random() - 0.5) * 20,
        y: entrance.y + entrance.height / 2 + (Math.random() - 0.5) * 20,
        targetX: target.x,
        targetY: target.y,
        speed: 0.5 + Math.random() * 0.5,
        density: 1,
        satisfaction: 100
      });
    }

    this.updateDensityGrid();
    return this.particles;
  }

  private getRandomTarget(): { x: number; y: number } {
    const rand = Math.random();
    
    if (rand < 0.6) {
      const stage = this.stages[Math.floor(Math.random() * this.stages.length)];
      return {
        x: stage.x + stage.width / 2,
        y: stage.y + stage.height + 20 + Math.random() * 40
      };
    } else if (rand < 0.85) {
      const attraction = this.attractions[Math.floor(Math.random() * this.attractions.length)];
      return {
        x: attraction.x + attraction.width / 2,
        y: attraction.y + attraction.height / 2
      };
    } else {
      const exit = this.exits[Math.floor(Math.random() * this.exits.length)];
      return {
        x: exit.x + exit.width / 2,
        y: exit.y + exit.height / 2
      };
    }
  }

  public update(
    deltaTime: number,
    deployments: Deployment[],
    weather: WeatherCondition,
    gameTime: number,
    totalDuration: number
  ): { particles: CrowdParticle[]; congestionIndex: number; crowdDensity: number[][] } {
    const weatherSpeedMultiplier = this.getWeatherSpeedMultiplier(weather);
    const isNearEnd = gameTime > totalDuration * 0.8;

    this.particles = this.particles.map(particle => {
      let targetX = particle.targetX;
      let targetY = particle.targetY;

      if (isNearEnd && Math.random() < 0.02) {
        const exit = this.exits[Math.floor(Math.random() * this.exits.length)];
        targetX = exit.x + exit.width / 2;
        targetY = exit.y + exit.height / 2;
      }

      const dx = targetX - particle.x;
      const dy = targetY - particle.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < 10) {
        const newTarget = this.getRandomTarget();
        return {
          ...particle,
          targetX: newTarget.x,
          targetY: newTarget.y
        };
      }

      const avoidance = this.calculateAvoidance(particle, deployments);
      
      const speed = particle.speed * weatherSpeedMultiplier * deltaTime * 60;
      const moveX = (dx / distance) * speed + avoidance.x * 0.3;
      const moveY = (dy / distance) * speed + avoidance.y * 0.3;

      let newX = Math.max(10, Math.min(this.map.width - 10, particle.x + moveX));
      let newY = Math.max(10, Math.min(this.map.height - 10, particle.y + moveY));

      const localDensity = this.getLocalDensity(newX, newY);
      const congestionSlowdown = Math.max(0.3, 1 - localDensity * 0.02);

      return {
        ...particle,
        x: particle.x + moveX * congestionSlowdown,
        y: particle.y + moveY * congestionSlowdown,
        density: localDensity,
        satisfaction: Math.max(0, particle.satisfaction - localDensity * 0.01)
      };
    });

    this.updateDensityGrid();
    
    const congestionIndex = this.calculateCongestionIndex();
    
    return {
      particles: this.particles,
      congestionIndex,
      crowdDensity: this.densityGrid
    };
  }

  private calculateAvoidance(
    particle: CrowdParticle,
    deployments: Deployment[]
  ): { x: number; y: number } {
    let avoidX = 0;
    let avoidY = 0;

    for (const deployment of deployments) {
      
      const dx = particle.x - deployment.x;
      const dy = particle.y - deployment.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 40 && distance > 0) {
        const force = (40 - distance) / 40;
        avoidX += (dx / distance) * force;
        avoidY += (dy / distance) * force;
      }
    }

    for (const other of this.particles) {
      if (other.id === particle.id) continue;
      
      const dx = particle.x - other.x;
      const dy = particle.y - other.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 15 && distance > 0) {
        const force = (15 - distance) / 15;
        avoidX += (dx / distance) * force * 0.5;
        avoidY += (dy / distance) * force * 0.5;
      }
    }

    return { x: avoidX, y: avoidY };
  }

  private getWeatherSpeedMultiplier(weather: WeatherCondition): number {
    switch (weather) {
      case 'clear': return 1;
      case 'cloudy': return 0.95;
      case 'rain': return 0.8;
      case 'heavy_rain': return 0.6;
      case 'storm': return 0.4;
      default: return 1;
    }
  }

  private updateDensityGrid(): void {
    this.initializeGrid();
    
    for (const particle of this.particles) {
      const gridX = Math.floor(particle.x / GRID_SIZE);
      const gridY = Math.floor(particle.y / GRID_SIZE);
      
      if (gridY >= 0 && gridY < this.densityGrid.length &&
          gridX >= 0 && gridX < this.densityGrid[0].length) {
        this.densityGrid[gridY][gridX]++;
      }
    }
  }

  private getLocalDensity(x: number, y: number): number {
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    
    let total = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const checkY = gridY + dy;
        const checkX = gridX + dx;
        if (checkY >= 0 && checkY < this.densityGrid.length &&
            checkX >= 0 && checkX < this.densityGrid[0].length) {
          total += this.densityGrid[checkY][checkX];
        }
      }
    }
    
    return total;
  }

  private calculateCongestionIndex(): number {
    let maxDensity = 0;
    let totalDensity = 0;
    let congestedCells = 0;

    for (let y = 0; y < this.densityGrid.length; y++) {
      for (let x = 0; x < this.densityGrid[0].length; x++) {
        const density = this.densityGrid[y][x];
        totalDensity += density;
        if (density > maxDensity) maxDensity = density;
        if (density >= 8) congestedCells++;
      }
    }

    const avgDensity = totalDensity / (this.densityGrid.length * this.densityGrid[0].length);
    const congestionRatio = congestedCells / (this.densityGrid.length * this.densityGrid[0].length);
    
    const congestionIndex = (maxDensity / 15) * 0.4 + congestionRatio * 0.4 + (avgDensity / 5) * 0.2;
    
    return Math.min(2, Math.max(0, congestionIndex));
  }

  public calculatePatrolCoverage(deployments: Deployment[]): number {
    const patrolDeployments = deployments.filter(d => d.unitType === 'patrol');
    if (patrolDeployments.length === 0) return 0;

    let coveredCells = 0;
    const totalCells = this.densityGrid.length * this.densityGrid[0].length;

    for (let y = 0; y < this.densityGrid.length; y++) {
      for (let x = 0; x < this.densityGrid[0].length; x++) {
        const worldX = x * GRID_SIZE + GRID_SIZE / 2;
        const worldY = y * GRID_SIZE + GRID_SIZE / 2;

        for (const deployment of patrolDeployments) {
          const dx = worldX - deployment.x;
          const dy = worldY - deployment.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance <= deployment.count * 25) {
            coveredCells++;
            break;
          }
        }
      }
    }

    return coveredCells / totalCells;
  }

  public getExitCongestion(exitId: string): number {
    const exit = this.map.elements.find(e => e.id === exitId);
    if (!exit || exit.type !== 'exit') return 0;

    const centerX = exit.x + exit.width / 2;
    const centerY = exit.y + exit.height / 2;

    let nearbyParticles = 0;
    for (const particle of this.particles) {
      const dx = particle.x - centerX;
      const dy = particle.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < 60) nearbyParticles++;
    }

    return Math.min(2, nearbyParticles / 20);
  }

  public getParticles(): CrowdParticle[] {
    return this.particles;
  }

  public getDensityGrid(): number[][] {
    return this.densityGrid;
  }
}
