CREATE TABLE "UserConnections" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "connectionId" TEXT NOT NULL,
    "providerConfigKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserConnections_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UserConnections_connectionId_idx" ON "UserConnections"("connectionId");

CREATE UNIQUE INDEX "UserConnections_userId_providerConfigKey_key" ON "UserConnections"("userId", "providerConfigKey");

ALTER TABLE "UserConnections" ADD CONSTRAINT "UserConnections_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
