-- AlterTable
ALTER TABLE "FieldDefinition" ADD COLUMN     "controlledSeparator" TEXT NOT NULL DEFAULT '|',
ADD COLUMN     "isControlled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isFile" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "uiOrder" INTEGER NOT NULL DEFAULT 0;
