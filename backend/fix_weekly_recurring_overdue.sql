-- Script para limpar flag isOverdue de tarefas recorrentes semanais marcadas incorretamente
-- Executa a mesma lógica da função clearIncorrectWeeklyRecurringOverdue diretamente no banco

-- Limpar flag de tarefas recorrentes semanais que:
-- 1. Não estão no dia correto da semana HOJE
-- 2. OU estão no dia correto mas o horário ainda não passou

UPDATE tasks t
SET t.is_overdue = 0
WHERE t.is_recurring = 1
  AND t.recurring_day_of_month IS NULL  -- Apenas tarefas semanais
  AND t.is_overdue = 1
  AND t.status IN ('pending', 'in-progress', 'waiting', 'not-executed')
  AND (
    -- Caso 1: Hoje não é um dos dias da semana configurados
    (
      t.recurring_days IS NOT NULL
      AND NOT FIND_IN_SET(
        CASE DAYOFWEEK(NOW())
          WHEN 1 THEN 'dom'
          WHEN 2 THEN 'seg'
          WHEN 3 THEN 'ter'
          WHEN 4 THEN 'qua'
          WHEN 5 THEN 'qui'
          WHEN 6 THEN 'sex'
          WHEN 7 THEN 'sab'
        END,
        t.recurring_days
      )
    )
    OR
    -- Caso 2: Hoje é um dia de recorrência mas o horário ainda não passou
    (
      t.time_limit IS NOT NULL
      AND TIME_FORMAT(NOW(), '%H:%i') < t.time_limit
    )
  );

-- Mostrar quantas tarefas foram corrigidas
SELECT 
  COUNT(*) as tarefas_corrigidas,
  'Tarefas recorrentes semanais com flag isOverdue limpa' as descricao
FROM tasks
WHERE is_recurring = 1
  AND recurring_day_of_month IS NULL
  AND is_overdue = 0
  AND status IN ('pending', 'in-progress', 'waiting', 'not-executed');
