# Estrutura do Banco de Dados - Gestor de Tarefas

## 📊 Tabelas Principais

### 1. `tasks` (Tabela de Tarefas)
Armazena todas as tarefas do sistema.

**Campos importantes:**
- `id`: Identificador único
- `name`: Nome da tarefa
- `status`: Status atual (`pending`, `completed`, `not-executed`)
- `updatedAt`: Data/hora da última atualização (usado para agrupar tarefas concluídas por dia)
- `isRecurring`: Se é tarefa recorrente
- `recurringDays`: Dias da semana (ex: "seg,ter,qua")
- `recurringDayOfMonth`: Dia do mês para tarefas mensais

**⚠️ IMPORTANTE:** 
- Quando uma tarefa é concluída, o `status` muda para `completed` e o `updatedAt` é atualizado
- Para tarefas recorrentes, quando é resetada para `pending`, o `status` muda mas o histórico é preservado na tabela `task_completions`

### 2. `task_completions` (Histórico de Conclusões) ⭐
**Esta é a tabela que preserva TODOS os registros de conclusão!**

**Campos:**
- `id`: Identificador único
- `taskId`: ID da tarefa (relação com `tasks`)
- `userId`: ID do usuário que completou (pode ser null se foi sistema)
- `completedAt`: Data e hora EXATA da conclusão (ex: 2026-03-09 14:30:00)
- `completedDate`: Data da conclusão normalizada para meia-noite (ex: 2026-03-09 00:00:00)

**Características:**
- ✅ **NUNCA é deletada** quando uma tarefa recorrente é resetada
- ✅ Mantém histórico completo de todas as conclusões
- ✅ Permite saber exatamente quando cada tarefa foi concluída
- ✅ Usada para verificar se uma tarefa foi completada hoje (evita reset prematuro)

**Exemplo de uso:**
```sql
-- Ver todas as conclusões de uma tarefa
SELECT * FROM task_completions WHERE taskId = 123 ORDER BY completedAt DESC;

-- Ver conclusões por dia
SELECT DATE(completedDate) as dia, COUNT(*) as total
FROM task_completions
GROUP BY DATE(completedDate)
ORDER BY dia DESC;
```

### 3. `users` (Usuários)
Armazena informações dos usuários do sistema.

### 4. `audit_logs` (Logs de Auditoria)
Registra todas as ações do sistema (criação, atualização, exclusão, etc.)

### 5. `overdue_alerts` (Alertas de Atraso)
Registra quando tarefas são detectadas como atrasadas.

---

## 🔄 Como Funciona o Fluxo de Tarefas Concluídas

### Tarefa Única (não recorrente):
1. Tarefa criada → `status = 'pending'`
2. Tarefa concluída → `status = 'completed'`, `updatedAt` atualizado
3. **Registro criado em `task_completions`** com `completedAt` e `completedDate`
4. Tarefa permanece como `completed` permanentemente

### Tarefa Recorrente:
1. Tarefa criada → `status = 'pending'`, `isRecurring = true`
2. Tarefa concluída → `status = 'completed'`, `updatedAt` atualizado
3. **Registro criado em `task_completions`** com `completedAt` e `completedDate`
4. No próximo dia de recorrência (se não foi completada hoje):
   - `status` volta para `pending`
   - **MAS o registro em `task_completions` NÃO é deletado!**
   - Novo registro será criado quando completar novamente

---

## 📅 Como as Tarefas Concluídas São Exibidas

### No Backend (`task.service.ts`):
- A função `findCompleted()` busca tarefas com `status = 'completed'`
- Filtra por `updatedAt` (data de conclusão) no período especificado
- Retorna tarefas agrupadas por data de conclusão

### No Frontend:
- **GeneralPage**: Agrupa tarefas concluídas por `updatedAt` (data de conclusão)
- **CompletedTasksPage**: Agrupa por `updatedAt` também
- Cada grupo mostra a data formatada (ex: "09/03/2026")

---

## ✅ Garantias de Preservação de Dados

1. **Tabela `task_completions` nunca é deletada automaticamente**
   - Mesmo quando tarefas recorrentes são resetadas
   - Mesmo quando tarefas são deletadas (usa `onDelete: Cascade` apenas se a tarefa for deletada)

2. **Histórico completo disponível**
   - Todas as conclusões ficam registradas com data/hora exata
   - Permite relatórios históricos completos

3. **Agrupamento por dia**
   - Usa `updatedAt` da tabela `tasks` para agrupar
   - Alternativamente, pode usar `completedDate` de `task_completions` para maior precisão

---

## 🔍 Consultas Úteis

### Ver todas as conclusões de um usuário:
```sql
SELECT 
  tc.completedDate,
  t.name,
  u.name as usuario
FROM task_completions tc
JOIN tasks t ON t.id = tc.taskId
LEFT JOIN users u ON u.id = tc.userId
WHERE tc.userId = 10
ORDER BY tc.completedDate DESC;
```

### Ver conclusões agrupadas por dia:
```sql
SELECT 
  DATE(tc.completedDate) as dia,
  COUNT(*) as total_conclusoes,
  COUNT(DISTINCT tc.taskId) as tarefas_diferentes
FROM task_completions tc
GROUP BY DATE(tc.completedDate)
ORDER BY dia DESC;
```

### Ver tarefas concluídas hoje:
```sql
SELECT t.*, tc.completedAt
FROM tasks t
JOIN task_completions tc ON tc.taskId = t.id
WHERE DATE(tc.completedDate) = CURDATE()
  AND t.status = 'completed';
```

---

## ⚠️ Observações Importantes

1. **Não há risco de perder registros**: A tabela `task_completions` é independente e preserva todo o histórico

2. **Para melhor precisão**: Se quiser agrupar por data de conclusão real (não `updatedAt`), pode modificar o backend para usar `task_completions.completedDate` ao invés de `tasks.updatedAt`

3. **Tarefas recorrentes**: Mesmo quando resetadas, o histórico de conclusões anteriores permanece intacto
