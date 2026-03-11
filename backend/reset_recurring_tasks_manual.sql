-- Script para resetar manualmente tarefas recorrentes concluídas
-- Execute este script no banco de dados para forçar o reset

-- Primeiro, vamos ver quais tarefas recorrentes estão concluídas
SELECT 
    t.id,
    t.name,
    t.status,
    t.recurringDays,
    t.recurringDayOfMonth,
    (SELECT MAX(completedDate) FROM task_completions WHERE taskId = t.id) as ultima_conclusao
FROM tasks t
WHERE t.isRecurring = 1 
  AND t.status = 'completed';

-- Resetar tarefas recorrentes semanais que foram concluídas antes de hoje
-- e hoje é um dos dias de recorrência
UPDATE tasks t
SET status = 'pending', reason = NULL
WHERE t.isRecurring = 1
  AND t.status = 'completed'
  AND t.recurringDays IS NOT NULL
  AND (
    -- Verificar se hoje é um dos dias configurados
    (DAYOFWEEK(CURDATE()) = 2 AND t.recurringDays LIKE '%seg%') OR  -- Segunda
    (DAYOFWEEK(CURDATE()) = 3 AND t.recurringDays LIKE '%ter%') OR  -- Terça
    (DAYOFWEEK(CURDATE()) = 4 AND t.recurringDays LIKE '%qua%') OR  -- Quarta
    (DAYOFWEEK(CURDATE()) = 5 AND t.recurringDays LIKE '%qui%') OR  -- Quinta
    (DAYOFWEEK(CURDATE()) = 6 AND t.recurringDays LIKE '%sex%') OR  -- Sexta
    (DAYOFWEEK(CURDATE()) = 7 AND t.recurringDays LIKE '%sab%')     -- Sábado
  )
  AND NOT EXISTS (
    -- Não resetar se foi completada hoje
    SELECT 1 FROM task_completions tc
    WHERE tc.taskId = t.id
      AND DATE(tc.completedDate) = CURDATE()
  );

-- Verificar quantas foram resetadas
SELECT COUNT(*) as tarefas_resetadas
FROM tasks
WHERE isRecurring = 1
  AND status = 'pending'
  AND updatedAt >= CURDATE();
