# 🧪 Guia de Teste - Sistema de Notificações do Windows

## ✅ Implementação Concluída

O sistema de notificações do Windows foi implementado com sucesso! As notificações serão exibidas automaticamente quando:

1. **Tarefas ficam atrasadas** (mudança de status ou horário limite ultrapassado)
2. **Novos alertas de overdue são detectados** pelo backend

## 🚀 Como Testar

### 1. Iniciar o Servidor de Desenvolvimento

```bash
cd frontend
npm run dev
```

O servidor estará disponível em `http://localhost:5173`

### 2. Teste Rápido com Botão de Teste

1. Abra o navegador e acesse `http://localhost:5173`
2. Faça login no sistema
3. Procure pelo **ícone de alerta** (⚠️) na barra superior (ao lado do contador de tarefas)
4. Clique no ícone para testar as notificações
5. Se a permissão ainda não foi concedida, o navegador solicitará permissão
6. Após conceder permissão, uma notificação de teste será exibida

### 3. Teste com Tarefas Reais

#### Teste 1: Tarefa com Horário Limite

1. Crie uma nova tarefa
2. Ative o campo "Horário limite"
3. Defina um horário próximo (ex: 2 minutos a partir de agora)
4. Aguarde o horário passar
5. Uma notificação será exibida automaticamente: **"⚠️ Tarefa Atrasada"**

#### Teste 2: Tarefa Pendente do Dia Anterior

1. Crie uma tarefa e deixe-a pendente
2. Aguarde até o próximo dia (ou simule mudando a data no backend)
3. O backend detectará automaticamente e criará um alerta
4. Uma notificação será exibida: **"🔔 Nova Tarefa Atrasada"**

### 4. Verificar Permissões

- **Status Ativo (Verde)**: Notificações estão habilitadas
- **Status Pendente (Cinza)**: Aguardando permissão do usuário
- **Status Negado (Cinza)**: Permissão negada - necessário habilitar manualmente

## 📋 Funcionalidades Implementadas

### ✅ Notificações Automáticas
- Monitoramento contínuo de tarefas atrasadas
- Verificação periódica a cada minuto para novos alertas
- Verificação quando o horário atual muda (a cada 30 segundos)

### ✅ Permissões
- Solicitação automática de permissão (após 2 segundos)
- Verificação de suporte do navegador
- Tratamento de permissões negadas

### ✅ Filtragem por Usuário
- **Administradores**: Recebem notificações de todas as tarefas atrasadas
- **Funcionários**: Recebem apenas notificações de suas próprias tarefas

### ✅ Prevenção de Duplicatas
- Sistema de tags para evitar notificações duplicadas
- Rastreamento de tarefas e alertas já notificados

## 🔧 Solução de Problemas

### ⚠️ Permissão Negada - Como Habilitar Notificações

Se você viu a mensagem "Permissão de notificações negada", siga os passos abaixo para o seu navegador:

#### 🌐 Google Chrome / Microsoft Edge

**Método 1: Pelo ícone na barra de endereços**
1. Olhe na barra de endereços (onde está o URL)
2. Clique no ícone de **cadeado** ou **informações** (ⓘ) à esquerda do endereço
3. Encontre a opção **"Notificações"**
4. Altere de **"Bloquear"** para **"Permitir"**
5. Recarregue a página (F5)

**Método 2: Pelas configurações do navegador**
1. Clique nos **três pontos** (⋮) no canto superior direito
2. Vá em **Configurações**
3. No menu lateral, clique em **Privacidade e segurança**
4. Clique em **Configurações do site**
5. Clique em **Notificações**
6. Procure por `localhost:5173` ou `192.168.137.1:5173` na lista
7. Se encontrar, altere para **"Permitir"**
8. Se não encontrar, adicione manualmente:
   - Clique em **Adicionar** ao lado de "Permitir"
   - Digite: `http://localhost:5173` ou `http://192.168.137.1:5173`
   - Clique em **Adicionar**
9. Recarregue a página (F5)

#### 🦊 Mozilla Firefox

1. Clique nos **três traços** (☰) no canto superior direito
2. Vá em **Configurações**
3. No menu lateral, clique em **Privacidade e Segurança**
4. Role até a seção **Permissões**
5. Clique em **Configurações...** ao lado de "Notificações"
6. Procure por `localhost:5173` ou `192.168.137.1:5173`
7. Se encontrar, altere para **"Permitir"**
8. Se não encontrar, adicione manualmente:
   - Digite: `http://localhost:5173` ou `http://192.168.137.1:5173`
   - Selecione **"Permitir"**
   - Clique em **Salvar alterações**
9. Recarregue a página (F5)

#### 🍎 Safari (macOS)

1. Vá em **Safari** → **Preferências** (ou pressione `Cmd + ,`)
2. Clique na aba **Websites**
3. No menu lateral, selecione **Notificações**
4. Procure por `localhost:5173` ou `192.168.137.1:5173`
5. Altere para **"Permitir"**
6. Recarregue a página (F5)

#### 🔄 Depois de Habilitar

1. **Recarregue a página** (F5 ou Ctrl+R)
2. Clique novamente no **ícone de teste** (⚠️) na barra superior
3. A permissão será solicitada novamente
4. Clique em **"Permitir"** quando o navegador perguntar
5. Uma notificação de teste será exibida!

### Notificações não aparecem?

1. **Verifique as permissões do navegador:**
   - Chrome/Edge: Configurações → Privacidade → Notificações
   - Firefox: Configurações → Privacidade → Permissões → Notificações

2. **Verifique o console do navegador:**
   - Abra o DevTools (F12)
   - Procure por erros relacionados a notificações

3. **Teste o botão de teste:**
   - Clique no ícone de alerta na barra superior
   - Se não aparecer, verifique se o navegador suporta notificações

## 📝 Notas Técnicas

- As notificações usam a API nativa do navegador (`Notification API`)
- Funcionam mesmo com o navegador minimizado (no Windows)
- Fecham automaticamente após 5 segundos
- Ao clicar na notificação, a janela do navegador é focada

## 🗑️ Remover Botão de Teste

Após validar que tudo está funcionando, você pode remover o botão de teste:

1. Remova a função `testNotification` do `App.tsx`
2. Remova o botão de teste da interface (linhas ~800-820)
3. Remova as variáveis não utilizadas do hook (`requestPermission`, `isSupported`, `permission`)
