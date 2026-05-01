const fs = require('fs');
const path = require('path');
const { query, close } = require('../db');
require('dotenv').config();

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  await query(schemaSql);
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to initialize the database');
  }

  try {
    await initializeDatabase();
    console.log('Database schema initialized successfully');
  } finally {
    await close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { initializeDatabase };
