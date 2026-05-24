const fs = require('fs');
const path = require('path');
const sequelize = require('../src/config/database');

const dataDir = path.join(__dirname, '../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function initDatabase() {
  try {
    console.log('Initializing database...');
    
    require('../src/models');
    
    await sequelize.authenticate();
    console.log('✓ Database connection established');

    await sequelize.sync({ force: true });
    console.log('✓ Database tables created');

    console.log('\nDatabase initialized successfully!');
    console.log('Database file:', path.resolve(dataDir, 'ledger.db'));
    
    process.exit(0);
  } catch (error) {
    console.error('✗ Database initialization failed:', error);
    process.exit(1);
  }
}

initDatabase();
