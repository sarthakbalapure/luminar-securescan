-- CreateTable
CREATE TABLE "ApiSpecification" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "specUrl" TEXT,
    "baseUrl" TEXT NOT NULL,
    "rawContent" TEXT NOT NULL,
    "parsedJson" JSONB NOT NULL,
    "endpointsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiSpecification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ApiSpecification_assetId_key" ON "ApiSpecification"("assetId");

-- CreateIndex
CREATE INDEX "ApiSpecification_baseUrl_idx" ON "ApiSpecification"("baseUrl");

-- CreateIndex
CREATE INDEX "ApiSpecification_sourceType_idx" ON "ApiSpecification"("sourceType");

-- AddForeignKey
ALTER TABLE "ApiSpecification" ADD CONSTRAINT "ApiSpecification_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
