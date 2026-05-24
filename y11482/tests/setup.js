const fs = require('fs');
const path = require('path');

const testDbPath = path.join(__dirname, '../data/test.sqlite3');
const dataDir = path.join(__dirname, '../data');

beforeAll(() => {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
});

beforeEach(() => {
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  process.env.NODE_ENV = 'test';
});

afterEach(() => {
  Object.keys(require.cache).forEach(key => {
    delete require.cache[key];
  });
});

afterAll(() => {
  if (fs.existsSync(testDbPath)) {
    try {
      fs.unlinkSync(testDbPath);
    } catch (e) {
    }
  }
});
