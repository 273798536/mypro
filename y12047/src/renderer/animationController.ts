import type { SimulationResult } from '../types';

export interface AnimationState {
  isPlaying: boolean;
  currentStep: number;
  totalSteps: number;
  speed: number;
  direction: 'forward' | 'backward' | 'pingpong';
  loop: boolean;
}

type AnimationCallback = (step: number, result: SimulationResult) => void;
type CompletionCallback = () => void;

export class AnimationController {
  private animationId: number | null = null;
  private lastTimestamp: number = 0;
  private accumulatedTime: number = 0;
  private results: SimulationResult[] = [];
  private state: AnimationState;
  private onStepCallback?: AnimationCallback;
  private onCompleteCallback?: CompletionCallback;
  private pingpongDirection: 1 | -1 = 1;

  constructor() {
    this.state = {
      isPlaying: false,
      currentStep: 0,
      totalSteps: 0,
      speed: 1,
      direction: 'forward',
      loop: true,
    };
  }

  setResults(results: SimulationResult[]): void {
    this.results = results;
    this.state.totalSteps = Math.max(0, results.length - 1);
    if (this.state.currentStep > this.state.totalSteps) {
      this.state.currentStep = this.state.totalSteps;
    }
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.max(0.1, Math.min(10, speed));
  }

  setDirection(direction: 'forward' | 'backward' | 'pingpong'): void {
    this.state.direction = direction;
    this.pingpongDirection = direction === 'backward' ? -1 : 1;
  }

  setLoop(loop: boolean): void {
    this.state.loop = loop;
  }

  setCurrentStep(step: number): void {
    this.state.currentStep = Math.max(0, Math.min(this.state.totalSteps, step));
    this.emitStep();
  }

  getState(): Readonly<AnimationState> {
    return { ...this.state };
  }

  getCurrentResult(): SimulationResult | undefined {
    return this.results[this.state.currentStep];
  }

  onStep(callback: AnimationCallback): void {
    this.onStepCallback = callback;
  }

  onComplete(callback: CompletionCallback): void {
    this.onCompleteCallback = callback;
  }

  play(): void {
    if (this.state.isPlaying || this.results.length === 0) return;
    
    this.state.isPlaying = true;
    this.lastTimestamp = performance.now();
    this.accumulatedTime = 0;
    this.animationLoop();
  }

  pause(): void {
    this.state.isPlaying = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  toggle(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  reset(): void {
    this.pause();
    this.state.currentStep = 0;
    this.pingpongDirection = 1;
    this.emitStep();
  }

  stepForward(): void {
    this.pause();
    if (this.state.currentStep < this.state.totalSteps) {
      this.state.currentStep++;
      this.emitStep();
    }
  }

  stepBackward(): void {
    this.pause();
    if (this.state.currentStep > 0) {
      this.state.currentStep--;
      this.emitStep();
    }
  }

  goToStart(): void {
    this.pause();
    this.state.currentStep = 0;
    this.pingpongDirection = 1;
    this.emitStep();
  }

  goToEnd(): void {
    this.pause();
    this.state.currentStep = this.state.totalSteps;
    this.pingpongDirection = -1;
    this.emitStep();
  }

  private animationLoop = (): void => {
    if (!this.state.isPlaying) return;

    const now = performance.now();
    const deltaTime = now - this.lastTimestamp;
    this.lastTimestamp = now;

    this.accumulatedTime += deltaTime * this.state.speed;
    const stepsPerSecond = 10;
    const stepInterval = 1000 / stepsPerSecond;

    while (this.accumulatedTime >= stepInterval) {
      this.accumulatedTime -= stepInterval;
      this.advanceStep();
      
      if (!this.state.isPlaying) break;
    }

    this.animationId = requestAnimationFrame(this.animationLoop);
  };

  private advanceStep(): void {
    const { currentStep, totalSteps, direction, loop } = this.state;

    if (direction === 'forward') {
      if (currentStep < totalSteps) {
        this.state.currentStep++;
      } else if (loop) {
        this.state.currentStep = 0;
      } else {
        this.pause();
        this.onCompleteCallback?.();
        return;
      }
    } else if (direction === 'backward') {
      if (currentStep > 0) {
        this.state.currentStep--;
      } else if (loop) {
        this.state.currentStep = totalSteps;
      } else {
        this.pause();
        this.onCompleteCallback?.();
        return;
      }
    } else if (direction === 'pingpong') {
      const nextStep = currentStep + this.pingpongDirection;
      
      if (nextStep < 0 || nextStep > totalSteps) {
        if (loop) {
          this.pingpongDirection *= -1;
          this.state.currentStep += this.pingpongDirection;
        } else {
          this.pause();
          this.onCompleteCallback?.();
          return;
        }
      } else {
        this.state.currentStep = nextStep;
      }
    }

    this.emitStep();
  }

  private emitStep(): void {
    const result = this.results[this.state.currentStep];
    if (result && this.onStepCallback) {
      this.onStepCallback(this.state.currentStep, result);
    }
  }

  destroy(): void {
    this.pause();
    this.onStepCallback = undefined;
    this.onCompleteCallback = undefined;
    this.results = [];
  }
}
