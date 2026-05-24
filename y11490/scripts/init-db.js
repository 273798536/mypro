const { initDatabase } = require('../src/database');
const fs = require('fs');
const path = require('path');
const config = require('../config');

const dirs = [
  config.uploads.dir,
  config.logging.dir,
  config.export.dir,
  path.dirname(config.database.path)
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

async function main() {
  await initDatabase();
  console.log('Database initialization complete!');
  process.exit(0);
}

main().catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
