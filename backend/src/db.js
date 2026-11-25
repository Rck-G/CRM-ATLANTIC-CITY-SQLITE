'use strict';
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dbFile = path.resolve(process.env.SQLITE_FILE || path.join(__dirname, '../../database/atlantic_crm.db'));
let database;
function getDatabase() {
  if (database) return database;
  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  database = new DatabaseSync(dbFile);
  database.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 8000;');
  const schema = fs.readFileSync(path.join(__dirname, '../database/sqlite-schema.sql'), 'utf8');
  database.exec(schema);
  return database;
}
function translate(sqlText) {
  let q = String(sqlText).trim();
  // Compatibility layer for the small T-SQL subset used by the existing CRM API.
  q = q.replace(/\bTOP\s*\(\s*(\d+)\s*\)/ig, '/*TOP:$1*/');
  const top = (q.match(/\/\*TOP:(\d+)\*\//) || [])[1];
  q = q.replace(/\/\*TOP:\d+\*\//, '');
  q = q.replace(/\bWITH\s*\(\s*(?:UPDLOCK|HOLDLOCK|ROWLOCK|NOLOCK)(?:\s*,\s*(?:UPDLOCK|HOLDLOCK|ROWLOCK|NOLOCK))*\s*\)/ig, '');
  q = q.replace(/\bINSERT\s+(?!INTO\b|OR\b)/ig, 'INSERT INTO ');
  q = q.replace(/\bdbo\./ig, '');
  q = q.replace(/\bCOUNT_BIG\s*\(/ig, 'COUNT(');
  q = q.replace(/SYSUTCDATETIME\s*\(\s*\)/ig, 'CURRENT_TIMESTAMP');
  q = q.replace(/CONVERT\s*\(\s*CHAR\s*\(\s*36\s*\)\s*,\s*NEWID\s*\(\s*\)\s*\)/ig, "lower(hex(randomblob(16)))");
  q = q.replace(/\bISNULL\s*\(/ig, 'IFNULL(');
  if (top) {
    const clean = q.replace(/;\s*$/, '');
    q = `${clean} LIMIT ${top}`;
  }
  return q;
}
function splitStatements(sqlText) {
  const out=[]; let cur='', quote=null;
  for (let i=0;i<sqlText.length;i++) {
    const c=sqlText[i];
    if (quote) { cur+=c; if(c===quote){ if(sqlText[i+1]===quote){cur+=sqlText[++i];} else quote=null; } }
    else if(c==="'" || c==='"' || c==='`'){quote=c;cur+=c;}
    else if(c===';'){if(cur.trim())out.push(cur.trim());cur='';}
    else cur+=c;
  }
  if(cur.trim())out.push(cur.trim()); return out;
}
function normalizeParams(params={}) { const out={}; for (const [k,v] of Object.entries(params||{})) out[k]=v instanceof Date ? v.toISOString() : typeof v==='boolean' ? (v?1:0) : v; return out; }
function execute(sqlText, params={}) {
  params=normalizeParams(params);
  const db=getDatabase();
  // Translate the two conditional patterns used by the SQL Server implementation.
  let raw=String(sqlText).trim();
  const conditionalRule = raw.match(/^IF\s+EXISTS\s*\(SELECT\s+1\s+FROM\s+dbo\.loyalty_point_rules\s+WHERE\s+rule_key=@key\)\s*UPDATE\s+dbo\.loyalty_point_rules\s+SET\s+name=@name,source=@source,points_per_unit=@ppu,unit_amount=@unit,active=@active,updated_at=SYSUTCDATETIME\(\)\s+WHERE\s+rule_key=@key\s+ELSE\s+INSERT\s+dbo\.loyalty_point_rules\(id,rule_key,name,source,points_per_unit,unit_amount,active,updated_at\)\s+VALUES\(CONVERT\(CHAR\(36\),NEWID\(\)\),@key,@name,@source,@ppu,@unit,@active,SYSUTCDATETIME\(\)\)$/i);
  if (conditionalRule) raw = `INSERT INTO loyalty_point_rules(id,rule_key,name,source,points_per_unit,unit_amount,active,updated_at) VALUES(lower(hex(randomblob(16))),@key,@name,@source,@ppu,@unit,@active,CURRENT_TIMESTAMP) ON CONFLICT(rule_key) DO UPDATE SET name=excluded.name,source=excluded.source,points_per_unit=excluded.points_per_unit,unit_amount=excluded.unit_amount,active=excluded.active,updated_at=CURRENT_TIMESTAMP`;
  if (/^IF\s+NOT\s+EXISTS\s*\(/i.test(raw)) {
    const m=raw.match(/^IF\s+NOT\s+EXISTS\s*\((SELECT.+?)\)\s*(INSERT\s+dbo\.[\s\S]+?);\s*SELECT\s+@@ROWCOUNT\s+n$/i);
    if(m){
      const existsSql=m[1].replace(/dbo\./ig,'');
      const insert=m[2].replace(/^INSERT\s+dbo\./i,'INSERT INTO ');
      const result=execute(insert.replace(/VALUES\s*\(([^;]+)\)$/i, 'SELECT $1 WHERE NOT EXISTS ('+existsSql+')'),params);
      return {recordset:[{n:result.rowsAffected[0]}],rowsAffected:result.rowsAffected};
    }
  }
  const statements=splitStatements(raw); let recordset=[]; let rowsAffected=0;
  for (const statement of statements) {
    const q=translate(statement);
    const trimmed=q.trim();
    const used={}; for(const key of Object.keys(params)) if(new RegExp('[@:$]'+key+'\\b').test(trimmed)) used[key]=params[key];
    if (/^(SELECT|PRAGMA|WITH)\b/i.test(trimmed)) {
      const stmt=db.prepare(trimmed); recordset=stmt.all(used).map(r=>({...r}));
    } else {
      const stmt=db.prepare(trimmed); const r=stmt.run(used); rowsAffected=Number(r.changes||0);
      recordset=[];
    }
  }
  return {recordset,rowsAffected:[rowsAffected],rowsAffectedTotal:rowsAffected};
}
class Request {
  constructor(owner){this.owner=owner;this.params={};}
  input(name,_type,value){if(arguments.length===2){value=_type;}this.params[name]=value instanceof Date?value.toISOString():typeof value==='boolean'?(value?1:0):value;return this;}
  async query(text){return execute(text,this.params);}
}
class Pool { request(){return new Request(this);} }
class Transaction {
  constructor(_pool){this.db=getDatabase();this.active=false;}
  async begin(){this.db.exec('BEGIN IMMEDIATE');this.active=true;}
  async commit(){if(this.active){this.db.exec('COMMIT');this.active=false;}}
  async rollback(){if(this.active){this.db.exec('ROLLBACK');this.active=false;}}
}
const sql = {
  Transaction, Request, ISOLATION_LEVEL:{SERIALIZABLE:1},
  Char:()=>null,NVarChar:()=>null,VarChar:()=>null,Bit:()=>null,Decimal:()=>null,DateTime2:()=>null,Int:()=>null
};
async function getPool(){getDatabase();return new Pool();}
async function query(text,inputs={}){return execute(text,inputs);}
async function health(){try{execute('SELECT 1 AS connected');return {ok:true,database:'connected',engine:'SQLite',file:dbFile};}catch(e){return {ok:false,database:'disconnected',code:e.code||'SQLITE_ERROR',message:e.message};}}
async function close(){if(database){database.close();database=null;}}
module.exports={sql,getPool,query,health,close,getDatabase,dbFile};
