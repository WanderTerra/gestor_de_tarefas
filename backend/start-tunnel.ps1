# Script para abrir túnel SSH para o MariaDB na VPS
# Executa antes de iniciar o backend em desenvolvimento local

$SSH_HOST = "82.25.69.143"
$SSH_PORT = 22
$SSH_USER = "portes"
$LOCAL_PORT = 3306
$REMOTE_PORT = 3306

Write-Host "🔗 Abrindo túnel SSH para MariaDB..." -ForegroundColor Cyan
Write-Host "   Local localhost:$LOCAL_PORT → VPS $SSH_HOST`:$REMOTE_PORT" -ForegroundColor Gray

# Verificar se já existe um túnel ativo na porta
$existing = Get-NetTCPConnection -LocalPort $LOCAL_PORT -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host "⚠️  Porta $LOCAL_PORT já está em uso. Túnel pode já estar ativo." -ForegroundColor Yellow
    Write-Host "   PIDs usando a porta: $($existing.OwningProcess -join ', ')" -ForegroundColor Gray
    $continue = Read-Host "Continuar mesmo assim? (s/n)"
    if ($continue -ne "s") { exit }
}

# Abrir túnel SSH em background
ssh -f -N -L ${LOCAL_PORT}:localhost:${REMOTE_PORT} ${SSH_USER}@${SSH_HOST} -p $SSH_PORT

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Túnel SSH ativo! MariaDB acessível em localhost:$LOCAL_PORT" -ForegroundColor Green
    Write-Host ""
    Write-Host "Para iniciar o backend:" -ForegroundColor Cyan
    Write-Host "   cd backend && npx tsx src/server.ts" -ForegroundColor White
} else {
    Write-Host "❌ Falha ao abrir túnel SSH. Verifique suas credenciais." -ForegroundColor Red
}
