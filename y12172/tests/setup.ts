import { dataStore } from '../src/store/DataStore';

beforeEach(() => {
  dataStore.reset();
});

afterAll(() => {
  dataStore.reset();
});
