-- CreateTable
CREATE TABLE "FeedSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "feedStatus" TEXT NOT NULL DEFAULT 'inactive',
    "lastSynced" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FeedSettings_shop_key" ON "FeedSettings"("shop");
