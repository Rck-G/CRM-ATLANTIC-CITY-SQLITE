/*
  CRM ATLANTIC CITY - MEJORA DEL ESQUEMA
  Motor: Microsoft SQL Server 2019+ / Azure SQL
  Uso:
    1) Ejecutar primero el schema.sql original.
    2) Ejecutar este archivo de migración.
  Este script conserva las columnas antiguas para no romper de inmediato
  la aplicación existente. Las nuevas columnas/tablas normalizadas quedan
  listas para que el backend migre progresivamente a ellas.
*/
USE crm_atlantic_city;
GO

/* =========================================================
   1. CATÁLOGO ÚNICO DE NIVELES VIP
   ========================================================= */
IF OBJECT_ID('dbo.vip_tiers','U') IS NULL
BEGIN
  CREATE TABLE dbo.vip_tiers (
    id CHAR(36) NOT NULL CONSTRAINT PK_vip_tiers PRIMARY KEY,
    code NVARCHAR(30) NOT NULL CONSTRAINT UQ_vip_tiers_code UNIQUE,
    name NVARCHAR(80) NOT NULL,
    description NVARCHAR(300) NULL,
    min_score DECIMAL(12,2) NOT NULL CONSTRAINT DF_vip_tiers_min_score DEFAULT 0,
    sort_order INT NOT NULL CONSTRAINT DF_vip_tiers_sort DEFAULT 0,
    is_active BIT NOT NULL CONSTRAINT DF_vip_tiers_active DEFAULT 1,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_vip_tiers_created DEFAULT SYSUTCDATETIME(),
    updated_at DATETIME2 NOT NULL CONSTRAINT DF_vip_tiers_updated DEFAULT SYSUTCDATETIME(),
    CONSTRAINT CK_vip_tiers_min_score CHECK (min_score >= 0)
  );
END;
GO

/* Códigos iniciales; ajustar umbrales/reglas comerciales antes de producción. */
IF NOT EXISTS (SELECT 1 FROM dbo.vip_tiers WHERE code='SILVER')
 INSERT dbo.vip_tiers(id,code,name,min_score,sort_order) VALUES
 (CONVERT(CHAR(36),NEWID()),'SILVER','Silver',0,1);
IF NOT EXISTS (SELECT 1 FROM dbo.vip_tiers WHERE code='GOLD')
 INSERT dbo.vip_tiers(id,code,name,min_score,sort_order) VALUES
 (CONVERT(CHAR(36),NEWID()),'GOLD','Gold',1000,2);
IF NOT EXISTS (SELECT 1 FROM dbo.vip_tiers WHERE code='PLATINUM')
 INSERT dbo.vip_tiers(id,code,name,min_score,sort_order) VALUES
 (CONVERT(CHAR(36),NEWID()),'PLATINUM','Platinum',5000,3);
GO

IF COL_LENGTH('dbo.clients','vip_tier_id') IS NULL
 ALTER TABLE dbo.clients ADD vip_tier_id CHAR(36) NULL;
IF COL_LENGTH('dbo.campaigns','target_tier_id') IS NULL
 ALTER TABLE dbo.campaigns ADD target_tier_id CHAR(36) NULL;
IF COL_LENGTH('dbo.benefits','vip_tier_id') IS NULL
 ALTER TABLE dbo.benefits ADD vip_tier_id CHAR(36) NULL;
GO

UPDATE c SET vip_tier_id=t.id
FROM dbo.clients c JOIN dbo.vip_tiers t ON t.code=UPPER(LTRIM(RTRIM(c.vip_tier)))
WHERE c.vip_tier_id IS NULL;
UPDATE ca SET target_tier_id=t.id
FROM dbo.campaigns ca JOIN dbo.vip_tiers t ON t.code=UPPER(LTRIM(RTRIM(ca.target_tier)))
WHERE ca.target_tier_id IS NULL;
UPDATE b SET vip_tier_id=t.id
FROM dbo.benefits b JOIN dbo.vip_tiers t ON t.code=UPPER(LTRIM(RTRIM(b.tier)))
WHERE b.vip_tier_id IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_clients_vip_tier')
 ALTER TABLE dbo.clients ADD CONSTRAINT FK_clients_vip_tier FOREIGN KEY(vip_tier_id) REFERENCES dbo.vip_tiers(id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_campaigns_vip_tier')
 ALTER TABLE dbo.campaigns ADD CONSTRAINT FK_campaigns_vip_tier FOREIGN KEY(target_tier_id) REFERENCES dbo.vip_tiers(id);
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_benefits_vip_tier')
 ALTER TABLE dbo.benefits ADD CONSTRAINT FK_benefits_vip_tier FOREIGN KEY(vip_tier_id) REFERENCES dbo.vip_tiers(id);
GO

/* =========================================================
   2. ROLES Y PERMISOS ADMINISTRABLES
   Mantiene users.role temporalmente por compatibilidad.
   La aplicación nueva debe usar user_roles / roles / permissions.
   ========================================================= */
IF OBJECT_ID('dbo.roles','U') IS NULL
 CREATE TABLE dbo.roles (
   id CHAR(36) NOT NULL CONSTRAINT PK_roles PRIMARY KEY,
   code NVARCHAR(30) NOT NULL CONSTRAINT UQ_roles_code UNIQUE,
   name NVARCHAR(80) NOT NULL,
   description NVARCHAR(250) NULL,
   is_active BIT NOT NULL CONSTRAINT DF_roles_active DEFAULT 1,
   created_at DATETIME2 NOT NULL CONSTRAINT DF_roles_created DEFAULT SYSUTCDATETIME()
 );
IF OBJECT_ID('dbo.permissions','U') IS NULL
 CREATE TABLE dbo.permissions (
   id CHAR(36) NOT NULL CONSTRAINT PK_permissions PRIMARY KEY,
   code NVARCHAR(80) NOT NULL CONSTRAINT UQ_permissions_code UNIQUE,
   name NVARCHAR(120) NOT NULL,
   description NVARCHAR(250) NULL
 );
IF OBJECT_ID('dbo.role_permissions','U') IS NULL
 CREATE TABLE dbo.role_permissions (
   role_id CHAR(36) NOT NULL,
   permission_id CHAR(36) NOT NULL,
   CONSTRAINT PK_role_permissions PRIMARY KEY(role_id,permission_id),
   CONSTRAINT FK_role_permissions_role FOREIGN KEY(role_id) REFERENCES dbo.roles(id) ON DELETE CASCADE,
   CONSTRAINT FK_role_permissions_permission FOREIGN KEY(permission_id) REFERENCES dbo.permissions(id) ON DELETE CASCADE
 );
IF OBJECT_ID('dbo.user_roles','U') IS NULL
 CREATE TABLE dbo.user_roles (
   user_id CHAR(36) NOT NULL,
   role_id CHAR(36) NOT NULL,
   assigned_at DATETIME2 NOT NULL CONSTRAINT DF_user_roles_assigned DEFAULT SYSUTCDATETIME(),
   assigned_by CHAR(36) NULL,
   CONSTRAINT PK_user_roles PRIMARY KEY(user_id,role_id),
   CONSTRAINT FK_user_roles_user FOREIGN KEY(user_id) REFERENCES dbo.users(id) ON DELETE CASCADE,
   CONSTRAINT FK_user_roles_role FOREIGN KEY(role_id) REFERENCES dbo.roles(id),
   CONSTRAINT FK_user_roles_assigned_by FOREIGN KEY(assigned_by) REFERENCES dbo.users(id)
 );
GO

DECLARE @roleSeed TABLE(code NVARCHAR(30), name NVARCHAR(80), description NVARCHAR(250));
INSERT INTO @roleSeed VALUES
 ('ADMIN','Administrador','Administración completa del CRM'),
 ('EMPLOYEE','Empleado','Operación diaria y atención'),
 ('MARKETING','Marketing','Campañas y beneficios'),
 ('CLIENT','Cliente','Acceso de cliente');
INSERT dbo.roles(id,code,name,description)
SELECT CONVERT(CHAR(36),NEWID()),s.code,s.name,s.description
FROM @roleSeed s WHERE NOT EXISTS(SELECT 1 FROM dbo.roles r WHERE r.code=s.code);

DECLARE @permSeed TABLE(code NVARCHAR(80),name NVARCHAR(120),description NVARCHAR(250));
INSERT INTO @permSeed VALUES
 ('users.read','Ver usuarios','Consultar usuarios'),
 ('users.manage','Administrar usuarios','Crear, modificar y desactivar usuarios'),
 ('clients.read','Ver clientes','Consultar clientes'),
 ('clients.manage','Administrar clientes','Crear y modificar clientes'),
 ('sales.read','Ver ventas','Consultar ventas'),
 ('sales.manage','Administrar ventas','Registrar y modificar ventas'),
 ('reservations.manage','Administrar reservas','Gestionar reservas'),
 ('events.manage','Administrar eventos','Gestionar eventos y registros'),
 ('campaigns.manage','Administrar campañas','Gestionar campañas y beneficios'),
 ('tickets.manage','Administrar tickets','Gestionar solicitudes'),
 ('reports.read','Ver reportes','Consultar reportes'),
 ('settings.manage','Administrar configuración','Gestionar configuración e integraciones');
INSERT dbo.permissions(id,code,name,description)
SELECT CONVERT(CHAR(36),NEWID()),s.code,s.name,s.description
FROM @permSeed s WHERE NOT EXISTS(SELECT 1 FROM dbo.permissions p WHERE p.code=s.code);
GO

/* Permisos base por rol. Se pueden ajustar desde el sistema de administración. */
INSERT dbo.role_permissions(role_id,permission_id)
SELECT r.id,p.id
FROM dbo.roles r
JOIN dbo.permissions p ON
 (r.code='ADMIN')
 OR (r.code='EMPLOYEE' AND p.code IN ('clients.read','clients.manage','sales.read','sales.manage','reservations.manage','events.manage','tickets.manage','reports.read'))
 OR (r.code='MARKETING' AND p.code IN ('clients.read','campaigns.manage','reports.read'))
WHERE NOT EXISTS (
 SELECT 1 FROM dbo.role_permissions rp WHERE rp.role_id=r.id AND rp.permission_id=p.id
);
GO

/* Migra los roles actuales a la tabla puente sin borrar users.role. */
INSERT dbo.user_roles(user_id,role_id)
SELECT u.id,r.id
FROM dbo.users u JOIN dbo.roles r ON r.code=UPPER(LTRIM(RTRIM(u.role)))
WHERE NOT EXISTS(SELECT 1 FROM dbo.user_roles ur WHERE ur.user_id=u.id AND ur.role_id=r.id);
GO

/* =========================================================
   3. VALIDACIÓN DE DOCUMENTOS JSON
   Los campos pueden seguir siendo documentos completos.
   ========================================================= */
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_clients_preferences_json')
 ALTER TABLE dbo.clients ADD CONSTRAINT CK_clients_preferences_json
 CHECK (preferences IS NULL OR ISJSON(preferences)=1);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_sales_metadata_json')
 ALTER TABLE dbo.sales ADD CONSTRAINT CK_sales_metadata_json
 CHECK (metadata IS NULL OR ISJSON(metadata)=1);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_integration_events_payload_json')
 ALTER TABLE dbo.integration_events ADD CONSTRAINT CK_integration_events_payload_json
 CHECK (ISJSON(payload)=1);
GO

/* =========================================================
   4. CLAVE FORÁNEA DEL USUARIO QUE CANJEA UN BENEFICIO
   ========================================================= */
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name='FK_assignment_redeemed_by')
 ALTER TABLE dbo.benefit_assignments ADD CONSTRAINT FK_assignment_redeemed_by
 FOREIGN KEY(redeemed_by) REFERENCES dbo.users(id);
GO

/* =========================================================
   5. PRODUCTOS Y DETALLE DE VENTAS
   ========================================================= */
IF OBJECT_ID('dbo.products','U') IS NULL
 CREATE TABLE dbo.products (
   id CHAR(36) NOT NULL CONSTRAINT PK_products PRIMARY KEY,
   sku NVARCHAR(80) NOT NULL CONSTRAINT UQ_products_sku UNIQUE,
   name NVARCHAR(180) NOT NULL,
   description NVARCHAR(MAX) NULL,
   product_type NVARCHAR(40) NOT NULL CONSTRAINT DF_products_type DEFAULT 'GENERAL',
   unit_price DECIMAL(14,2) NOT NULL,
   currency CHAR(3) NOT NULL CONSTRAINT DF_products_currency DEFAULT 'PEN',
   is_active BIT NOT NULL CONSTRAINT DF_products_active DEFAULT 1,
   created_at DATETIME2 NOT NULL CONSTRAINT DF_products_created DEFAULT SYSUTCDATETIME(),
   updated_at DATETIME2 NOT NULL CONSTRAINT DF_products_updated DEFAULT SYSUTCDATETIME(),
   CONSTRAINT CK_products_price CHECK(unit_price>=0)
 );
IF OBJECT_ID('dbo.sale_items','U') IS NULL
 CREATE TABLE dbo.sale_items (
   id CHAR(36) NOT NULL CONSTRAINT PK_sale_items PRIMARY KEY,
   sale_id CHAR(36) NOT NULL,
   product_id CHAR(36) NULL,
   description NVARCHAR(220) NOT NULL,
   quantity DECIMAL(12,3) NOT NULL,
   unit_price DECIMAL(14,2) NOT NULL,
   discount_amount DECIMAL(14,2) NOT NULL CONSTRAINT DF_sale_items_discount DEFAULT 0,
   line_total AS (CONVERT(DECIMAL(14,2),(quantity*unit_price)-discount_amount)) PERSISTED,
   created_at DATETIME2 NOT NULL CONSTRAINT DF_sale_items_created DEFAULT SYSUTCDATETIME(),
   CONSTRAINT FK_sale_items_sale FOREIGN KEY(sale_id) REFERENCES dbo.sales(id) ON DELETE CASCADE,
   CONSTRAINT FK_sale_items_product FOREIGN KEY(product_id) REFERENCES dbo.products(id),
   CONSTRAINT CK_sale_items_quantity CHECK(quantity>0),
   CONSTRAINT CK_sale_items_unit_price CHECK(unit_price>=0),
   CONSTRAINT CK_sale_items_discount CHECK(discount_amount>=0 AND discount_amount<=quantity*unit_price)
 );
CREATE INDEX IX_sale_items_sale ON dbo.sale_items(sale_id);
GO

/* =========================================================
   6. MÉTODOS DE PAGO Y PAGOS
   Permite pagos parciales o múltiples por venta.
   ========================================================= */
IF OBJECT_ID('dbo.payment_methods','U') IS NULL
 CREATE TABLE dbo.payment_methods (
   id CHAR(36) NOT NULL CONSTRAINT PK_payment_methods PRIMARY KEY,
   code NVARCHAR(40) NOT NULL CONSTRAINT UQ_payment_methods_code UNIQUE,
   name NVARCHAR(100) NOT NULL,
   is_active BIT NOT NULL CONSTRAINT DF_payment_methods_active DEFAULT 1,
   created_at DATETIME2 NOT NULL CONSTRAINT DF_payment_methods_created DEFAULT SYSUTCDATETIME()
 );
IF OBJECT_ID('dbo.payments','U') IS NULL
 CREATE TABLE dbo.payments (
   id CHAR(36) NOT NULL CONSTRAINT PK_payments PRIMARY KEY,
   sale_id CHAR(36) NOT NULL,
   payment_method_id CHAR(36) NOT NULL,
   transaction_reference NVARCHAR(180) NULL,
   amount DECIMAL(14,2) NOT NULL,
   currency CHAR(3) NOT NULL CONSTRAINT DF_payments_currency DEFAULT 'PEN',
   status NVARCHAR(30) NOT NULL CONSTRAINT DF_payments_status DEFAULT 'PENDING',
   paid_at DATETIME2 NULL,
   created_at DATETIME2 NOT NULL CONSTRAINT DF_payments_created DEFAULT SYSUTCDATETIME(),
   CONSTRAINT FK_payments_sale FOREIGN KEY(sale_id) REFERENCES dbo.sales(id),
   CONSTRAINT FK_payments_method FOREIGN KEY(payment_method_id) REFERENCES dbo.payment_methods(id),
   CONSTRAINT CK_payments_amount CHECK(amount>0),
   CONSTRAINT CK_payments_status CHECK(status IN ('PENDING','PAID','FAILED','REFUNDED','CANCELLED'))
 );
CREATE INDEX IX_payments_sale ON dbo.payments(sale_id,status);
GO

INSERT dbo.payment_methods(id,code,name)
SELECT CONVERT(CHAR(36),NEWID()),v.code,v.name
FROM (VALUES
 ('CASH','Efectivo'),
 ('CARD','Tarjeta'),
 ('BANK_TRANSFER','Transferencia bancaria'),
 ('DIGITAL_WALLET','Billetera digital'),
 ('OTHER','Otro')
) v(code,name)
WHERE NOT EXISTS(SELECT 1 FROM dbo.payment_methods pm WHERE pm.code=v.code);
GO

/* =========================================================
   7. REGLAS DE INTEGRIDAD ADICIONALES
   ========================================================= */
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_reservations_party_size')
 ALTER TABLE dbo.reservations ADD CONSTRAINT CK_reservations_party_size CHECK(party_size>0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_reservations_dates')
 ALTER TABLE dbo.reservations ADD CONSTRAINT CK_reservations_dates CHECK(ends_at>starts_at);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_events_dates')
 ALTER TABLE dbo.events ADD CONSTRAINT CK_events_dates CHECK(ends_at>starts_at);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_restaurants_capacity')
 ALTER TABLE dbo.restaurants ADD CONSTRAINT CK_restaurants_capacity CHECK(capacity>=0);
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_benefits_redemptions')
 ALTER TABLE dbo.benefits ADD CONSTRAINT CK_benefits_redemptions CHECK(redeemed_count>=0 AND (max_redemptions IS NULL OR max_redemptions>=0));
IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE name='CK_sales_amount')
 ALTER TABLE dbo.sales ADD CONSTRAINT CK_sales_amount CHECK(amount>=0);
GO

/* =========================================================
   8. VISTAS DE APOYO PARA CONSULTAS
   ========================================================= */
CREATE OR ALTER VIEW dbo.vw_sales_totals AS
SELECT s.id AS sale_id,s.external_id,s.client_id,s.currency,s.amount AS recorded_amount,
       COALESCE(SUM(si.line_total),0) AS items_total,
       COALESCE(SUM(CASE WHEN p.status='PAID' THEN p.amount ELSE 0 END),0) AS paid_total,
       s.status,s.sold_at
FROM dbo.sales s
LEFT JOIN dbo.sale_items si ON si.sale_id=s.id
LEFT JOIN dbo.payments p ON p.sale_id=s.id
GROUP BY s.id,s.external_id,s.client_id,s.currency,s.amount,s.status,s.sold_at;
GO

/* NOTAS DE MIGRACIÓN:
   - reservations.guest_* y event_registrations.attendee_* se conservan como
     snapshot del invitado/participante o para personas sin cuenta CRM.
   - users.role se conserva temporalmente. Tras adaptar el backend a user_roles,
     se puede retirar el CHECK/columna legacy en una migración posterior.
   - clients.vip_tier, campaigns.target_tier y benefits.tier se conservan
     temporalmente; la aplicación nueva debe escribir en las columnas *_id.
   - No se inventan productos, ventas, artículos ni pagos históricos.
     Los registros de sale_items y payments se insertan desde el POS real.
*/
