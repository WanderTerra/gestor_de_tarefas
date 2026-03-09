-- Migration: Criar tabela task_completions para histórico de conclusões de tarefas
-- Esta tabela é especialmente útil para tarefas recorrentes, permitindo rastrear
-- quando cada tarefa foi completada e verificar se já foi completada hoje

CREATE TABLE IF NOT EXISTS `task_completions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `task_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL COMMENT 'Usuário que completou a tarefa (NULL = sistema)',
  `completed_at` datetime(3) NOT NULL DEFAULT current_timestamp(3) COMMENT 'Data e hora exata da conclusão',
  `completed_date` date NOT NULL COMMENT 'Data da conclusão (sem hora, para verificar se foi hoje)',
  PRIMARY KEY (`id`),
  UNIQUE KEY `task_completions_task_id_completed_date_key` (`task_id`, `completed_date`),
  KEY `task_completions_task_id_idx` (`task_id`),
  KEY `task_completions_completed_date_idx` (`completed_date`),
  KEY `task_completions_completed_at_idx` (`completed_at`),
  CONSTRAINT `task_completions_task_id_fkey` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `task_completions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
