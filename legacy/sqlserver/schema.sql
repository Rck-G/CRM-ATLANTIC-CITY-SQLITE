/* CRM Atlantic City - SQL Server 2019+ / Azure SQL */
IF DB_ID(N'crm_atlantic_city') IS NULL CREATE DATABASE crm_atlantic_city;
GO
USE crm_atlantic_city;
GO

IF OBJECT_ID('dbo.users','U') IS NULL CREATE TABLE dbo.users (
 id CHAR(36) NOT NULL PRIMARY KEY, name NVARCHAR(160) NOT NULL, phone NVARCHAR(60) NULL,
 email NVARCHAR(190) NOT NULL UNIQUE, password_hash NVARCHAR(255) NOT NULL,
 role NVARCHAR(20) NOT NULL CONSTRAINT DF_users_role DEFAULT 'CLIENT'
   CONSTRAINT CK_users_role CHECK (role IN ('ADMIN','EMPLOYEE','MARKETING','CLIENT')),
 client_id CHAR(36) NULL, is_active BIT NOT NULL CONSTRAINT DF_users_active DEFAULT 1, created_at DATETIME2 NOT NULL, updated_at DATETIME2 NOT NULL,
 INDEX idx_users_role NONCLUSTERED (role)
);
IF COL_LENGTH('dbo.users','phone') IS NULL ALTER TABLE dbo.users ADD phone NVARCHAR(60) NULL;
IF NOT EXISTS(SELECT 1 FROM sys.indexes WHERE object_id=OBJECT_ID('dbo.users') AND name='UX_users_client_id_not_null')
 CREATE UNIQUE INDEX UX_users_client_id_not_null ON dbo.users(client_id) WHERE client_id IS NOT NULL;
IF OBJECT_ID('dbo.clients','U') IS NULL CREATE TABLE dbo.clients (
 id CHAR(36) NOT NULL PRIMARY KEY, dni NVARCHAR(60) NOT NULL UNIQUE,
 first_name NVARCHAR(120) NOT NULL,last_name NVARCHAR(120) NOT NULL,email NVARCHAR(190) NULL,
 phone NVARCHAR(60) NULL,birth_date DATE NULL,preferences NVARCHAR(MAX) NULL,
 consent_marketing BIT NOT NULL CONSTRAINT DF_clients_consent DEFAULT 0,
 vip_tier NVARCHAR(30) NOT NULL CONSTRAINT DF_clients_tier DEFAULT 'SILVER',
 vip_score DECIMAL(12,2) NOT NULL CONSTRAINT DF_clients_score DEFAULT 0,
 vip_evaluated_at DATETIME2 NULL,created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL,
 INDEX idx_clients_name NONCLUSTERED(last_name,first_name), INDEX idx_clients_email NONCLUSTERED(email)
);
IF OBJECT_ID('dbo.users','U') IS NOT NULL AND COL_LENGTH('dbo.users','client_id') IS NOT NULL
 AND NOT EXISTS(SELECT 1 FROM sys.foreign_keys WHERE name='FK_users_clients')
 ALTER TABLE dbo.users ADD CONSTRAINT FK_users_clients FOREIGN KEY(client_id) REFERENCES dbo.clients(id);
IF OBJECT_ID('dbo.client_activity','U') IS NULL CREATE TABLE dbo.client_activity (
 id CHAR(36) NOT NULL PRIMARY KEY,client_id CHAR(36) NOT NULL,source NVARCHAR(60) NOT NULL,kind NVARCHAR(60) NOT NULL,
 amount DECIMAL(14,2) NULL,occurred_at DATETIME2 NOT NULL,idempotency_key NVARCHAR(190) NULL UNIQUE,
 CONSTRAINT FK_activity_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id) ON DELETE CASCADE,
 INDEX idx_activity_client NONCLUSTERED(client_id,occurred_at)
);
IF OBJECT_ID('dbo.campaigns','U') IS NULL CREATE TABLE dbo.campaigns (
 id CHAR(36) NOT NULL PRIMARY KEY,name NVARCHAR(180) NOT NULL,description NVARCHAR(MAX) NULL,
 status NVARCHAR(30) NOT NULL DEFAULT 'DRAFT',target_tier NVARCHAR(30) NULL,starts_at DATETIME2 NULL,ends_at DATETIME2 NULL,
 channel NVARCHAR(40) DEFAULT 'IN_APP',created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL
);
IF OBJECT_ID('dbo.benefits','U') IS NULL CREATE TABLE dbo.benefits (
 id CHAR(36) NOT NULL PRIMARY KEY,campaign_id CHAR(36) NULL,name NVARCHAR(180) NOT NULL,description NVARCHAR(MAX) NULL,
 code NVARCHAR(80) NOT NULL UNIQUE,tier NVARCHAR(30) NULL,valid_from DATETIME2 NULL,valid_until DATETIME2 NULL,
 max_redemptions INT DEFAULT 1,redeemed_count INT DEFAULT 0,status NVARCHAR(30) DEFAULT 'AVAILABLE',created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL CONSTRAINT DF_benefits_updated DEFAULT SYSUTCDATETIME(),
 CONSTRAINT FK_benefits_campaign FOREIGN KEY(campaign_id) REFERENCES dbo.campaigns(id)
);
IF OBJECT_ID('dbo.benefit_assignments','U') IS NULL CREATE TABLE dbo.benefit_assignments (
 id CHAR(36) NOT NULL PRIMARY KEY,client_id CHAR(36) NOT NULL,benefit_id CHAR(36) NOT NULL,assigned_at DATETIME2 NOT NULL,
 redeemed_at DATETIME2 NULL,status NVARCHAR(30) DEFAULT 'AVAILABLE',redeemed_by CHAR(36) NULL,
 CONSTRAINT uq_client_benefit UNIQUE(client_id,benefit_id),
 CONSTRAINT FK_assignment_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id) ON DELETE CASCADE,
 CONSTRAINT FK_assignment_benefit FOREIGN KEY(benefit_id) REFERENCES dbo.benefits(id)
);
IF OBJECT_ID('dbo.tickets','U') IS NULL CREATE TABLE dbo.tickets (
 id CHAR(36) NOT NULL PRIMARY KEY,ticket_no NVARCHAR(40) NOT NULL UNIQUE,client_id CHAR(36) NULL,created_by_id CHAR(36) NOT NULL,
 subject NVARCHAR(220) NOT NULL,description NVARCHAR(MAX) NOT NULL,category NVARCHAR(80) DEFAULT 'GENERAL',channel NVARCHAR(40) DEFAULT 'WEB',
 priority NVARCHAR(20) DEFAULT 'MEDIUM',status NVARCHAR(30) DEFAULT 'NEW',department NVARCHAR(100) NULL,resolution NVARCHAR(MAX) NULL,
 created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL,
 CONSTRAINT FK_tickets_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id),CONSTRAINT FK_tickets_user FOREIGN KEY(created_by_id) REFERENCES dbo.users(id),
 INDEX idx_tickets_status NONCLUSTERED(status,priority,created_at)
);
IF OBJECT_ID('dbo.ticket_history','U') IS NULL CREATE TABLE dbo.ticket_history (
 id CHAR(36) NOT NULL PRIMARY KEY,ticket_id CHAR(36) NOT NULL,actor_id CHAR(36) NULL,action NVARCHAR(100) NOT NULL,
 from_state NVARCHAR(30) NULL,to_state NVARCHAR(30) NULL,note NVARCHAR(MAX) NULL,created_at DATETIME2 NOT NULL,
 CONSTRAINT FK_history_ticket FOREIGN KEY(ticket_id) REFERENCES dbo.tickets(id) ON DELETE CASCADE,
 CONSTRAINT FK_history_user FOREIGN KEY(actor_id) REFERENCES dbo.users(id)
);
IF OBJECT_ID('dbo.audit_events','U') IS NULL CREATE TABLE dbo.audit_events (
 id CHAR(36) NOT NULL PRIMARY KEY,actor_id CHAR(36) NULL,action NVARCHAR(120) NOT NULL,resource NVARCHAR(80) NOT NULL,
 resource_id NVARCHAR(100) NULL,outcome NVARCHAR(30) DEFAULT 'SUCCESS',correlation_id NVARCHAR(100) NULL,created_at DATETIME2 NOT NULL,
 CONSTRAINT FK_audit_user FOREIGN KEY(actor_id) REFERENCES dbo.users(id)
);
IF OBJECT_ID('dbo.integrations','U') IS NULL CREATE TABLE dbo.integrations (
 id CHAR(36) NOT NULL PRIMARY KEY,name NVARCHAR(180) NOT NULL,type NVARCHAR(80) NOT NULL,endpoint NVARCHAR(500) NULL,
 enabled BIT DEFAULT 0,last_status NVARCHAR(50) DEFAULT 'NOT_CONFIGURED',last_sync_at DATETIME2 NULL,
 created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL
);
IF OBJECT_ID('dbo.restaurants','U') IS NULL CREATE TABLE dbo.restaurants (
 id CHAR(36) NOT NULL PRIMARY KEY,code NVARCHAR(50) NOT NULL UNIQUE,name NVARCHAR(180) NOT NULL,description NVARCHAR(MAX) NULL,
 location NVARCHAR(255) NULL,capacity INT DEFAULT 0,active BIT DEFAULT 1,created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL
);
IF OBJECT_ID('dbo.reservations','U') IS NULL CREATE TABLE dbo.reservations (
 id CHAR(36) NOT NULL PRIMARY KEY,restaurant_id CHAR(36) NOT NULL,client_id CHAR(36) NULL,external_id NVARCHAR(150) NULL UNIQUE,
 guest_name NVARCHAR(180) NOT NULL,guest_email NVARCHAR(190) NULL,guest_phone NVARCHAR(60) NULL,party_size INT NOT NULL,
 starts_at DATETIME2 NOT NULL,ends_at DATETIME2 NOT NULL,status NVARCHAR(30) DEFAULT 'PENDING',notes NVARCHAR(MAX) NULL,
 source NVARCHAR(50) DEFAULT 'CRM',created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL,
 CONSTRAINT FK_res_restaurant FOREIGN KEY(restaurant_id) REFERENCES dbo.restaurants(id),
 CONSTRAINT FK_res_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id),
 INDEX idx_reservations_date NONCLUSTERED(restaurant_id,starts_at,ends_at,status)
);
IF OBJECT_ID('dbo.events','U') IS NULL CREATE TABLE dbo.events (
 id CHAR(36) NOT NULL PRIMARY KEY,code NVARCHAR(60) NOT NULL UNIQUE,name NVARCHAR(180) NOT NULL,description NVARCHAR(MAX) NULL,
 venue NVARCHAR(180) NULL,starts_at DATETIME2 NOT NULL,ends_at DATETIME2 NOT NULL,capacity INT NULL,status NVARCHAR(30) DEFAULT 'DRAFT',
 created_at DATETIME2 NOT NULL,updated_at DATETIME2 NOT NULL
);
IF OBJECT_ID('dbo.event_registrations','U') IS NULL CREATE TABLE dbo.event_registrations (
 id CHAR(36) NOT NULL PRIMARY KEY,event_id CHAR(36) NOT NULL,client_id CHAR(36) NULL,external_id NVARCHAR(150) NULL UNIQUE,
 attendee_name NVARCHAR(180) NOT NULL,attendee_email NVARCHAR(190) NULL,status NVARCHAR(30) DEFAULT 'REGISTERED',created_at DATETIME2 NOT NULL,
 CONSTRAINT FK_registration_event FOREIGN KEY(event_id) REFERENCES dbo.events(id) ON DELETE CASCADE,
 CONSTRAINT FK_registration_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id)
);
IF OBJECT_ID('dbo.sales','U') IS NULL CREATE TABLE dbo.sales (
 id CHAR(36) NOT NULL PRIMARY KEY,external_id NVARCHAR(150) NOT NULL UNIQUE,client_id CHAR(36) NULL,source NVARCHAR(80) NOT NULL,
 currency CHAR(3) DEFAULT 'PEN',amount DECIMAL(14,2) NOT NULL,status NVARCHAR(30) DEFAULT 'PAID',sold_at DATETIME2 NOT NULL,
 metadata NVARCHAR(MAX) NULL,created_at DATETIME2 NOT NULL,CONSTRAINT FK_sales_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id)
);
IF OBJECT_ID('dbo.integration_events','U') IS NULL CREATE TABLE dbo.integration_events (
 id CHAR(36) NOT NULL PRIMARY KEY,source NVARCHAR(80) NOT NULL,external_id NVARCHAR(150) NOT NULL,event_type NVARCHAR(100) NOT NULL,
 payload NVARCHAR(MAX) NOT NULL,status NVARCHAR(30) DEFAULT 'RECEIVED',attempts INT DEFAULT 0,last_error NVARCHAR(MAX) NULL,
 received_at DATETIME2 NOT NULL,processed_at DATETIME2 NULL,CONSTRAINT uq_integration_event UNIQUE(source,external_id)
);
IF OBJECT_ID('dbo.app_settings','U') IS NULL CREATE TABLE dbo.app_settings (
 setting_key NVARCHAR(100) NOT NULL PRIMARY KEY,setting_value NVARCHAR(MAX) NULL,updated_at DATETIME2 NOT NULL
);
GO

IF COL_LENGTH('dbo.users','is_active') IS NULL
 ALTER TABLE dbo.users ADD is_active BIT NOT NULL CONSTRAINT DF_users_active_mig DEFAULT 1;
IF COL_LENGTH('dbo.benefits','updated_at') IS NULL
 ALTER TABLE dbo.benefits ADD updated_at DATETIME2 NOT NULL CONSTRAINT DF_benefits_updated_mig DEFAULT SYSUTCDATETIME();
GO
