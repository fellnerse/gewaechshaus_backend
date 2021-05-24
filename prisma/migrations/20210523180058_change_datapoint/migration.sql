/*
  Warnings:

  - You are about to drop the column `date` on the `Datapoint` table. All the data in the column will be lost.
  - You are about to drop the column `deviceHostName` on the `Datapoint` table. All the data in the column will be lost.
  - Added the required column `deviceHostname` to the `Datapoint` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Datapoint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deviceHostname" TEXT NOT NULL,
    "humidity" REAL NOT NULL,
    "light" REAL NOT NULL,
    "temperature" REAL NOT NULL,
    FOREIGN KEY ("deviceHostname") REFERENCES "Device" ("hostname") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Datapoint" ("humidity", "id", "light", "temperature") SELECT "humidity", "id", "light", "temperature" FROM "Datapoint";
DROP TABLE "Datapoint";
ALTER TABLE "new_Datapoint" RENAME TO "Datapoint";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
