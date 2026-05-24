import { DataSource } from 'typeorm';

declare global {
  var __DATA_SOURCE__: DataSource | undefined;
}

beforeEach(async () => {
  if (global.__DATA_SOURCE__) {
    const entities = global.__DATA_SOURCE__.entityMetadatas;
    for (const entity of entities) {
      const repository = global.__DATA_SOURCE__.getRepository(entity.name);
      await repository.clear();
    }
  }
});

afterAll(async () => {
  if (global.__DATA_SOURCE__) {
    await global.__DATA_SOURCE__.destroy();
  }
});
