-- Corrigir tarefa 75: deadline é amanhã, não deveria estar atrasada
UPDATE tasks
SET is_overdue = 0
WHERE id = 75
  AND deadline IS NOT NULL
  AND DATE(deadline) > CURDATE();

-- Verificar se foi corrigido
SELECT 
  id, 
  name, 
  deadline, 
  DATE(deadline) as deadline_date,
  CURDATE() as hoje,
  is_overdue,
  CASE 
    WHEN DATE(deadline) > CURDATE() THEN 'Deadline no futuro - NÃO deveria estar atrasada'
    WHEN DATE(deadline) = CURDATE() THEN 'Deadline é hoje - verificar horário'
    ELSE 'Deadline passou - deveria estar atrasada'
  END as status_esperado
FROM tasks
WHERE id = 75;
