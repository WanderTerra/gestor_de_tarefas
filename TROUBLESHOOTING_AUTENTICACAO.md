# 🔧 Troubleshooting: Erro 404 de Autenticação

## 📋 Problema

Quando o frontend é acessado pelo **IP da rede** (ex: `http://10.100.20.188:5173`) em vez de `localhost`, ocorre erro **404 (Not Found)** nas chamadas de API, especialmente em `/api/auth/login` ou `/api/auth/me`.

### Sintomas

- Erro no console: `POST http://10.100.20.188:5173/api/auth/login 404 (Not Found)`
- Erro no console: `Failed to load resource: the server responded with a status of 404 (Not Found)`
- Aplicação não consegue fazer login ou verificar autenticação

### Causa Raiz

1. **Proxy do Vite não funciona com IP da rede**: O proxy configurado no `vite.config.ts` redireciona `/api` para `localhost:3001`, mas quando acessado por IP, o proxy pode não funcionar corretamente.

2. **CORS bloqueando requisições**: O backend estava configurado para aceitar apenas `localhost:5173`, bloqueando requisições vindas do IP da rede.

3. **URL da API incorreta**: O frontend tentava usar `/api` (relativo), mas quando acessado por IP, precisa usar a URL completa do backend.

---

## ✅ Solução Implementada

### 1. Frontend (`frontend/src/services/api.ts`)

O código agora **detecta automaticamente** quando está sendo acessado pela rede:

```typescript
function getApiUrl(): string {
  if (!import.meta.env.DEV) {
    return '/api'; // Produção: sempre usa /api (mesmo domínio)
  }

  // Se VITE_API_URL estiver definida, usa ela
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Detecta se está sendo acessado por IP da rede
  const hostname = window.location.hostname;
  const isNetworkAccess = hostname !== 'localhost' && hostname !== '127.0.0.1';
  
  if (isNetworkAccess) {
    // Usa URL completa do backend no mesmo IP
    return `http://${hostname}:3001/api`;
  }

  // Caso padrão: usa /api (proxy do Vite)
  return '/api';
}
```

**Comportamento:**
- ✅ **Localhost**: Usa `/api` → proxy do Vite redireciona para `localhost:3001`
- ✅ **IP da rede**: Usa `http://10.100.20.188:3001/api` (URL completa)
- ✅ **Produção**: Sempre usa `/api` (mesmo domínio, Nginx faz proxy)

### 2. Backend (`backend/src/server.ts`)

CORS configurado para aceitar qualquer origem **apenas em desenvolvimento**:

```typescript
const corsOptions = env.NODE_ENV === 'development' 
  ? {
      origin: true, // Aceita qualquer origem em dev
      credentials: true,
    }
  : {
      origin: env.CORS_ORIGIN, // Produção: apenas origens configuradas
      credentials: true,
    };
```

**Comportamento:**
- ✅ **Desenvolvimento**: Aceita requisições de qualquer origem (localhost, IPs da rede, etc.)
- ✅ **Produção**: Aceita apenas as origens configuradas em `CORS_ORIGIN` (seguro)

### 3. Vite (`frontend/vite.config.ts`)

Proxy melhorado com logs para debug:

```typescript
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
    // ... configurações adicionais
  },
}
```

---

## 🔍 Como Verificar se Está Funcionando

### 1. Verificar Console do Navegador

Ao acessar pelo IP da rede, você deve ver:

```
🌐 Acesso pela rede detectado. Usando backend em: http://10.100.20.188:3001/api
💡 Certifique-se de que o backend está acessível neste IP e porta 3001
🔧 API_URL configurada como: http://10.100.20.188:3001/api
```

### 2. Verificar se Backend Está Acessível

Teste manualmente no navegador ou com curl:

```bash
# Deve retornar JSON com status: "ok"
curl http://10.100.20.188:3001/api/health
```

### 3. Verificar CORS

Se ainda houver erro de CORS, verifique os logs do backend. O backend deve aceitar a requisição sem erro de CORS.

---

## 🚨 Checklist de Troubleshooting

Se o problema persistir, verifique:

- [ ] **Backend está rodando?**
  ```bash
  cd backend
  npm run dev
  ```
  Deve aparecer: `🚀 Backend rodando em http://localhost:3001`

- [ ] **Backend está acessível pelo IP da rede?**
  - O Express por padrão aceita conexões de qualquer interface
  - Verifique se não há firewall bloqueando a porta 3001
  - Teste: `curl http://SEU_IP:3001/api/health`

- [ ] **Porta 3001 está livre?**
  ```powershell
  # Windows
  netstat -ano | findstr :3001
  ```

- [ ] **Frontend detectou o acesso pela rede?**
  - Verifique o console do navegador para ver a mensagem de detecção

- [ ] **CORS está configurado corretamente?**
  - Em desenvolvimento, deve aceitar qualquer origem
  - Verifique `backend/src/server.ts`

---

## 🏭 Status para Produção

### ✅ **PRONTO PARA PRODUÇÃO**

O código está **seguro e pronto para produção**:

1. **Frontend em produção:**
   - ✅ Sempre usa `/api` (mesmo domínio)
   - ✅ Não tenta detectar IP da rede em produção
   - ✅ Funciona com Nginx fazendo proxy de `/api` para o backend

2. **Backend em produção:**
   - ✅ CORS usa apenas origens configuradas (`CORS_ORIGIN`)
   - ✅ Não aceita requisições de qualquer origem
   - ✅ Seguro contra ataques CSRF

3. **Configuração de produção:**
   - ✅ Nginx faz proxy de `/api` para `localhost:3031` (backend)
   - ✅ Frontend servido como arquivos estáticos
   - ✅ Mesmo domínio = sem problemas de CORS

### ⚠️ **IMPORTANTE para Produção**

Certifique-se de que:

1. **Variável de ambiente `CORS_ORIGIN`** está configurada no backend:
   ```bash
   # backend/.env
   CORS_ORIGIN=https://seu-dominio.com,https://www.seu-dominio.com
   ```

2. **NODE_ENV=production** está definido no backend:
   ```bash
   # backend/.env
   NODE_ENV=production
   ```

3. **Nginx está configurado** para fazer proxy de `/api`:
   - Verifique `deploy/nginx/gestor-de-tarefas.conf`
   - O proxy deve apontar para `http://127.0.0.1:3031` (porta do backend em produção)

---

## 📝 Notas Técnicas

### Por que o proxy do Vite não funciona com IP?

O proxy do Vite funciona bem com `localhost`, mas quando você acessa pelo IP da rede:
- O navegador faz requisições para `http://10.100.20.188:5173/api/...`
- O proxy do Vite pode não interceptar corretamente
- A solução é usar a URL completa do backend: `http://10.100.20.188:3001/api`

### Por que CORS aceita qualquer origem em dev?

Em desenvolvimento, é comum acessar de diferentes IPs (localhost, IP da rede, etc.). Aceitar qualquer origem facilita o desenvolvimento. Em produção, isso seria um risco de segurança, por isso o código verifica `NODE_ENV` e usa apenas origens configuradas.

---

## 🔄 Histórico

- **Data**: [Data da correção]
- **Problema**: Erro 404 ao acessar frontend pelo IP da rede
- **Solução**: Detecção automática de acesso por IP + CORS flexível em dev
- **Status**: ✅ Resolvido e pronto para produção

---

## 📞 Se o Problema Persistir

1. Verifique os logs do backend para erros específicos
2. Verifique o console do navegador para mensagens de erro detalhadas
3. Teste a conectividade: `curl http://SEU_IP:3001/api/health`
4. Verifique se o firewall não está bloqueando a porta 3001
5. Reinicie ambos os servidores (backend e frontend)
