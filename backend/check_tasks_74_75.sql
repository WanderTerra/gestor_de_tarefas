-- Query para verificar tarefas com ID 74 e 75
-- Esta query mostra todos os campos relevantes para entender o status de atraso

SELECT 
  id,
  name,
  description,
  status,
  is_recurring,
  deadline,
  time_limit,
  is_overdue,
  recurring_days,
  recurring_day_of_month,
  created_at,
  updated_at,
  -- Campos calculados para análise
  CASE 
    WHEN status = 'completed' THEN 'CONCLUÍDA (nunca mostra atrasado)'
    WHEN is_overdue = 1 THEN 'Marcada como atrasada no BD'
    WHEN deadline IS NOT NULL THEN 
      CASE 
        WHEN DATE(deadline) > CURDATE() THEN 'Deadline no futuro'
        WHEN DATE(deadline) = CURDATE() THEN 'Deadline é HOJE'
        WHEN DATE(deadline) < CURDATE() THEN 'Deadline no passado (deveria estar atrasada)'
      END
    WHEN is_recurring = 1 THEN 'Tarefa recorrente (sem deadline)'
    ELSE 'Sem deadline e não recorrente'
  END as analise_status,
  -- Verificação de horário
  CASE 
    WHEN time_limit IS NOT NULL AND DATE(deadline) = CURDATE() THEN
      CASE 
        WHEN time_limit <= TIME_FORMAT(NOW(), '%H:%i') THEN 'Horário limite JÁ PASSOU hoje'
        ELSE 'Horário limite ainda NÃO passou hoje'
      END
    WHEN time_limit IS NOT NULL AND is_recurring = 1 THEN
      CASE 
        WHEN time_limit <= TIME_FORMAT(NOW(), '%H:%i') THEN 'Horário limite JÁ PASSOU hoje (recorrente)'
        ELSE 'Horário limite ainda NÃO passou hoje (recorrente)'
      END
    ELSE 'Sem time_limit ou não aplicável'
  END as analise_horario,
  -- Recomendação
  CASE 
    WHEN status = 'completed' THEN 'OK: Tarefa concluída não mostra atrasado'
    WHEN is_overdue = 1 THEN 'OK: Backend marcou como atrasada'
    WHEN deadline IS NOT NULL AND DATE(deadline) < CURDATE() THEN 'PROBLEMA: Deadline passou mas is_overdue = 0'
    WHEN deadline IS NOT NULL AND DATE(deadline) = CURDATE() AND time_limit IS NOT NULL AND time_limit <= TIME_FORMAT(NOW(), '%H:%i') THEN 'PROBLEMA: Horário passou hoje mas is_overdue = 0'
    WHEN deadline IS NOT NULL AND DATE(deadline) > CURDATE() THEN 'OK: Deadline no futuro, não está atrasada'
    WHEN is_recurring = 1 AND time_limit IS NOT NULL AND time_limit <= TIME_FORMAT(NOW(), '%H:%i') THEN 'PROBLEMA: Horário passou (recorrente) mas is_overdue = 0'
    ELSE 'Verificar manualmente'
  END as recomendacao
FROM tasks
WHERE id IN (74, 75)
ORDER BY id;

-- Query adicional: Verificar data/hora atual do servidor
SELECT 
  NOW() as data_hora_atual_servidor,
  CURDATE() as data_atual,
  TIME_FORMAT(NOW(), '%H:%i') as horario_atual,
  DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s') as formato_completo;
