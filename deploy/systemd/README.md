# Serviço Systemd - Gestor de Tarefas Backend

Este arquivo configura o backend como um serviço systemd que:
- ✅ Inicia automaticamente após o boot do servidor
- ✅ Reinicia automaticamente em caso de parada ou falha
- ✅ Gerencia logs centralizados via journald
- ✅ Permite controle via systemctl

## 📋 Instalação

### 1. Copiar o arquivo para o sistema

```bash
sudo cp deploy/systemd/gestor-backend.service /etc/systemd/system/gestor-backend.service
```

### 2. Ajustar configurações (se necessário)

Edite o arquivo para ajustar:
- `User` e `Group`: usuário que executará o serviço
- `WorkingDirectory`: caminho completo do diretório backend
- `EnvironmentFile`: caminho do arquivo `.env`
- `ExecStart`: caminho do Node.js (verificar com `which node`)

```bash
sudo nano /etc/systemd/system/gestor-backend.service
```

### 3. Recarregar systemd e habilitar o serviço

```bash
# Recarregar configurações do systemd
sudo systemctl daemon-reload

# Habilitar para iniciar automaticamente no boot
sudo systemctl enable gestor-backend

# Iniciar o serviço agora
sudo systemctl start gestor-backend
```

## 🎮 Comandos de Gerenciamento

### Status e Logs

```bash
# Ver status do serviço
sudo systemctl status gestor-backend

# Ver logs em tempo real (seguir)
sudo journalctl -u gestor-backend -f

# Ver últimas 100 linhas de log
sudo journalctl -u gestor-backend -n 100

# Ver logs desde hoje
sudo journalctl -u gestor-backend --since today

# Ver logs de um período específico
sudo journalctl -u gestor-backend --since "2024-01-01 00:00:00" --until "2024-01-01 23:59:59"
```

### Controle do Serviço

```bash
# Parar o serviço
sudo systemctl stop gestor-backend

# Iniciar o serviço
sudo systemctl start gestor-backend

# Reiniciar o serviço
sudo systemctl restart gestor-backend

# Recarregar configuração (após editar o arquivo .service)
sudo systemctl daemon-reload
sudo systemctl restart gestor-backend

# Desabilitar inicialização automática
sudo systemctl disable gestor-backend

# Habilitar inicialização automática
sudo systemctl enable gestor-backend
```

## 🔍 Verificação

Após iniciar, verifique se está funcionando:

```bash
# Ver status
sudo systemctl status gestor-backend

# Verificar se está escutando na porta correta
sudo netstat -tlnp | grep node
# ou
sudo ss -tlnp | grep node

# Testar endpoint
curl http://localhost:3031/api/health
```

## 🐛 Troubleshooting

### Serviço não inicia

1. Verificar logs:
   ```bash
   sudo journalctl -u gestor-backend -n 50
   ```

2. Verificar permissões:
   ```bash
   # Verificar se o usuário tem acesso ao diretório
   sudo -u portes ls -la /home/portes/gestor_tarefas/gestor_de_tarefas/backend
   
   # Verificar se o arquivo .env existe e tem permissões corretas
   sudo -u portes cat /home/portes/gestor_tarefas/gestor_de_tarefas/backend/.env
   ```

3. Testar execução manual:
   ```bash
   cd /home/portes/gestor_tarefas/gestor_de_tarefas/backend
   sudo -u portes /usr/bin/node dist/server.js
   ```

### Serviço reinicia constantemente

1. Ver logs para identificar o erro:
   ```bash
   sudo journalctl -u gestor-backend -f
   ```

2. Verificar se o banco de dados está acessível:
   ```bash
   sudo systemctl status mariadb
   ```

3. Verificar variáveis de ambiente:
   ```bash
   sudo -u portes cat /home/portes/gestor_tarefas/gestor_de_tarefas/backend/.env
   ```

### Logs não aparecem

1. Verificar se o serviço está rodando:
   ```bash
   sudo systemctl status gestor-backend
   ```

2. Verificar configuração de logs no arquivo .service:
   ```bash
   sudo grep -i "StandardOutput\|StandardError" /etc/systemd/system/gestor-backend.service
   ```

## 📝 Notas

- O serviço está configurado para reiniciar automaticamente (`Restart=always`)
- Logs são gerenciados pelo journald do systemd
- O serviço inicia automaticamente após o boot do servidor
- Timeout de parada: 30 segundos (ajustável via `TimeoutStopSec`)
