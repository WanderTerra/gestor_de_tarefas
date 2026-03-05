-- Script para corrigir tarefas marcadas incorretamente como atrasadas
-- Tarefas com deadline no futuro devem ter is_overdue = 0

-- Corrigir tarefas únicas (não recorrentes) com deadline no futuro
UPDATE tasks
SET is_overdue = 0
WHERE is_recurring = 0
  AND deadline IS NOT NULL
  AND DATE(deadline) > CURDATE()
  AND is_overdue = 1
  AND status IN ('pending', 'in-progress', 'waiting', 'not-executed');

-- Corrigir tarefas únicas com deadline hoje mas horário limite ainda não passou
-- (considerando que o horário limite é no formato HH:MM)
UPDATE tasks
SET is_overdue = 0
WHERE is_recurring = 0
  AND deadline IS NOT NULL
  AND DATE(deadline) = CURDATE()
  AND time_limit IS NOT NULL
  AND TIME_FORMAT(NOW(), '%H:%i') < time_limit
  AND is_overdue = 1
  AND status IN ('pending', 'in-progress', 'waiting', 'not-executed');

-- Mostrar quantas tarefas foram corrigidas
SELECT 
  COUNT(*) as tarefas_corrigidas,
  'Tarefas com deadline futuro corrigidas' as descricao
FROM tasks
WHERE is_recurring = 0
  AND deadline IS NOT NULL
  AND DATE(deadline) > CURDATE()
  AND is_overdue = 0
  AND status IN ('pending', 'in-progress', 'waiting', 'not-executed');
