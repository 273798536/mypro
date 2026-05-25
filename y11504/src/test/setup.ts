import { DataSource } from 'typeorm';

declare global {
  var __DATA_SOURCE__: DataSource | undefined;
}

afterAll(async () => {
  if (global.__DATA_SOURCE__) {
    try {
      await global.__DATA_SOURCE__.destroy();
    } catch (e) {
    }
  }
});
