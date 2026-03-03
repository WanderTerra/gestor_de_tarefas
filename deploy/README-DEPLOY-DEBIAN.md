# Deploy no Debian 13 – Gestor de Tarefas

Este guia descreve como colocar o **Gestor de Tarefas** em produção num servidor **Debian 13**, com Nginx, Node.js, MariaDB e systemd.

## Visão geral

- **Nginx**: reverse proxy; serve o frontend estático e encaminha `/api` para o backend.
- **Backend**: aplicação Node.js (Express) em `backend/`, roda como serviço systemd na porta 3001 (só local).
- **Frontend**: build estático (Vite/React) em `frontend/dist`, servido pelo Nginx.
- **Banco**: MariaDB no próprio servidor (ou acessível via rede).

---

## 1. Pré-requisitos no servidor Debian 13

```bash
sudo apt update
sudo apt install -y curl git nginx mariadb-server
```

### Node.js 20 LTS (recomendado)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v20.x
```

---

## 2. MariaDB – banco de dados

```bash
sudo systemctl enable mariadb
sudo systemctl start mariadb
sudo mysql_secure_installation   # definir senha do root e opções de segurança
```

Criar base e utilizador para a aplicação:

```bash
sudo mysql -u root -p
```

No MySQL:

```sql
CREATE DATABASE gestor_tarefas CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'gestor'@'localhost' IDENTIFIED BY 'sua_senha_forte';
GRANT ALL PRIVILEGES ON gestor_tarefas.* TO 'gestor'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 3. Colocar o código no servidor

Exemplo em `/var/www/gestor-de-tarefas` (pode usar outro caminho e ajustar Nginx/systemd).

```bash
sudo mkdir -p /var/www
sudo chown "$USER:$USER" /var/www
cd /var/www
git clone https://github.com/SEU_USUARIO/gestor_de_tarefas.git gestor-de-tarefas
cd gestor-de-tarefas
```

Ou copiar o projeto por rsync/scp e depois ajustar caminhos nos ficheiros de deploy.

---

## 4. Backend

```bash
cd /var/www/gestor-de-tarefas/backend
cp .env.production.example .env
nano .env   # editar DATABASE_URL, JWT_SECRET, CORS_ORIGIN
npm ci --omit=dev
npm run build
npx prisma generate
npx prisma migrate deploy   # ou, se não tiver migrações versionadas: npx prisma db push
npm run db:seed             # se quiser usuário admin inicial
```

Testar localmente:

```bash
node dist/server.js
# Aceder a http://localhost:3001/api/health
# Ctrl+C para parar
```

---

## 5. Frontend (build de produção)

O frontend usa `VITE_API_URL` ou, em falta, `/api`. Com Nginx a fazer proxy de `/api` para o backend no mesmo domínio, **não é necessário** definir `VITE_API_URL` em produção.

```bash
cd /var/www/gestor-de-tarefas/frontend
npm ci
npm run build
```

O build fica em `frontend/dist`. O Nginx vai servir o conteúdo desta pasta (ou uma cópia para o diretório definido no `root` do Nginx).

---

## 6. Nginx

Copiar e ativar o site:

```bash
sudo cp /var/www/gestor-de-tarefas/deploy/nginx/gestor-de-tarefas.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/gestor-de-tarefas.conf /etc/nginx/sites-enabled/
```

Ajustar no ficheiro:

- `server_name` para o seu domínio (ou `_` para aceitar qualquer host).
- `root` deve apontar para a pasta onde está o **conteúdo** de `frontend/dist`.

Exemplo se quiser manter o código em `/var/www/gestor-de-tarefas` e servir o build:

No ficheiro Nginx, use:

```nginx
root /var/www/gestor-de-tarefas/frontend/dist;
```

Ou copie o conteúdo de `frontend/dist` para algo como `/var/www/gestor-de-tarefas/frontend` e use esse caminho como `root` (conforme está no exemplo em `deploy/nginx/gestor-de-tarefas.conf`).

Depois:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 7. Systemd – backend como serviço

```bash
sudo cp /var/www/gestor-de-tarefas/deploy/systemd/gestor-backend.service /etc/systemd/system/
```

Se a aplicação não estiver em `/var/www/gestor-de-tarefas/backend`, editar o serviço:

```bash
sudo nano /etc/systemd/system/gestor-backend.service
```

Ajustar `WorkingDirectory` e `EnvironmentFile` para o caminho real do backend e do `.env`.

Depois:

```bash
sudo systemctl daemon-reload
sudo systemctl enable gestor-backend
sudo systemctl start gestor-backend
sudo systemctl status gestor-backend
```

Logs:

```bash
sudo journalctl -u gestor-backend -f
```

---

## 8. Permissões e dono dos ficheiros

O serviço systemd está configurado para correr como `www-data`. Os ficheiros da aplicação devem ser legíveis por esse utilizador:

```bash
sudo chown -R www-data:www-data /var/www/gestor-de-tarefas
# Ou, se preferir que o deploy seja feito por outro user e só a leitura para www-data:
# sudo chown -R $USER:www-data /var/www/gestor-de-tarefas
# sudo chmod -R g+rX /var/www/gestor-de-tarefas
```

O `.env` não deve ser world-readable. Exemplo:

```bash
sudo chmod 640 /var/www/gestor-de-tarefas/backend/.env
```

---

## 9. Resumo de URLs e portas

| O quê        | Onde                          |
|-------------|---------------------------------|
| Site (SPA)  | `http://SEU_IP` ou `https://seu-dominio` |
| API         | `http://SEU_IP/api` ou `https://seu-dominio/api` |
| Backend direto (local) | `http://127.0.0.1:3001` (só no servidor) |

---

## 10. HTTPS (recomendado)

Instalar Certbot e obter certificado Let's Encrypt:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d tarefas.seudominio.com
```

Depois de configurar HTTPS, no `.env` do backend use `CORS_ORIGIN` com `https://`:

```env
CORS_ORIGIN="https://tarefas.seudominio.com"
```

---

## 11. Atualizar a aplicação (deploy contínuo)

```bash
cd /var/www/gestor-de-tarefas
git pull
cd backend && npm ci --omit=dev && npm run build && sudo systemctl restart gestor-backend
cd ../frontend && npm ci && npm run build
sudo systemctl reload nginx
```

---

## Ficheiros de deploy incluídos

- `deploy/nginx/gestor-de-tarefas.conf` – site Nginx (proxy + estáticos).
- `deploy/systemd/gestor-backend.service` – serviço systemd do backend.
- `backend/.env.production.example` – exemplo de variáveis de ambiente para produção.

Se o teu caminho de instalação for diferente de `/var/www/gestor-de-tarefas`, ajusta sempre esse caminho no Nginx e no systemd.
