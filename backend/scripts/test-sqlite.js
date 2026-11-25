'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const file = path.join(os.tmpdir(), `atlantic-crm-test-${process.pid}.db`);
process.env.SQLITE_FILE = file;
const db = require('../src/db');
(async()=>{
  try {
    const health = await db.health();
    assert.equal(health.ok, true, 'SQLite debe iniciar y crear el esquema');
    const tiers = await db.query('SELECT tier,min_points FROM dbo.loyalty_tier_rules ORDER BY min_points');
    assert.deepEqual(tiers.recordset.map(x=>[x.tier,Number(x.min_points)]),[['SILVER',0],['GOLD',500],['PLATINUM',1500]]);
    await db.query("INSERT dbo.users(id,name,email,password_hash,role,is_active,created_at,updated_at) VALUES(@id,@name,@email,@hash,'ADMIN',1,SYSUTCDATETIME(),SYSUTCDATETIME())",{id:'test-admin',name:'Admin test',email:'admin@test.local',hash:'hash'});
    const pool=await db.getPool(); const tx=new db.sql.Transaction(pool); await tx.begin();
    const q=new db.sql.Request(tx); q.input('id',db.sql.Char(36),'test-client').input('dni',db.sql.NVarChar(60),'TEST-1').input('fn',db.sql.NVarChar(120),'Cliente').input('ln',db.sql.NVarChar(120),'Prueba').input('email',db.sql.NVarChar(190),'client@test.local').input('phone',db.sql.NVarChar(60),null).input('consent',db.sql.Bit,true);
    await q.query("INSERT dbo.clients(id,dni,first_name,last_name,email,phone,consent_marketing,vip_tier,vip_score,created_at,updated_at) VALUES(@id,@dni,@fn,@ln,@email,@phone,@consent,'SILVER',0,SYSUTCDATETIME(),SYSUTCDATETIME())");
    await tx.commit();
    const client=await db.query('SELECT id,first_name FROM dbo.clients WHERE id=@id',{id:'test-client'});
    assert.equal(client.recordset[0].first_name,'Cliente');
    const top=await db.query('SELECT TOP (1) id FROM dbo.users WHERE email=@email',{email:'admin@test.local'});
    assert.equal(top.recordset.length,1);
    console.log('OK: esquema SQLite, reglas Silver/Gold/Platinum, consultas parametrizadas, TOP y transacciones.');
  } finally {
    await db.close();
    for(const suffix of ['', '-shm', '-wal']) try{fs.unlinkSync(file+suffix);}catch{}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
