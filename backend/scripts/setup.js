'use strict';
const fs=require('fs');
const path=require('path');
const crypto=require('crypto');
const envPath=path.join(__dirname,'../.env');
if(fs.existsSync(envPath)){
  console.log('backend/.env ya existe; se conserva la configuración actual.');
  process.exit(0);
}
const env=[
  'PORT=3000',
  'HOST=127.0.0.1',
  'SQLITE_FILE=./database/atlantic_crm.db',
  `JWT_SECRET=${crypto.randomBytes(48).toString('hex')}`,
  'JWT_EXPIRES_IN=8h',
  'FRONTEND_ORIGIN=http://localhost:3000',
  `INTEGRATION_WEBHOOK_SECRET=${crypto.randomBytes(32).toString('hex')}`,
  ''
].join('\n');
fs.writeFileSync(envPath,env,{flag:'wx'});
console.log('Se creó backend/.env con secretos aleatorios y ruta SQLite local.');
