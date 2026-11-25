require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const db = require('../src/db');
const id = n => `10000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const staff = [
  {id:'20000000-0000-4000-8000-000000000010',name:'ADMIN DEMO',email:'admin@demo.atlantic.local',role:'ADMIN',password:'DemoAdmin#2026'},
  {id:'20000000-0000-4000-8000-000000000011',name:'Gabriel Mendoza',email:'manager@demo.atlantic.local',role:'EMPLOYEE',password:'DemoManager#2026'},
  {id:'20000000-0000-4000-8000-000000000012',name:'Camila Rojas',email:'marketing@demo.atlantic.local',role:'MARKETING',password:'DemoMarketing#2026'}
];
const clients = [
  {id:id(1),uid:'20000000-0000-4000-8000-000000000001',dni:'DEMO-1001',first:'Lucía',last:'Ramírez',email:'lucia.ramirez@demo.atlantic.local',phone:'+51 900 100 101',password:'DemoCliente#101',tier:'SILVER',score:100},
  {id:id(2),uid:'20000000-0000-4000-8000-000000000002',dni:'DEMO-1002',first:'Mateo',last:'Fernández',email:'mateo.fernandez@demo.atlantic.local',phone:'+51 900 100 102',password:'DemoCliente#102',tier:'GOLD',score:600},
  {id:id(3),uid:'20000000-0000-4000-8000-000000000003',dni:'DEMO-1003',first:'Valentina',last:'Torres',email:'valentina.torres@demo.atlantic.local',phone:'+51 900 100 103',password:'DemoCliente#103',tier:'PLATINUM',score:1500}
];
async function run(){
  if(process.env.SEED_DEMO_DATA!=='true'||process.env.NODE_ENV==='production') throw new Error('Carga demo bloqueada. En desarrollo defina SEED_DEMO_DATA=true.');
  await db.getDatabase();
  for(const u of staff){
    await db.query(`INSERT OR IGNORE INTO users(id,name,email,password_hash,role,client_id,is_active,created_at,updated_at) VALUES(@id,@name,@email,@hash,@role,NULL,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:u.id,name:u.name,email:u.email,role:u.role,hash:await bcrypt.hash(u.password,12)});
  }
  for(const c of clients){
    await db.query(`INSERT OR IGNORE INTO clients(id,dni,first_name,last_name,email,phone,consent_marketing,vip_tier,vip_score,created_at,updated_at) VALUES(@id,@dni,@first,@last,@email,@phone,1,@tier,@score,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:c.id,dni:c.dni,first:c.first,last:c.last,email:c.email,phone:c.phone,tier:c.tier,score:c.score});
    await db.query(`INSERT OR IGNORE INTO users(id,name,email,password_hash,role,client_id,is_active,created_at,updated_at) VALUES(@uid,@name,@email,@hash,'CLIENT',@cid,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{uid:c.uid,name:`${c.first} ${c.last}`,email:c.email,hash:await bcrypt.hash(c.password,12),cid:c.id});
  }
  const campaigns=[
    ['30000000-0000-4000-8000-000000000001','Noches de Lujo Atlantic','Experiencias premium y atención preferente para clientes Platinum.','ACTIVE','PLATINUM','EMAIL'],
    ['30000000-0000-4000-8000-000000000002','Sabores del Pacífico','Promoción gastronómica para clientes Gold.','ACTIVE','GOLD','IN_APP'],
    ['30000000-0000-4000-8000-000000000003','Bienvenida Atlantic','Beneficios de bienvenida para nuevos clientes Silver.','SCHEDULED','SILVER','SMS']
  ];
  for(const c of campaigns) await db.query(`INSERT OR IGNORE INTO campaigns(id,name,description,status,target_tier,channel,starts_at,ends_at,created_at,updated_at) VALUES(@id,@name,@description,@status,@tier,@channel,CURRENT_TIMESTAMP,datetime('now','+60 day'),CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:c[0],name:c[1],description:c[2],status:c[3],tier:c[4],channel:c[5]});
  const benefits=[
    ['31000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Cena degustación VIP','Menú degustación para dos personas.','DEMO-PLATINUM-DINNER','PLATINUM',30],
    ['31000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000002','20% en restaurantes','Descuento en establecimientos participantes.','DEMO-GOLD-FOOD20','GOLD',100],
    ['31000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000003','Bebida de bienvenida','Bebida sin alcohol de cortesía.','DEMO-SILVER-WELCOME','SILVER',150]
  ];
  for(const b of benefits) await db.query(`INSERT OR IGNORE INTO benefits(id,campaign_id,name,description,code,tier,valid_from,valid_until,max_redemptions,redeemed_count,status,created_at,updated_at) VALUES(@id,@campaign,@name,@description,@code,@tier,CURRENT_TIMESTAMP,datetime('now','+90 day'),@max,0,'AVAILABLE',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:b[0],campaign:b[1],name:b[2],description:b[3],code:b[4],tier:b[5],max:b[6]});
  const restaurants=[
    ['32000000-0000-4000-8000-000000000001','DEMO-REST-01','Brisa Marina','Cocina marina contemporánea con vista al océano.','Atlantic City · Malecón',80],
    ['32000000-0000-4000-8000-000000000002','DEMO-REST-02','Sakura Lounge','Experiencia japonesa, sushi y barra omakase.','Atlantic City · Zona Premium',55],
    ['32000000-0000-4000-8000-000000000003','DEMO-REST-03','Terraza 21','Cocina internacional y coctelería de autor sin alcohol.','Atlantic City · Terraza',100]
  ];
  for(const r of restaurants) await db.query(`INSERT OR IGNORE INTO restaurants(id,code,name,description,location,capacity,active,created_at,updated_at) VALUES(@id,@code,@name,@description,@location,@capacity,1,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:r[0],code:r[1],name:r[2],description:r[3],location:r[4],capacity:r[5]});
  const events=[
    ['34000000-0000-4000-8000-000000000001','DEMO-EVT-01','Atlantic Gourmet Night','Noche gastronómica con estaciones de degustación.','Brisa Marina',7,80],
    ['34000000-0000-4000-8000-000000000002','DEMO-EVT-02','Sunset Jazz Experience','Música en vivo y experiencia al atardecer.','Terraza 21',14,100],
    ['34000000-0000-4000-8000-000000000003','DEMO-EVT-03','Sakura Omakase Session','Sesión especial de cocina japonesa.','Sakura Lounge',21,55]
  ];
  for(const e of events) await db.query(`INSERT OR IGNORE INTO events(id,code,name,description,venue,starts_at,ends_at,capacity,status,created_at,updated_at) VALUES(@id,@code,@name,@description,@venue,datetime('now',@days),datetime('now',@endDays),@capacity,'PUBLISHED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:e[0],code:e[1],name:e[2],description:e[3],venue:e[4],days:`+${e[5]} day`,endDays:`+${e[5]+3} day`,capacity:e[6]});
  for(let i=0;i<3;i++){
    await db.query(`INSERT OR IGNORE INTO event_registrations(id,event_id,client_id,external_id,attendee_name,attendee_email,status,created_at) VALUES(@id,@event,@client,@external,@name,@email,'REGISTERED',CURRENT_TIMESTAMP)`,{id:`35000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,event:events[i][0],client:clients[i].id,external:`DEMO-REG-${i+1}`,name:`${clients[i].first} ${clients[i].last}`,email:clients[i].email});
    await db.query(`INSERT OR IGNORE INTO reservations(id,restaurant_id,client_id,external_id,guest_name,guest_email,guest_phone,party_size,starts_at,ends_at,status,notes,source,created_at,updated_at) VALUES(@id,@restaurant,@client,@external,@guest,@email,@phone,@party,datetime('now',@days,'+19 hour'),datetime('now',@days,'+21 hour'),'CONFIRMED','Reserva ficticia de demostración','DEMO',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:`33000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,restaurant:restaurants[i][0],client:clients[i].id,external:`DEMO-RES-${i+1}`,guest:`${clients[i].first} ${clients[i].last}`,email:clients[i].email,phone:clients[i].phone,party:2+i,days:`+${i+2} day`});
    await db.query(`INSERT OR IGNORE INTO tickets(id,ticket_no,client_id,created_by_id,subject,description,category,channel,priority,status,department,created_at,updated_at) VALUES(@id,@no,@client,@createdBy,@subject,@description,'DEMO','WEB',@priority,@status,'Atención al cliente',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,{id:`38000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,no:`DEMO-TKT-00${i+1}`,client:clients[i].id,createdBy:staff[0].id,subject:['Consulta sobre beneficio VIP','Cambio de reserva','Información de evento'][i],description:'Solicitud ficticia de demostración para probar la atención al cliente.',priority:['MEDIUM','HIGH','LOW'][i],status:['IN_PROGRESS','PENDING','RESOLVED'][i]});
  }
  for(let i=0;i<3;i++){
    await db.query(`INSERT OR IGNORE INTO benefit_assignments(id,client_id,benefit_id,assigned_at,status) VALUES(@id,@client,@benefit,CURRENT_TIMESTAMP,'AVAILABLE')`,{id:`37000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,client:clients[i].id,benefit:benefits[i][0]});
    await db.query(`INSERT OR IGNORE INTO sales(id,external_id,client_id,source,currency,amount,status,sold_at,metadata,created_at) VALUES(@id,@external,@client,'DEMO POS','PEN',@amount,'PAID',datetime('now','-7 day'),'{"demo":true}',CURRENT_TIMESTAMP)`,{id:`36000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,external:`DEMO-SALE-${i+1}`,client:clients[i].id,amount:[850,420,190][i]});
    await db.query(`INSERT OR IGNORE INTO loyalty_point_transactions(id,client_id,points,movement_type,source,reference_id,description,created_at) VALUES(@id,@client,@points,'ADJUST','DEMO',@ref,'Saldo inicial demo',CURRENT_TIMESTAMP)`,{id:`39000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`,client:clients[i].id,points:clients[i].score,ref:`DEMO-INITIAL-${i+1}`});
  }
  console.log('Datos demo SQLite listos: 3 clientes (Silver, Gold, Platinum), 3 usuarios internos, campañas, beneficios, restaurantes, reservas, eventos, tickets, ventas y puntos.');
  console.log('Admin: admin@demo.atlantic.local / DemoAdmin#2026');
}
run().then(()=>db.close()).catch(async e=>{console.error('No se pudieron cargar datos demo:',e.message);await db.close();process.exitCode=1;});
