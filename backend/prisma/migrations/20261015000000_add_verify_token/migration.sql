-- Corrige drift de schema: a coluna `verifyToken` existia no schema.prisma
-- (verificação de e-mail) mas nunca havia sido versionada em migração.
-- AlterTable
ALTER TABLE `users` ADD COLUMN `verifyToken` VARCHAR(255) NULL;
