# 🔒 Checklist: Arquivos Críticos para Autenticação em Produção

## ⚠️ Arquivos que PODEM dar problema em produção

### 🔴 **CRÍTICO - Verificar ANTES de fazer deploy**

#### 1. **`backend/src/server.ts`** ⚠️ CRÍTICO
**Risco:** Configuração de CORS pode aceitar requisições de qualquer origem se mal configurado.

**O que verificar:**
- ✅ Linha 20: `const isDevelopment = env.NODE_ENV === 'development';`
- ✅ Linha 21-29: CORS só aceita qualquer origem se `NODE_ENV === 'development'`
- ✅ Em produção, deve usar `env.CORS_ORIGIN` (origens configuradas)

**Configuração necessária em produção:**
```bash
# backend/.env (PRODUÇÃO)
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com,https://www.seu-dominio.com
```

**Status atual:** ✅ SEGURO (só aceita qualquer origem se NODE_ENV for explicitamente 'development')

---

#### 2. **`backend/src/config/env.ts`** ⚠️ CRÍTICO
**Risco:** Valores padrão podem ser usados em produção se variáveis de ambiente não estiverem definidas.

**O que verificar:**
- ⚠️ Linha 5: `NODE_ENV: process.env.NODE_ENV || 'development'` - **Padrão é 'development'**
- ⚠️ Linha 7: `CORS_ORIGIN: ... || ['http://localhost:5173']` - **Padrão é localhost**
- ⚠️ Linha 8: `JWT_SECRET: ... || 'gestor-tarefas-secret-dev-2024'` - **Padrão é fraco**

**Configuração necessária em produção:**
```bash
# backend/.env (PRODUÇÃO) - TODAS ESSAS VARIÁVEIS DEVEM ESTAR DEFINIDAS
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com,https://www.seu-dominio.com
JWT_SECRET=uma-chave-secreta-muito-forte-e-aleatoria-aqui
DATABASE_URL=mysql://usuario:senha@host:porta/banco
```

**Status atual:** ⚠️ REQUER CONFIGURAÇÃO - Valores padrão são inseguros para produção

---

#### 3. **`frontend/src/services/api.ts`** ⚠️ IMPORTANTE
**Risco:** URL da API pode estar incorreta em produção se build não for feito corretamente.

**O que verificar:**
- ✅ Linha 7-8: `if (!import.meta.env.DEV) return '/api';` - **Em produção sempre usa '/api'**
- ✅ Linha 16-30: Lógica de detecção de IP só roda em desenvolvimento
- ✅ `import.meta.env.DEV` é `false` em build de produção (seguro)

**Configuração necessária em produção:**
- ✅ Nenhuma configuração necessária - o código detecta automaticamente
- ✅ Build de produção: `npm run build` (Vite define `import.meta.env.DEV = false`)

**Status atual:** ✅ SEGURO (sempre usa '/api' em produção)

---

#### 4. **`backend/src/middleware/auth.ts`** ⚠️ IMPORTANTE
**Risco:** Validação de JWT depende de `JWT_SECRET` estar configurado corretamente.

**O que verificar:**
- ✅ Linha 47: `jwt.verify(token, env.JWT_SECRET)` - Usa `env.JWT_SECRET`
- ⚠️ Se `JWT_SECRET` for o padrão de desenvolvimento, tokens podem ser vulneráveis

**Configuração necessária em produção:**
```bash
# backend/.env (PRODUÇÃO)
JWT_SECRET=uma-chave-secreta-muito-forte-e-aleatoria-diferente-do-dev
```

**Status atual:** ⚠️ REQUER CONFIGURAÇÃO - JWT_SECRET deve ser forte e único em produção

---

### 🟡 **MODERADO - Verificar se necessário**

#### 5. **`frontend/src/contexts/AuthContext.tsx`** ✅ SEGURO
**Risco:** Baixo - apenas tratamento de erros melhorado.

**O que verificar:**
- ✅ Linha 28-34: Tratamento de erro não quebra a aplicação
- ✅ Se backend não estiver disponível, limpa token e continua (comportamento correto)

**Status atual:** ✅ SEGURO (melhorias não afetam produção negativamente)

---

#### 6. **`frontend/vite.config.ts`** ✅ NÃO AFETA PRODUÇÃO
**Risco:** Nenhum - configuração de proxy só é usada em desenvolvimento.

**O que verificar:**
- ✅ Proxy só funciona no servidor de desenvolvimento (`npm run dev`)
- ✅ Em build de produção, o código é estático e não usa proxy

**Status atual:** ✅ SEGURO (não afeta produção)

---

#### 7. **`backend/src/controllers/auth.controller.ts`** ✅ SEGURO
**Risco:** Baixo - lógica de autenticação não mudou.

**O que verificar:**
- ✅ Lógica de login/registro não foi alterada
- ✅ Validação de schemas continua funcionando

**Status atual:** ✅ SEGURO (sem mudanças que afetem produção)

---

## 📋 Checklist Pré-Deploy

Antes de fazer deploy em produção, verifique:

### Backend (`backend/.env`):
- [ ] `NODE_ENV=production` está definido
- [ ] `CORS_ORIGIN` contém apenas os domínios de produção (separados por vírgula)
- [ ] `JWT_SECRET` é uma chave forte e única (diferente do desenvolvimento)
- [ ] `DATABASE_URL` está configurado corretamente
- [ ] `PORT` está configurado (ou usa padrão 3001)

### Frontend:
- [ ] Build foi feito com `npm run build` (não usar `npm run dev` em produção)
- [ ] Arquivos em `frontend/dist` foram gerados corretamente
- [ ] Nginx está configurado para servir `frontend/dist` e fazer proxy de `/api`

### Nginx (`deploy/nginx/gestor-de-tarefas.conf`):
- [ ] `root` aponta para `frontend/dist`
- [ ] `location /api` faz proxy para `http://127.0.0.1:3031` (porta do backend em produção)
- [ ] `server_name` está configurado com o domínio correto

### Testes:
- [ ] Testar login em produção
- [ ] Testar verificação de token (`/api/auth/me`)
- [ ] Verificar logs do backend para erros de CORS
- [ ] Verificar se requisições estão sendo bloqueadas incorretamente

---

## 🚨 Problemas Comuns e Soluções

### Problema 1: "CORS bloqueando requisições em produção"
**Causa:** `CORS_ORIGIN` não contém o domínio de produção.

**Solução:**
```bash
# backend/.env
CORS_ORIGIN=https://seu-dominio.com,https://www.seu-dominio.com
```

### Problema 2: "Erro 404 em /api/auth/login"
**Causa:** Nginx não está fazendo proxy corretamente ou backend não está rodando.

**Solução:**
- Verificar se backend está rodando: `systemctl status gestor-backend`
- Verificar configuração do Nginx: `sudo nginx -t`
- Verificar logs: `sudo tail -f /var/log/nginx/gestor-de-tarefas-error.log`

### Problema 3: "Token inválido ou expirado"
**Causa:** `JWT_SECRET` diferente entre desenvolvimento e produção.

**Solução:**
- Garantir que `JWT_SECRET` em produção é o mesmo usado quando os tokens foram gerados
- Se mudou o `JWT_SECRET`, usuários precisam fazer login novamente

### Problema 4: "Frontend tentando acessar http://IP:3001/api em produção"
**Causa:** Build de produção não foi feito corretamente ou `import.meta.env.DEV` está true.

**Solução:**
- Fazer build novamente: `cd frontend && npm run build`
- Verificar se `frontend/dist` contém os arquivos gerados
- Limpar cache do navegador

---

## ✅ Resumo de Segurança

### Arquivos que REQUEREM atenção:
1. **`backend/src/config/env.ts`** - ⚠️ Configurar todas as variáveis de ambiente
2. **`backend/src/server.ts`** - ✅ Código seguro, mas requer `NODE_ENV=production`
3. **`backend/src/middleware/auth.ts`** - ⚠️ Requer `JWT_SECRET` forte

### Arquivos que são SEGUROS:
1. **`frontend/src/services/api.ts`** - ✅ Detecta produção automaticamente
2. **`frontend/src/contexts/AuthContext.tsx`** - ✅ Apenas melhorias
3. **`frontend/vite.config.ts`** - ✅ Não afeta produção

---

## 📝 Notas Importantes

1. **Nunca commitar `.env`** com valores de produção no Git
2. **Sempre usar `NODE_ENV=production`** em produção
3. **JWT_SECRET deve ser único e forte** em produção
4. **CORS_ORIGIN deve conter apenas domínios de produção**
5. **Build do frontend deve ser feito** antes de fazer deploy

---

**Última atualização:** Após correções de autenticação (commits 49f5809 e b53a4fc)
