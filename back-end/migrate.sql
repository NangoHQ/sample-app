CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "Users" (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       VARCHAR(255) NOT NULL UNIQUE,
    "displayName" VARCHAR(255) NOT NULL,
    password    TEXT,
    "connectionId" TEXT
);

CREATE TABLE IF NOT EXISTS "UserConnections" (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"          UUID NOT NULL,
    "connectionId"    TEXT NOT NULL,
    "providerConfigKey" TEXT NOT NULL,
    broken            BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    UNIQUE ("userId", "providerConfigKey")
);

CREATE INDEX IF NOT EXISTS "UserConnections_connectionId_idx" ON "UserConnections"("connectionId");

CREATE TABLE IF NOT EXISTS "Contacts" (
    id            VARCHAR(64) PRIMARY KEY,
    "integrationId" TEXT NOT NULL,
    "connectionId"  TEXT NOT NULL,
    "fullName"      TEXT NOT NULL,
    avatar          TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3),
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "deletedAt"     TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Contacts_integrationId_idx" ON "Contacts"("integrationId");

CREATE TABLE IF NOT EXISTS "Files" (
    id              VARCHAR(64) PRIMARY KEY,
    title           TEXT NOT NULL,
    "mimeType"      TEXT NOT NULL,
    url             TEXT,
    size            INTEGER,
    "driveId"       TEXT,
    "createdTime"   TIMESTAMP(3) NOT NULL,
    "integrationId" TEXT NOT NULL,
    "connectionId"  TEXT NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "deletedAt"     TIMESTAMP(3)
);

CREATE INDEX IF NOT EXISTS "Files_integrationId_idx" ON "Files"("integrationId");
CREATE INDEX IF NOT EXISTS "Files_connectionId_idx" ON "Files"("connectionId");

CREATE TABLE IF NOT EXISTS "Records" (
    id              TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "connectionId"  TEXT NOT NULL,
    model           TEXT NOT NULL,
    data            JSONB NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    "deletedAt"     TIMESTAMP(3),
    UNIQUE ("integrationId", "connectionId", model, id)
);

CREATE INDEX IF NOT EXISTS "Records_integrationId_model_idx" ON "Records"("integrationId", model);
CREATE INDEX IF NOT EXISTS "Records_connectionId_idx" ON "Records"("connectionId");

-- Bookmark table: stores the modifiedAfter cursor per (connectionId, model)
-- so we only re-fetch delta records on each sync webhook.
CREATE TABLE IF NOT EXISTS "SyncBookmarks" (
    "connectionId"   TEXT NOT NULL,
    model            TEXT NOT NULL,
    "modifiedAfter"  TEXT NOT NULL,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT NOW(),
    PRIMARY KEY ("connectionId", model)
);

CREATE TABLE IF NOT EXISTS "WebhookEvents" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type            TEXT NOT NULL,
    provider        TEXT NOT NULL,
    "connectionId"  TEXT,
    operation       TEXT,
    model           TEXT,
    payload         JSONB NOT NULL,
    "receivedAt"    TIMESTAMP(3) NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "WebhookEvents_type_idx" ON "WebhookEvents"(type);
CREATE INDEX IF NOT EXISTS "WebhookEvents_provider_idx" ON "WebhookEvents"(provider);
CREATE INDEX IF NOT EXISTS "WebhookEvents_receivedAt_idx" ON "WebhookEvents"("receivedAt");
