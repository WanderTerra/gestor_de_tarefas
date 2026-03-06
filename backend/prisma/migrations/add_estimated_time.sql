-- Adicionar coluna estimated_time na tabela tasks
-- Esta migração adiciona suporte para tempo estimado de execução em minutos

ALTER TABLE `tasks` 
ADD COLUMN `estimated_time` INT NULL 
COMMENT 'Tempo estimado de execução em minutos. NULL se não informado.';
