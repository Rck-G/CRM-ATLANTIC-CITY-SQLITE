
require('dotenv').config({path:require('path').join(__dirname,'../.env')});
const express=require('express'), path=require('path'), crypto=require('crypto');
const bcrypt=require('bcryptjs'), jwt=require('jsonwebtoken'), cors=require('cors'), helmet=require('helmet');
const rateLimit=require('express-rate-limit'), db=require('./db');
const app=express(), {sql}=db, PORT=Number(process.env.PORT||3000);
if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32) console.warn('ADVERTENCIA: JWT_SECRET debe tener al menos 32 caracteres aleatorios.');
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'","data:"],connectSrc:["'self'"],objectSrc:["'none'"],baseUri:["'self'"],frameAncestors:["'none'"],formAction:["'self'"]}}}));
app.use('/api',(req,res,next)=>{res.setHeader('Cache-Control','no-store');next()});
app.use(cors({origin:process.env.FRONTEND_ORIGIN||'http://localhost:3000'})); app.use(express.json({limit:'1mb'}));
const id=()=>crypto.randomUUID(), now=()=>new Date(), asyncRoute=f=>(q,s,n)=>Promise.resolve(f(q,s,n)).catch(n);
const auth=asyncRoute(async(req,res,next)=>{
 if(req.method==='POST'&&req.path==='/integrations/pos/sales')return next();
 const h=req.headers.authorization||''; if(!h.startsWith('Bearer '))return res.status(401).json({error:'Sesión no válida'});
 try {const p=jwt.verify(h.slice(7),process.env.JWT_SECRET);const r=await db.query('SELECT id,name,email,role,client_id FROM dbo.users WHERE id=@id AND is_active=1',{id:p.sub});if(!r.recordset.length)return res.status(401).json({error:'Usuario inactivo o inexistente'});req.user=r.recordset[0];next();}
 catch(e){if(e.name==='JsonWebTokenError'||e.name==='TokenExpiredError')return res.status(401).json({error:'Sesión expirada o inválida'});throw e;}
});
const roles=(...a)=>(req,res,next)=>!req.user||!a.includes(req.user.role)?res.status(403).json({error:'Permisos insuficientes'}):next();
const sign=u=>jwt.sign({sub:u.id},process.env.JWT_SECRET,{expiresIn:process.env.JWT_EXPIRES_IN||'8h'});
async function audit(u,action,resource,rid,outcome='SUCCESS'){await db.query(`INSERT dbo.audit_events(id,actor_id,action,resource,resource_id,outcome,created_at) VALUES(@id,@u,@a,@r,@rid,@o,SYSUTCDATETIME())`,{id:id(),u:u||null,a:action,r:resource,rid:String(rid||''),o:outcome});}
app.get('/api/health',asyncRoute(async(req,res)=>{const h=await db.health();res.status(h.ok?200:503).json(h)}));
app.get('/api/auth/bootstrap-status',asyncRoute(async(req,res)=>{const r=await db.query("SELECT COUNT_BIG(*) AS n FROM dbo.users WHERE role='ADMIN'");res.json({available:Number(r.recordset[0].n)===0})}));
app.post('/api/auth/bootstrap-admin',rateLimit({windowMs:900000,max:5}),asyncRoute(async(req,res)=>{
 const {name,email,password}=req.body||{};if(!name||!/^\S+@\S+\.\S+$/.test(email||'')||String(password||'').length<12)return res.status(400).json({error:'Nombre, correo válido y contraseña de al menos 12 caracteres requeridos'});
 const tx=new sql.Transaction(await db.getPool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try{const r=await new sql.Request(tx).query("SELECT COUNT_BIG(*) n FROM dbo.users WHERE role='ADMIN'");if(Number(r.recordset[0].n)>0){await tx.rollback();return res.status(409).json({error:'La configuración inicial ya fue completada'});}
 const uid=id(),hash=await bcrypt.hash(password,12);const q=new sql.Request(tx);q.input('id',sql.Char(36),uid).input('name',sql.NVarChar(160),name.trim()).input('email',sql.NVarChar(190),email.toLowerCase()).input('hash',sql.NVarChar(255),hash);await q.query("INSERT dbo.users(id,name,email,password_hash,role,is_active,created_at,updated_at) VALUES(@id,@name,@email,@hash,'ADMIN',1,SYSUTCDATETIME(),SYSUTCDATETIME())");await tx.commit();res.status(201).json({message:'Administrador inicial creado. Inicie sesión.'});
 }catch(e){await tx.rollback();throw e;}
}));
app.post('/api/auth/login',rateLimit({windowMs:900000,max:10,standardHeaders:true,legacyHeaders:false}),asyncRoute(async(req,res)=>{
 const email=String(req.body.email||'').trim().toLowerCase(),password=String(req.body.password||'');
 const r=await db.query('SELECT TOP (1) id,name,email,password_hash,role,client_id,is_active FROM dbo.users WHERE email=@email',{email});
 const u=r.recordset[0];if(!u||!u.is_active||!await bcrypt.compare(password,u.password_hash))return res.status(401).json({error:'Correo o contraseña incorrectos'});
 const user={id:u.id,name:u.name,email:u.email,role:u.role,client_id:u.client_id};res.json({token:sign(user),user});
}));
app.get('/api/auth/me',auth,(req,res)=>res.json(req.user));
app.post('/api/auth/logout',auth,(req,res)=>res.json({message:'Sesión cerrada. Elimine el token del cliente.'}));
app.post('/api/auth/register',rateLimit({windowMs:900000,max:5,standardHeaders:true,legacyHeaders:false}),asyncRoute(async(req,res)=>{
  const d=req.body||{},dni=String(d.dni||'').trim(),firstName=String(d.firstName||'').trim(),lastName=String(d.lastName||'').trim(),email=String(d.email||'').trim().toLowerCase(),phone=String(d.phone||'').trim(),password=String(d.password||'');
  if(!dni||dni.length>60||!firstName||firstName.length>120||!lastName||lastName.length>120||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>190||phone.length>60||password.length<12||password.length>200)return res.status(400).json({error:'Verifica documento, nombres, apellidos, correo, teléfono y contraseña (12 a 200 caracteres)'});
 const tx=new sql.Transaction(await db.getPool());await tx.begin();
 try{const cid=id(),uid=id(),hash=await bcrypt.hash(d.password,12);let q=new sql.Request(tx);
 q.input('id',sql.Char(36),cid).input('dni',sql.NVarChar(60),dni).input('fn',sql.NVarChar(120),firstName).input('ln',sql.NVarChar(120),lastName).input('email',sql.NVarChar(190),email).input('phone',sql.NVarChar(60),phone||null).input('consent',sql.Bit,!!d.consentMarketing);
 await q.query("INSERT dbo.clients(id,dni,first_name,last_name,email,phone,consent_marketing,vip_tier,vip_score,created_at,updated_at) VALUES(@id,@dni,@fn,@ln,@email,@phone,@consent,'SILVER',0,SYSUTCDATETIME(),SYSUTCDATETIME())");
 q=new sql.Request(tx);q.input('id',sql.Char(36),uid).input('name',sql.NVarChar(160),firstName+' '+lastName).input('email',sql.NVarChar(190),email).input('hash',sql.NVarChar(255),hash).input('cid',sql.Char(36),cid);
 await q.query("INSERT dbo.users(id,name,email,password_hash,role,client_id,is_active,created_at,updated_at) VALUES(@id,@name,@email,@hash,'CLIENT',@cid,1,SYSUTCDATETIME(),SYSUTCDATETIME())");await tx.commit();const user={id:uid,name:firstName+' '+lastName,email,role:'CLIENT',client_id:cid};res.status(201).json({message:'Cuenta creada',token:sign(user),user});
 }catch(e){await tx.rollback();if(e.number===2601||e.number===2627)return res.status(409).json({error:'El documento o correo ya está registrado'});throw e;}
}));
app.use('/api',auth);
// Perfil personal: cada sesión solo puede consultar y modificar sus propios datos.
let profileSchemaReady;
async function ensureProfileSchema(){ return Promise.resolve(); }
app.get('/api/profile',asyncRoute(async(req,res)=>{
 await ensureProfileSchema();
 const r=await db.query(`SELECT u.id,u.name,u.email,COALESCE(u.phone,c.phone) AS phone,u.role,u.client_id,
  c.dni,c.first_name AS firstName,c.last_name AS lastName,c.birth_date AS birthDate,
  c.preferences,c.consent_marketing AS consentMarketing
  FROM dbo.users u LEFT JOIN dbo.clients c ON c.id=u.client_id WHERE u.id=@id`,{id:req.user.id});
 if(!r.recordset.length)return res.status(404).json({error:'Perfil no encontrado'});
 res.json(r.recordset[0]);
}));
app.patch('/api/profile',asyncRoute(async(req,res)=>{
 await ensureProfileSchema();
 const d=req.body||{}, email=String(d.email||'').trim().toLowerCase();
 if(!/^\S+@\S+\.\S+$/.test(email))return res.status(400).json({error:'Ingresa un correo electrónico válido'});
 const isClient=req.user.role==='CLIENT';
 const firstName=String(d.firstName||'').trim(),lastName=String(d.lastName||'').trim();
 const name=isClient?`${firstName} ${lastName}`.trim():String(d.name||'').trim();
 const phone=String(d.phone||'').trim();
 if(!name||name.length>160)return res.status(400).json({error:isClient?'Nombres y apellidos son obligatorios':'El nombre es obligatorio y no debe superar 160 caracteres'});
 if(phone.length>60)return res.status(400).json({error:'El teléfono no debe superar 60 caracteres'});
 if(isClient&&(!firstName||!lastName||firstName.length>120||lastName.length>120))return res.status(400).json({error:'Nombres y apellidos son obligatorios'});
 const tx=new sql.Transaction(await db.getPool());await tx.begin();
 try{
  let q=new sql.Request(tx);
  q.input('id',sql.Char(36),req.user.id).input('name',sql.NVarChar(160),name).input('email',sql.NVarChar(190),email).input('phone',sql.NVarChar(60),phone||null);
  await q.query('UPDATE dbo.users SET name=@name,email=@email,phone=@phone,updated_at=SYSUTCDATETIME() WHERE id=@id');
  if(isClient){
   if(!req.user.client_id)throw new Error('La cuenta no tiene una ficha de cliente asociada');
   q=new sql.Request(tx);q.input('cid',sql.Char(36),req.user.client_id).input('fn',sql.NVarChar(120),firstName).input('ln',sql.NVarChar(120),lastName).input('email',sql.NVarChar(190),email).input('phone',sql.NVarChar(60),phone||null);
   await q.query('UPDATE dbo.clients SET first_name=@fn,last_name=@ln,email=@email,phone=@phone,updated_at=SYSUTCDATETIME() WHERE id=@cid');
  }
  await tx.commit();await audit(req.user.id,'PROFILE_UPDATED','users',req.user.id);
  res.json({message:'Perfil actualizado',user:{id:req.user.id,name,email,phone:phone||null,role:req.user.role,client_id:req.user.client_id}});
 }catch(e){await tx.rollback();if(e.number===2601||e.number===2627)return res.status(409).json({error:'Ese correo ya está asociado a otra cuenta'});throw e;}
}));
app.post('/api/profile/password',rateLimit({windowMs:900000,max:5}),asyncRoute(async(req,res)=>{
 const currentPassword=String(req.body?.currentPassword||''),newPassword=String(req.body?.newPassword||'');
 if(newPassword.length<12)return res.status(400).json({error:'La nueva contraseña debe tener al menos 12 caracteres'});
 if(newPassword.length>200)return res.status(400).json({error:'La nueva contraseña es demasiado larga'});
 const r=await db.query('SELECT password_hash FROM dbo.users WHERE id=@id AND is_active=1',{id:req.user.id});
 if(!r.recordset.length||!await bcrypt.compare(currentPassword,r.recordset[0].password_hash))return res.status(400).json({error:'La contraseña actual no es correcta'});
 const hash=await bcrypt.hash(newPassword,12);await db.query('UPDATE dbo.users SET password_hash=@hash,updated_at=SYSUTCDATETIME() WHERE id=@id',{hash,id:req.user.id});
 await audit(req.user.id,'PROFILE_PASSWORD_CHANGED','users',req.user.id);res.json({message:'Contraseña actualizada correctamente'});
}));
const resources={
 clients:{table:'clients',roles:['ADMIN','EMPLOYEE','MARKETING'],fields:{dni:'dni',firstName:'first_name',lastName:'last_name',email:'email',phone:'phone',birthDate:'birth_date',consentMarketing:'consent_marketing',preferences:'preferences'},required:['dni','firstName','lastName'],order:'created_at'},
 campaigns:{table:'campaigns',roles:['ADMIN','MARKETING'],fields:{name:'name',description:'description',status:'status',targetTier:'target_tier',startsAt:'starts_at',endsAt:'ends_at',channel:'channel'},required:['name'],order:'created_at'},
 benefits:{table:'benefits',roles:['ADMIN','MARKETING'],fields:{campaignId:'campaign_id',name:'name',description:'description',code:'code',tier:'tier',validFrom:'valid_from',validUntil:'valid_until',maxRedemptions:'max_redemptions',status:'status'},required:['name','code'],order:'created_at'},
 tickets:{table:'tickets',roles:['ADMIN','EMPLOYEE','MARKETING','CLIENT'],fields:{clientId:'client_id',subject:'subject',description:'description',category:'category',priority:'priority',status:'status',department:'department'},required:['subject','description'],order:'created_at'},
 restaurants:{table:'restaurants',roles:['ADMIN','EMPLOYEE'],fields:{code:'code',name:'name',description:'description',location:'location',capacity:'capacity',active:'active'},required:['code','name'],order:'created_at'},
 reservations:{table:'reservations',roles:['ADMIN','EMPLOYEE','MARKETING'],fields:{restaurantId:'restaurant_id',clientId:'client_id',guestName:'guest_name',guestEmail:'guest_email',guestPhone:'guest_phone',partySize:'party_size',startsAt:'starts_at',endsAt:'ends_at',status:'status',notes:'notes'},required:['restaurantId','guestName','partySize','startsAt','endsAt'],order:'starts_at'},
 events:{table:'events',roles:['ADMIN','MARKETING'],fields:{code:'code',name:'name',description:'description',venue:'venue',startsAt:'starts_at',endsAt:'ends_at',capacity:'capacity',status:'status'},required:['code','name','startsAt','endsAt'],order:'starts_at'},
 integrations:{table:'integrations',roles:['ADMIN'],fields:{name:'name',type:'type',endpoint:'endpoint',enabled:'enabled'},required:['name','type'],order:'created_at'}
};
const types={consentMarketing:sql.Bit,active:sql.Bit,enabled:sql.Bit,capacity:sql.Int,partySize:sql.Int,maxRedemptions:sql.Int,startsAt:sql.DateTime2,endsAt:sql.DateTime2,validFrom:sql.DateTime2,validUntil:sql.DateTime2,birthDate:sql.Date};
function valType(k,v){if(types[k])return types[k];if(typeof v==='boolean')return sql.Bit;if(typeof v==='number')return sql.Decimal(14,2);return sql.NVarChar(sql.MAX);}
function bind(q,k,v){q.input(k,types[k]|| (typeof v==='boolean'?sql.Bit:typeof v==='number'?sql.Decimal(14,2):sql.NVarChar(sql.MAX)),v===undefined?null:v);}
const readRoles={
 clients:['ADMIN','EMPLOYEE','MARKETING'], campaigns:['ADMIN','EMPLOYEE','MARKETING'],
 benefits:['ADMIN','EMPLOYEE','MARKETING'], tickets:['ADMIN','EMPLOYEE','MARKETING','CLIENT'],
 restaurants:['ADMIN','EMPLOYEE','MARKETING'], reservations:['ADMIN','EMPLOYEE','MARKETING'],
 events:['ADMIN','EMPLOYEE','MARKETING'], integrations:['ADMIN']
};
for(const [key,c] of Object.entries(resources)){
 app.get('/api/'+key,asyncRoute(async(req,res)=>{
  if(key==='tickets'&&req.user.role==='CLIENT'){
   const r=await db.query('SELECT * FROM dbo.tickets WHERE client_id=@cid ORDER BY created_at DESC',{cid:req.user.client_id});return res.json(r.recordset);
  }
  if(!(readRoles[key]||[]).includes(req.user.role))return res.status(403).json({error:'Permisos insuficientes'});
  const r=key==='reservations'?await db.query(`SELECT r.*,rs.name AS restaurant_name FROM dbo.reservations r INNER JOIN dbo.restaurants rs ON rs.id=r.restaurant_id ORDER BY r.starts_at DESC`):key==='clients'?await db.query('SELECT *,first_name AS firstName,last_name AS lastName,vip_tier AS vipTier,vip_score AS vipScore FROM dbo.clients ORDER BY created_at DESC'):await db.query(`SELECT * FROM dbo.${c.table} ORDER BY ${c.order} DESC`);res.json(r.recordset);
 }));
 app.post('/api/'+key,roles(...c.roles),asyncRoute(async(req,res)=>{
  const d=req.body||{};if(c.required.some(k=>d[k]===undefined||d[k]===''))return res.status(400).json({error:'Completa los campos obligatorios'});
  if(key==='tickets'&&req.user.role==='CLIENT')d.clientId=req.user.client_id;
  if(key==='reservations'){
   const start=new Date(d.startsAt),end=new Date(d.endsAt),party=Number(d.partySize);
   if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||!Number.isInteger(party)||party<1)return res.status(400).json({error:'Intervalo de fechas o cantidad de personas inválidos'});
   const tx=new sql.Transaction(await db.getPool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
   try{let check=new sql.Request(tx);check.input('rid',sql.Char(36),d.restaurantId).input('start',sql.DateTime2,start).input('end',sql.DateTime2,end);
    const conflict=await check.query("SELECT TOP (1) id FROM dbo.reservations WITH (UPDLOCK,HOLDLOCK) WHERE restaurant_id=@rid AND status NOT IN ('CANCELLED','REJECTED') AND starts_at<@end AND ends_at>@start");
    if(conflict.recordset.length){await tx.rollback();return res.status(409).json({error:'El restaurante ya tiene una reserva en ese intervalo'});}
    const rid=id(),q=new sql.Request(tx),fields=Object.entries(c.fields).filter(([k])=>d[k]!==undefined);q.input('id',sql.Char(36),rid);
    const cols=['id'],pars=['@id'];for(const [k,col] of fields){bind(q,k,d[k]);cols.push(col);pars.push('@'+k);}
    cols.push('created_at','updated_at');pars.push('SYSUTCDATETIME()','SYSUTCDATETIME()');
    await q.query(`INSERT dbo.reservations(${cols.join(',')}) VALUES(${pars.join(',')})`);await tx.commit();await audit(req.user.id,'RESERVATIONS_CREATED','reservations',rid);return res.status(201).json({id:rid,message:'Reserva creada'});
   }catch(e){await tx.rollback();throw e;}
  }
  const idv=id(),fields=Object.entries(c.fields).filter(([k])=>d[k]!==undefined),q=(await db.getPool()).request();
  q.input('id',sql.Char(36),idv);const cols=['id'],pars=['@id'];for(const [k,col] of fields){bind(q,k,d[k]);cols.push(col);pars.push('@'+k);}
  if(key==='tickets'){q.input('createdById',sql.Char(36),req.user.id);cols.push('created_by_id');pars.push('@createdById');q.input('ticketNo',sql.NVarChar(40),'AC-'+Date.now());cols.push('ticket_no');pars.push('@ticketNo');}
  cols.push('created_at','updated_at');pars.push('SYSUTCDATETIME()','SYSUTCDATETIME()');
  await q.query(`INSERT dbo.${c.table}(${cols.join(',')}) VALUES(${pars.join(',')})`);await audit(req.user.id,key.toUpperCase()+'_CREATED',key,idv);res.status(201).json({id:idv,message:'Registro creado'});
 }));
 app.patch('/api/'+key+'/:rid',roles(...c.roles),asyncRoute(async(req,res)=>{
  if(key==='tickets'&&req.user.role==='CLIENT')return res.status(403).json({error:'Los clientes no pueden modificar tickets desde esta operación'});
  const d=req.body||{},fields=Object.entries(c.fields).filter(([k])=>d[k]!==undefined);if(!fields.length)return res.status(400).json({error:'No hay cambios'});
  if(key==='tickets'&&d.status!==undefined&&!['NEW','PENDING','IN_PROGRESS','WAITING_INFO','RESOLVED','CLOSED'].includes(String(d.status).toUpperCase()))return res.status(400).json({error:'Estado de ticket no válido'});
  if(key==='reservations'){
   if(d.status!==undefined&&!['PENDING','CONFIRMED','SEATED','COMPLETED','CANCELLED','NO_SHOW'].includes(String(d.status).toUpperCase()))return res.status(400).json({error:'Estado de reserva no válido'});
   if(d.partySize!==undefined&&(!Number.isInteger(Number(d.partySize))||Number(d.partySize)<1))return res.status(400).json({error:'La cantidad de personas debe ser un entero mayor que cero'});
   if(d.startsAt!==undefined||d.endsAt!==undefined||d.restaurantId!==undefined){
    const current=await db.query('SELECT restaurant_id,starts_at,ends_at,status FROM dbo.reservations WHERE id=@id',{id:req.params.rid});if(!current.recordset.length)return res.status(404).json({error:'Reserva no encontrada'});
    const old=current.recordset[0],restaurantId=d.restaurantId??old.restaurant_id,start=new Date(d.startsAt??old.starts_at),end=new Date(d.endsAt??old.ends_at);
    if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)return res.status(400).json({error:'El intervalo de la reserva no es válido'});
    if(String(d.status??old.status).toUpperCase()!=='CANCELLED'){
     const conflict=await db.query("SELECT id FROM dbo.reservations WHERE restaurant_id=@rid AND id<>@id AND status NOT IN ('CANCELLED','REJECTED') AND starts_at<@end AND ends_at>@start LIMIT 1",{rid:restaurantId,id:req.params.rid,start:start.toISOString(),end:end.toISOString()});
     if(conflict.recordset.length)return res.status(409).json({error:'El restaurante ya tiene otra reserva en ese intervalo'});
    }
   }
  }
  let previousTicketStatus=null;
  if(key==='tickets'&&d.status!==undefined){const old=await db.query('SELECT status FROM dbo.tickets WHERE id=@id',{id:req.params.rid});if(!old.recordset.length)return res.status(404).json({error:'Ticket no encontrado'});previousTicketStatus=old.recordset[0].status;}
  const q=(await db.getPool()).request();q.input('rid',sql.Char(36),req.params.rid);fields.forEach(([k,col])=>bind(q,k,d[k]));
  const sets=fields.map(([k,col])=>`${col}=@${k}`).join(',');const r=await q.query(`UPDATE dbo.${c.table} SET ${sets},updated_at=SYSUTCDATETIME() WHERE id=@rid`);
  if(!r.rowsAffected[0])return res.status(404).json({error:'Registro no encontrado'});
  if(key==='tickets'&&d.status!==undefined&&String(d.status).toUpperCase()!==String(previousTicketStatus).toUpperCase())await db.query("INSERT dbo.ticket_history(id,ticket_id,actor_id,action,from_state,to_state,note,created_at) VALUES(@id,@ticket,@actor,'STATUS_CHANGED',@from,@to,'Cambio de estado desde el panel',SYSUTCDATETIME())",{id:id(),ticket:req.params.rid,actor:req.user.id,from:previousTicketStatus,to:String(d.status).toUpperCase()});
  await audit(req.user.id,key.toUpperCase()+'_UPDATED',key,req.params.rid);res.json({message:'Registro actualizado'});
 }));
}
app.patch('/api/reservations/:rid/status',roles('ADMIN','EMPLOYEE'),asyncRoute(async(req,res)=>{
 const allowed=['PENDING','CONFIRMED','SEATED','COMPLETED','CANCELLED','NO_SHOW'];
 const status=String(req.body?.status||'').toUpperCase();
 if(!allowed.includes(status))return res.status(400).json({error:'Estado de reserva no válido'});
 const r=await db.query('UPDATE dbo.reservations SET status=@status,updated_at=SYSUTCDATETIME() WHERE id=@id',{status,id:req.params.rid});
 if(!r.rowsAffected[0])return res.status(404).json({error:'Reserva no encontrada'});
 await audit(req.user.id,'RESERVATION_STATUS_UPDATED','reservations',req.params.rid);
 res.json({message:'Estado de reserva actualizado'});
}));
app.get('/api/clients/:cid',asyncRoute(async(req,res)=>{
 if(req.user.role==='CLIENT'&&req.user.client_id!==req.params.cid)return res.status(403).json({error:'Permisos insuficientes'});
 const r=await db.query('SELECT * FROM dbo.clients WHERE id=@id',{id:req.params.cid});if(!r.recordset.length)return res.status(404).json({error:'Cliente no encontrado'});
 const a=await db.query('SELECT TOP (200) * FROM dbo.client_activity WHERE client_id=@id ORDER BY occurred_at DESC',{id:req.params.cid});res.json({...r.recordset[0],firstName:r.recordset[0].first_name,lastName:r.recordset[0].last_name,vipTier:r.recordset[0].vip_tier,vipScore:r.recordset[0].vip_score,activity:a.recordset});
}));
app.delete('/api/clients/:cid',roles('ADMIN','EMPLOYEE'),asyncRoute(async(req,res)=>{const r=await db.query('UPDATE dbo.clients SET updated_at=SYSUTCDATETIME() WHERE id=@id AND NOT EXISTS(SELECT 1 FROM dbo.users WHERE client_id=@id)',{id:req.params.cid});if(!r.rowsAffected[0])return res.status(409).json({error:'No se pudo eliminar: no existe o tiene cuenta vinculada. Desactiva la cuenta para conservar el historial.'});await audit(req.user.id,'CLIENT_DEACTIVATION_REQUESTED','clients',req.params.cid);res.json({message:'Registro actualizado; conserva el historial.'})}));
app.get('/api/users',roles('ADMIN'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT id,name,email,role,is_active,created_at FROM dbo.users ORDER BY created_at DESC');res.json(r.recordset)}));
app.post('/api/users',roles('ADMIN'),asyncRoute(async(req,res)=>{const d=req.body||{};if(!d.name||!/^\S+@\S+\.\S+$/.test(d.email||'')||String(d.password||'').length<12||!['ADMIN','EMPLOYEE','MARKETING'].includes(d.role))return res.status(400).json({error:'Nombre, correo, contraseña (12+) y rol válido requeridos'});const uid=id();await db.query("INSERT dbo.users(id,name,email,password_hash,role,is_active,created_at,updated_at) VALUES(@id,@name,@email,@hash,@role,1,SYSUTCDATETIME(),SYSUTCDATETIME())",{id:uid,name:d.name,email:d.email.toLowerCase(),hash:await bcrypt.hash(d.password,12),role:d.role});await audit(req.user.id,'USER_CREATED','users',uid);res.status(201).json({id:uid})}));
app.patch('/api/users/:id',roles('ADMIN'),asyncRoute(async(req,res)=>{const d=req.body||{};const sets=[],p={id:req.params.id};
 if(d.role!==undefined&&!['ADMIN','EMPLOYEE','MARKETING','CLIENT'].includes(d.role))return res.status(400).json({error:'Rol no válido'});
 if(d.name!==undefined&&(!String(d.name).trim()||String(d.name).length>160))return res.status(400).json({error:'Nombre no válido'});
 if(d.is_active!==undefined&&![true,false,0,1].includes(d.is_active))return res.status(400).json({error:'Estado de usuario no válido'});
 if(req.params.id===req.user.id&&(d.role&&d.role!=='ADMIN'||d.is_active===false||d.is_active===0))return res.status(409).json({error:'No puedes quitarte tu propio acceso de administrador'});
 const currentUser=await db.query('SELECT role,is_active FROM dbo.users WHERE id=@id',{id:req.params.id});
 if(!currentUser.recordset.length)return res.status(404).json({error:'Usuario no encontrado'});
 const removesAdmin=currentUser.recordset[0].role==='ADMIN'&&(d.role!==undefined&&d.role!=='ADMIN'||d.is_active===false||d.is_active===0);
 if(removesAdmin){const activeAdmins=await db.query("SELECT COUNT(*) n FROM dbo.users WHERE role='ADMIN' AND is_active=1");if(Number(activeAdmins.recordset[0].n)<=1)return res.status(409).json({error:'No se puede desactivar o cambiar el último administrador activo'});}

 for(const k of ['name','role','is_active'])if(d[k]!==undefined){sets.push(`${k}=@${k}`);p[k]=d[k]}if(d.password){if(String(d.password).length<12)return res.status(400).json({error:'La contraseña debe tener al menos 12 caracteres'});sets.push('password_hash=@hash');p.hash=await bcrypt.hash(d.password,12)}if(!sets.length)return res.status(400).json({error:'No hay cambios'});const q=(await db.getPool()).request();for(const [k,v] of Object.entries(p))q.input(k,k==='id'?sql.Char(36):k==='is_active'?sql.Bit:sql.NVarChar(sql.MAX),v);const r=await q.query(`UPDATE dbo.users SET ${sets.join(',')},updated_at=SYSUTCDATETIME() WHERE id=@id`);if(!r.rowsAffected[0])return res.status(404).json({error:'Usuario no encontrado'});await audit(req.user.id,'USER_UPDATED','users',req.params.id);res.json({message:'Usuario actualizado'})}));
// Fidelización configurable: los umbrales y reglas se administran en SQL y desde el panel.
async function loyaltyTiers(){const r=await db.query('SELECT tier,min_points FROM dbo.loyalty_tier_rules ORDER BY min_points');return r.recordset;}
function tierFor(points,tiers){let chosen='SILVER';for(const t of tiers){if(Number(points)>=Number(t.min_points))chosen=t.tier;}return chosen;}
app.get('/api/loyalty/config',roles('ADMIN'),asyncRoute(async(req,res)=>{
 const [tiers,rules]=await Promise.all([loyaltyTiers(),db.query('SELECT id,rule_key,name,source,points_per_unit,unit_amount,active FROM dbo.loyalty_point_rules ORDER BY name')]);
 res.json({tiers,rules:rules.recordset});
}));
app.put('/api/loyalty/config',roles('ADMIN'),asyncRoute(async(req,res)=>{
 const d=req.body||{}, tiers=d.tiers, rules=d.rules;
 if(!Array.isArray(tiers)||tiers.length!==3||!Array.isArray(rules))return res.status(400).json({error:'Envía los tres niveles y las reglas de acumulación'});
 const expected=['SILVER','GOLD','PLATINUM'];
 for(const name of expected){const t=tiers.find(x=>x.tier===name);if(!t||!Number.isFinite(Number(t.minPoints))||Number(t.minPoints)<0)return res.status(400).json({error:`Umbral inválido para ${name}`});}
 const ordered=expected.map(n=>Number(tiers.find(x=>x.tier===n).minPoints));
 if(ordered[0]!==0||ordered[1]<=ordered[0]||ordered[2]<=ordered[1])return res.status(400).json({error:'Silver debe iniciar en 0 y los umbrales deben ser crecientes'});
 for(const r of rules){if(!r.ruleKey||!r.name||!r.source||!Number.isFinite(Number(r.pointsPerUnit))||Number(r.pointsPerUnit)<0||!Number.isFinite(Number(r.unitAmount))||Number(r.unitAmount)<=0)return res.status(400).json({error:'Cada regla requiere nombre, origen, puntos válidos y monto base mayor a cero'});}
 const tx=new sql.Transaction(await db.getPool());await tx.begin();try{
  for(const t of tiers){const q=new sql.Request(tx);q.input('tier',sql.NVarChar(20),t.tier).input('points',sql.Decimal(12,2),Number(t.minPoints));await q.query('UPDATE dbo.loyalty_tier_rules SET min_points=@points,updated_at=SYSUTCDATETIME() WHERE tier=@tier');}
  for(const r of rules){const q=new sql.Request(tx);q.input('id',sql.Char(36),id()).input('key',sql.NVarChar(60),r.ruleKey).input('name',sql.NVarChar(120),r.name).input('source',sql.NVarChar(40),r.source).input('ppu',sql.Decimal(12,2),Number(r.pointsPerUnit)).input('unit',sql.Decimal(14,2),Number(r.unitAmount)).input('active',sql.Bit,!!r.active);await q.query(`INSERT INTO dbo.loyalty_point_rules(id,rule_key,name,source,points_per_unit,unit_amount,active,updated_at) VALUES(@id,@key,@name,@source,@ppu,@unit,@active,SYSUTCDATETIME()) ON CONFLICT(rule_key) DO UPDATE SET name=excluded.name,source=excluded.source,points_per_unit=excluded.points_per_unit,unit_amount=excluded.unit_amount,active=excluded.active,updated_at=excluded.updated_at`);}
  await tx.commit();await audit(req.user.id,'LOYALTY_CONFIG_UPDATED','loyalty', 'configuration');res.json({message:'Configuración de fidelización guardada'});
 }catch(e){await tx.rollback();throw e;}
}));
app.post('/api/clients/:cid/loyalty/tier',roles('ADMIN'),asyncRoute(async(req,res)=>{
 const tier=String(req.body.tier||'').toUpperCase(),reason=String(req.body.reason||'').trim();if(!['SILVER','GOLD','PLATINUM'].includes(tier))return res.status(400).json({error:'Nivel no válido'});
 const tx=new sql.Transaction(await db.getPool());await tx.begin();try{const q=new sql.Request(tx);q.input('id',sql.Char(36),req.params.cid);const c=await q.query('SELECT vip_tier FROM dbo.clients WHERE id=@id');if(!c.recordset.length){await tx.rollback();return res.status(404).json({error:'Cliente no encontrado'});}const previous=c.recordset[0].vip_tier;
  const u=new sql.Request(tx);u.input('id',sql.Char(36),req.params.cid).input('tier',sql.NVarChar(20),tier);await u.query('UPDATE dbo.clients SET vip_tier=@tier,vip_tier_override=@tier,updated_at=SYSUTCDATETIME() WHERE id=@id');
  const h=new sql.Request(tx);h.input('hid',sql.Char(36),id()).input('cid',sql.Char(36),req.params.cid).input('prev',sql.NVarChar(20),previous).input('tier',sql.NVarChar(20),tier).input('reason',sql.NVarChar(250),reason||'Asignación manual').input('uid',sql.Char(36),req.user.id);await h.query("INSERT dbo.loyalty_tier_history(id,client_id,previous_tier,new_tier,change_type,reason,changed_by,created_at) VALUES(@hid,@cid,@prev,@tier,'MANUAL',@reason,@uid,SYSUTCDATETIME())");await tx.commit();await audit(req.user.id,'VIP_TIER_MANUALLY_SET','clients',req.params.cid);res.json({message:'Nivel actualizado manualmente',tier,mode:'MANUAL'});
 }catch(e){await tx.rollback();throw e;}
}));
app.delete('/api/clients/:cid/loyalty/tier-override',roles('ADMIN'),asyncRoute(async(req,res)=>{
 const tiers=await loyaltyTiers();const tx=new sql.Transaction(await db.getPool());await tx.begin();try{const q=new sql.Request(tx);q.input('id',sql.Char(36),req.params.cid);const c=await q.query('SELECT vip_tier,vip_score FROM dbo.clients WHERE id=@id');if(!c.recordset.length){await tx.rollback();return res.status(404).json({error:'Cliente no encontrado'});}const previous=c.recordset[0].vip_tier,tier=tierFor(c.recordset[0].vip_score,tiers);const u=new sql.Request(tx);u.input('id',sql.Char(36),req.params.cid).input('tier',sql.NVarChar(20),tier);await u.query('UPDATE dbo.clients SET vip_tier=@tier,vip_tier_override=NULL,vip_evaluated_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME() WHERE id=@id');const h=new sql.Request(tx);h.input('hid',sql.Char(36),id()).input('cid',sql.Char(36),req.params.cid).input('prev',sql.NVarChar(20),previous).input('tier',sql.NVarChar(20),tier).input('uid',sql.Char(36),req.user.id);await h.query("INSERT dbo.loyalty_tier_history(id,client_id,previous_tier,new_tier,change_type,reason,changed_by,created_at) VALUES(@hid,@cid,@prev,@tier,'AUTO','Se reanudó la asignación automática',@uid,SYSUTCDATETIME())");await tx.commit();await audit(req.user.id,'VIP_TIER_AUTO_RESTORED','clients',req.params.cid);res.json({message:'Asignación automática reactivada',tier});}catch(e){await tx.rollback();throw e;}
}));
app.post('/api/clients/:cid/loyalty/points',roles('ADMIN'),asyncRoute(async(req,res)=>{
 const points=Number(req.body.points),reason=String(req.body.reason||'').trim();if(!Number.isFinite(points)||points===0||Math.abs(points)>1000000||!reason)return res.status(400).json({error:'Indica un ajuste distinto de cero y un motivo'});
 const tx=new sql.Transaction(await db.getPool());await tx.begin();try{const q=new sql.Request(tx);q.input('cid',sql.Char(36),req.params.cid);const c=await q.query('SELECT vip_score,vip_tier,vip_tier_override FROM dbo.clients WHERE id=@cid');if(!c.recordset.length){await tx.rollback();return res.status(404).json({error:'Cliente no encontrado'});}const current=Number(c.recordset[0].vip_score),nextScore=current+points;if(nextScore<0){await tx.rollback();return res.status(400).json({error:'El saldo de puntos no puede quedar negativo'});}
  const ins=new sql.Request(tx);ins.input('pid',sql.Char(36),id()).input('cid',sql.Char(36),req.params.cid).input('points',sql.Decimal(12,2),points).input('ref',sql.NVarChar(190),`MANUAL:${id()}`).input('desc',sql.NVarChar(250),reason).input('uid',sql.Char(36),req.user.id);await ins.query("INSERT dbo.loyalty_point_transactions(id,client_id,points,movement_type,source,reference_id,description,created_by,created_at) VALUES(@pid,@cid,@points,'ADJUST','MANUAL',@ref,@desc,@uid,SYSUTCDATETIME())");
  const tiers=await loyaltyTiers(),prev=c.recordset[0].vip_tier,tier=c.recordset[0].vip_tier_override||tierFor(nextScore,tiers);const up=new sql.Request(tx);up.input('cid',sql.Char(36),req.params.cid).input('score',sql.Decimal(12,2),nextScore).input('tier',sql.NVarChar(20),tier);await up.query('UPDATE dbo.clients SET vip_score=@score,vip_tier=@tier,updated_at=SYSUTCDATETIME() WHERE id=@cid');if(!c.recordset[0].vip_tier_override&&tier!==prev){const h=new sql.Request(tx);h.input('hid',sql.Char(36),id()).input('cid',sql.Char(36),req.params.cid).input('prev',sql.NVarChar(20),prev).input('tier',sql.NVarChar(20),tier).input('uid',sql.Char(36),req.user.id);await h.query("INSERT dbo.loyalty_tier_history(id,client_id,previous_tier,new_tier,change_type,reason,changed_by,created_at) VALUES(@hid,@cid,@prev,@tier,'AUTO','Cambio por ajuste manual de puntos',@uid,SYSUTCDATETIME())");}await tx.commit();await audit(req.user.id,'LOYALTY_POINTS_ADJUSTED','clients',req.params.cid);res.json({message:'Puntos ajustados',points:nextScore,tier});
 }catch(e){await tx.rollback();throw e;}
}));
app.get('/api/clients/:cid/loyalty/transactions',asyncRoute(async(req,res)=>{if(req.user.role==='CLIENT'&&req.user.client_id!==req.params.cid)return res.status(403).json({error:'Permisos insuficientes'});const r=await db.query('SELECT TOP (200) points,movement_type,source,reference_id,description,created_at FROM dbo.loyalty_point_transactions WHERE client_id=@id ORDER BY created_at DESC',{id:req.params.cid});res.json(r.recordset);}));
app.post('/api/vip/recalculate',roles('ADMIN','MARKETING'),asyncRoute(async(req,res)=>{
 const tiers=await loyaltyTiers();const r=await db.query('SELECT id,vip_tier,vip_score,vip_tier_override FROM dbo.clients');
 const results=r.recordset.map(c=>({clientId:c.id,previousTier:c.vip_tier,tier:c.vip_tier_override||tierFor(c.vip_score,tiers),score:Number(c.vip_score),mode:c.vip_tier_override?'MANUAL':'AUTO'}));
 if(!req.body.dryRun){const tx=new sql.Transaction(await db.getPool());await tx.begin();try{for(const x of results){if(x.mode==='MANUAL')continue;const old=x.previousTier;if(old!==x.tier){const h=new sql.Request(tx);h.input('hid',sql.Char(36),id()).input('cid',sql.Char(36),x.clientId).input('prev',sql.NVarChar(20),old).input('tier',sql.NVarChar(20),x.tier);await h.query("INSERT dbo.loyalty_tier_history(id,client_id,previous_tier,new_tier,change_type,reason,created_at) VALUES(@hid,@cid,@prev,@tier,'AUTO','Recalculo por puntos',SYSUTCDATETIME())");}const q=new sql.Request(tx);q.input('id',sql.Char(36),x.clientId).input('tier',sql.NVarChar(20),x.tier);await q.query('UPDATE dbo.clients SET vip_tier=@tier,vip_evaluated_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME() WHERE id=@id AND vip_tier_override IS NULL');}await tx.commit();await audit(req.user.id,'VIP_RECALCULATED','clients',results.length);}catch(e){await tx.rollback();throw e;}}
 res.json({evaluated:results.length,results});
}));
app.get('/api/my/benefits',asyncRoute(async(req,res)=>{
 if(req.user.role!=='CLIENT'||!req.user.client_id)return res.status(403).json({error:'Esta consulta está disponible para cuentas de cliente'});
 const r=await db.query(`SELECT b.id,b.name,b.description,b.code,b.tier,b.valid_from,b.valid_until,b.status AS benefit_status,ba.status AS assignment_status,ba.assigned_at,ba.redeemed_at
 FROM benefit_assignments ba INNER JOIN benefits b ON b.id=ba.benefit_id
 WHERE ba.client_id=@cid ORDER BY CASE ba.status WHEN 'AVAILABLE' THEN 0 ELSE 1 END,ba.assigned_at DESC`,{cid:req.user.client_id});
 res.json(r.recordset);
}));
app.get('/api/analytics/summary',asyncRoute(async(req,res)=>{
 const q=await db.query(`SELECT (SELECT COUNT_BIG(*) FROM dbo.clients) clients,(SELECT COUNT_BIG(*) FROM dbo.clients WHERE vip_tier<>'SILVER') vip,(SELECT COALESCE(SUM(amount),0) FROM dbo.sales WHERE status='PAID') sales,(SELECT COUNT_BIG(*) FROM dbo.sales) salesCount,(SELECT COUNT_BIG(*) FROM dbo.reservations WHERE status IN ('PENDING','CONFIRMED')) reservations,(SELECT COUNT_BIG(*) FROM dbo.tickets WHERE status NOT IN ('RESOLVED','CLOSED')) pendingTickets,(SELECT COUNT_BIG(*) FROM dbo.campaigns WHERE status='ACTIVE') activeCampaigns,(SELECT COUNT_BIG(*) FROM dbo.events WHERE starts_at>=SYSUTCDATETIME() AND status='PUBLISHED') upcomingEvents`);
 const x=q.recordset[0];const result=Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='bigint'?Number(v):v]));result.ticketsOpen=Number(result.pendingTickets||0);res.json(result);
}));
app.get('/api/audit',roles('ADMIN'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT TOP (500) * FROM dbo.audit_events ORDER BY created_at DESC');res.json(r.recordset)}));
app.get('/api/sales',roles('ADMIN','MARKETING'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT TOP (500) * FROM dbo.sales ORDER BY sold_at DESC');res.json(r.recordset)}));
app.get('/api/integrations',roles('ADMIN'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT * FROM dbo.integrations ORDER BY created_at DESC');res.json(r.recordset)}));
app.get('/api/integrations/events',roles('ADMIN'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT TOP (300) * FROM dbo.integration_events ORDER BY received_at DESC');res.json(r.recordset)}));
app.post('/api/integrations/:iid/sync',roles('ADMIN'),asyncRoute(async(req,res)=>{const r=await db.query("UPDATE dbo.integrations SET last_status='MANUAL_REVIEW',last_sync_at=SYSUTCDATETIME(),updated_at=SYSUTCDATETIME() WHERE id=@id",{id:req.params.iid});if(!r.rowsAffected[0])return res.status(404).json({error:'Integración no encontrada'});res.json({message:'Solicitud registrada; no se ejecutó sincronización externa sin conector configurado.'})}));
app.post('/api/integrations/pos/sales',asyncRoute(async(req,res)=>{
 if(!process.env.INTEGRATION_WEBHOOK_SECRET||req.headers['x-integration-secret']!==process.env.INTEGRATION_WEBHOOK_SECRET)return res.status(401).json({error:'Credencial de integración inválida'});
 const d=req.body||{},amount=Number(d.amount),status=String(d.status||'PAID').toUpperCase(),source=String(d.source||'POS').toUpperCase(),currency=String(d.currency||'PEN').toUpperCase(),soldAt=d.soldAt?new Date(d.soldAt):new Date();
  if(typeof d.externalId!=='string'||!d.externalId.trim()||d.externalId.length>150||!Number.isFinite(amount)||amount<0||amount>1000000000||!['PAID','PENDING','REFUNDED','CANCELLED'].includes(status)||!/^[A-Z0-9_-]{2,40}$/.test(source)||!/^[A-Z]{3}$/.test(currency)||!Number.isFinite(soldAt.getTime()))return res.status(400).json({error:'Datos de venta inválidos: verifica identificador, importe, estado, origen, moneda y fecha'});
  if(d.clientId){const client=await db.query('SELECT id FROM dbo.clients WHERE id=@id',{id:d.clientId});if(!client.recordset.length)return res.status(400).json({error:'El cliente indicado no existe'});}
  if(d.metadata!==undefined&&(typeof d.metadata!=='object'||d.metadata===null||Array.isArray(d.metadata)))return res.status(400).json({error:'Los metadatos deben ser un objeto JSON'});
  const tx=new sql.Transaction(await db.getPool());await tx.begin();try{
  const sid=id(),q=new sql.Request(tx);q.input('id',sql.Char(36),sid).input('ext',sql.NVarChar(150),d.externalId).input('cid',sql.Char(36),d.clientId||null).input('source',sql.NVarChar(80),source).input('currency',sql.Char(3),currency).input('amount',sql.Decimal(14,2),amount).input('status',sql.NVarChar(30),status).input('sold',sql.DateTime2,soldAt).input('meta',sql.NVarChar(sql.MAX),JSON.stringify(d.metadata||{}));
  await q.query('INSERT dbo.sales(id,external_id,client_id,source,currency,amount,status,sold_at,metadata,created_at) VALUES(@id,@ext,@cid,@source,@currency,@amount,@status,@sold,@meta,SYSUTCDATETIME())');
  let pointsAwarded=0;
  if(status==='PAID'&&d.clientId){const rr=new sql.Request(tx);rr.input('source',sql.NVarChar(40),source);const rule=await rr.query("SELECT TOP (1) points_per_unit,unit_amount FROM dbo.loyalty_point_rules WHERE active=1 AND source IN (@source,'ALL') ORDER BY CASE WHEN source=@source THEN 0 ELSE 1 END");if(rule.recordset.length){pointsAwarded=Math.floor((amount/Number(rule.recordset[0].unit_amount))*Number(rule.recordset[0].points_per_unit)*100)/100;if(pointsAwarded>0){const ins=new sql.Request(tx);ins.input('pid',sql.Char(36),id()).input('cid',sql.Char(36),d.clientId).input('points',sql.Decimal(12,2),pointsAwarded).input('source',sql.NVarChar(40),source).input('ref',sql.NVarChar(190),`SALE:${d.externalId}`).input('desc',sql.NVarChar(250),`Puntos por venta ${d.externalId}`);await ins.query("INSERT dbo.loyalty_point_transactions(id,client_id,points,movement_type,source,reference_id,description,created_at) VALUES(@pid,@cid,@points,'EARN',@source,@ref,@desc,SYSUTCDATETIME()); UPDATE dbo.clients SET vip_score=vip_score+@points,updated_at=SYSUTCDATETIME() WHERE id=@cid;");const c=new sql.Request(tx);c.input('cid',sql.Char(36),d.clientId);const cr=await c.query('SELECT vip_score,vip_tier,vip_tier_override FROM dbo.clients WHERE id=@cid');if(cr.recordset.length&&!cr.recordset[0].vip_tier_override){const tiers=await loyaltyTiers();const next=tierFor(cr.recordset[0].vip_score,tiers),prev=cr.recordset[0].vip_tier;if(next!==prev){const up=new sql.Request(tx);up.input('cid',sql.Char(36),d.clientId).input('tier',sql.NVarChar(20),next);await up.query('UPDATE dbo.clients SET vip_tier=@tier,vip_evaluated_at=SYSUTCDATETIME() WHERE id=@cid');const hist=new sql.Request(tx);hist.input('hid',sql.Char(36),id()).input('cid',sql.Char(36),d.clientId).input('prev',sql.NVarChar(20),prev).input('tier',sql.NVarChar(20),next);await hist.query("INSERT dbo.loyalty_tier_history(id,client_id,previous_tier,new_tier,change_type,reason,created_at) VALUES(@hid,@cid,@prev,@tier,'AUTO','Ascenso por compra POS',SYSUTCDATETIME())");}}}}}
  await tx.commit();res.status(201).json({id:sid,pointsAwarded});
 }catch(e){await tx.rollback();if(e.number===2601||e.number===2627||(String(e.code||'').startsWith('SQLITE_CONSTRAINT')||/UNIQUE constraint failed|constraint failed/i.test(e.message||'')))return res.status(409).json({error:'La venta ya fue registrada; no se duplicaron puntos'});throw e;}
}));
app.get('/api/reports/clients.csv',roles('ADMIN','MARKETING'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT dni,first_name,last_name,email,phone,vip_tier,vip_score,created_at FROM dbo.clients ORDER BY created_at DESC');const cols=['dni','first_name','last_name','email','phone','vip_tier','vip_score','created_at'];const quote=v=>{let value=String(v??'');if(/^[\s\u0000-\u001f]*[=+@\-]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};const csv=[cols.join(','),...r.recordset.map(x=>cols.map(k=>quote(x[k])).join(','))].join('\r\n');res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename=clientes_atlantic.csv');res.send('\ufeff'+csv)}));
app.post('/api/benefits/:bid/assign',roles('ADMIN','MARKETING'),asyncRoute(async(req,res)=>{const {clientId}=req.body||{};if(!clientId)return res.status(400).json({error:'Selecciona un cliente'});const aid=id();await db.query("INSERT dbo.benefit_assignments(id,client_id,benefit_id,assigned_at,status) VALUES(@id,@cid,@bid,SYSUTCDATETIME(),'AVAILABLE')",{id:aid,cid:clientId,bid:req.params.bid});await audit(req.user.id,'BENEFIT_ASSIGNED','benefits',req.params.bid);res.status(201).json({id:aid})}));
app.post('/api/benefits/:bid/redeem',roles('ADMIN','EMPLOYEE','CLIENT'),asyncRoute(async(req,res)=>{
 const cid=req.user.role==='CLIENT'?req.user.client_id:req.body.clientId;if(!cid)return res.status(400).json({error:'Cliente requerido'});
 const tx=new sql.Transaction(await db.getPool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);
 try{let q=new sql.Request(tx);q.input('bid',sql.Char(36),req.params.bid).input('cid',sql.Char(36),cid);const a=await q.query("SELECT TOP (1) id FROM dbo.benefit_assignments WITH (UPDLOCK,HOLDLOCK) WHERE benefit_id=@bid AND client_id=@cid AND status='AVAILABLE'");if(!a.recordset.length){await tx.rollback();return res.status(404).json({error:'Asignación disponible no encontrada'});}
 q=new sql.Request(tx);q.input('bid',sql.Char(36),req.params.bid);const b=await q.query('SELECT max_redemptions,redeemed_count,valid_from,valid_until FROM dbo.benefits WITH (UPDLOCK,HOLDLOCK) WHERE id=@bid');if(!b.recordset.length||b.recordset[0].redeemed_count>=b.recordset[0].max_redemptions||b.recordset[0].valid_from&&b.recordset[0].valid_from>new Date()||b.recordset[0].valid_until&&b.recordset[0].valid_until<new Date())throw Error('Beneficio no disponible o vencido');
 q=new sql.Request(tx);q.input('aid',sql.Char(36),a.recordset[0].id).input('uid',sql.Char(36),req.user.id).input('bid',sql.Char(36),req.params.bid);await q.query("UPDATE dbo.benefit_assignments SET status='REDEEMED',redeemed_at=SYSUTCDATETIME(),redeemed_by=@uid WHERE id=@aid; UPDATE dbo.benefits SET redeemed_count=redeemed_count+1 WHERE id=@bid");await tx.commit();await audit(req.user.id,'BENEFIT_REDEEMED','benefits',req.params.bid);res.json({message:'Canje registrado'});
 }catch(e){await tx.rollback();res.status(409).json({error:e.message});}
}));
app.get('/api/campaigns/:cid/audience',roles('ADMIN','MARKETING','EMPLOYEE'),asyncRoute(async(req,res)=>{const c=await db.query('SELECT target_tier FROM dbo.campaigns WHERE id=@id',{id:req.params.cid});if(!c.recordset.length)return res.status(404).json({error:'Campaña no encontrada'});const tier=req.query.tier||c.recordset[0].target_tier||null;const r=await db.query('SELECT id,first_name AS firstName,last_name AS lastName,email,vip_tier AS vipTier FROM dbo.clients WHERE consent_marketing=1 AND (@tier IS NULL OR vip_tier=@tier) ORDER BY last_name,first_name',{tier});res.json({consented:r.recordset.length,totalEligible:r.recordset.length,clients:r.recordset})}));
app.post('/api/campaigns/:cid/assign-benefits',roles('ADMIN','MARKETING'),asyncRoute(async(req,res)=>{const tx=new sql.Transaction(await db.getPool());await tx.begin();try{let q=new sql.Request(tx);q.input('cid',sql.Char(36),req.params.cid);const b=await q.query('SELECT id FROM dbo.benefits WHERE campaign_id=@cid');q=new sql.Request(tx);q.input('tier',sql.NVarChar(30),req.body.tier||null);const c=await q.query('SELECT id FROM dbo.clients WHERE consent_marketing=1 AND (@tier IS NULL OR vip_tier=@tier)');let count=0;for(const ben of b.recordset)for(const cl of c.recordset){const ins=new sql.Request(tx);ins.input('id',sql.Char(36),id()).input('cid',sql.Char(36),cl.id).input('bid',sql.Char(36),ben.id);const rr=await ins.query("INSERT OR IGNORE INTO dbo.benefit_assignments(id,client_id,benefit_id,assigned_at,status) VALUES(@id,@cid,@bid,SYSUTCDATETIME(),'AVAILABLE')");count+=rr.rowsAffected[0];}await tx.commit();res.json({assigned:count,assignmentsCreated:count});}catch(e){await tx.rollback();throw e;}}));
app.get('/api/events/:eid/registrations',roles('ADMIN','MARKETING','EMPLOYEE'),asyncRoute(async(req,res)=>{const r=await db.query('SELECT * FROM dbo.event_registrations WHERE event_id=@id ORDER BY created_at DESC',{id:req.params.eid});res.json(r.recordset)}));
app.post('/api/events/:eid/register',asyncRoute(async(req,res)=>{const d=req.body||{},tx=new sql.Transaction(await db.getPool());await tx.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);try{let q=new sql.Request(tx);q.input('id',sql.Char(36),req.params.eid);const e=await q.query("SELECT capacity,status FROM dbo.events WITH (UPDLOCK,HOLDLOCK) WHERE id=@id");if(!e.recordset.length||e.recordset[0].status!=='PUBLISHED')throw Error('Evento no disponible');q=new sql.Request(tx);q.input('id',sql.Char(36),req.params.eid);const n=await q.query("SELECT COUNT_BIG(*) n FROM dbo.event_registrations WHERE event_id=@id AND status='REGISTERED'");if(e.recordset[0].capacity&&Number(n.recordset[0].n)>=e.recordset[0].capacity)throw Error('Aforo completo');const rid=id();q=new sql.Request(tx);q.input('rid',sql.Char(36),rid).input('eid',sql.Char(36),req.params.eid).input('cid',sql.Char(36),req.user.client_id||null).input('name',sql.NVarChar(180),d.attendeeName||req.user.name).input('email',sql.NVarChar(190),d.attendeeEmail||req.user.email);await q.query("INSERT dbo.event_registrations(id,event_id,client_id,attendee_name,attendee_email,status,created_at) VALUES(@rid,@eid,@cid,@name,@email,'REGISTERED',SYSUTCDATETIME())");await tx.commit();res.status(201).json({id:rid});}catch(e){await tx.rollback();res.status(409).json({error:e.message});}}));
app.use('/api',(req,res)=>res.status(404).json({error:'Ruta de API no encontrada'}));
app.use(express.static(path.join(__dirname,'../../frontend')));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'../../frontend/index.html')));
app.use((err,req,res,next)=>{console.error('[API]',err.code||'',err.message);if(err.number===2601||err.number===2627||(String(err.code||'').startsWith('SQLITE_CONSTRAINT')||/UNIQUE constraint failed|constraint failed/i.test(err.message||'')))return res.status(409).json({error:'Ya existe un registro con esos datos'});res.status(500).json({error:'Error interno del servidor'});});
const server=app.listen(PORT,process.env.HOST||'127.0.0.1',()=>console.log(`CRM Atlantic City: http://localhost:${PORT}`));
async function shutdown(){console.log('Cerrando CRM...');server.close(async()=>{await db.close();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
module.exports=app;
