-- SQLite schema for CRM Atlantic City. Generated from the SQL Server schema; dbo schema prefix removed.
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (

 id TEXT NOT NULL PRIMARY KEY, name TEXT NOT NULL, phone TEXT NULL,
 email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL CONSTRAINT DF_users_role DEFAULT 'CLIENT'
   CONSTRAINT CK_users_role CHECK (role IN ('ADMIN','EMPLOYEE','MARKETING','CLIENT')),
 client_id TEXT NULL, is_active INTEGER NOT NULL CONSTRAINT DF_users_active DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
 CONSTRAINT FK_users_clients FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS clients (

 id TEXT NOT NULL PRIMARY KEY, dni TEXT NOT NULL UNIQUE,
 first_name TEXT NOT NULL,last_name TEXT NOT NULL,email TEXT NULL,
 phone TEXT NULL,birth_date DATE NULL,preferences TEXT NULL,
 consent_marketing INTEGER NOT NULL CONSTRAINT DF_clients_consent DEFAULT 0,
 vip_tier TEXT NOT NULL CONSTRAINT DF_clients_tier DEFAULT 'SILVER',
 vip_score REAL NOT NULL CONSTRAINT DF_clients_score DEFAULT 0,
 vip_evaluated_at TEXT NULL,vip_tier_override TEXT NULL,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS client_activity (

 id TEXT NOT NULL PRIMARY KEY,client_id TEXT NOT NULL,source TEXT NOT NULL,kind TEXT NOT NULL,
 amount REAL NULL,occurred_at TEXT NOT NULL,idempotency_key TEXT NULL UNIQUE,
 CONSTRAINT FK_activity_client FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS campaigns (

 id TEXT NOT NULL PRIMARY KEY,name TEXT NOT NULL,description TEXT NULL,
 status TEXT NOT NULL DEFAULT 'DRAFT',target_tier TEXT NULL,starts_at TEXT NULL,ends_at TEXT NULL,
 channel TEXT DEFAULT 'IN_APP',created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS benefits (

 id TEXT NOT NULL PRIMARY KEY,campaign_id TEXT NULL,name TEXT NOT NULL,description TEXT NULL,
 code TEXT NOT NULL UNIQUE,tier TEXT NULL,valid_from TEXT NULL,valid_until TEXT NULL,
 max_redemptions INT DEFAULT 1,redeemed_count INT DEFAULT 0,status TEXT DEFAULT 'AVAILABLE',created_at TEXT NOT NULL,updated_at TEXT NOT NULL CONSTRAINT DF_benefits_updated DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT FK_benefits_campaign FOREIGN KEY(campaign_id) REFERENCES campaigns(id)
);
CREATE TABLE IF NOT EXISTS benefit_assignments (

 id TEXT NOT NULL PRIMARY KEY,client_id TEXT NOT NULL,benefit_id TEXT NOT NULL,assigned_at TEXT NOT NULL,
 redeemed_at TEXT NULL,status TEXT DEFAULT 'AVAILABLE',redeemed_by TEXT NULL,
 CONSTRAINT uq_client_benefit UNIQUE(client_id,benefit_id),
 CONSTRAINT FK_assignment_client FOREIGN KEY(client_id) REFERENCES clients(id) ON DELETE CASCADE,
 CONSTRAINT FK_assignment_benefit FOREIGN KEY(benefit_id) REFERENCES benefits(id)
);
CREATE TABLE IF NOT EXISTS tickets (

 id TEXT NOT NULL PRIMARY KEY,ticket_no TEXT NOT NULL UNIQUE,client_id TEXT NULL,created_by_id TEXT NOT NULL,
 subject TEXT NOT NULL,description TEXT NOT NULL,category TEXT DEFAULT 'GENERAL',channel TEXT DEFAULT 'WEB',
 priority TEXT DEFAULT 'MEDIUM',status TEXT DEFAULT 'NEW',department TEXT NULL,resolution TEXT NULL,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 CONSTRAINT FK_tickets_client FOREIGN KEY(client_id) REFERENCES clients(id),CONSTRAINT FK_tickets_user FOREIGN KEY(created_by_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS ticket_history (

 id TEXT NOT NULL PRIMARY KEY,ticket_id TEXT NOT NULL,actor_id TEXT NULL,action TEXT NOT NULL,
 from_state TEXT NULL,to_state TEXT NULL,note TEXT NULL,created_at TEXT NOT NULL,
 CONSTRAINT FK_history_ticket FOREIGN KEY(ticket_id) REFERENCES tickets(id) ON DELETE CASCADE,
 CONSTRAINT FK_history_user FOREIGN KEY(actor_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS audit_events (

 id TEXT NOT NULL PRIMARY KEY,actor_id TEXT NULL,action TEXT NOT NULL,resource TEXT NOT NULL,
 resource_id TEXT NULL,outcome TEXT DEFAULT 'SUCCESS',correlation_id TEXT NULL,created_at TEXT NOT NULL,
 CONSTRAINT FK_audit_user FOREIGN KEY(actor_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS integrations (

 id TEXT NOT NULL PRIMARY KEY,name TEXT NOT NULL,type TEXT NOT NULL,endpoint TEXT NULL,
 enabled INTEGER DEFAULT 0,last_status TEXT DEFAULT 'NOT_CONFIGURED',last_sync_at TEXT NULL,
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS restaurants (

 id TEXT NOT NULL PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,description TEXT NULL,
 location TEXT NULL,capacity INT DEFAULT 0,active INTEGER DEFAULT 1,created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS reservations (

 id TEXT NOT NULL PRIMARY KEY,restaurant_id TEXT NOT NULL,client_id TEXT NULL,external_id TEXT NULL UNIQUE,
 guest_name TEXT NOT NULL,guest_email TEXT NULL,guest_phone TEXT NULL,party_size INT NOT NULL,
 starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,status TEXT DEFAULT 'PENDING',notes TEXT NULL,
 source TEXT DEFAULT 'CRM',created_at TEXT NOT NULL,updated_at TEXT NOT NULL,
 CONSTRAINT FK_res_restaurant FOREIGN KEY(restaurant_id) REFERENCES restaurants(id),
 CONSTRAINT FK_res_client FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS events (

 id TEXT NOT NULL PRIMARY KEY,code TEXT NOT NULL UNIQUE,name TEXT NOT NULL,description TEXT NULL,
 venue TEXT NULL,starts_at TEXT NOT NULL,ends_at TEXT NOT NULL,capacity INT NULL,status TEXT DEFAULT 'DRAFT',
 created_at TEXT NOT NULL,updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_registrations (

 id TEXT NOT NULL PRIMARY KEY,event_id TEXT NOT NULL,client_id TEXT NULL,external_id TEXT NULL UNIQUE,
 attendee_name TEXT NOT NULL,attendee_email TEXT NULL,status TEXT DEFAULT 'REGISTERED',created_at TEXT NOT NULL,
 CONSTRAINT FK_registration_event FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
 CONSTRAINT FK_registration_client FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS sales (

 id TEXT NOT NULL PRIMARY KEY,external_id TEXT NOT NULL UNIQUE,client_id TEXT NULL,source TEXT NOT NULL,
 currency TEXT DEFAULT 'PEN',amount REAL NOT NULL,status TEXT DEFAULT 'PAID',sold_at TEXT NOT NULL,
 metadata TEXT NULL,created_at TEXT NOT NULL,CONSTRAINT FK_sales_client FOREIGN KEY(client_id) REFERENCES clients(id)
);
CREATE TABLE IF NOT EXISTS integration_events (

 id TEXT NOT NULL PRIMARY KEY,source TEXT NOT NULL,external_id TEXT NOT NULL,event_type TEXT NOT NULL,
 payload TEXT NOT NULL,status TEXT DEFAULT 'RECEIVED',attempts INT DEFAULT 0,last_error TEXT NULL,
 received_at TEXT NOT NULL,processed_at TEXT NULL,CONSTRAINT uq_integration_event UNIQUE(source,external_id)
);
CREATE TABLE IF NOT EXISTS app_settings (

 setting_key TEXT NOT NULL PRIMARY KEY,setting_value TEXT NULL,updated_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS UX_users_client_id_not_null ON users(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(last_name,first_name);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_activity_client ON client_activity(client_id,occurred_at);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status,priority,created_at);
CREATE INDEX IF NOT EXISTS idx_reservations_date ON reservations(restaurant_id,starts_at,ends_at,status);



CREATE TABLE IF NOT EXISTS loyalty_tier_rules (
 tier TEXT PRIMARY KEY, min_points REAL NOT NULL CHECK(min_points>=0), updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CHECK(tier IN ('SILVER','GOLD','PLATINUM'))
);
CREATE TABLE IF NOT EXISTS loyalty_point_rules (
 id TEXT PRIMARY KEY, rule_key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, source TEXT NOT NULL,
 points_per_unit REAL NOT NULL CHECK(points_per_unit>=0), unit_amount REAL NOT NULL CHECK(unit_amount>0),
 active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS loyalty_point_transactions (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL, points REAL NOT NULL, movement_type TEXT NOT NULL,
 source TEXT NOT NULL, reference_id TEXT NOT NULL, description TEXT, created_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(created_by) REFERENCES users(id),
 CHECK(movement_type IN ('EARN','ADJUST','REDEEM')), UNIQUE(source,reference_id)
);
CREATE TABLE IF NOT EXISTS loyalty_tier_history (
 id TEXT PRIMARY KEY, client_id TEXT NOT NULL, previous_tier TEXT, new_tier TEXT NOT NULL,
 change_type TEXT NOT NULL, reason TEXT, changed_by TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(client_id) REFERENCES clients(id), FOREIGN KEY(changed_by) REFERENCES users(id)
);
INSERT OR IGNORE INTO loyalty_tier_rules(tier,min_points) VALUES ('SILVER',0),('GOLD',500),('PLATINUM',1500);
INSERT OR IGNORE INTO loyalty_point_rules(id,rule_key,name,source,points_per_unit,unit_amount,active)
 VALUES('39000000-0000-4000-8000-000000000001','POS_PURCHASE','Compras generales','POS',1,1,1);
