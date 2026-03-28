/*
  Warnings:

  - You are about to drop the column `isMultiple` on the `FieldDefinition` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `FieldDefinition` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "FieldDefinition" DROP COLUMN "isMultiple",
DROP COLUMN "type",
ADD COLUMN     "aiAuto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "aiPrompt" TEXT,
ADD COLUMN     "columnIndex" INTEGER,
ADD COLUMN     "controlledAdds" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlledDrop" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlledMulti" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "controlledVocabUrl" TEXT,
ADD COLUMN     "isBulk" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isLong" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "staticText" TEXT;
