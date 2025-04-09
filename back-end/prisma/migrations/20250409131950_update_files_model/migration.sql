/*
  Warnings:

  - You are about to drop the column `modifiedTime` on the `Files` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Files` table. All the data in the column will be lost.
  - You are about to drop the column `webViewLink` on the `Files` table. All the data in the column will be lost.
  - Added the required column `title` to the `Files` table without a default value. This is not possible if the table is not empty.
  - Added the required column `url` to the `Files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Files" DROP COLUMN "modifiedTime",
DROP COLUMN "name",
DROP COLUMN "webViewLink",
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "url" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Users" ADD COLUMN     "googleDriveConnectionId" TEXT;
