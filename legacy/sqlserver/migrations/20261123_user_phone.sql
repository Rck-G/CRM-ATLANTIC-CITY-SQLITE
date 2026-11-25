/* Añade el teléfono a las cuentas de usuario para perfiles de personal y administración. */
IF OBJECT_ID('dbo.users','U') IS NOT NULL AND COL_LENGTH('dbo.users','phone') IS NULL
    ALTER TABLE dbo.users ADD phone NVARCHAR(60) NULL;
GO
