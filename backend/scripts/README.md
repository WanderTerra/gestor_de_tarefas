# Scripts de Utilidade

## Reset de Tarefas Recorrentes

### Como usar:

```bash
# No diretório backend
cd backend
npm run reset:recurring
```

Ou diretamente com tsx:

```bash
tsx scripts/reset-recurring-tasks.ts
```

### O que o script faz:

1. ✅ Conecta ao banco de dados
2. 📋 Lista todas as tarefas recorrentes concluídas
3. 🔄 Executa o reset (reseta apenas se hoje for dia de recorrência E não foi completada hoje)
4. 📊 Mostra quais tarefas foram resetadas
5. 📝 Mostra o histórico de conclusões (que é preservado)

### Exemplo de saída:

```
🔄 Iniciando reset de tarefas recorrentes concluídas...

✅ Conexão com banco de dados estabelecida.

📋 Encontradas 2 tarefa(s) recorrente(s) concluída(s):

  - ID 123: Tarefa Semanal
    Recorrência: seg,ter,qua
    Última atualização: 09/03/2026 14:30:00

  - ID 124: Tarefa Mensal
    Recorrência: Dia 9 do mês
    Última atualização: 09/03/2026 10:15:00

🔄 1 tarefa(s) recorrente(s) resetada(s) de "completed" para "pending" (hoje é dia de recorrência).

✅ Reset concluído! 1 tarefa(s) resetada(s).

📋 Tarefas resetadas para "pending":

  - ID 123: Tarefa Semanal (pending)

📊 Últimas 2 conclusões registradas (histórico preservado):

  - Tarefa ID 123: 09/03/2026 14:30:00
  - Tarefa ID 124: 09/03/2026 10:15:00
```

### Observações:

- ⚠️ O script só reseta tarefas se **hoje for um dia de recorrência válido**
- ⚠️ O script **não reseta** tarefas que foram completadas hoje
- ✅ O histórico de conclusões na tabela `task_completions` **nunca é deletado**
