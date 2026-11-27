'use strict';
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function run() {
  const database = db.getDatabase();
  const migrationPath = path.join(__dirname, '../database/migration_001_prefixed_ids.sql');
  const migration = fs.readFileSync(migrationPath, 'utf8');

  try {
    database.exec(migration);
    const violations = database.prepare('PRAGMA foreign_key_check').all();
    if (violations.length) {
      console.error('La migración terminó, pero hay claves foráneas inválidas:', violations);
      process.exitCode = 1;
      return;
    }
    console.log('Migración de IDs completada. Las claves foráneas están correctas.');
  } finally {
    await db.close();
  }
}

run().catch(async error => {
  console.error('No se pudo migrar la base de datos:', error.message);
  await db.close();
  process.exitCode = 1;
});
