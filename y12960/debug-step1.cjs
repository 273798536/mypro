// Step 1: Test basic module loading
console.log('Step 1: Testing basic module loading...');

try {
  console.log('1.1 Loading express...');
  const express = require('express');
  console.log('✓ Express loaded, version:', express.version || 'unknown');

  console.log('1.2 Loading better-sqlite3...');
  const Database = require('better-sqlite3');
  console.log('✓ better-sqlite3 loaded');

  console.log('1.3 Loading cors...');
  const cors = require('cors');
  console.log('✓ cors loaded');

  console.log('1.4 Loading multer...');
  const multer = require('multer');
  console.log('✓ multer loaded');

  console.log('1.5 Loading zod...');
  const zod = require('zod');
  console.log('✓ zod loaded');

  console.log('✓ All basic modules loaded successfully');
} catch (error) {
  console.error('✗ Error loading basic modules:', error.message);
  console.error(error.stack);
  process.exit(1);
}
