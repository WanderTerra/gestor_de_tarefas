-- Adicionar coluna tutorial_link na tabela tasks
-- Esta migração adiciona suporte para link do tutorial da tarefa

ALTER TABLE `tasks` 
ADD COLUMN `tutorial_link` VARCHAR(500) NULL 
COMMENT 'Link do tutorial ou documentação relacionada à tarefa. NULL se não informado.';
