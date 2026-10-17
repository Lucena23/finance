-- Freemium v1.2: controle de plano por Conta Familiar.
-- O estado efetivo (TRIAL | PREMIUM | GRACE | FREE) é CALCULADO a partir
-- destas datas pelo PlanService — não há coluna de status para evitar
-- inconsistências.
-- AlterTable
ALTER TABLE `family_accounts` ADD COLUMN `trialEndsAt` DATETIME(3) NULL,
    ADD COLUMN `premiumEndsAt` DATETIME(3) NULL,
    ADD COLUMN `billingCycle` ENUM('MONTHLY', 'SEMIANNUAL', 'ANNUAL') NULL;

-- Contas já existentes recebem o período de teste a partir de agora
-- (nenhum cliente perde acesso de forma abrupta).
UPDATE `family_accounts` SET `trialEndsAt` = DATE_ADD(NOW(3), INTERVAL 15 DAY) WHERE `trialEndsAt` IS NULL;
