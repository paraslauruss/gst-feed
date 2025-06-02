-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_FeedSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "feedStatus" TEXT DEFAULT 'inactive',
    "lastSynced" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_FeedSettings" ("createdAt", "feedStatus", "id", "lastSynced", "shop", "updatedAt") SELECT "createdAt", "feedStatus", "id", "lastSynced", "shop", "updatedAt" FROM "FeedSettings";
DROP TABLE "FeedSettings";
ALTER TABLE "new_FeedSettings" RENAME TO "FeedSettings";
CREATE UNIQUE INDEX "FeedSettings_shop_key" ON "FeedSettings"("shop");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
