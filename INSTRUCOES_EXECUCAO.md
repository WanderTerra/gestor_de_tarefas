# 📋 Instruções para Executar o Projeto

## 🔧 Pré-requisitos

1. **Node.js** instalado (versão 18 ou superior)
2. **Dependências instaladas** em ambos os projetos:
   ```bash
   # No diretório raiz do projeto
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Arquivo `.env` configurado** no diretório `backend/` com as variáveis necessárias:
   - `DATABASE_URL` - URL de conexão com o banco de dados
   - `JWT_SECRET` - Chave secreta para JWT (opcional, tem valor padrão)
   - `SSH_HOST`, `SSH_PORT`, `SSH_USER`, `SSH_PASSWORD` - Configurações SSH (se necessário)
   - `DB_HOST`, `DB_PORT` - Host e porta do banco de dados

## 🚀 Como Executar

### **Opção 1: Dois Terminais Separados (Recomendado)**

#### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

**O que acontece:**
- O backend inicia na porta **3001**
- Tenta criar túnel SSH automaticamente (se `SSH_HOST` estiver configurado)
- Testa conexão com o banco de dados
- Exibe mensagens de status no console

**Mensagens esperadas:**
- ✅ `🚀 Backend rodando em http://localhost:3001`
- ✅ `🔑 Conexão SSH estabelecida.` (se SSH configurado)
- ✅ `🔗 Túnel SSH ativo: localhost:3306 → ...` (se SSH configurado)
- ✅ `✅ Conexão com banco de dados estabelecida com sucesso.`

**Se houver erro de conexão:**
- ❌ `❌ Não foi possível conectar ao banco de dados.`
- Verifique se o túnel SSH está funcionando ou se o banco está acessível

#### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**O que acontece:**
- O frontend inicia na porta **5173**
- Abre automaticamente no navegador em `http://localhost:5173`
- Conecta ao backend via proxy configurado

**Mensagens esperadas:**
- ✅ `VITE v5.x.x  ready in xxx ms`
- ✅ `➜  Local:   http://localhost:5173/`

---

### **Opção 2: Um Terminal com Processos em Background (Windows PowerShell)**

```powershell
# Backend em background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd backend; npm run dev"

# Frontend em background
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd frontend; npm run dev"
```

---

## 🔐 Credenciais de Login Padrão

Após executar o seed do banco de dados:
- **Usuário:** `admin`
- **Senha:** `admin123`

**Para criar o usuário admin (se ainda não existir):**
```bash
cd backend
npm run db:seed
```

---

## 🛠️ Comandos Úteis

### Backend:
```bash
cd backend

# Desenvolvimento (com hot-reload)
npm run dev

# Gerar Prisma Client
npm run db:generate

# Aplicar migrações
npm run db:migrate

# Abrir Prisma Studio (interface visual do banco)
npm run db:studio

# Criar usuário admin
npm run db:seed
```

### Frontend:
```bash
cd frontend

# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build de produção
npm run preview
```

---

## ⚠️ Solução de Problemas

### Erro: "Can't reach database server"
**Causa:** Banco de dados não está acessível

**Soluções:**
1. Se usa túnel SSH, verifique se `SSH_HOST`, `SSH_USER`, `SSH_PASSWORD` estão corretos no `.env`
2. Verifique se o servidor SSH está acessível
3. Se não usa túnel SSH, verifique se o banco está rodando localmente

### Erro: "Port 3001 already in use"
**Causa:** Backend já está rodando ou outro processo está usando a porta

**Solução:**
```powershell
# Encontrar processo usando a porta 3001
netstat -ano | findstr :3001

# Encerrar o processo (substitua <PID> pelo número encontrado)
taskkill /PID <PID> /F
```

### Erro: "Port 5173 already in use"
**Causa:** Frontend já está rodando ou outro processo está usando a porta

**Solução:**
```powershell
# Encontrar processo usando a porta 5173
netstat -ano | findstr :5173

# Encerrar o processo (substitua <PID> pelo número encontrado)
taskkill /PID <PID> /F
```

### Erro 503 no Login
**Causa:** Backend está rodando, mas banco de dados não está acessível

**Solução:**
1. Verifique os logs do backend para ver mensagens de erro
2. Verifique se o túnel SSH está ativo (se necessário)
3. Verifique se o banco de dados está rodando

---

## 📝 Notas Importantes

1. **Ordem de execução:** É recomendado iniciar o backend primeiro, depois o frontend
2. **Túnel SSH:** O backend tenta criar o túnel SSH automaticamente na inicialização
3. **Hot Reload:** Ambos os projetos têm hot-reload ativado (mudanças são refletidas automaticamente)
4. **Logs:** Mantenha os terminais abertos para ver logs e erros em tempo real

---

## 🎯 URLs Importantes

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001/api
- **Health Check:** http://localhost:3001/api/health
- **Prisma Studio:** Execute `npm run db:studio` no backend e acesse a URL exibida
