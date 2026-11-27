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
    const integrity = await db.query('PRAGMA integrity_check');
    assert.equal(integrity.recordset[0].integrity_check, 'ok', 'La base debe superar integrity_check');
    const fk = await db.query('PRAGMA foreign_key_check');
    assert.equal(fk.recordset.length, 0, 'No debe haber claves foráneas huérfanas');
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
    await db.query("INSERT dbo.tickets(id,ticket_no,client_id,created_by_id,subject,description,status,created_at,updated_at) VALUES(@id,@no,@cid,@uid,@subject,@description,'IN_PROGRESS',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",{id:'test-ticket',no:'TEST-001',cid:'test-client',uid:'test-admin',subject:'Prueba de atención',description:'Ticket de prueba'});
    const ticketCount=await db.query("SELECT COUNT(*) n FROM dbo.tickets WHERE status NOT IN ('RESOLVED','CLOSED')");
    assert.equal(Number(ticketCount.recordset[0].n),1,'El conteo de tickets abiertos debe incluir IN_PROGRESS');
    await db.query("INSERT dbo.ticket_history(id,ticket_id,actor_id,action,from_state,to_state,note,created_at) VALUES(@id,@ticket,@actor,'STATUS_CHANGED','IN_PROGRESS','RESOLVED','Prueba de historial',CURRENT_TIMESTAMP)",{id:'test-ticket-history',ticket:'test-ticket',actor:'test-admin'});
    const history=await db.query('SELECT from_state,to_state FROM dbo.ticket_history WHERE ticket_id=@id',{id:'test-ticket'});
    assert.equal(history.recordset[0].to_state,'RESOLVED','Los cambios de estado deben poder registrarse en el historial');
    await db.query("INSERT dbo.benefits(id,name,description,code,tier,max_redemptions,redeemed_count,status,created_at,updated_at) VALUES(@id,@name,@description,@code,'GOLD',10,0,'AVAILABLE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)",{id:'test-benefit',name:'Beneficio de prueba',description:'Detalle visible al cliente',code:'TEST-BEN-01'});
    await db.query("INSERT dbo.benefit_assignments(id,client_id,benefit_id,assigned_at,status) VALUES(@id,@cid,@bid,CURRENT_TIMESTAMP,'AVAILABLE')",{id:'test-assignment',cid:'test-client',bid:'test-benefit'});
    const benefits=await db.query(`SELECT b.name,b.description,b.code,ba.status AS assignment_status FROM benefit_assignments ba INNER JOIN benefits b ON b.id=ba.benefit_id WHERE ba.client_id=@cid`,{cid:'test-client'});
    assert.equal(benefits.recordset.length,1,'El cliente debe recuperar los beneficios asignados');
    assert.equal(benefits.recordset[0].assignment_status,'AVAILABLE');
    console.log('OK: esquema SQLite, reglas VIP, consultas parametrizadas, TOP, transacciones, tickets abiertos y beneficios por cliente.');
  } finally {
    await db.close();
    for(const suffix of ['', '-shm', '-wal']) try{fs.unlinkSync(file+suffix);}catch{}
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
