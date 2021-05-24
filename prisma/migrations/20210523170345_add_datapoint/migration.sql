-- CreateTable
CREATE TABLE "Device" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "hostname" TEXT NOT NULL,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Datapoint" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME DEFAULT CURRENT_TIMESTAMP,
    "deviceHostName" TEXT NOT NULL,
    "humidity" REAL NOT NULL,
    "light" REAL NOT NULL,
    "temperature" REAL NOT NULL,
    FOREIGN KEY ("deviceHostName") REFERENCES "Device" ("hostname") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Device.hostname_unique" ON "Device"("hostname");
