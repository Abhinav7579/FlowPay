-- CreateTable
CREATE TABLE "Platform" (
    "id" TEXT NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "monthRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGMV" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);
