/* Atlantic CRM - fidelización configurable. Ejecutar después de schema.sql */
USE crm_atlantic_city;
GO
IF COL_LENGTH('dbo.clients','vip_tier_override') IS NULL
  ALTER TABLE dbo.clients ADD vip_tier_override NVARCHAR(20) NULL;
IF OBJECT_ID('dbo.loyalty_tier_rules','U') IS NULL
CREATE TABLE dbo.loyalty_tier_rules (
  tier NVARCHAR(20) NOT NULL PRIMARY KEY,
  min_points DECIMAL(12,2) NOT NULL,
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_loyalty_tier_updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_loyalty_tier_name CHECK (tier IN ('SILVER','GOLD','PLATINUM')),
  CONSTRAINT CK_loyalty_tier_points CHECK (min_points >= 0)
);
IF OBJECT_ID('dbo.loyalty_point_rules','U') IS NULL
CREATE TABLE dbo.loyalty_point_rules (
  id CHAR(36) NOT NULL PRIMARY KEY,
  rule_key NVARCHAR(60) NOT NULL UNIQUE,
  name NVARCHAR(120) NOT NULL,
  source NVARCHAR(40) NOT NULL,
  points_per_unit DECIMAL(12,2) NOT NULL,
  unit_amount DECIMAL(14,2) NOT NULL,
  active BIT NOT NULL CONSTRAINT DF_loyalty_rule_active DEFAULT 1,
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_loyalty_rule_updated DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_loyalty_rule_values CHECK(points_per_unit >= 0 AND unit_amount > 0)
);
IF OBJECT_ID('dbo.loyalty_point_transactions','U') IS NULL
CREATE TABLE dbo.loyalty_point_transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  client_id CHAR(36) NOT NULL,
  points DECIMAL(12,2) NOT NULL,
  movement_type NVARCHAR(20) NOT NULL,
  source NVARCHAR(40) NOT NULL,
  reference_id NVARCHAR(190) NOT NULL,
  description NVARCHAR(250) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_loyalty_tx_created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_loyalty_tx_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id),
  CONSTRAINT FK_loyalty_tx_user FOREIGN KEY(created_by) REFERENCES dbo.users(id),
  CONSTRAINT CK_loyalty_tx_type CHECK(movement_type IN ('EARN','ADJUST','REDEEM')),
  CONSTRAINT UQ_loyalty_tx_reference UNIQUE(source,reference_id)
);
IF OBJECT_ID('dbo.loyalty_tier_history','U') IS NULL
CREATE TABLE dbo.loyalty_tier_history (
  id CHAR(36) NOT NULL PRIMARY KEY,
  client_id CHAR(36) NOT NULL,
  previous_tier NVARCHAR(20) NULL,
  new_tier NVARCHAR(20) NOT NULL,
  change_type NVARCHAR(20) NOT NULL,
  reason NVARCHAR(250) NULL,
  changed_by CHAR(36) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_loyalty_history_created DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_loyalty_history_client FOREIGN KEY(client_id) REFERENCES dbo.clients(id),
  CONSTRAINT FK_loyalty_history_user FOREIGN KEY(changed_by) REFERENCES dbo.users(id)
);
IF NOT EXISTS(SELECT 1 FROM dbo.loyalty_tier_rules WHERE tier='SILVER') INSERT dbo.loyalty_tier_rules(tier,min_points) VALUES('SILVER',0);
IF NOT EXISTS(SELECT 1 FROM dbo.loyalty_tier_rules WHERE tier='GOLD') INSERT dbo.loyalty_tier_rules(tier,min_points) VALUES('GOLD',500);
IF NOT EXISTS(SELECT 1 FROM dbo.loyalty_tier_rules WHERE tier='PLATINUM') INSERT dbo.loyalty_tier_rules(tier,min_points) VALUES('PLATINUM',1500);
IF NOT EXISTS(SELECT 1 FROM dbo.loyalty_point_rules WHERE rule_key='POS_PURCHASE')
 INSERT dbo.loyalty_point_rules(id,rule_key,name,source,points_per_unit,unit_amount,active)
 VALUES('39000000-0000-4000-8000-000000000001','POS_PURCHASE','Compras generales','POS',1,1,1);
GO
