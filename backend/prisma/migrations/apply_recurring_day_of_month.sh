#!/bin/bash
# Script para aplicar a migração recurring_day_of_month
# Uso: ./apply_recurring_day_of_month.sh

# Carregar variáveis de ambiente do .env
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

# Verificar se DATABASE_URL está definida
if [ -z "$DATABASE_URL" ]; then
  echo "ERRO: DATABASE_URL não está definida no .env"
  exit 1
fi

# Extrair informações do DATABASE_URL
# Formato: mysql://user:password@host:port/database
DB_URL=$(echo $DATABASE_URL | sed 's|mysql://||')
DB_USER=$(echo $DB_URL | cut -d: -f1)
DB_PASS=$(echo $DB_URL | cut -d: -f2 | cut -d@ -f1)
DB_HOST=$(echo $DB_URL | cut -d@ -f2 | cut -d: -f1)
DB_PORT=$(echo $DB_URL | cut -d: -f3 | cut -d/ -f1)
DB_NAME=$(echo $DB_URL | cut -d/ -f2)

echo "Aplicando migração: add_recurring_day_of_month"
echo "Banco: $DB_NAME em $DB_HOST:$DB_PORT"

# Executar SQL
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" <<EOF
-- Verificar se a coluna já existe
SET @col_exists = (
  SELECT COUNT(*) 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = '$DB_NAME' 
    AND TABLE_NAME = 'tasks' 
    AND COLUMN_NAME = 'recurring_day_of_month'
);

-- Adicionar coluna apenas se não existir
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE \`tasks\` ADD COLUMN \`recurring_day_of_month\` INT NULL COMMENT ''Dia do mês (1-31) para tarefas mensais. NULL para tarefas não mensais.'';',
  'SELECT ''Coluna recurring_day_of_month já existe.'' AS message;'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT 'Migração concluída com sucesso!' AS message;
EOF

echo "Migração aplicada!"
