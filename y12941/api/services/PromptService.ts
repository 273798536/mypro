import { PromptRepository } from '../repositories/PromptRepository';
import type { PromptVersion } from '../../shared/types';

export class PromptService {
  private promptRepo = new PromptRepository();

  getAll(): PromptVersion[] {
    return this.promptRepo.findAll();
  }

  getActive(): PromptVersion | null {
    return this.promptRepo.findActive();
  }

  create(data: Omit<PromptVersion, 'id' | 'createdAt'>): PromptVersion {
    return this.promptRepo.create(data);
  }

  activate(id: string): void {
    this.promptRepo.activate(id);
  }
}
